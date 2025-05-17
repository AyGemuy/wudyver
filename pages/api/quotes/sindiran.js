import fetch from "node-fetch";
async function sindiran() {
  try {
    const url = "https://raw.githubusercontent.com/orderku/db/main/dbbot/random/sindiran.json";
    const res = await fetch(url);
    return await res.json();
  } catch {
    return [];
  }
}
export default async function handler(req, res) {
  try {
    const sindiranQuotes = await sindiran();
    if (sindiranQuotes.length > 0) {
      const randomQuote = sindiranQuotes[Math.floor(Math.random() * sindiranQuotes.length)];
      return res.status(200).json({
        quote: randomQuote.result
      });
    } else {
      res.status(404).json({
        error: "No sindiran quotes available"
      });
    }
  } catch {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}