import fetch from "node-fetch";
const getFonts = async () => {
  const res = await fetch("https://api.memegen.link/fonts", {
    headers: {
      accept: "application/json"
    }
  });
  const fonts = await res.json();
  return Object.values(fonts).map(v => v.id);
};
const getTemplates = async () => {
  const res = await fetch("https://api.memegen.link/templates", {
    headers: {
      accept: "application/json"
    }
  });
  const templates = await res.json();
  return templates.map(template => template.id);
};
const createImageFromTemplate = async (templateId, atas, bawah) => {
  const res = await fetch("https://api.memegen.link/images", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      template_id: templateId,
      text: [atas, bawah]
    })
  });
  return await res.json();
};
const createImage = async (bg, atas, bawah, font) => {
  const res = await fetch("https://api.memegen.link/images/custom", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      background: bg,
      text: [atas, bawah],
      font: font,
      extension: "png"
    })
  });
  return await res.json();
};
const fetchBuffer = async url => {
  const response = await fetch(url);
  return await response.arrayBuffer();
};
const formatText = text => text.trim().replace(/\s/g, "_").replace(/-/g, "__").replace(/_/g, "--").replace(/\?/g, "~q").replace(/&/g, "~a").replace(/%/g, "~p").replace(/#/g, "~h").replace(/\//g, "~s").replace(/\\/g, "~b").replace(/</g, "~l").replace(/>/g, "~g").replace(/''/g, '"');
export default async function handler(req, res) {
  const {
    link,
    top = " ",
    bottom = " ",
    font = 0,
    template
  } = req.method === "GET" ? req.query : req.body;
  if (top && bottom) {
    try {
      const fonts = await getFonts();
      const selectedFont = font ? fonts[font - 1] : fonts[0];
      const topText = formatText(top);
      const bottomText = formatText(bottom);
      let memeImage;
      if (template) {
        const templates = await getTemplates();
        const templateId = templates[template - 1] || templates[0];
        memeImage = await createImageFromTemplate(templateId, topText, bottomText);
      } else if (link) {
        memeImage = await createImage(link, topText, bottomText, selectedFont);
      } else {
        return res.status(400).json({
          error: "Parameter 'link' atau 'template' diperlukan."
        });
      }
      const imageBuffer = await fetchBuffer(memeImage.url);
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(Buffer.from(imageBuffer));
    } catch (error) {
      return res.status(500).json({
        error: error.message
      });
    }
  } else {
    return res.status(400).json({
      error: "Parameters 'top' dan 'bottom' diperlukan."
    });
  }
}