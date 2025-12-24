import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function getSynonymsAndAntonyms(searchTerm) {
  try {
    const formData = new URLSearchParams({
      q: searchTerm
    });
    const response = await fetch("https://m.persamaankata.com/search.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    });
    if (!response.ok) throw new Error("Jaringan bermasalah");
    const html = await response.text();
    const $ = cheerio.load(html);
    const synonyms = $(".thesaurus_group").eq(0).find(".word_thesaurus a").map((_, el) => ({
      word: $(el).text(),
      link: $(el).attr("href")
    })).get();
    const antonyms = $(".thesaurus_group").eq(1).find(".word_thesaurus a").map((_, el) => ({
      word: $(el).text(),
      link: $(el).attr("href")
    })).get();
    const imageLink = $("#visual_synonym_img").attr("src") || "Tidak ada";
    return {
      synonyms: synonyms,
      antonyms: antonyms,
      imageLink: imageLink
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

function formatList(words) {
  return words.map(word => `- ${word.word}`).join("\n");
}
export default async function handler(req, res) {
  const {
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!text) return res.status(400).json({
    message: "No text provided"
  });
  const result = await getSynonymsAndAntonyms(text);
  return res.status(200).json(typeof result === "object" ? result : result);
}