import fetch from "node-fetch";

const getFonts = async () => {
  const res = await fetch("https://api.memegen.link/fonts", {
    headers: { accept: "application/json" },
  });
  const fonts = await res.json();
  return Object.values(fonts).map((v) => v.id);
};

const createImage = async (bg, atas, bawah, font) => {
  const res = await fetch("https://api.memegen.link/images/custom", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      background: bg,
      text: [encodeURIComponent(atas || ""), encodeURIComponent(bawah || "")],
      font: font,
      extension: "png",
    }),
  });
  return await res.json();
};

const fetchBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image from ${url}`);
  return await response.arrayBuffer();
};

export default async function handler(req, res) {
const { method } = req;
  const { link, top, bottom, font } = req.method === 'GET' ? req.query : req.body;
    if (link && top && bottom) {
      try {
        const fonts = await getFonts();
        const selectedFont = fonts[font - 1] || fonts[0];
        const memeImage = await createImage(link, top, bottom, selectedFont);
        const imageBuffer = await fetchBuffer(memeImage.url);
        res.setHeader("Content-Type", "image/webp");
        res.status(200).send(Buffer.from(imageBuffer));
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    } else {
      return res.status(400).json({ error: "Parameters 'link', 'top', 'bottom', and 'font' are required." });
    }
}
