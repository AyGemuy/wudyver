import fetch from "node-fetch";
async function Lenna(content) {
  const url = "https://v3.lenna.ai/app/public/api/negxZa/webhook/webchat";
  const payload = {
    senderId: "ADE3Pz",
    message: {
      temporary_id: Date.now().toString(),
      id: Date.now().toString(),
      messageable_id: 5945615,
      messageable_type: "user",
      created_at: null,
      content: [{
        type: "text",
        text: content,
        speech: content
      }]
    },
    events: "message",
    integrationId: "PdR7Oe"
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "X-LENNA-WEBCHAT": "noNL/5yySRsW9tugZfOM3WxTZTum59GvwUrUh3FvDec=",
        "X-LENNA-ROBOT": "vSaaWvqDtfod4USiM7agLg==",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://lenna.ai/"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data.bot.message.original.data.message.content[0].text || data.bot.message.original.data.message.content.nlp[0].text || "No response";
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await Lenna(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}