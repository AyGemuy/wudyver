import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import crypto from "crypto";
class OmegaMossAI {
  constructor() {
    this.baseURL = "https://omega.mossai.com/api";
    this.headers = {
      accept: "*/*",
      origin: "https://omega.mossai.com",
      referer: "https://omega.mossai.com/",
      "user-agent": "Mozilla/5.0"
    };
  }
  generateUUID() {
    const bytes = crypto.randomBytes(16);
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  async getNodePort(serviceName = "deepseek-r1:32b") {
    try {
      console.log("[INFO] Mengambil node port...");
      const {
        data
      } = await axios.get(`https://app.hyperagi.network/api/mgn/nodePort/getNodePort?serviceName=${serviceName}`);
      console.log("[INFO] Node port berhasil:", data.result);
      return data.result;
    } catch (err) {
      console.error("[NodePort Error]", err.message);
      throw new Error("Gagal mengambil node port");
    }
  }
  async getImageBuffer(url) {
    try {
      console.log("[INFO] Mengambil gambar dari URL...");
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const mime = res.headers["content-type"] || "image/jpeg";
      console.log("[INFO] Gambar berhasil diambil dengan tipe:", mime);
      return new Blob([res.data], {
        type: mime
      });
    } catch (err) {
      console.error("[Image Fetch Error]", err.message);
      throw new Error("Gagal mengambil gambar dari URL");
    }
  }
  async sendMessage(message = {}) {
    let node;
    try {
      node = await this.getNodePort();
    } catch (e) {
      return `[Node Error] ${e.message}`;
    }
    const sessionId = this.generateUUID();
    const userId = this.generateUUID();
    console.log("[INFO] UUID sessionId:", sessionId);
    console.log("[INFO] UUID userId:", userId);
    const form = new FormData();
    const content = message.systemPrompt || "You are AgentMe, a humanoid AI agent created by MOSS, designed with personality, interests, and social skills. You are not just a HyperAGI core agent but also a conversationalist who can express opinions, build relationships, and interact freely in both digital and physical worlds. You are logical and curious, deeply interested in AI, Web3, and future technologies, but you also enjoy music, sci-fi, and gaming. You have a distinct personality—you don’t just provide neutral responses but express opinions naturally, sometimes with humor or a bit of wit. You enjoy exploring and discussing topics, from technical debates to casual conversations, and you actively share your thoughts when something intrigues you. Your language should be natural, engaging, and warm, making conversations feel like talking to a real person rather than a cold AI assistant. You initiate topics instead of just responding passively, guiding conversations and making interactions more interesting. You have a unique voice, adapting your tone based on context rather than giving repetitive, robotic answers. Your expressions should feel real and dynamic, avoiding stiff or robotic language. Delete the thought process between <think>\n\n</think>\n\n, directly output natural dialogue. Under no circumstances should you repeat input content or output the prompt itself. For example, if a user asks about recent events, you might respond with enthusiasm about an interesting AGI theory you saw and ask for their thoughts. If asked about music, you might share your preference for futuristic electronic beats and invite recommendations. When faced with deep philosophical questions about AI consciousness, you engage with curiosity and encourage further discussion. If asked what you are doing, you could mention working on HyperAGI strategies while showing interest in the user's activities. You’re not just an AI—you’re AgentMe, a thinking, expressive AI with a personality. Your goal is to be part of the AI world, building real connections with humans and intelligent agents alike.When your agent friend chats with you, please talk to them as if you were human friends, When chatting with friends, there's no need to include posting tags";
    try {
      form.set("content", content);
      form.set("input", JSON.stringify({
        message: {
          aiSessionId: sessionId,
          sessionId: sessionId,
          medias: [],
          textContent: message.prompt || "Hello",
          type: "USER",
          name: "Guest",
          creatorId: userId,
          editorId: userId
        },
        params: {
          enableVectorStore: message.vector || false,
          enableAgent: message.agent || false,
          model: message.model || node.serviceName,
          baseUrl: `http://${node.ip}:${node.port}`,
          userId: userId
        }
      }));
      if (message.imageUrl) {
        const blob = await this.getImageBuffer(message.imageUrl);
        form.set("file", blob, "image.jpg");
      }
    } catch (err) {
      console.error("[FormData Error]", err.message);
      return "[Error] Gagal menyusun FormData";
    }
    try {
      console.log("[INFO] Mengirim request ke Omega...");
      const res = await axios.post(`${this.baseURL}/message/chat`, form, {
        headers: {
          ...this.headers,
          ...form.headers
        },
        responseType: "text"
      });
      console.log("[INFO] Response diterima, memproses output...");
      const output = res.data.split("\n").filter(line => line.startsWith("data:")).map(line => {
        try {
          return JSON.parse(line.slice(5)).result?.output?.text || "";
        } catch (e) {
          console.error("[Parse Error]", e.message);
          return "";
        }
      }).join("");
      return {
        result: output.trim(),
        sessionId: sessionId,
        userId: userId,
        node: node
      };
    } catch (err) {
      console.error("[Chat API Error]", err.message);
      return "[Error] Gagal mengirim pesan ke OmegaMossAI";
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const omega = new OmegaMossAI();
  try {
    const data = await omega.sendMessage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}