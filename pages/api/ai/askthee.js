import fetch from "node-fetch";
const modelNames = ["Cristiano Ronaldo", "Lionel Messi", "Ataturk", "Albert Einstein", "Aristotle", "Carl Sagan", "Isaac Asimov", "Confucius", "Frida Kahlo", "G.G. Marquez", "Ernest Miller Hemingway", "Lucius Annaeus Seneca", "Steve Jobs", "Nikola Tesla", "Socrates", "Thomas Edison", "Rosalind Franklin", "Gary Vaynerchuk", "Amelia Earhart", "Elon Musk", "Marcus Aurelius", "Ludwig van Beethoven", "Jane Goodall", "Rumi"];
async function AskThee(prompt, index = null) {
  const name = index >= 0 && index < modelNames.length ? modelNames[index] : 1;
  const url = "https://askthee.vercel.app/api/generate";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://askthee.vercel.app/?ref=taaft&utm_source=taaft&utm_medium=referral"
    },
    body: JSON.stringify({
      name: name,
      question: prompt
    })
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    type = 3
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt || type)) return res.status(400).json({
    message: "No prompt, type provided"
  });
  const result = await AskThee(prompt, type);
  return res.status(200).json({
    result: {
      result: typeof result === "object" ? result : result
    }
  });
}