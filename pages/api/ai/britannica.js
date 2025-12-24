import axios from "axios";
class BritannicaClient {
  constructor() {
    this.baseURL = "https://www.britannica.com/chat-api";
    this.sessionId = null;
    this.conversationId = null;
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        priority: "u=1, i",
        referer: "https://www.britannica.com/chatbot",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async ensureSession() {
    if (!this.sessionId) {
      console.log("Checking or creating session...");
      try {
        const response = await this.axios.get("/session/check", {
          headers: {
            "session-id": ""
          }
        });
        this.sessionId = response.data.session_id;
        console.log(`Session started. Session ID: ${this.sessionId}`);
      } catch (error) {
        throw new Error("Failed to start session.");
      }
    }
    if (!this.conversationId) {
      console.log("Creating new conversation...");
      try {
        const data = {
          article_id: "-1"
        };
        const response = await this.axios.post("/conversations/conversation/", data, {
          headers: {
            "content-type": "application/json",
            "session-id": this.sessionId
          }
        });
        this.conversationId = response.data.id;
        console.log(`Conversation created. Conversation ID: ${this.conversationId}`);
      } catch (error) {
        throw new Error("Failed to create conversation.");
      }
    }
  }
  async chat({
    prompt,
    messages,
    ...options
  }) {
    await this.ensureSession();
    const payloadContent = prompt ? {
      message_type: "text_message",
      text_message: prompt
    } : {
      message_type: "text_message",
      text_message: messages[0].content
    };
    console.log(`Sending message: "${payloadContent.text_message}"`);
    let runId;
    try {
      const data = {
        article_id: "-1",
        role: "user",
        content: payloadContent,
        action: "run",
        retry_status: "standard"
      };
      const response = await this.axios.post(`/conversations/${this.conversationId}/messages/`, data, {
        headers: {
          "content-type": "application/json",
          "session-id": this.sessionId
        }
      });
      runId = response.data.run_id;
      console.log(`Message sent. Run ID: ${runId}`);
    } catch (error) {
      throw new Error("Failed to send message.");
    }
    console.log("Waiting for AI response...");
    try {
      const response = await this.axios.get(`/conversations/${this.conversationId}/messages/${runId}/feed`, {
        headers: {
          accept: "text/event-stream",
          "session-id": this.sessionId
        }
      });
      const parsedData = this.parseData(response.data);
      console.log("\n--- Langkah-langkah Proses API ---");
      parsedData.allSteps.forEach(step => {
        console.log(`- ${step.name}:`, step.content);
      });
      console.log("\n--- Respon Akhir ---");
      console.log(parsedData.responseText);
      if (parsedData.suggestedQuestions.length > 0) {
        console.log("\nSuggested questions:", parsedData.suggestedQuestions.map(q => `"${q}"`).join(", "));
      }
      return parsedData;
    } catch (error) {
      throw new Error("Failed to get response.");
    }
  }
  parseData(rawData) {
    let fullResponseText = "";
    let suggestedQuestions = [];
    const allSteps = [];
    const lines = rawData.split("\n").filter(line => line.startsWith("data:"));
    for (const line of lines) {
      try {
        const data = JSON.parse(line.substring(5));
        if (data.name) {
          allSteps.push({
            name: data.name,
            content: data.content
          });
        }
        if (data.role === "assistant" && data.name === "grounded_response" && data.content) {
          fullResponseText += data.content;
        } else if (data.content && typeof data.content.follow_up_questions !== "undefined") {
          suggestedQuestions = data.content.follow_up_questions;
        }
      } catch (error) {}
    }
    return {
      result: fullResponseText,
      suggest: suggestedQuestions,
      step: allSteps
    };
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
    const client = new BritannicaClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}