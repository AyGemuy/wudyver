import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    let data = await (await fetch("https://flagcdn.com/en/codes.json")).json();
    const randomKey = Object.keys(data)[Math.floor(Math.random() * Object.keys(data).length)];
    const json = {
      name: data[randomKey],
      img: `https://flagpedia.net/data/flags/ultra/${randomKey}.png`
    };
    return res.status(200).json(json);
  } catch {
    try {
      let src = await (await fetch("https://raw.githubusercontent.com/BochilTeam/database/master/games/tebakbendera2.json")).json();
      const json = src[Math.floor(Math.random() * src.length)];
      return res.status(200).json(json);
    } catch {
      res.status(500).json({
        error: "Failed to fetch data"
      });
    }
  }
}