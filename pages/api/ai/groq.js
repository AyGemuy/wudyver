import fetch from "node-fetch";
async function groq(q) {
  try {
    const { data } = await (
      await fetch("https://api-zenn.vercel.app/api/ai/groq?q=" + q)
    )?.json();
    return data;
  } catch (error) {
    throw new Error("Error:", error.message);
  }
}
export default async function handler(req, res) {
  const { prompt } = req.query;

  if (!prompt) return res.status(400).json({ message: "No prompt provided" });

  const result = await groq(prompt);
  return res.status(200).json(typeof result === "object" ? result : result);
}
