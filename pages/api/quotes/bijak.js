import fetch from "node-fetch";
async function katabijak() {
  try {
    const url = "https://raw.githubusercontent.com/onlybot12/galau/a3d5c0a37435a9c694c6b69e027385c1fd776df0/katabijak.json";
    const res = await fetch(url);
    return await res.text();
  } catch {
    return [];
  }
}
export default async function handler(req, res) {
  try {
    const quotes = await katabijak();
    if (quotes.length > 0) {
      const filteredQuotes = quotes.split("\n").slice(1, -1);
      const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)].slice(1, -2);
      return res.status(200).json({
        quote: randomQuote
      });
    } else {
      res.status(404).json({
        error: "No quotes found"
      });
    }
  } catch {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}