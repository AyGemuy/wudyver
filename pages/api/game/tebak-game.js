import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const src = await (await fetch("https://raw.githubusercontent.com/qisyana/scrape/main/tebakgame.json")).json();
    const json = src[Math.floor(Math.random() * src.length)];
    return res.status(200).json(json);
  } catch {
    res.status(500).json({
      error: "Failed to fetch data"
    });
  }
}