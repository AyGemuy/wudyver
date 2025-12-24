import fetch from "node-fetch";
const AiContinues = async (inputText, uid = "uid") => {
  const params = new URLSearchParams({
    q: inputText,
    uid: uid,
    model: "gpt-4",
    cai: ""
  });
  try {
    const res = await fetch(`https://ai-continues.onrender.com/chatbox?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return (await res.json()).answer;
  } catch (error) {
    console.error("AI response fetch failed:", error);
    throw new Error("AI response fetch failed.");
  }
};
export default async function handler(req, res) {
  const {
    prompt,
    uid
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt || uid)) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await AiContinues(prompt, uid);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}