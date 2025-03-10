import fetch from "node-fetch";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "No prompt provided"
    });
  }
  const apiUrl = `https://algoz.ai/ai/xai.php?prompt=${encodeURIComponent(prompt)}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const preContent = $("pre").text();
    if (!preContent) {
      return res.status(404).json({
        result: "No <pre> tag content found"
      });
    }
    return res.status(200).json({
      result: preContent
    });
  } catch (error) {
    return res.status(500).json({
      result: `Error processing request: ${error.message}`
    });
  }
}