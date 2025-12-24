import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const {
      type
    } = req.method === "GET" ? req.query : req.body;
    if (!type) {
      return res.status(400).json({
        message: "Type is required"
      });
    }
    const allowedTypes = ["ass", "sixtynine", "pussy", "dick", "anal", "boobs", "bdsm", "black", "easter", "bottomless", "blowjub", "collared", "cum", "cumsluts", "dp", "dom", "extreme", "feet", "finger", "fuck", "futa", "gay", "gif", "group", "hentai", "kiss", "lesbian", "lick", "pegged", "phgif", "puffies", "real", "suck", "tattoo", "tiny", "toys", "xmas"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid type provided"
      });
    }
    const apiUrl = `https://nsfwhub.onrender.com/nsfw?type=${type}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to fetch data"
      });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}