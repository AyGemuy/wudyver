import fetch from "node-fetch";
const urls = {
  dare: "https://raw.githubusercontent.com/BochilTeam/database/master/kata-kata/dare.json",
  truth: "https://raw.githubusercontent.com/BochilTeam/database/master/kata-kata/truth.json",
  bucin: "https://raw.githubusercontent.com/BochilTeam/database/master/kata-kata/bucin.json",
  gombalan: "https://raw.githubusercontent.com/Jabalsurya2105/database/master/data/gombalan.json",
  renungan: "https://raw.githubusercontent.com/BochilTeam/database/master/kata-kata/renungan.json"
};
const cache = {};
const getRandom = async type => {
  if (!cache[type]) {
    const response = await fetch(urls[type]);
    if (!response.ok) throw new Error(`Failed to fetch ${type}: ${response.status}`);
    cache[type] = await response.json();
  }
  return cache[type][Math.floor(Math.random() * cache[type].length)];
};
export default async function handler(req, res) {
  try {
    const {
      type
    } = req.method === "GET" ? req.query : req.body;
    const result = urls[type] ? await getRandom(type) : null;
    return result ? res.status(200).json({
      quote: result
    }) : res.status(400).json({
      error: 'Invalid type. Use "dare", "truth", "bucin", "gombalan", or "renungan".'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}