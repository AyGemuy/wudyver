import fetch from "node-fetch";
async function AllyfyChat(content) {
  try {
    const url = "https://chatbot.allyfy.chat/api/v1/message/stream/super/chat";
    const headers = {
      Accept: "text/event-stream",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json;charset=utf-8",
      DNT: "1",
      Origin: "https://www.allyfy.chat",
      Priority: "u=1, i",
      Referer: "https://www.allyfy.chat/",
      Referrer: "https://www.allyfy.chat",
      "Sec-CH-UA": '"Not/A)Brand";v="8", "Chromium";v="126"',
      "Sec-CH-UA-Mobile": "?0",
      "Sec-CH-UA-Platform": '"Linux"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    };
    const body = JSON.stringify({
      messages: [{
        content: content,
        role: "user"
      }],
      content: content,
      baseInfo: {
        clientId: "q08kdrde1115003lyedfoir6af0yy531",
        pid: "38281",
        channelId: "100000",
        locale: "en-US",
        localZone: 180,
        packageName: "com.cch.allyfy.webh"
      }
    });
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.text();
    const result = data.trim().split("\n").map(line => {
      const json = line.slice(5);
      try {
        return JSON.parse(json).content;
      } catch {
        return null;
      }
    }).filter(Boolean).join("");
    return result;
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
  const result = await AllyfyChat(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}