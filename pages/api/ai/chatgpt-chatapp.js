import MD5 from "crypto-js/md5.js";
import axios from "axios";
class ChatAPI {
  constructor(keyToken = "XXXXXXYYY", ipLang = null) {
    this.keyToken = keyToken;
    this.siteURL = "https://chatgptchatapp.com";
    this.apiURL = this.siteURL + "/api";
    this.ipLang = ipLang;
    this.lang = "en";
    this.vip = null;
    this.ypp = null;
    this.timestampResponse = null;
  }
  nonce() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(e) {
      const t = Math.random() * 16 | 0;
      return (e === "x" ? t : t & 3 | 8).toString(16);
    });
  }
  generateID({
    timestamp,
    messages,
    nonce
  }) {
    const content = messages[timestamp % messages.length]?.content?.trim() || "";
    const str = `timestamp${timestamp}nonce${nonce}messages${content}keyToken${this.keyToken}vv1`;
    return MD5(str).toString();
  }
  async fetchHTML(url) {
    try {
      const res = await axios.get(url);
      return res.data;
    } catch (error) {
      console.error("Fetch HTML failed:", error.message);
      throw error;
    }
  }
  extract(html, regex) {
    const match = html.match(regex);
    return match?.[1] || null;
  }
  async init(url) {
    try {
      const html = await this.fetchHTML(url);
      this.lang = this.ipLang || this.extract(html, /const lang = "([^"]+)"/) || "en";
      this.vip = this.extract(html, /const vip = "([^"]+)"/);
      this.ypp = this.extract(html, /const ypp = "([^"]+)"/);
    } catch (error) {
      console.error("Init failed:", error.message);
      throw error;
    }
  }
  async getTimestamp(href) {
    try {
      const url = `${this.apiURL}/get-timestamp?href=${encodeURIComponent(href)}&ypp=${this.ypp}`;
      const res = await axios.get(url);
      this.timestampResponse = res.data;
      return {
        timestamp: res.data?.timestamp,
        lang: res.data?.ipInfo?.lang,
        href: res.data?.href
      };
    } catch (error) {
      console.error("Get timestamp failed:", error.message);
      throw error;
    }
  }
  async sendMessage(input) {
    try {
      const timestampData = await this.getTimestamp(input.url || this.siteURL);
      const timestamp = timestampData.timestamp;
      const nonceValue = this.nonce();
      const id = this.generateID({
        timestamp: timestamp,
        messages: input.messages,
        nonce: nonceValue
      });
      const payload = {
        id: id,
        timestamp: timestamp,
        nonce: nonceValue,
        messages: input.messages,
        url: this.siteURL,
        isAuthCheck: "",
        modal: null,
        vip: this.vip,
        lang: this.lang,
        uId: ""
      };
      const res = await axios.post(this.apiURL, payload, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          referer: this.siteURL
        }
      });
      return res.headers["content-type"]?.includes("text/event-stream") ? this.parseChatResponse(res.data) : res.data;
    } catch (error) {
      console.error("Send message failed:", error.message);
      throw error;
    }
  }
  parseChatResponse(responseData) {
    return responseData.split("\n").filter(function(line) {
      return line.startsWith("data:");
    }).reduce(function(acc, dataLine) {
      try {
        const jsonData = JSON.parse(dataLine.slice(6).trim());
        const text = jsonData?.choices?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          acc.result += text;
        }
      } catch (error) {
        console.warn("Failed to parse JSON:", dataLine.slice(6).trim(), error.message);
      }
      return acc;
    }, {
      result: ""
    });
  }
  async chat({
    prompt,
    messages,
    model
  }) {
    await this.init(this.siteURL);
    try {
      const timestampData = await this.getTimestamp(this.siteURL);
      const timestamp = timestampData.timestamp;
      const nonceValue = this.nonce();
      let messagesToSend = [];
      if (prompt) {
        messagesToSend = [{
          role: "user",
          content: prompt,
          timestamp: Date.now(),
          thoughts: null,
          attachments: "",
          toolNameHints: [],
          functionCall: "",
          dataAdd: "",
          model: model || null
        }];
      } else if (messages && Array.isArray(messages) && messages.length > 0) {
        messagesToSend = messages;
      } else {
        throw new Error("Paramenter 'prompt' atau 'messages' harus diberikan.");
      }
      const id = this.generateID({
        timestamp: timestamp,
        messages: messagesToSend,
        nonce: nonceValue
      });
      const payload = {
        id: id,
        timestamp: timestamp,
        nonce: nonceValue,
        messages: messagesToSend,
        url: this.siteURL,
        isAuthCheck: "",
        modal: null,
        vip: this.vip,
        lang: this.lang,
        uId: ""
      };
      const res = await axios.post(this.apiURL, payload, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          referer: this.siteURL
        }
      });
      return res.headers["content-type"]?.includes("text/event-stream") ? this.parseChatResponse(res.data) : res.data;
    } catch (error) {
      console.error("Chat method failed:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const chatAPI = new ChatAPI();
    const response = await chatAPI.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}