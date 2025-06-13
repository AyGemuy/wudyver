import fetch from "node-fetch";
async function MuslimAI(query) {
  try {
    const responseSearch = await fetch("https://www.muslimai.io/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.muslimai.io/"
      },
      body: JSON.stringify({
        query: query
      })
    });
    const ayatData = responseSearch.ok ? await responseSearch.json() : null;
    const content = ayatData?.[0]?.content;
    if (!content) {
      console.error("Tidak ada data ayat yang ditemukan.");
      return;
    }
    const prompt = `Use the following passages to answer the query in Indonesian, ensuring clarity and understanding, as a world-class expert in the Quran. Do not mention that you were provided any passages in your answer: ${query}

${content}`;
    const responseAnswer = await fetch("https://www.muslimai.io/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.muslimai.io/"
      },
      body: JSON.stringify({
        prompt: prompt
      })
    });
    const jawaban = responseAnswer.ok ? await responseAnswer.text() : null;
    return jawaban;
  } catch (error) {
    console.error(error);
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await MuslimAI(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}