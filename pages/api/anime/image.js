import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    anime
  } = req.method === "GET" ? req.query : req.body;
  if (!anime) {
    return res.status(400).send(`
          Anime type is required. Please choose one of the following:
          loli, neko, waifu, zerotwo
        `);
  }
  const apiUrls = {
    loli: "https://weeb-api.vercel.app/loli",
    neko: "https://weeb-api.vercel.app/neko",
    waifu: "https://weeb-api.vercel.app/waifu",
    zerotwo: "https://weeb-api.vercel.app/zerotwo"
  };
  const apiUrl = apiUrls[anime.toLowerCase()];
  if (!apiUrl) {
    return res.status(404).send(`
          Anime type not found. Please choose one of the following:
          loli, neko, waifu, zerotwo
        `);
  }
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      redirect: "follow"
    });
    if (!response.ok) {
      return res.status(500).send("Failed to fetch the redirect link");
    }
    const finalUrl = response.url;
    const imageResponse = await fetch(finalUrl);
    if (!imageResponse.ok) {
      return res.status(500).send("Failed to fetch the image from the redirect link");
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(buffer);
  } catch (error) {
    res.status(500).send("Failed to fetch anime image");
  }
}