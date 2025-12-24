import axios from "axios";
import * as cheerio from "cheerio";
class FSave {
  constructor(url) {
    this.url = url;
    this.baseUrl = "https://fsave.io/action.php?lang=en";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://fsave.io/instagram-video-download",
      "Content-Type": "application/x-www-form-urlencoded"
    };
  }
  decodeData(data) {
    let [part1, part2, part3, part4, part5] = data;
    let part6 = "";
    const decodeSegment = (segment, base, length) => {
      const charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split("");
      let baseSet = charSet.slice(0, base);
      let decodeSet = charSet.slice(0, length);
      let decodedValue = segment.split("").reverse().reduce((accum, char, index) => {
        return accum + baseSet.indexOf(char) * Math.pow(base, index);
      }, 0);
      let result = "";
      while (decodedValue > 0) {
        result = decodeSet[decodedValue % length] + result;
        decodedValue = Math.floor(decodedValue / length);
      }
      return result || "0";
    };
    for (let i = 0, len = part1.length; i < len; i++) {
      let segment = "";
      while (part1[i] !== part3[part5]) {
        segment += part1[i];
        i++;
      }
      for (let j = 0; j < part3.length; j++) {
        segment = segment.replace(new RegExp(part3[j], "g"), j.toString());
      }
      part6 += String.fromCharCode(decodeSegment(segment, part5, 10) - part4);
    }
    return decodeURIComponent(encodeURIComponent(part6));
  }
  extractParams(data) {
    try {
      return data.split("decodeURIComponent(escape(r))}(")[1].split("))")[0].split(",").map(item => item.replace(/"/g, "").trim());
    } catch (error) {
      throw new Error("Gagal mengekstrak parameter");
    }
  }
  getVideoUrl(data) {
    return this.decodeData(this.extractParams(data));
  }
  parseFsaveData(data) {
    try {
      const html = data.split('getElementById("download-section").innerHTML = "')[1].split('"; document.getElementById("inputData").remove(); ')[0].replace(/\\(\\)?/g, "");
      const $ = cheerio.load(html);
      const downloadLinks = [];
      $("div.download-items__btn a").each((index, button) => {
        let downloadUrl = $(button).attr("href");
        if (!/https?:\/\//.test(downloadUrl || "")) {
          downloadUrl = "https://snapsave.app" + downloadUrl;
        }
        downloadLinks.push(downloadUrl);
      });
      if (!downloadLinks.length) {
        throw new Error("Tidak ada data ditemukan");
      }
      return {
        url: downloadLinks,
        metadata: {
          url: this.url
        }
      };
    } catch (error) {
      throw new Error("Gagal memproses data FSave");
    }
  }
  async fetchData() {
    try {
      const response = await axios.post(this.baseUrl, new URLSearchParams({
        url: this.url
      }), {
        headers: this.headers
      });
      return this.parseFsaveData(this.getVideoUrl(response.data));
    } catch (error) {
      throw new Error("Gagal mengambil data dari FSave: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "Invalid Instagram URL"
      });
    }
    const fsave = new FSave(url);
    const result = await fsave.fetchData();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message
    });
  }
}