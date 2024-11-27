import fetch from "node-fetch";

async function sindiran() {
  try {
    const url =
      "https://raw.githubusercontent.com/orderku/db/main/dbbot/random/sindiran.json";
    let res = await fetch(url);
    let data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching sindiran data:", error);
    return [];
  }
}

export default async function handler(req, res) {
  try {
    const sindiranQuotes = await sindiran();
    if (sindiranQuotes.length > 0) {
      // Optionally, you can add logic to return a random sindiran quote
      const randomQuote = sindiranQuotes[Math.floor(Math.random() * sindiranQuotes.length)];
      res.status(200).json({ quote: randomQuote.result });
    } else {
      res.status(404).json({ error: "No sindiran quotes available" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}
