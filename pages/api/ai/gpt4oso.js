import axios from "axios";
export default async function handler(req, res) {
  const {
    type = "gpt3",
      prompt,
      conversationId = "0b904e9dbc6acd825cfa7b44ec742eee",
      sessionId = "d75e6ea6869cc93abd754f714c944294",
      fileContent
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt || type === "gpt3" && !conversationId || type === "gpt4" && !sessionId) {
    return res.status(400).json({
      error: "Prompt, conversationId (for gpt3), or sessionId (for gpt4) are required"
    });
  }
  const attachments = fileContent ? [{
    fileType: null,
    file: {},
    filePath: "",
    fileContent: fileContent,
    fileName: null,
    fileSize: null,
    fileSizeDisplay: "null",
    fileSuffix: null
  }] : [];
  const headers = {
    "Content-Type": "application/json",
    authorization: "",
    uniqueId: "cc914520d2c78abaa99dbb22eb9ac2d8",
    verify: "",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: "https://gpt4o.so/app/d75e6ea6869cc93abd754f714c944294"
  };
  try {
    const apiUrl = type === "gpt3" ? "https://gpt4oso.erweima.ai/api/v1/gpt4o/gpt35" : type === "gpt4" ? "https://gpt4oso.erweima.ai/api/v1/gpt4o/chat" : null;
    if (!apiUrl) {
      return res.status(400).json({
        error: 'Invalid type, must be "gpt3" or "gpt4"'
      });
    }
    const data = type === "gpt3" ? {
      prompt: prompt,
      conversationId: conversationId
    } : {
      prompt: prompt,
      sessionId: sessionId,
      attachments: attachments
    };
    const response = await axios.post(apiUrl, data, {
      headers: headers
    });
    if (response.status < 200 || response.status >= 300) {
      return res.status(response.status).json({
        error: "Failed to process request",
        details: await response.text()
      });
    }
    const rawData = response.data;
    return res.status(200).json({
      result: rawData
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}