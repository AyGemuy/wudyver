import fetch from "node-fetch";

export default async function handler(req, res) {
  const url = "https://widget.galichat.com/api/vector-search";
  const headers = {
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    Referer: "https://widget.galichat.com/chat/6691wb9cakfml2mjro2x19",
  };

  const defaultBody = {
    message: "Woi",
    userPrompt:
      "All the responses should be understood by general people. Respond with simple answers that a have maxim 3-4 sentences and could be understood by general people. If you don't know something or if it is not clearly specified in the docs respond with 'Unfortunately, we cannot help now with this information, a human agent will get back to you.'",
    vibeResponse: "neutral",
    threadId: "q0pgZUXdmh6WiZb1x0s2uw6",
    chatHash: "6691wb9cakfml2mjro2x19",
    chatHistory: [],
  };

  if (req.method === "POST") {
    const body = req.body && typeof req.body === "object" ? req.body : defaultBody;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res
          .status(response.status)
          .json({ error: `Failed to fetch: ${errorText}` });
      }

      const data = await response.json();
      return res.status(200).json(typeof data === "object" ? data : data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "GET") {
    const prompt =
      req.query.prompt ||
      "All the responses should be understood by general people. Respond with simple answers that a have maxim 3-4 sentences and could be understood by general people.";
    const message = req.query.message || "Woi";
    const threadId = req.query.threadId || "q0pgZUXdmh6WiZb1x0s2uw6";

    const body = {
      message,
      userPrompt: prompt,
      vibeResponse: "neutral",
      threadId,
      chatHash: "6691wb9cakfml2mjro2x19",
      chatHistory: [],
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res
          .status(response.status)
          .json({ error: `Failed to fetch: ${errorText}` });
      }

      const data = await response.json();
      return res.status(200).json(typeof data === "object" ? data : data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
