import axios from "axios";
class YouTubeDownloader {
  constructor() {
    this.gC = {
      0: "NywyOCw2LDUzLDM4LDU1LDM4LDYxLDgsMjYsMTksMjEsMjUsMjksMzQsNDEsOCwzMiw4LDM1LDM1LDQ5LDI4LDI2LDIwLDI0LDUyLDQ2LDY2LDQ5LDE2LDU5LDM1LDM0LDQ2LDUyLDU5LDQ1LDYxLDIxLDk=",
      1: "IrHUN6Xe07oKmLT5SihqEOuckvDY8Vsf42MFGwP9JCdzZxylbApjRQn1taB3gW",
      f: ["0", "", 1, 36, 5, 1, ","],
      r: ["youtube-mp36.p.", "3fb448bb80mshb8219b06208d8c8p179be5jsndaed67c1144f"]
    };
    this.gA = 0;
    this.gVideo = false;
  }
  atobSafe(str) {
    return Buffer.from(str, "base64").toString("utf-8");
  }
  k(e) {
    const data = this.atobSafe(this.gC["0"]).split(this.gC.f[6]);
    const reversed = this.gC["1"].split("").reverse().join("");
    for (let t = 0; t < data.length; t++) {
      e += reversed[data[t] - this.gC.f[4]];
    }
    return this.gC.f[2] === 1 ? e.toLowerCase() : this.gC.f[2] === 2 ? e.toUpperCase() : e;
  }
  async api(videoId) {
    this.gA = 1;
    const endpoint = `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}&_=${Math.random()}`;
    const headers = {
      "x-rapidapi-host": this.gC.r[0] + "rapidapi.com",
      "x-rapidapi-key": this.gC.r[1]
    };
    try {
      const response = await axios.get(endpoint, {
        headers: headers
      });
      const data = response.data;
      if (data.status === "ok") {
        return {
          title: data.title,
          link: data.link
        };
      } else if (data.status === "processing") {
        return this.api(videoId);
      } else {
        throw new Error("Failed to process video.");
      }
    } catch (error) {
      throw new Error("API request failed.");
    }
  }
  async processVideo(url) {
    const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    if (!match) throw new Error("Invalid YouTube URL.");
    this.gVideo = match[1];
    return await this.api(this.gVideo);
  }
  async download(youtubeUrl) {
    try {
      const result = await this.processVideo(youtubeUrl);
      return result;
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "YouTube URL is required"
    });
  }
  try {
    const ytdl = new YouTubeDownloader();
    const result = await ytdl.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: "Error fetching stream"
    });
  }
}