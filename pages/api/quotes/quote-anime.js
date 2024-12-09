import fetch from "node-fetch";

async function getQuote(text, isRandom) {
  try {
    const { quote, character, anime } = isRandom
      ? await quotesRandom()
      : text
      ? await quotesByName(text)
      : await quotesRandom();
    
    return { quote, character, anime };
  } catch (error) {
    console.error("Error fetching quote:", error);
    return { quote: "Sorry, there was an error fetching the quote.", character: "" };
  }
}

async function quotesRandom() {
  try {
    const response = await fetch("https://animechan.xyz/api/random");
    const data = await response.json();
    const { quote, character, anime } = data;
    return { quote, character, anime };
  } catch (error) {
    console.error("Error fetching random quote:", error);
    return null;
  }
}

async function quotesByName(name) {
  try {
    const response = await fetch(`https://animechan.xyz/api/random/character?name=${name}`);
    const data = await response.json();
    const { quote, character, anime } = data;
    return { quote, character, anime };
  } catch (error) {
    console.error(`Error fetching ${name}'s quote:`, error);
    return null;
  }
}

export default async function handler(req, res) {
  const { text, random } = req.query;

  try {
    const isRandom = random === "true"; // Check if random=true in query
    const { quote, character, anime } = await getQuote(text, isRandom);
    if (quote || character || anime) {
      res.status(200).json({ quote, character, anime });
    } else {
      res.status(404).json({ error: "Quote not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}
