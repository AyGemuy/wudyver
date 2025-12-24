import fetch from "node-fetch";
const url = "https://widget.galichat.com/api/vector-search";
const headers = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  Referer: "https://widget.galichat.com/chat/6691wb9cakfml2mjro2x19"
};
const defaultBody = {
  message: "Woi",
  userPrompt: "All the responses should be understood by general people. Respond with simple answers that a have maxim 3-4 sentences and could be understood by general people. If you don't know something or if it is not clearly specified in the docs respond with 'Unfortunately, we cannot help now with this information, a human agent will get back to you.'",
  vibeResponse: "neutral",
  threadId: "q0pgZUXdmh6WiZb1x0s2uw6",
  chatHash: "6691wb9cakfml2mjro2x19",
  chatHistory: []
};
export default async function handler(req, res) {
  const body = req.method === "POST" ? req.body && typeof req.body === "object" ? req.body : defaultBody : {
    message: req.query.message || "Woi",
    userPrompt: req.query.prompt || defaultBody.userPrompt,
    vibeResponse: "neutral",
    threadId: req.query.threadId || defaultBody.threadId,
    chatHash: defaultBody.chatHash,
    chatHistory: []
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Failed to fetch: ${errorText}`
      });
    }
    const data = await response.text();
    return res.status(200).json({
      result: typeof data === "object" ? data : {
        data: data
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}