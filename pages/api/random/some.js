import fetch from "node-fetch";
const baseApiUrl = "https://some-random-api.com";
const validOptions = {
  animal: ["bird", "cat", "dog", "fox", "kangaroo", "koala", "panda", "raccoon", "red_panda"],
  animu: ["face-palm", "hug", "pat", "quote", "wink"],
  canvas: {
    filter: ["blue", "blurple", "blurple2", "brightness", "color", "green", "greyscale", "invert", "invertgreyscale", "red", "sepia", "threshold"],
    misc: ["bisexual", "blur", "circle", "colorviewer", "heart", "hex", "horny", "its-so-stupid", "jpg", "lesbian", "lgbt", "lied", "lolice", "namecard", "nobitches", "nonbinary", "oogway", "oogway2", "pansexual", "pixelate", "rgb", "simpcard", "spin", "tonikawa", "transgender", "tweet", "youtube-comment"],
    overlay: ["comrade", "gay", "glass", "jail", "passed", "triggered", "wasted"]
  },
  facts: ["bird", "cat", "dog", "fox", "koala", "panda"],
  img: ["bird", "cat", "dog", "fox", "kangaroo", "koala", "panda", "pikachu", "raccoon", "red_panda", "whale"],
  others: ["base64", "binary", "bottoken", "dictionary", "joke", "lyrics"],
  pokemon: ["abilities", "items", "moves", "pokedex"]
};
export default async function handler(req, res) {
  const {
    type,
    query,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!type || !query) return res.status(400).json({
    error: "Paramenter 'type' dan 'query' wajib diisi"
  });
  const endpoint = type === "animal" && validOptions.animal.includes(query) ? `animal/${query}` : type === "animu" && validOptions.animu.includes(query) ? `animu/${query}` : type === "canvas" ? Object.entries(validOptions.canvas).find(([key, list]) => query.startsWith(`${key}/`) && list.includes(query.replace(`${key}/`, "")))?.[1] && `canvas/${query}` : type === "facts" && validOptions.facts.includes(query) ? `facts/${query}` : type === "img" && validOptions.img.includes(query) ? `img/${query}` : type === "others" && validOptions.others.includes(query) ? `others/${query}` : type === "pokemon" && validOptions.pokemon.includes(query) ? `pokemon/${query}` : type === "welcome" ? "welcome" : null;
  if (!endpoint) return res.status(400).json({
    error: "Tipe atau query tidak valid"
  });
  const queryString = new URLSearchParams(params).toString();
  const apiUrl = `${baseApiUrl}/${endpoint}${queryString ? `?${queryString}` : ""}`;
  try {
    const response = await fetch(apiUrl);
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const jsonData = await response.json();
      return res.status(200).json(jsonData);
    }
    if (contentType?.includes("image")) {
      const buffer = await response.arrayBuffer();
      res.setHeader("Content-Type", contentType);
      return res.end(Buffer.from(buffer));
    }
    return res.status(400).json({
      error: "Unsupported content type"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Gagal mengambil data",
      details: error.message
    });
  }
}