import axios from "axios";
class AnimeQuotes {
  constructor() {
    this.databaseURL = "https://animequotes-e29a2-default-rtdb.firebaseio.com/anime.json";
    this.animeQuotes = [];
  }
  async getQuote({
    limit = 5
  }) {
    try {
      const response = await axios.get(this.databaseURL);
      this.animeQuotes = response.data;
      const animeList = Object.keys(this.animeQuotes);
      const randomQuotes = [];
      for (let i = 0; i < limit; i++) {
        const randomAnime = animeList[Math.floor(Math.random() * animeList.length)];
        const characterList = Object.keys(this.animeQuotes[randomAnime]);
        const randomCharacter = characterList[Math.floor(Math.random() * characterList.length)];
        const quotes = this.animeQuotes[randomAnime][randomCharacter];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        randomQuotes.push({
          quote: randomQuote,
          character: randomCharacter,
          anime: randomAnime
        });
      }
      return randomQuotes;
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