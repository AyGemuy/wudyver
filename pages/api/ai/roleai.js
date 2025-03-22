import axios from "axios";
class RoleAiChat {
  constructor(baseUrl = "https://roleai.chat", apiKey = "3edc4rfv%TGB^YHNasd") {
    this.url = `${baseUrl}/embed/api/chat`;
    this.params = {
      token: Buffer.from("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxOSwicm9sZSI6ImRlZmF1bHQiLCJpYXQiOjE3MTI2NzE0NDN9.8LToC-AstpAEgUN3-KZ6gpy4RLqm5USdGMHEH2jLOHw").toString("base64"),
      apiKey: Buffer.from(apiKey).toString("base64")
    };
  }
  async sendMessage({
    messages = [],
    prompt = "",
    model = "@cf/meta/llama-3.1-8b-instruct-fp8",
    useStream = true
  }) {
    console.log("📨 Mengirim permintaan ke RoleAi...");
    try {
      const formattedMessages = messages.length ? messages : [{
        role: "user",
        content: prompt
      }];
      const params = {
        ...this.params,
        model: model,
        messages: JSON.stringify(formattedMessages)
      };
      return useStream ? await this._fetchStream(params) : await this._fetchNonStream(params);
    } catch (error) {
      console.error("❌ Gagal mengirim pesan:", error.message);
      return null;
    }
  }
  async _fetchStream(params) {
    try {
      console.log("📡 Mode streaming diaktifkan...");
      const {
        data
      } = await axios.get(this.url, {
        params: params,
        responseType: "stream"
      });
      return new Promise((resolve, reject) => {
        let result = [];
        data.on("data", chunk => this._parseData(chunk.toString(), result));
        data.on("end", () => resolve(result.join("")));
        data.on("error", err => {
          console.error("❌ Kesalahan streaming:", err.message);
          reject(null);
        });
      });
    } catch (error) {
      console.error("❌ Gagal mengambil data stream:", error.message);
      return null;
    }
  }
  async _fetchNonStream(params) {
    try {
      console.log("📡 Mode non-streaming diaktifkan...");
      const {
        data
      } = await axios.get(this.url, {
        params: params
      });
      return this._parseData(data).join("");
    } catch (error) {
      console.error("❌ Gagal mengambil data non-stream:", error.message);
      return null;
    }
  }
  _parseData(data, result = []) {
    try {
      data.split(/\n+/).forEach(line => {
        try {
          let json = JSON.parse(line.slice(5));
          if (json.response && json.response !== "[DONE]") result.push(json.response);
        } catch {}
      });
    } catch (error) {
      console.error("❌ Kesalahan parsing data:", error.message);
    }
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const chat = new RoleAiChat();
  try {
    const data = await chat.sendMessage(params);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}