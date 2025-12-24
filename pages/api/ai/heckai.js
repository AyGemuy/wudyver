import axios from "axios";
class HeckAI {
  constructor() {
    this.baseURL = "https://api.heckai.weight-wave.com/api/ha/v1";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: "",
      "content-type": "application/json",
      origin: "https://heck.ai",
      referer: "https://heck.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.modelList = {
      1: "google/gemini-2.0-flash-001",
      2: "deepseek/deepseek-r1",
      3: "openai/gpt-4o-mini"
    };
  }
  parseData(input) {
    const get = (start, end) => {
      const lines = input.split("\n").map(line => {
        const content = line.slice(6);
        return content ? content : "\n";
      });
      const i = lines.indexOf(start),
        j = lines.indexOf(end);
      return i >= 0 && j > i ? lines.slice(i + 1, j).join("") : null;
    };
    const answer = get("[ANSWER_START]", "[ANSWER_DONE]");
    const related = get("[RELATE_Q_START]", "[RELATE_Q_DONE]");
    let source = [];
    try {
      source = JSON.parse(get("[SOURCE_START]", "[SOURCE_DONE]") || "[]");
    } catch {}
    return {
      answer: answer,
      related: related,
      source: source
    };
  }
  async create(question) {
    try {
      const slugTitle = `${question?.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
      const {
        data
      } = await axios.post(`${this.baseURL}/session/create`, {
        title: slugTitle
      }, {
        headers: this.headers
      });
      return data?.id || data?.sessionId;
    } catch (err) {
      console.error(`Error creating session: ${err.message}`);
      throw new Error(`Failed to create session: ${err.message}`);
    }
  }
  async chat({
    model = 1,
    lang = "English",
    prev_answer = null,
    prev_question = null,
    prompt: question,
    sessionId = null,
    search = false
  }) {
    try {
      const modelName = this.modelList[model];
      if (!modelName) {
        throw new Error(`Model not found. Available models: ${Object.entries(this.modelList).map(([ i, name ]) => `${i}. ${name}`).join("\n")}`);
      }
      const endpoint = search ? "search" : "chat";
      const finalSessionId = sessionId || await this.create(question);
      const requestData = {
        model: modelName,
        question: question,
        language: lang,
        sessionId: finalSessionId,
        ...prev_question && {
          previousQuestion: prev_question
        },
        ...prev_answer && {
          previousAnswer: prev_answer
        }
      };
      Object.keys(requestData).forEach(key => {
        if (requestData[key] === null || requestData[key] === undefined) {
          delete requestData[key];
        }
      });
      const response = await axios.post(`${this.baseURL}/${endpoint}`, requestData, {
        headers: this.headers
      });
      console.log(`Processed ${endpoint} successfully!`);
      return {
        ...this.parseData(response.data),
        sessionId: finalSessionId
      };
    } catch (err) {
      console.error(`Error in chat: ${err.message}`);
      if (err.response) {
        console.error(`Server error: ${err.response.status} - ${err.response.data}`);
      }
      throw new Error(`Failed to execute chat: ${err.message}`);
    }
  }
  setAuthorization(token) {
    this.headers.authorization = token;
    return this;
  }
  getModels() {
    return Object.entries(this.modelList).map(([id, name]) => ({
      id: parseInt(id),
      name: name
    }));
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
    const api = new HeckAI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}