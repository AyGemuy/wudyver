import axios from "axios";
import * as cheerio from "cheerio";
import {
  io
} from "socket.io-client";
class TemporaryMail {
  constructor() {
    this.client = axios.create({
      baseURL: "https://generator.email",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image:webp,image:apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=0, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      },
      withCredentials: true
    });
    this.email = null;
    this.recId = null;
    this.ws = null;
    this.listeners = [];
    this.cookies = {};
    this.client.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookieString => {
          const [nameValue] = cookieString.split(";");
          const [name, value] = nameValue.split("=");
          if (name && value) {
            this.cookies[name.trim()] = value.trim();
          }
        });
      }
      return response;
    }, error => Promise.reject(error));
    this.client.interceptors.request.use(config => {
      const cookieHeader = Object.entries(this.cookies).map(([name, value]) => `${name}=${value}`).join("; ");
      if (cookieHeader) {
        config.headers["Cookie"] = cookieHeader;
      }
      return config;
    }, error => Promise.reject(error));
  }
  _parseMailData(html) {
    const $ = cheerio.load(html || "");
    const from = $(".from_div_45g45gg").text().trim() || "Unknown Sender";
    const subject = $(".subj_div_45g45gg").text().trim() || "No Subject";
    const time = $(".time_div_45g45gg").text().trim() || "Unknown Time";
    return {
      from: from,
      subject: subject,
      time: time
    };
  }
  async create() {
    try {
      const res = await this.client.get("/email-generator");
      const $ = cheerio.load(res.data || "");
      const user = $("#userName").val() || null;
      const domain = $("#domainName2").val() || null;
      if (!user || !domain) {
        throw new Error("Email parts missing from generator page.");
      }
      this.email = `${user}@${domain}`.toLowerCase();
      const smurl = `${domain?.toLowerCase() || ""}/${user?.replace(/[^a-zA-Z_0-9.-]/g, "").toLowerCase() || ""}`;
      this.cookies["surl"] = smurl;
      const script = $('script:contains("recieved:")').html() || "";
      const recMatch = script.match(/recieved: "([^"]+)"/);
      this.recId = recMatch?.[1] || null;
      const checkRes = await this.client.post("/check_adres_validation3.php", `usr=${user}&dmn=${domain}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://generator.email",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const validationStatus = checkRes.data?.status || "unknown";
      const uptime = checkRes.data?.uptime || null;
      this._setupWs(this.email);
      return {
        email: this.email,
        recId: this.recId,
        status: validationStatus,
        uptime: uptime
      };
    } catch (error) {
      console.error("Error generating mail:", error);
      throw error;
    }
  }
  _setupWs(mail) {
    if (this.ws) {
      this.ws.disconnect();
    }
    this.ws = io("wss://generator.email", {
      path: "/socket.io",
      transports: ["websocket"],
      autoConnect: false
    });
    this.ws.on("connect", () => {
      console.log(`WebSocket connected for ${mail}`);
      this.ws.emit("watch_for_my_email", mail);
    });
    this.ws.on("new_email", data => {
      try {
        const parsed = JSON.parse(data || "{}");
        if (parsed.tddata) {
          const mailDetails = this._parseMailData(parsed.tddata);
          const fullMail = {
            clickgo: parsed.clickgo || null,
            received: parsed.recieved || null,
            ...mailDetails
          };
          this.listeners.forEach(cb => cb(fullMail));
        }
      } catch (e) {
        console.error("WebSocket data parsing error:", e, data);
      }
    });
    this.ws.on("disconnect", reason => {
      console.log(`WebSocket disconnected: ${reason}`);
    });
    this.ws.on("connect_error", error => {
      console.error("WebSocket connection error:", error);
    });
    this.ws.connect();
  }
  onMail(cb) {
    this.listeners.push(cb);
  }
  async message({
    email = this.email
  } = {}) {
    if (!email) {
      throw new Error("Email address is required to fetch messages.");
    }
    try {
      const [user, domain] = email.split("@");
      const smurl = `${domain?.toLowerCase() || ""}/${user?.replace(/[^a-zA-Z_0-9.-]/g, "").toLowerCase() || ""}`;
      this.cookies["surl"] = smurl;
      const res = await this.client.get(`/${smurl}`);
      const $ = cheerio.load(res.data || "");
      const messages = $(".mail-list-items").map((i, el) => {
        const $el = $(el);
        const from = $el.find(".from_div_45g45gg").text().trim() || "Unknown Sender";
        const subject = $el.find(".subj_div_45g45gg").text().trim() || "No Subject";
        const time = $el.find(".time_div_45g45gg").text().trim() || "Unknown Time";
        const clickGoLink = $el.find('a[href*="clickgo"]').attr("href") || null;
        return {
          from: from,
          subject: subject,
          time: time,
          clickGoLink: clickGoLink
        };
      }).get();
      return messages;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  }
  disconnect() {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
    this.listeners = [];
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const client = new TemporaryMail();
  try {
    switch (action) {
      case "create":
        try {
          const newData = await client.create();
          return res.status(200).json(newData);
        } catch (error) {
          console.error("API Create Error:", error.message);
          return res.status(500).json({
            error: "Failed to create email and UUID.",
            details: error.message
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
          });
        }
        try {
          const messages = await client.message({
            email: params.email
          });
          return res.status(200).json(messages);
        } catch (error) {
          console.error("API Message Error:", error.message);
          return res.status(500).json({
            error: "Failed to retrieve messages.",
            details: error.message
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'create' or 'message'."
        });
    }
  } catch (error) {
    console.error("Internal Server Error in API handler:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  } finally {
    client.disconnect();
  }
}