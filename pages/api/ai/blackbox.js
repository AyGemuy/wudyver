import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";
import { randomBytes, randomUUID } from "crypto";
class Blackbox {
  constructor() {
    (this.userId = randomUUID()),
      (this.chatId = randomBytes(16).toString("hex"));
  }
  async chat(
    messages,
    userSystemPrompt = "You are Realtime AI. Follow the user's instructions carefully.",
    webSearchMode = !0,
    playgroundMode = !1,
    codeModelMode = !1,
    isMicMode = !1,
  ) {
    try {
      const blackboxResponse = await fetch("https://www.blackbox.ai/api/chat", {
        method: "POST",
        mode: "cors",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          Referer: "https://www.blackbox.ai/",
          "Content-Type": "application/json",
          Origin: "https://www.blackbox.ai",
          DNT: "1",
          "Sec-GPC": "1",
          "Alt-Used": "www.blackbox.ai",
          Connection: "keep-alive",
        },
        body: JSON.stringify({
          messages: messages,
          id: this.chatId || "chat-free",
          previewToken: null,
          userId: this.userId,
          codeModelMode: codeModelMode,
          agentMode: {},
          trendingAgentMode: {},
          isMicMode: isMicMode,
          userSystemPrompt: userSystemPrompt,
          maxTokens: 1024,
          playgroundMode: playgroundMode,
          webSearchMode: webSearchMode,
          promptUrls: "",
          isChromeExt: !1,
          githubToken: null,
        }),
      });
      return await blackboxResponse.text();
    } catch (error) {
      return console.error("Error fetching data:", error), null;
    }
  }
  async image(imageBuffer, input) {
    try {
      const { ext, mime } = (await fileTypeFromBuffer(imageBuffer)) || {};
      if (!ext || !mime) return null;
      const form = new FormData(),
        blob = new Blob([imageBuffer], {
          type: mime,
        });
      form.append("image", blob, "image." + ext),
        form.append("fileName", "image." + ext),
        form.append("userId", this.userId);
      const response = await fetch("https://www.blackbox.ai/api/upload", {
          method: "POST",
          body: form,
        }),
        messages = [
          {
            role: "user",
            content: (await response.json()).response + "\n#\n" + input,
          },
        ];
      return await this.chat(messages, "Realtime", !0, !1, !1, !1);
    } catch (error) {
      throw (console.error("Error:", error), error);
    }
  }
}
export default async function handler(req, res) {
  const { type, prompt, url } = req.query;
  const blackbox = new Blackbox();

  try {
    if (type === "chat") {
      if (!prompt) return res.status(400).json({ error: "Prompt is required for chat" });
      const messages = [{ role: "user", content: prompt }];
      const result = await blackbox.chat(messages, "You are Realtime AI.");
      Promise.resolve(result)
      .then(() => {
        console.log('Query processing complete!');
      })
      .catch((error) => {
        console.error('Error processing query:', error);
      });
      return res.status(200).json({ result });
    }

    if (type === "image") {
      if (!url || !prompt) return res.status(400).json({ error: "URL and prompt are required for image" });
      const imageResponse = await fetch(url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const result = await blackbox.image(imageBuffer, prompt);
      Promise.resolve(result)
      .then(() => {
        console.log('Query processing complete!');
      })
      .catch((error) => {
        console.error('Error processing query:', error);
      });
      return res.status(200).json({ result });
    }

    return res.status(400).json({ error: "Invalid type parameter" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
