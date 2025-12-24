import axios from "axios";
class WonderaApiClient {
  constructor() {
    this.baseURL = "https://www.wondera.ai/v1";
    this.authToken = undefined;
    this.characters = [];
  }
  async guestLogin() {
    try {
      const res = await axios.post(`${this.baseURL}/auth/guest_login`, {
        guest_id: ""
      }, {
        headers: {
          accept: "application/json",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "application/json;charset=UTF-8",
          origin: "https://www.wondera.ai",
          referer: "https://www.wondera.ai/?utm_source=freeaitool.ai",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      this.authToken = res.data.data.token;
      return res.data;
    } catch (e) {
      console.error("Login error:", e.response?.data?.msg || e.message);
      throw new Error(`Login failed: ${e.response?.data?.msg || e.message}`);
    }
  }
  async getAgents(page = 1, pageSize = 10) {
    try {
      if (!this.authToken) await this.guestLogin();
      const res = await axios.get(`${this.baseURL}/singer/agent_list`, {
        params: {
          page: page,
          page_size: pageSize
        },
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          authorization: `Bearer ${this.authToken}`,
          referer: "https://www.wondera.ai/?utm_source=freeaitool.ai",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      this.characters = res.data.data.items;
      return res.data;
    } catch (e) {
      console.error("Fetch agents error:", e.response?.data?.msg || e.message);
      throw new Error(`Failed to get agent list: ${e.response?.data?.msg || e.message}`);
    }
  }
  getChar(index) {
    try {
      return index >= 0 && index < this.characters.length ? this.characters[index] : undefined;
    } catch (e) {
      console.error("Get char error:", e.message);
      throw new Error(`Failed to retrieve character: ${e.message}`);
    }
  }
  displayChars() {
    try {
      if (this.characters.length === 0) {
        console.log("No characters available.");
        return;
      }
      this.characters.forEach((char, index) => console.log(`${index}: ${char.name}`));
    } catch (e) {
      console.error("Display chars error:", e.message);
    }
  }
  parseRes(text) {
    const data = [];
    const lines = text.split("\n");
    lines.forEach(line => {
      if (line.startsWith("data: ")) {
        try {
          data.push(JSON.parse(line.slice(6)));
        } catch (e) {
          console.warn("JSON parse warning:", e, "Line:", line);
        }
      }
    });
    return data;
  }
  async chat({
    prompt = "Kamu siapa?",
    char_index = 0,
    deep_compose = "N",
    ...rest
  }) {
    try {
      if (!this.authToken) await this.guestLogin();
      if (this.characters.length === 0) await this.getAgents();
      const selChar = this.getChar(char_index);
      if (!selChar) {
        this.displayChars();
        throw new Error(`Invalid character index: ${char_index}.`);
      }
      const {
        singer_library_id: charId,
        name: charName
      } = selChar;
      const payload = {
        singer_library_id: charId,
        input: prompt,
        message: prompt,
        deep_compose: deep_compose,
        ...rest
      };
      const res = await axios.post(`${this.baseURL}/co_creation/send_message`, payload, {
        headers: {
          accept: "text/event-stream",
          "accept-language": "id-ID,id;q=0.9",
          authorization: `Bearer ${this.authToken}`,
          "content-type": "application/json",
          origin: "https://www.wondera.ai",
          referer: "https://www.wondera.ai/?utm_source=freeaitool.ai",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      const parsedData = this.parseRes(res.data);
      let result = {
        id: charId,
        name: charName
      };
      parsedData.forEach(item => {
        if (item.msg_type === "StatusMsg") {
          result.status = item.data;
        } else if (item.msg_type === "TextMsg") {
          result.text = item.data;
        }
      });
      return result;
    } catch (e) {
      console.error("Chat error:", e.response?.data?.msg || e.message);
      throw new Error(`Chat failed for ${selChar?.name || "unknown character"}: ${e.response?.data?.msg || e.message}`);
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
    const client = new WonderaApiClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}