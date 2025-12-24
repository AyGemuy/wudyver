import fetch from "node-fetch";
const baseApiUrl = "https://nekos.life/api";
export default async function handler(req, res) {
  const {
    method,
    query,
    body
  } = req;
  const params = method === "GET" ? query : body;
  if (!params.type) {
    return res.status(400).json({
      error: 'Paramenter "type" is required.'
    });
  }
  const validTypes = ["8ball", "cat", "hug", "kiss", "lizard", "neko", "pat", "smug", "woof", "gasm", "goose", "cuddle", "avatar", "slap", "gecg", "feed", "fox_girl", "meow", "wallpaper", "tickle", "spank", "waifu", "lewd", "ngif"];
  if (!validTypes.includes(params.type)) {
    return res.status(400).json({
      error: `Invalid type. Valid types are: ${validTypes.join(", ")}`
    });
  }
  const apiUrl = `${baseApiUrl}/${params.type}`;
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
    return res.status(415).json({
      error: "Unsupported content type received."
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}