import axios from "axios";
class AnimeQuotes {
  constructor() {
    this.baseURL = "https://www.animequotes.ncoll-central.com/";
    this.endpoint = "ajax/randomQuote.php";
    this.headers = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "x-requested-with": "XMLHttpRequest",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
      referer: "https://www.animequotes.ncoll-central.com/"
    };
  }
  async getQuote() {
    try {
      const {
        data
      } = await axios.post(this.baseURL + this.endpoint, null, {
        headers: this.headers
      });
      if (data?.image && !data.image.startsWith("http")) {
        data.image = this.baseURL + "images/" + data.image;
      }
      return data;
    } catch (error) {
      throw new Error("Failed to fetch anime quote: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const quote = new AnimeQuotes();
  try {
    const result = await quote.getQuote();
    return res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch anime quotes",
      message: err.message
    });
  }
}