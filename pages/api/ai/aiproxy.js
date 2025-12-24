import fetch from "node-fetch";
async function chatAI(query, profile, model) {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer sk-bpGbwgFrNi9GKcNd9DBAd6QwGtuecv30SU2gAreQzVO8XUrF"
    },
    body: JSON.stringify({
      model: model || "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: profile
      }, {
        role: "user",
        content: query
      }]
    }),
    redirect: "follow"
  };
  try {
    const response = await fetch("https://api.aiproxy.io/v1/chat/completions", options);
    const data = await response.json();
    return data.choices[0]?.message.content;
  } catch (error) {
    console.error("Error:", error);
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    profile,
    model
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt || profile || model)) return res.status(400).json({
    message: "No prompt, profile, model provided"
  });
  const result = await chatAI(prompt, profile, model);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}