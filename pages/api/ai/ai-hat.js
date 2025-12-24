import axios from "axios";
class Hat {
  constructor() {
    this.baseUrl = "https://hat.baby/api/";
    this.headers = {
      "Content-Type": "application/json"
    };
  }
  async fetchData(endpoint, data) {
    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }
  getSources = async question => await this.fetchData("getSources", {
    question: question
  });
  getSimilarQuestions = async question => await this.fetchData("getSimilarQuestions", {
    question: question
  });
  getAnswer = async (question, sources) => await this.fetchData("getAnswer", {
    question: question,
    sources: sources
  });
  main = async question => {
    try {
      const [sources, similarQuestions, answer] = await Promise.all([this.getSources(question), this.getSimilarQuestions(question), this.getAnswer(question, await this.getSources(question))]);
      const chatResult = answer.split("\n").map(line => {
        try {
          return JSON.parse(line.replace("data: ", "")).text;
        } catch {
          return "";
        }
      }).join("");
      return {
        similarQuestions: similarQuestions,
        sources: sources,
        chatResult: chatResult
      };
    } catch (error) {
      throw error;
    }
  };
}
export default async function handler(req, res) {
  const {
    question
  } = req.method === "GET" ? req.query : req.body;
  if (!question) {
    return res.status(400).json({
      error: "Paramenter 'question' is required"
    });
  }
  try {
    const hat = new Hat();
    const result = await hat.main(question);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}