import axios from "axios";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.json({
    error: "Only GET"
  });
  try {
    const {
      url
    } = req.body;
    const result = await saveinsta(url);
    res.json(result);
  } catch (e) {
    res.json({
      error: e.toString()
    });
  }
}
async function saveinsta(url) {
  try {
    const payload = new URLSearchParams({
      url: url,
      host: "instagram"
    });
    const {
      data
    } = await axios.post("https://saveinsta.io/core/ajax.php", payload, {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        cookie: "PHPSESSID=rmer1p00mtkqv64ai0pa429d4o",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
      }
    });
    const $ = cheerio.load(data);
    const media = $("div.row > div.col-md-12 > div.row.story-container.mt-4.pb-4.border-bottom").map((_, el) => {
      return "https://saveinsta.io/" + $(el).find("div.col-md-8.mx-auto > a").attr("href");
    }).get();
    return {
      media: media
    };
  } catch (e) {
    throw new Error("SaveInsta API error: " + e.message);
  }
}