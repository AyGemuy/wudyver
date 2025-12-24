import axios from "axios";
class ImageGenerator {
  constructor() {
    this.url = "https://keremerkan.net/generator/code.png";
  }
  async getImageBuffer(params = {}) {
    const defaultParams = {
      do: 1,
      action: "text",
      ecl: "L",
      block: 20,
      margin: 1,
      otype: "png",
      ctype: "q",
      fg: "#000000",
      bg: "#FFFFFF",
      hid: "7d4f629c-65737102",
      free_text: params.data || "ylooo"
    };
    try {
      const response = await axios.get(this.url, {
        params: {
          ...defaultParams,
          ...params
        },
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error("Error fetching image data");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.data) {
    return res.status(400).json({
      error: "Data parameter is required"
    });
  }
  const generator = new ImageGenerator();
  try {
    const buffer = await generator.getImageBuffer(params);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="qrcode.png"');
    return res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate image"
    });
  }
}