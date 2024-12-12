import axios from "axios";
import * as cheerio from "cheerio";

class TikDD {
  constructor() {
    this.url = "https://www.tikdd.cc/wp-json/aio-dl/video-data/";
    this.headers = {
      accept: "*/*",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://www.tikdd.cc",
      referer: "https://www.tikdd.cc/",
      "user-agent": "Postify/1.0.0",
      cookie: "pll_language=en",
      "x-forwarded-for": Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 256),
      ).join("."),
    };
  }

  async token() {
    const { data } = await axios.get("https://www.tikdd.cc");
    const $ = cheerio.load(data);
    const token = $("#token").val();
    if (!token) throw new Error("Tokennya gak ada 😆");
    return token;
  }

  urlHash(url) {
    return btoa(url) + (url.length + 1e3) + btoa("aio-dl");
  }

  async down(videoUrl) {
    const token = await this.token();
    const hash = this.urlHash(videoUrl);
    const response = await axios.post(
      this.url,
      new URLSearchParams({
        url: videoUrl,
        token: token,
        hash: hash,
      }),
      {
        headers: this.headers,
      },
    );
    return response.data;
  }
}

const TikDd = new TikDD();

const Tikdd = async (videoUrl) => {
  try {
    return await TikDd.down(videoUrl);
  } catch (error) {
    console.error("Error during download:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: "No url provided" });

  const result = await Tikdd(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
