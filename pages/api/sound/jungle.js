import fetch from "node-fetch";
import * as cheerio from "cheerio";
const AudioJungle = async (category, page = 1) => {
  try {
    const url = `https://audiojungle.net/search/${category}?page=${page}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const sounds = [];
    $("div.shared-item_cards-list-audio_card_component__root").each((i, elem) => {
      const src = $(elem).find("source").attr("src");
      const id = $(elem).data("item-id");
      const name = $(elem).data("impression-name");
      const brand = $(elem).data("impression-brand");
      const price = $(elem).data("price");
      const link = $(elem).find("a.shared-item_cards-list-audio_card_component__itemLinkOverlay").attr("href");
      if (src) {
        sounds.push({
          src: src,
          id: id,
          name: name,
          brand: brand,
          price: price,
          link: link ? `https://audiojungle.net${link}` : null
        });
      }
    });
    if (sounds.length === 0) throw new Error("No sound data found");
    return sounds;
  } catch (error) {
    console.error("Error fetching sounds:", error.message);
    throw new Error(`Error fetching AudioJungle: ${error.message}`);
  }
};
export default async function handler(req, res) {
  const {
    category,
    page,
    id
  } = req.method === "GET" ? req.query : req.body;
  if (!category) {
    return res.status(400).json({
      success: false,
      message: "Category is required"
    });
  }
  try {
    const sounds = await AudioJungle(category, page);
    const index = id ? parseInt(id) - 1 : Math.floor(Math.random() * sounds.length);
    if (index < 0 || index >= sounds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid id"
      });
    }
    const sound = sounds[index];
    return res.status(200).json({
      success: true,
      data: sound
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}