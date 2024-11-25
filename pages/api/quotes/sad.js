import fetch from "node-fetch";

async function katasad() {
  try {
    const url =
      "https://raw.githubusercontent.com/onlybot12/galau/a3d5c0a37435a9c694c6b69e027385c1fd776df0/sad.json";
    let res = await fetch(url);
    let data = await res.text();
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getRandomSadQuote() {
  try {
    const quotes = await katasad();
    if (quotes.length > 0) {
      const filteredQuotes = quotes
        .split("\n")
        .filter((_, index) => index !== 0 && index !== quotes.length - 1); // Remove first and last lines
      const randomQuote = filteredQuotes[
        Math.floor(Math.random() * filteredQuotes.length)
      ].slice(1, -2); // Trim the quote
      return randomQuote;
    }
    return "No quotes available.";
  } catch (error) {
    console.error("Error fetching sad quotes:", error);
    return "Error fetching quotes.";
  }
}

export default async function handler(req, res) {
  try {
    const randomQuote = await getRandomSadQuote();
    res.status(200).json({ quote: randomQuote });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}
