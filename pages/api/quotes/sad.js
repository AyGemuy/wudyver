import fetch from "node-fetch";
async function katasad() {
  try {
    const url = "https://raw.githubusercontent.com/onlybot12/galau/a3d5c0a37435a9c694c6b69e027385c1fd776df0/sad.json";
    const res = await fetch(url);
    return await res.text();
  } catch {
    return [];
  }
}
async function getRandomSadQuote() {
  try {
    const quotes = await katasad();
    if (quotes.length > 0) {
      const filteredQuotes = quotes.split("\n").slice(1, -1);
      return filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)].slice(1, -2);
    }
    return "No quotes available.";
  } catch {
    return "Error fetching quotes.";
  }
}
export default async function handler(req, res) {
  try {
    const randomQuote = await getRandomSadQuote();
    return res.status(200).json({
      quote: randomQuote
    });
  } catch {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}