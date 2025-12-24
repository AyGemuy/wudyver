import axios from "axios";
import xml2js from "xml2js";
class TextCraftImageGenerator {
  constructor() {
    this.BASE_URL = "https://textcraft.net/gentext3.php";
    this.STATIC_URL = "https://static1.textcraft.net";
    this.DEFAULT_PARAMS = {
      font_style: "font1",
      font_size: "x",
      font_colour: "0",
      bgcolour: "#2C262E",
      glow_halo: "0",
      glossy: "0",
      lighting: "0",
      fit_lines: "0",
      truecolour_images: "0",
      non_trans: "false",
      glitter_border: "true",
      text_border: "1",
      border_colour: "#2C262E",
      anim_type: "none",
      submit_type: "text",
      perspective_effect: "1",
      drop_shadow: "1",
      savedb: "0",
      multiline: "3",
      font_style2: "font6",
      font_style3: "font6",
      font_size2: "t",
      font_size3: "t",
      font_colour2: "68",
      font_colour3: "66",
      text_border2: "1",
      text_border3: "1",
      border_colour2: "#211E4E",
      border_colour3: "#EBD406"
    };
  }
  async generate({
    text,
    text2,
    text3,
    ...options
  }) {
    if (!text && !text2 && !text3) {
      throw new Error("Setidaknya satu parameter teks (text, text2, atau text3) harus disediakan.");
    }
    const queryParams = new URLSearchParams({
      text: text,
      text2: text2,
      text3: text3,
      ...this.DEFAULT_PARAMS,
      ...options
    }).toString();
    const fullUrl = `${this.BASE_URL}?${queryParams}`;
    try {
      const response = await axios.get(fullUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          Referer: "https://textcraft.net/",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "no-cache"
        },
        timeout: 1e4,
        responseType: "text"
      });
      const parsed = await xml2js.parseStringPromise(response.data);
      const filename = parsed.image.fullfilename[0];
      const datadir = parsed.image.datadir[0];
      const imageUrl = `${this.STATIC_URL}/${datadir}/${filename}`;
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = imageResponse.headers["content-type"] || "image/png";
      return {
        data: imageResponse.data,
        contentType: contentType
      };
    } catch (err) {
      console.error("Error generating or fetching image:", err.message);
      throw new Error(`Failed to generate or fetch image: ${err.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text && !params.text2 && !params.text3) {
    return res.status(400).json({
      error: "Setidaknya satu parameter teks (text, text2, atau text3) harus disediakan."
    });
  }
  try {
    const maker = new TextCraftImageGenerator();
    const {
      data: imageData,
      contentType
    } = await maker.generate(params);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
    return res.status(200).send(imageData);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}