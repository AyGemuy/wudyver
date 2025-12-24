import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar: jar
}));
class TinubeShortener {
  constructor() {
    console.log("TinubeShortener (mode hardcoded) siap digunakan.");
    this.apiUrl = "https://tinu.be/en";
    this.baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
      Referer: this.apiUrl
    };
  }
  async short({
    url,
    name
  }) {
    console.log("\nMemulai proses pemendekan di tinu.be...");
    try {
      const hardcodedNextActionId = "74b2f223fe2b6e65737e07eeabae72c67abf76b2";
      console.warn(`PERINGATAN: Menggunakan Next-Action ID yang di-hardcode: ${hardcodedNextActionId}`);
      console.warn("Skrip ini dapat berhenti bekerja kapan saja jika ID tersebut berubah.");
      const alias = name || `${Math.random().toString(36).substring(2, 9)}`;
      console.log(`URL Asli: ${url}, Alias: ${alias}`);
      const postData = JSON.stringify([{
        longUrl: url,
        urlCode: alias
      }]);
      const postHeaders = {
        ...this.baseHeaders,
        Accept: "text/x-component",
        "Next-Action": hardcodedNextActionId,
        "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(site)%22%2C%7B%22children%22%3A%5B%5B%22lang%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%3F%7B%5C%22lang%5C%22%3A%5C%22en%5C%22%7D%22%2C%7B%7D%2C%22%2Fen%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
        "Content-Type": "text/plain;charset=UTF-8"
      };
      console.log("Mengirim permintaan POST ke tinu.be...");
      const response = await client.post(this.apiUrl, postData, {
        headers: postHeaders
      });
      const responseText = response.data || "";
      const lines = responseText.split("\n");
      const dataLine = lines.find(line => line.startsWith("1:"));
      const jsonData = dataLine ? JSON.parse(dataLine.substring(2)) : null;
      const urlCode = jsonData?.data?.urlCode;
      if (urlCode) {
        const finalUrl = `https://tinu.be/${urlCode}`;
        console.log("Berhasil! URL pendek:", finalUrl);
        return {
          url: finalUrl
        };
      } else {
        console.error("Gagal mem-parsing urlCode dari respons:", responseText);
        return null;
      }
    } catch (error) {
      console.error("Terjadi kesalahan selama proses pemendekan di tinu.be:");
      console.error(`Pesan Error: ${error.message}`);
      const status = error.response?.status ? `Status: ${error.response.status}` : "Status tidak tersedia.";
      console.error(status);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const shortener = new TinubeShortener();
    const response = await shortener.short(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}