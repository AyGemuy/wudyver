import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function ArtiKata(input) {
  try {
    const formData = new URLSearchParams({
      input: input
    });
    const response = await fetch("https://www.artikata.com/translate.php", {
      method: "POST",
      body: formData
    });
    if (!response.ok) throw new Error("Jaringan bermasalah");
    const $ = cheerio.load(await response.text());
    return {
      title: $("title").text().trim() || "Tidak ada",
      definition: $(".contents9 table tr td:last-of-type").text().trim() || "Tidak ada",
      source: $(".contents12").text().trim() || "Tidak ada",
      relatedWords: $(".related").map((_, el) => $(el).text().trim()).get().join(", ") || "Tidak ada"
    };
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      text
    } = req.method === "GET" ? req.query : req.body;
    if (!text) {
      return res.status(400).json({
        error: "Paramenter 'text' diperlukan"
      });
    }
    const result = await ArtiKata(text);
    if (!result) {
      return res.status(500).json({
        error: "Gagal mengambil data dari artikata.com"
      });
    }
    return res.status(200).json(result);
  }
  res.setHeader("Allow", ["GET"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}