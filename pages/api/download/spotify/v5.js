import axios from "axios";
import * as cheerio from "cheerio";
class SpotifyMate {
  constructor() {
    this.url = "https://spotifymate.com/action";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "multipart/form-data; boundary=----WebKitFormBoundaryZrWHjJMmKHmILZWJ",
      cookie: "session_data=eaphm5fq0arlktf2govbe6eq3v; _ga_YCP6R0LL6X=GS1.1.1736045144.1.0.1736045144.0.0.0; _ga=GA1.1.684513556.1736045145; __gads=ID=2a923430b66fafd1:T=1736045147:RT=1736045147:S=ALNI_MbAnxqC3I2dyAkFJ-kJpeBdIBpZYg; __gpi=UID=00000fd492b8404b:T=1736045147:RT=1736045147:S=ALNI_MY9HQ_qPD2rNWV983PWY5RgdIdAxA; __eoi=ID=952eee4d802c6c13:T=1736045147:RT=1736045147:S=AA-AfjYmOwl69p4kIhHZ1XGlNRTP; FCNEC=%5B%5B%22AKsRol99OynFZ0lxtmgx7whGh90ncY76SaEtGUFQTkw1rWdv_Tdm8rG9VImTvSHFzHHcMVkgHdng-u9KtN7XgLfNq9D9ZsAm6hTi2svs4MGcvf5o9bifQAlwZOt8x9wlofEGNoPk3wbL3HjVZUk6phdV_oUJ6ysbAA%3D%3D%22%5D%5D",
      origin: "https://spotifymate.com",
      referer: "https://spotifymate.com/en",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchData(spotifyUrl) {
    try {
      const formData = `------WebKitFormBoundaryZrWHjJMmKHmILZWJ
Content-Disposition: form-data; name="url"

${spotifyUrl}
------WebKitFormBoundaryZrWHjJMmKHmILZWJ
Content-Disposition: form-data; name="_nibeW"

8efa751fa8ca2651c65941a1ded6ad3f
------WebKitFormBoundaryZrWHjJMmKHmILZWJ--`;
      const response = await axios.post(this.url, formData, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const result = {
        song: $(".spotifymate-downloader-left img").eq(0).attr("src") || "No image",
        title: $(".spotifymate-downloader-middle h3").eq(0).text().trim() || "No title",
        artist: $(".spotifymate-downloader-middle p span").eq(0).text().trim() || "Unknown artist",
        mp3: $('a[onclick="showAd();"]').eq(0).attr("href") || "No MP3 link",
        cover: $('a[onclick="showAd();"]').eq(1).attr("href") || "No cover link"
      };
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  try {
    const spotifyMate = new SpotifyMate();
    const result = await spotifyMate.fetchData(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}