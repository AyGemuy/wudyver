import fetch from "node-fetch";
async function Bubblegum(prompt, style = "Creative", invoice = 0) {
  try {
    const sign = await (await fetch("https://effulgent-bubblegum-e2f5df.netlify.app/api/create")).json();
    const response = await fetch("https://effulgent-bubblegum-e2f5df.netlify.app/api/sydney", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        conversationId: sign?.conversationId,
        encryptedconversationsignature: sign?.encryptedconversationsignature,
        clientId: sign?.clientId,
        invocationId: invoice,
        conversationStyle: style,
        prompt: prompt
      })
    });
    const jsonString = await response.text();
    const responses = jsonString.split("").map(s => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    }).filter(v => v?.item) || [];
    const json = responses[0];
    return json?.item.messages.filter(e => e.messageType === "Chat").reverse()[0] || json?.item.messages.filter(e => e.author === "bot" && e.adaptiveCards[0]?.body[0]?.type === "TextBlock").reverse()[0];
  } catch (error) {
    console.error("Error in BingChat:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    style,
    invoice
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt || style || invoice)) return res.status(400).json({
    message: "No prompt, style, invoice provided"
  });
  const result = await Bubblegum(prompt, style, invoice);
  Promise.resolve(result).then(() => {
    console.log("Query processing complete!");
  }).catch(error => {
    console.error("Error processing query:", error);
  });
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}