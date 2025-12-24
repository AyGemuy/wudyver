import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
class QuizGenerator {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://bitlife.ai",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "application/json",
        Origin: "https://bitlife.ai",
        Pragma: "no-cache",
        Referer: "https://bitlife.ai/AutoBitLife/cdc4fa59-c616-49ce-971a-e4f425f0e617/Quiz_Maker_Assistant",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    }));
    this.run_guid = "cdc4fa59-c616-49ce-971a-e4f425f0e617";
  }
  genGuid() {
    return crypto.randomUUID();
  }
  genTime() {
    const now = new Date();
    const datePart = now.toLocaleDateString("en-CA");
    const timePart = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
    const ampm = now.getHours() >= 12 ? "PM" : "AM";
    return `${datePart} ${timePart} ${ampm}`;
  }
  async generate({
    prompt,
    message,
    chat_session,
    ...rest
  }) {
    const finalMessage = message || prompt;
    if (!finalMessage) {
      return {
        success: false,
        error: true,
        message: "Harap berikan 'prompt' atau 'message'"
      };
    }
    const sessionGuid = chat_session || this.genGuid();
    try {
      console.log("Memulai generate quiz dari BitLife.ai...");
      const payload = {
        BitlifeState: 3,
        automation_run_guid: this.run_guid,
        chat_session_guid: sessionGuid,
        message: finalMessage,
        speakers: 1,
        sectionState: 1,
        userdatetime: this.genTime(),
        ...rest
      };
      const response = await this.client.post("/api/bitlife/chat", payload);
      const data = response.data;
      console.log("Generate quiz BitLife selesai");
      return data;
    } catch (error) {
      console.error("Generate gagal:", error.response?.data || error.message);
      return {
        success: false,
        error: true,
        message: error.response?.data || error.message,
        rawError: error.response?.data
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new QuizGenerator();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}