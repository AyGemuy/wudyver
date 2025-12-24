import axios from "axios";
class ChatfaiAPI {
  constructor(authToken) {
    this.client = axios.create({
      baseURL: "https://api.chatfai.com/v1",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
        origin: "https://chatfai.com",
        referer: "https://chatfai.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async getConversationId(characterId = "zJRCoXBaX53HLo3FtuNb") {
    try {
      const response = await this.client.post("/conversations", {
        characters: [characterId]
      });
      return response.data?.id;
    } catch (error) {
      console.error("Error saat mendapatkan ID percakapan:", error);
      throw new Error("Gagal mendapatkan ID percakapan.");
    }
  }
  async sendMessage(conversationId = "ZzsWq8XaiS0nJVbfTocM", content) {
    try {
      const response = await this.client.post(`/conversations/${conversationId}/messages`, {
        content: content
      });
      return response.data?.id;
    } catch (error) {
      console.error("Error saat mengirim pesan:", error);
      throw new Error("Gagal mengirim pesan.");
    }
  }
  async getMessages(conversationId = "ZzsWq8XaiS0nJVbfTocM", count = 10) {
    try {
      const response = await this.client.get(`/conversations/${conversationId}/messages`, {
        params: {
          count: count
        }
      });
      return response.data?.data;
    } catch (error) {
      console.error("Error saat mendapatkan pesan:", error);
      throw new Error("Gagal mendapatkan pesan.");
    }
  }
  async waitForLatestMessage(conversationId = "ZzsWq8XaiS0nJVbfTocM", currentMessageId, timeout = 1e4) {
    try {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const messages = await this.getMessages(conversationId);
        if (messages?.length && messages[0].id !== currentMessageId) {
          return messages[0];
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      throw new Error(`Pesan baru tidak ditemukan dalam batas waktu.`);
    } catch (error) {
      console.error("Error saat menunggu pesan terbaru:", error);
      throw new Error("Gagal menunggu pesan terbaru.");
    }
  }
  async sendAndRetrieve(prompt, characterId = "zJRCoXBaX53HLo3FtuNb", timeout = 1e4) {
    try {
      const conversationId = await this.getConversationId(characterId);
      const currentMessageId = await this.sendMessage(conversationId, prompt);
      const latestMessage = await this.waitForLatestMessage(conversationId, currentMessageId, timeout);
      return latestMessage;
    } catch (error) {
      console.error("Error dalam sendAndRetrieve:", error);
      throw new Error("Gagal dalam pengambilan pesan.");
    }
  }
  async searchCharacters(query, perPage = 20) {
    try {
      const response = await this.client.get(`/characters/search`, {
        params: {
          q: query,
          per_page: perPage
        }
      });
      return response.data?.data;
    } catch (error) {
      console.error("Error saat mencari karakter:", error);
      throw new Error("Gagal mencari karakter.");
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action = "chat",
        prompt,
        cid: characterId,
        timeout,
        query
    } = req.method === "GET" ? req.query : req.body;
    if (!action) {
      return res.status(400).json({
        error: "action diperlukan."
      });
    }
    const authToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImMwYTQwNGExYTc4ZmUzNGM5YTVhZGU5NTBhMjE2YzkwYjVkNjMwYjMiLCJ0eXAiOiJKV1QifQ.eyJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9jaGF0ZmFpLXNiIiwiYXVkIjoiY2hhdGZhaS1zYiIsImF1dGhfdGltZSI6MTczNTc1NjE0NywidXNlcl9pZCI6Inh3SFFtSk53aFRUWVE1T21JVzdDT0w4NlhYbTIiLCJzdWIiOiJ4d0hRbUpOd2hUVFlRNU9tSVc3Q09MODZYWG0yIiwiaWF0IjoxNzM1NzU2MTQ3LCJleHAiOjE3MzU3NTk3NDcsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnt9LCJzaWduX2luX3Byb3ZpZGVyIjoiYW5vbnltb3VzIn19.V5VGzvRELxFWNbFVHvKtI1iLtJXd4CmZsQstTR3Lxg2L3IBK8DqpK6-4EdiGAcMxocCvhvas98sEqFpL7ZUkTJd17JUAohrjETZZ2y0ZdTdGAJAAli9Ntgs5EJwLXbMevcq6_ejhgu4Elv0UYT705mHaaaglb9W2A0Bf_1cQ0heFZ3LnyFjz1X2ngV69MlkmW4VpZwgg1kGWnpKkpn1deA0PRcNhKL5VvBoGsgLz9tjr51smOBSvjoWUHGKQH5jx87VJfVTmy5-AOZI9m73-lSr2CGdQg9VAiL57J_QjBPmprtc-_NZj4BCkJ-YIfmGp0raIhCGhVom5sCUB-5q5nQ";
    if (!authToken) {
      return res.status(500).json({
        error: "CHATFAI_API_TOKEN tidak ditemukan dalam environment."
      });
    }
    const api = new ChatfaiAPI(authToken);
    if (action === "search") {
      if (!query) {
        return res.status(400).json({
          error: "query diperlukan untuk pencarian."
        });
      }
      const searchResults = await api.searchCharacters(query);
      return res.status(200).json({
        success: true,
        results: searchResults
      });
    }
    if (action === "chat" && prompt) {
      const latestMessage = await api.sendAndRetrieve(prompt, characterId || "zJRCoXBaX53HLo3FtuNb", timeout || 1e4);
      return res.status(200).json({
        success: true,
        message: latestMessage
      });
    }
    return res.status(400).json({
      error: "Aksi tidak dikenal."
    });
  } catch (error) {
    console.error("Error dalam handler:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}