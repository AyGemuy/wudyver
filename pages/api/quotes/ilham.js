import fetch from "node-fetch";
async function katailham() {
  try {
    const url = "https://raw.githubusercontent.com/orderku/db/main/dbbot/random/katailham.json";
    let res = await fetch(url);
    let data = await res.json();
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}
export default async function handler(req, res) {
  try {
    const quotes = await katailham();
    if (quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      return res.status(200).json({
        quote: randomQuote.result
      });
    } else {
      res.status(404).json({
        error: "No quotes found"
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}