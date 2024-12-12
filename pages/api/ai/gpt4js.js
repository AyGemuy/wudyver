// pages/api/chat.js

import GPT4js from "gpt4js";

export default async function handler(req, res) {
  const method = req.method;
  const { query, body } = req;

  if (method !== "POST" && method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const provider = query.provider || body?.provider || "Nextway";
    const model = query.model || body?.model || "gpt-4o-free";
    const stream = query.stream === "true" || body?.stream || false;
    const temperature = parseFloat(query.temperature) || body?.temperature || 0.5;
    const webSearch = query.webSearch === "true" || body?.webSearch || false;
    const codeModelMode = query.codeModelMode === "true" || body?.codeModelMode || false;
    const isChromeExt = query.isChromeExt === "true" || body?.isChromeExt || false;

    let messages;

    if (method === "GET") {
      const content = query.content || "";
      if (!content) {
        return res.status(400).json({ error: "Query parameter 'content' is required for GET requests." });
      }
      messages = [{ role: "user", content }];
    } else {
      messages = body?.messages || [];
      if (!messages.length) {
        return res.status(400).json({
          error: "Messages array is required for POST requests and must include at least one user message.",
        });
      }
    }

    const options = {
      provider,
      model,
      stream,
      temperature,
      webSearch,
      codeModelMode,
      isChromeExt,
    };

    const providerInstance = GPT4js.createProvider(provider);

    const text = await providerInstance.chatCompletion(
      messages,
      options,
      (data) => console.log("Streaming data:", data)
    );

    return res.status(200).json({ response: text });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}
