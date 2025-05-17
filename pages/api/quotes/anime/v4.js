import axios from "axios";
class AnimeQuotes {
  constructor() {
    this.databaseURL = "https://raw.githubusercontent.com/wolfgunblood/anime-quotes/main/data.json";
    this.animeQuotes = [];
  }
  async getQuote({
    limit = 5
  }) {
    try {
      const response = await axios.get(this.databaseURL);
      this.animeQuotes = response.data;
      const quotes = [];
      for (let i = 0; i < limit; i++) {
        const random = this.animeQuotes[Math.floor(Math.random() * this.animeQuotes.length)];
        quotes.push({
          quote: random.Quote,
          character: random.Character,
          anime: random.Anime
        });
      }
      return quotes;
    } catch (error) {
      console.error("Error fetching anime quotes:", error);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const quote = new AnimeQuotes();
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const result = await quote.getQuote({
      limit: Number(params.limit) || 5
    });
    return res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch anime quotes",
      message: err.message
    });
  }
}