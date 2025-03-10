import axios from "axios";
class MemeGenerator {
  constructor() {
    this.api = "https://api.memegen.link";
  }
  formatText(text) {
    return encodeURIComponent(text.trim());
  }
  async request(endpoint, method = "GET", body = null) {
    try {
      const options = {
        method: method,
        url: `${this.api}${endpoint}`
      };
      if (body) options.data = body;
      const {
        data
      } = await axios(options);
      return data;
    } catch (err) {
      throw new Error(`Gagal memproses permintaan: ${err.message}`);
    }
  }
  async getFonts() {
    try {
      const fonts = await this.request("/fonts");
      return fonts.map(v => v.id);
    } catch {
      throw new Error("Gagal mengambil daftar font.");
    }
  }
  async getTemplates() {
    try {
      const templates = await this.request("/templates");
      return templates.map(t => t.id);
    } catch {
      throw new Error("Gagal mengambil daftar template.");
    }
  }
  async createImage(bg, top, bottom, font) {
    try {
      return await this.request("/images/custom", "POST", {
        background: bg,
        text: [top, bottom],
        font: font,
        extension: "png"
      });
    } catch {
      throw new Error("Gagal membuat gambar kustom.");
    }
  }
  async createImageFromTemplate(template, top, bottom) {
    try {
      return {
        url: `${this.api}/images/${template}/${this.formatText(top)}/${this.formatText(bottom)}.png`
      };
    } catch {
      throw new Error("Gagal membuat gambar dari template.");
    }
  }
  async fetchBuffer(imageUrl) {
    try {
      const {
        data
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return Buffer.from(data);
    } catch {
      throw new Error("Gagal mengambil gambar meme.");
    }
  }
}
export default async function handler(req, res) {
  const memeGen = new MemeGenerator();
  const {
    url,
    top = " ",
    bottom = " ",
    font = 0,
    template
  } = req.method === "GET" ? req.query : req.body;
  if (!top || !bottom) {
    return res.status(400).json({
      error: "Parameters 'top' dan 'bottom' diperlukan."
    });
  }
  try {
    const fonts = await memeGen.getFonts();
    const selectedFont = font ? fonts[font - 1] : fonts[0];
    let memeImage;
    if (template) {
      try {
        const templates = await memeGen.getTemplates();
        const templateId = templates[template - 1] || templates[0];
        memeImage = await memeGen.createImageFromTemplate(templateId, top, bottom);
      } catch {
        return res.status(400).json({
          error: "Gagal membuat meme dari template."
        });
      }
    } else if (url) {
      try {
        memeImage = await memeGen.createImage(url, top, bottom, selectedFont);
      } catch {
        return res.status(400).json({
          error: "Gagal membuat meme dari gambar custom."
        });
      }
    } else {
      return res.status(400).json({
        error: "Parameter 'url' atau 'template' diperlukan."
      });
    }
    try {
      const imageBuffer = await memeGen.fetchBuffer(memeImage.url);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } catch {
      return res.status(500).json({
        error: "Gagal mengambil gambar meme."
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}