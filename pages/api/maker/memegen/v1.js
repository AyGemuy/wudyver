import axios from "axios";
class MemeGenerator {
  constructor() {
    this.api = "https://api.memegen.link";
    this.chars = {
      " ": "_",
      _: "__",
      "-": "--",
      "\n": "~n",
      "?": "~q",
      "&": "~a",
      "%": "~p",
      "#": "~h",
      "/": "~s",
      "\\": "~b",
      "<": "~l",
      ">": "~g",
      '"': "''"
    };
  }
  encodeText(text) {
    return text ? text.split("").map(c => this.chars[c] || c).join("") : "_";
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
    if (!/^https?:\/\/.+/i.test(bg)) {
      throw new Error("URL gambar tidak valid.");
    }
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
      const encodedTop = this.encodeText(top);
      const encodedBottom = this.encodeText(bottom);
      return {
        url: `${this.api}/images/${template}/${encodedTop}/${encodedBottom}.png`
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
  async fetchBase64(imageUrl) {
    try {
      const buffer = await this.fetchBuffer(imageUrl);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch {
      throw new Error("Gagal mengonversi gambar ke base64.");
    }
  }
}
export default async function handler(req, res) {
  const memeGen = new MemeGenerator();
  const {
    action,
    link,
    top = " ",
    bottom = " ",
    font = 0,
    template,
    output = "buffer"
  } = req.method === "GET" ? req.query : req.body;
  try {
    switch (action) {
      case "fonts":
        return res.status(200).json(await memeGen.getFonts());
      case "templates":
        return res.status(200).json(await memeGen.getTemplates());
      case "generate":
        if (!top || !bottom) {
          return res.status(400).json({
            error: "Paramenters 'top' dan 'bottom' diperlukan."
          });
        }
        const fonts = await memeGen.getFonts();
        const selectedFont = font ? fonts[font - 1] : fonts[0];
        let memeImage;
        if (template) {
          const templates = await memeGen.getTemplates();
          const templateId = templates[template - 1] || templates[0];
          memeImage = await memeGen.createImageFromTemplate(templateId, top, bottom);
        } else if (link) {
          if (!/^https?:\/\/.+/i.test(link)) {
            return res.status(400).json({
              error: "URL gambar tidak valid."
            });
          }
          memeImage = await memeGen.createImage(link, top, bottom, selectedFont);
        } else {
          return res.status(400).json({
            error: "Paramenter 'link' atau 'template' diperlukan."
          });
        }
        if (!memeImage.url) {
          return res.status(500).json({
            error: "Gagal mendapatkan URL gambar meme."
          });
        }
        if (output === "url") {
          return res.status(200).json({
            url: memeImage.url
          });
        }
        try {
          if (output === "buffer") {
            const imageBuffer = await memeGen.fetchBuffer(memeImage.url);
            res.setHeader("Content-Type", "image/png");
            return res.status(200).send(imageBuffer);
          } else if (output === "base64") {
            const base64Image = await memeGen.fetchBase64(memeImage.url);
            return res.status(200).json({
              base64: base64Image
            });
          } else {
            return res.status(400).json({
              error: "Format output tidak valid."
            });
          }
        } catch {
          return res.status(500).json({
            error: "Gagal mengambil gambar meme."
          });
        }
      default:
        return res.status(400).json({
          error: "Aksi tidak valid. Gunakan 'fonts', 'templates', atau 'generate'."
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}