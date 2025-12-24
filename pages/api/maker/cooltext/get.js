import * as cheerio from "cheerio";
import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    link
  } = req.method === "GET" ? req.query : req.body;
  if (!link) return res.status(400).json({
    error: "Link is required"
  });
  try {
    const response = await fetch(link);
    if (!response.ok) throw new Error("Failed to fetch data");
    const html = await response.text();
    const id = cheerio.load(html)("#LogoID").attr("value");
    if (!id) throw new Error("Logo ID not found");
    return res.status(200).json({
      id: id
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}