import fetch from "node-fetch";
async function gemini(q) {
  try {
    const res = await fetch(
      "https://functio.vercel.app/api/ai/gemini/generate",
      {
        method: "POST",
        body: JSON.stringify({
          req: q,
        }),
      },
    );
    const payload = (await res.json())?.desc;
    return payload;
  } catch (error) {
    throw new Error("Error:", error.message);
  }
}
export default async function handler(req, res) {
  const { prompt } = req.query;

  if (!prompt) return res.status(400).json({ message: "No prompt provided" });

  const result = await gemini(prompt);
  return res.status(200).json(typeof result === "object" ? result : result);
}
