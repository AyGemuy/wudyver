import EventEmitter from "events";
import WebSocket from "ws";
import axios from "axios";
import * as wrapper from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import {
  Readable
} from "stream";
Readable.fromEventEmitter = function(emitter, events) {
  const readable = new Readable({
    read() {}
  });
  const onData = data => {
    readable.push(data);
  };
  const onEnd = () => {
    readable.push(null);
  };
  const onError = err => {
    readable.emit("error", err);
  };
  emitter.on(events[0], onData);
  emitter.on(events[1], onEnd);
  emitter.on(events[2], onError);
  return readable;
};
const iask = {
  turndownService: new TurndownService(),
  request(query, mode, options) {
    if (typeof query === "object") {
      return query;
    }
    return {
      q: query,
      mode: mode,
      ...options
    };
  },
  eventx(query) {
    const pipe = new EventEmitter();
    const getQueryString = () => {
      const params = new URLSearchParams(query);
      return params.toString();
    };
    return {
      query: query,
      pipe: pipe,
      getQueryString: getQueryString
    };
  },
  parseChunk(message) {
    try {
      const data = JSON.parse(message);
      const diff = data.pop();
      let content = "";
      let stop = false;
      if (diff?.e?.[0]?.[1]?.data) {
        content = diff.e[0][1].data.replace(/<br\/>/g, "\n");
        console.log(content);
      }
      if (diff?.response?.rendered?.[2]?.[1]?.[4]?.[4]) {
        content = this.turndownService.turndown(diff.response.rendered[2][1][4][4]);
        stop = true;
        console.log(content);
      }
      return {
        content: content,
        stop: stop
      };
    } catch (error) {
      console.error(error);
      return {
        content: "",
        stop: true
      };
    }
  },
  inspect(response) {
    const $ = cheerio.load(response.data);
    const phxElement = $('[id^="phx-"]').first();
    const joinMessage = JSON.stringify([null, null, `lv:${phxElement.attr("id")}`, "phx_join", {
      url: response.request.res.responseUrl,
      session: phxElement.attr("data-phx-session")
    }]);
    const csrfToken = $('meta[name="csrf-token"]').attr("content");
    return {
      joinMessage: joinMessage,
      csrfToken: csrfToken
    };
  },
  async cws(queryString, jar) {
    const client = wrapper.wrapper(axios.create({
      jar: jar
    }));
    try {
      const response = await client.get(`https://iask.ai?${queryString}`);
      const {
        joinMessage,
        csrfToken
      } = this.inspect(response);
      const cookies = await jar.getCookieString("https://iask.ai");
      console.log(cookies);
      const ws = new WebSocket(`wss://iask.ai/live/websocket?_csrf_token=${csrfToken}&vsn=2.0.0`, {
        headers: {
          Cookie: cookies
        }
      });
      await new Promise((resolve, reject) => {
        ws.on("open", () => {
          console.log("Websocket berhasil terhubung...");
          ws.send(joinMessage);
          resolve();
        });
        ws.on("error", err => {
          console.error("Tidak dapat terhubung ke WebSocket:", err);
          reject(err);
        });
      });
      return ws;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  async handleJoin(event) {
    try {
      const jar = new CookieJar();
      const ws = await this.cws(event.getQueryString(), jar);
      const pipe = event.pipe;
      ws.on("message", message => {
        console.log(message.toString());
        const {
          content,
          stop
        } = this.parseChunk(message.toString());
        if (content !== "") {
          pipe.emit("data", content);
        }
        if (stop) {
          pipe.emit("end");
          ws.close();
        }
      });
      ws.on("close", () => {
        console.log("Websocket terputus...");
        pipe.emit("end");
      });
      ws.on("error", err => {
        console.error(err);
        pipe.emit("error", err);
      });
    } catch (error) {
      console.error(error);
      event.pipe.emit("error", error);
    }
  },
  dispatcher: new EventEmitter(),
  setupDispatcher() {
    this.dispatcher.on("JoinEvent", event => this.handleJoin(event));
  },
  ask: async (query, mode = "question", options = {}) => {
    const summon = iask.request(query, mode, options);
    const event = iask.eventx(summon);
    iask.dispatcher.emit("JoinEvent", event);
    return Readable.fromEventEmitter(event.pipe, ["data", "end", "error"]);
  },
  init() {
    this.setupDispatcher();
  }
};
async function Ask(query, mode = "question", options = {
  detail_level: "detailed"
}) {
  try {
    iask.init();
    const stream = await iask.ask(query, mode, options);
    return new Promise((resolve, reject) => {
      let result = "";
      stream.on("data", chunk => {
        result += chunk;
      });
      stream.on("end", () => {
        console.log("Permintaan ke Websocket iASK berhasil..");
        console.log("Result:", result);
        resolve({
          result: result
        });
      });
      stream.on("error", err => {
        console.error(err);
        reject({
          err: err
        });
      });
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    query,
    mode = "question",
    ...options
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    error: "Query parameter is required"
  });
  try {
    const result = await Ask(query, mode, options);
    const response = result ? result : "Result not found";
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to handle the query"
    });
  }
}