import axios from "axios";
class AskMe {
  constructor() {
    this.cfg = {
      baseURL: "https://askme.matlubapps.com/",
      timeout: 6e4,
      headers: {
        "Content-Type": "application/json",
        key: "ak8asda9$5kpq"
      },
      model: "gpt_4__1_nano"
    };
    this.history = [];
    this.api = axios.create({
      baseURL: this.cfg.baseURL,
      timeout: this.cfg.timeout,
      headers: this.cfg.headers
    });
  }
  async _resolve({
    media
  }) {
    if (!media) return "";
    console.log(`[Process] Resolving media... Type: ${typeof media}`);
    try {
      if (Buffer.isBuffer(media)) {
        console.log(`[Process] Media is Buffer. Converting to Base64...`);
        return media.toString("base64");
      }
      if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          console.log(`[Process] Media is URL. Downloading from: ${media}`);
          const response = await axios.get(media, {
            responseType: "arraybuffer"
          });
          const base64 = Buffer.from(response.data).toString("base64");
          console.log(`[Process] Download success. Size: ${response.data.length} bytes.`);
          return base64;
        }
        if (media.startsWith("data:")) {
          console.log(`[Process] Media is DataURI. Stripping prefix...`);
          return media.split(",")[1];
        }
        console.log(`[Process] Media assumed as Raw Base64.`);
        return media;
      }
    } catch (error) {
      console.error(`[Error] Failed to resolve media: ${error.message}`);
      return "";
    }
    return "";
  }
  async _sanitize() {
    console.log(`[Process] Sanitizing history (Count: ${this.history.length})...`);
    try {
      const sanitized = await Promise.all(this.history.map(async (msg, index) => {
        let rawBase64 = "";
        if (msg.data) {
          console.log(`[Process] Processing media for history item #${index} (${msg.role})...`);
          rawBase64 = await this._resolve({
            media: msg.data
          });
        }
        return {
          role: msg.role,
          content: msg.content,
          data: rawBase64
        };
      }));
      this.history = sanitized;
      console.log(`[Process] History sanitized successfully.`);
      return this.history;
    } catch (error) {
      console.error(`[Error] Sanitizing history failed: ${error.message}`);
      throw error;
    }
  }
  async chat({
    prompt,
    media = null,
    ...rest
  }) {
    try {
      console.log(`\n--- [Start] Send Message ---`);
      console.log(`[Input] Prompt: "${prompt.substring(0, 30)}..."`);
      this.history.push({
        role: "user",
        content: prompt,
        data: media
      });
      await this._sanitize();
      const currentModel = rest.model || this.cfg.model;
      const payload = {
        history: this.history,
        isPremium: rest.isPremium || false,
        modelname: currentModel
      };
      console.log(`[Request] Payload ready. Model: ${currentModel}, History Length: ${this.history.length}`);
      console.log(`[Request] POST ${this.cfg.baseURL}ask-me...`);
      const response = await this.api.post("ask-me", payload);
      console.log(`[Response] Status: ${response.status} ${response.statusText}`);
      console.log(`[Response] Data:`, JSON.stringify(response.data, null, 2));
      const data = response.data;
      if (data && (data.msg || data.text)) {
        const botReply = data.msg || data.text;
        console.log(`[Process] Bot Reply: "${botReply.substring(0, 30)}..."`);
        this.history.push({
          role: "assistant",
          content: botReply,
          data: ""
        });
        console.log(`--- [Success] End Message ---\n`);
        return data;
      } else {
        throw new Error("Server returned empty 'msg' or 'text'.");
      }
    } catch (error) {
      console.error(`\n[Error] Transaction Failed!`);
      if (error.response) {
        console.error(`[Error] Server Response: ${error.response.status}`);
        console.error(`[Error] Body:`, error.response.data);
      } else if (error.request) {
        console.error(`[Error] No response received from server.`);
      } else {
        console.error(`[Error] Message: ${error.message}`);
      }
      console.log(`[Process] Rolling back history (Removing last item)...`);
      this.history.pop();
      console.log(`--- [Failed] End Message ---\n`);
      throw error;
    }
  }
  addHistory({
    role,
    content,
    media = null
  }) {
    this.history.push({
      role: role,
      content: content,
      data: media
    });
    console.log(`[History] Added manual item (${role}). Total: ${this.history.length}`);
  }
  getHistory() {
    return this.history;
  }
  clearHistory() {
    this.history = [];
    console.log(`[History] Cleared.`);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AskMe();
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