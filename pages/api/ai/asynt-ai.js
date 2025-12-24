import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AsyntAIChat {
  constructor() {
    this.sessionId = `session_${Math.random().toString(36).substr(2, 12)}`;
  }
  async chat({
    prompt,
    session_id = this.sessionId,
    ...rest
  }) {
    try {
      console.log("Mengirim chat dengan session:", this.sessionId);
      const requestData = {
        widget_id: "asyntai_2bcd9dfbae24",
        message: prompt,
        session_id: session_id,
        ...rest
      };
      console.log("Request data:", requestData);
      const headers = {
        "Content-Type": "application/json",
        Cookie: `sessionid=${Math.random().toString(36).substr(2, 16)}`,
        Referer: "https://asyntai.com/",
        ...SpoofHead()
      };
      const response = await axios.post("https://asyntai.com/api/widget-chat/", requestData, {
        headers: headers
      });
      console.log("Response berhasil diterima");
      return response.data;
    } catch (error) {
      console.error("Error dalam chat:", error.message);
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
    const chat = new AsyntAIChat();
    const response = await chat.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}