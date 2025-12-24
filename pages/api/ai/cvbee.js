import fetch from "node-fetch";
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
export default async function handler(req, res) {
  const {
    prompt,
    sessionId = "f056f1be76d0f242fb751661cacee195",
    fileContent = null
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).send("Missing required parameters.");
  }
  try {
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
    const response = await fetch("https://autosite.erweima.ai/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "",
        uniqueId: "57304d90fe3471e561a563f150e61349",
        verify: "",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://cvbee.ai/id/app/f056f1be76d0f242fb751661cacee195"
      },
      body: JSON.stringify({
        prompt: prompt,
        sessionId: sessionId,
        attachments: attachments
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }
    const rawData = await response.text();
    return res.status(200).json({
      result: extractData(rawData)
    });
  } catch (error) {
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
}