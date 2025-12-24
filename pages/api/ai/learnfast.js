import axios from "axios";
const extractData = input => {
  return input.split("\n").filter(line => line.startsWith("{")).map(line => {
    try {
      const json = JSON.parse(line.trim());
      return json.data.message || "";
    } catch {
      return "";
    }
  }).join("").trim();
};
class AutoSiteChat {
  constructor(uniqueId, sessionId) {
    if (!uniqueId || !sessionId) {
      throw new Error("Paramenter 'uniqueId' dan 'sessionId' diperlukan.");
    }
    this.apiUrl = "https://autosite.erweima.ai/api/v1/chat";
    this.headers = {
      "Content-Type": "application/json",
      authorization: "",
      verify: "",
      uniqueId: uniqueId,
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: `https://learnfast.ai/id/app/${sessionId}`
    };
    this.sessionId = sessionId;
  }
  async sendMessage(prompt, fileData) {
    if (!prompt) {
      throw new Error("Paramenter 'prompt' diperlukan.");
    }
    const data = {
      prompt: prompt,
      sessionId: this.sessionId,
      attachments: [{
        fileType: fileData?.fileType || "image/png",
        file: fileData?.file || {},
        filePath: fileData?.filePath || "",
        fileContent: fileData?.fileContent || "",
        fileName: fileData?.fileName || "file.png",
        fileSize: fileData?.fileSize || 0,
        fileSizeDisplay: fileData?.fileSizeDisplay || "0 KB",
        fileSuffix: fileData?.fileSuffix || "png"
      }]
    };
    try {
      const response = await axios.post(this.apiUrl, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengirim pesan: ${error.response?.data || error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt = "hai",
      uniqueId = "57304d90fe3471e561a563f150e61349",
      sessionId = "178cf058f288e8fa5c88ebebdc7300d5",
      fileType,
      fileContent,
      filePath,
      fileName,
      fileSize,
      fileSizeDisplay,
      fileSuffix
  } = req.method === "GET" ? req.query : req.body;
  const fileData = {
    fileType: fileType,
    fileContent: fileContent,
    filePath: filePath,
    fileName: fileName,
    fileSize: fileSize,
    fileSizeDisplay: fileSizeDisplay,
    fileSuffix: fileSuffix
  };
  const autoSite = new AutoSiteChat(uniqueId, sessionId);
  try {
    const result = await autoSite.sendMessage(prompt, fileData);
    return res.status(200).json({
      result: extractData(result)
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}