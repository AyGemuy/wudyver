import axios from "axios";
import * as cheerio from "cheerio";
class IlkpopDownloader {
  decode(data) {
    try {
      return data.split(".").map(part => String.fromCharCode(parseInt(Buffer.from(part, "base64").toString().replace(/\D/g, "")))).join("");
    } catch {
      return "";
    }
  }
  async getDirect({
    url
  }) {
    try {
      const {
        data: html
      } = await axios.get(url);
      const $ = cheerio.load(html);
      const match = html.match(/var\s+_ilkpopccv\w+\s*=\s*(['"].*?['"]\s*(?:\+\s*['"].*?['"])*)/);
      if (!match) return null;
      const encData = match[1].split(/\s*\+\s*/).map(part => part.replace(/^'|'$/g, "")).join("");
      const decData = decodeURIComponent(this.decode(encData));
      const notnotkey = decData.match(/nonot\('(.*?)','.*?','.*?'\)/);
      if (!notnotkey) return null;
      const {
        data: downloadData
      } = await axios.get(`https://ilkpop.cc/ilkdl.txt?id=${notnotkey[1]}`);
      return {
        title: $("h1.entry-title").text().trim() || "",
        artist: $("td#song_artist a").text().trim() || "",
        album: $("td#song_album a").text().trim() || "",
        genre: $("td#song_genre a").text().trim() || "",
        year: $("td#song_year a").text().trim() || "",
        duration: $("td#length").text().trim() || "",
        fileFormat: $("td#file_format").text().trim() || "",
        mimeType: $("td#mime").text().trim() || "",
        bitrate: $("td#bitrate").text().trim() || "",
        size: $("td#size").text().trim() || "",
        views: $("td#views").text().trim() || "",
        uploadDate: $("td#date_upload").text().trim() || "",
        coverImage: $("img.aligncenter").attr("src") ? `https:${$("img.aligncenter").attr("src")}` : "",
        downloadLink: downloadData.play || ""
      };
    } catch {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const downloader = new IlkpopDownloader();
  try {
    const data = await downloader.getDirect(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}