import axios from "axios";
import crypto from "crypto";

function userAgent() {
  const androidVersions = ["4.0.3", "4.1.1", "4.2.2", "4.3", "4.4", "5.0.2", "5.1", "6.0", "7.0", "8.0", "9.0", "10.0", "11.0"],
    deviceModels = ["M2004J19C", "S2020X3", "Xiaomi4S", "RedmiNote9", "SamsungS21", "GooglePixel5"],
    buildVersions = ["RP1A.200720.011", "RP1A.210505.003", "RP1A.210812.016", "QKQ1.200114.002", "RQ2A.210505.003"],
    selectedModel = deviceModels[Math.floor(Math.random() * deviceModels.length)],
    selectedBuild = buildVersions[Math.floor(Math.random() * buildVersions.length)],
    chromeVersion = `Chrome/${Math.floor(80 * Math.random()) + 1}.${Math.floor(999 * Math.random()) + 1}.${Math.floor(9999 * Math.random()) + 1}`;
  return `Mozilla/5.0 (Linux; Android ${androidVersions[Math.floor(Math.random() * androidVersions.length)]}; ${selectedModel} Build/${selectedBuild}) AppleWebKit/537.36 (KHTML, like Gecko) ${chromeVersion} Mobile Safari/537.36 WhatsApp/1.${Math.floor(9 * Math.random()) + 1}.${Math.floor(9 * Math.random()) + 1}`;
}
export default async function handler(req, res) {
  const {
    prompt: message,
    type = "chat",
    assistant
  } = req.method === "GET" ? req.query : req.body;
  try {
    const headers = {
      "User-Agent": userAgent(),
      Referer: "https://chatgpt.bestim.org/chat/",
      "X-Forwarded-For": crypto.randomBytes(4).join(".")
    };
    const data = {
      temperature: .5,
      frequency_penalty: 0,
      type: type,
      messagesHistory: [{
        from: "chatGPT",
        content: assistant || "Saya AI dari OpenAI, diciptakan untuk membantu Anda mengeksplorasi ide, bertukar informasi, dan menyelesaikan masalah. Ada yang bisa saya bantu?"
      }, {
        from: "you",
        content: message
      }],
      message: message
    };
    const response = await axios.post("https://chatgpt.bestim.org/chat/send2/", data, {
      headers: headers
    });
    const result = response.data || (await axios.post("https://chatgpt.bestim.org/chat/send/", data, {
      headers: headers
    })).data;
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    return res.status(500).json({
      error: "Error occurred in TalkAI"
    });
  }
}