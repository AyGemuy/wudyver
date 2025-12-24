import axios from "axios";
class BratGenerator {
  constructor() {
    this.url = "https://www.bestcalculators.org/wp-admin/admin-ajax.php";
    this.headers = {
      authority: "www.bestcalculators.org",
      accept: "*/*",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://www.bestcalculators.org",
      referer: "https://www.bestcalculators.org/online-generators/brat-text-generator/",
      "user-agent": "Postify/1.0.0",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async create(text = "Brat", fontSize = "100", blur = "5") {
    try {
      const data = new URLSearchParams({
        action: "generate_brat_text",
        text: text,
        fontSize: fontSize,
        blurLevel: blur
      });
      const {
        data: base64
      } = await axios.post(this.url, data.toString(), {
        headers: this.headers
      });
      return Buffer.from(base64, "base64");
    } catch {
      throw new Error("Failed to generate image");
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      text = "Brat",
        fontSize = "100",
        blur = "5"
    } = req.method === "GET" ? req.query : req.body;
    const imageBuffer = await new BratGenerator().create(text, fontSize, blur);
    res.setHeader("Content-Type", "image/png");
    res.end(imageBuffer);
  } catch {
    res.status(500).end();
  }
}