import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Liner {
  constructor() {
    this.jar = new CookieJar();
    this.ax = wrapper(axios.create({
      jar: this.jar
    }));
    this.h = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://app.liner.com",
      pragma: "no-cache",
      referer: "https://app.liner.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-liner-platform-type": "web"
    };
    this.uid = null;
    this.sid = null;
    this.tid = null;
    this.mid = null;
  }
  log(m) {
    console.log(`[Liner] ${m}`);
  }
  async ensureAuth() {
    if (this.uid) return;
    try {
      this.log("Auth...");
      const {
        data: d
      } = await this.ax.post("https://api.liner.com/auth/guest?isPaid=false&experiment-id=66&msAppInstalled=false", {
        personalInformation: {
          countryCode: "ID"
        },
        properties: {},
        amplitudeProps: {
          stable_id: crypto.randomUUID()
        }
      }, {
        headers: {
          ...this.h,
          "content-type": "application/json"
        }
      });
      this.uid = d?.id;
      this.log(`Auth OK: UID=${this.uid}`);
    } catch (e) {
      this.log(`Auth error: ${e.message}`);
      throw e;
    }
  }
  async ensureThread() {
    if (this.tid) return;
    try {
      await this.ensureAuth();
      this.log("Get space...");
      const {
        data: sp
      } = await this.ax.get("https://api.liner.com/v1/general-space", {
        headers: this.h
      });
      this.sid = sp?.spaceId;
      this.log(`Space OK: SID=${this.sid}`);
      this.log("Create thread...");
      const {
        data: th
      } = await this.ax.post(`https://api.liner.com/v1/space/${this.sid}/thread`, {
        userId: this.uid,
        metadata: {
          cache: {}
        },
        messagePieces: [{
          type: "text",
          content: {
            text: "init"
          }
        }],
        attachments: [],
        mode: "general",
        answerMode: "search",
        deviceType: "web"
      }, {
        headers: {
          ...this.h,
          "content-type": "application/json"
        }
      });
      this.tid = th?.id;
      this.mid = th?.messageId;
      this.log(`Thread OK: TID=${this.tid}, MID=${this.mid}`);
    } catch (e) {
      this.log(`Thread error: ${e.message}`);
      throw e;
    }
  }
  async chat({
    prompt,
    ...opts
  }) {
    try {
      await this.ensureThread();
      this.log(`Chat: "${prompt}"`);
      const md = {
        request: {
          spaceId: this.sid,
          threadId: this.tid,
          userMessageId: this.mid,
          userId: this.uid,
          query: prompt,
          platform: "web",
          regenerate: false,
          showReferenceChunks: true,
          mode: opts.mode || "general",
          answerMode: opts.answerMode || "search",
          experimentId: 33,
          modelType: "liner",
          experimentVariants: ["naver-1__control"],
          isDeepResearchMode: false,
          answerFormat: "auto",
          searchSources: [{
            type: "web"
          }, {
            type: "paper"
          }]
        }
      };
      await this.ax.put(`https://api.liner.com/v1/space/${this.sid}/thread/${this.tid}/message/${this.mid}`, {
        metadata: md,
        messagePieces: null,
        attachments: null
      }, {
        headers: {
          ...this.h,
          "content-type": "application/json"
        }
      });
      const {
        data: str
      } = await this.ax.post(`https://api.liner.com/lisa/v1/spaces/${this.sid}/threads/${this.tid}/messages/${this.mid}/answer`, {
        experimentVariants: ["naver-1__control"],
        modelType: "liner",
        platform: "web",
        query: prompt,
        regenerate: false,
        searchSources: [{
          type: "web"
        }, {
          type: "paper"
        }]
      }, {
        headers: {
          ...this.h,
          accept: "text/event-stream",
          "content-type": "application/json"
        },
        responseType: "text"
      });
      let txt = "";
      const inf = {
        traceId: null,
        agentMessageId: null,
        references: [],
        referenceChunks: [],
        infoTable: null,
        takoResults: [],
        raw: []
      };
      const lines = str.split("\n");
      for (const l of lines) {
        if (l.startsWith("data:")) {
          try {
            const j = JSON.parse(l.slice(5));
            inf.raw.push(j);
            if (j?.answer) txt += j.answer;
            if (j?.traceId) inf.traceId = j.traceId;
            if (j?.agentMessageId) inf.agentMessageId = j.agentMessageId;
            if (j?.references) inf.references = j.references;
            if (j?.v2References) inf.references = j.v2References;
            if (j?.referenceChunks) inf.referenceChunks = j.referenceChunks;
            if (j?.v2ReferenceChunks) inf.referenceChunks = j.v2ReferenceChunks;
            if (j?.infoTable) inf.infoTable = j.infoTable;
            if (j?.takoResults) inf.takoResults = j.takoResults;
          } catch {}
        }
      }
      this.log("Chat OK");
      return {
        result: txt || "No response",
        ...inf
      };
    } catch (e) {
      this.log(`Chat error: ${e.message}`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Liner();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}