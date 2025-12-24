import axios from "axios";
class QRCodeGenerator {
  constructor() {
    this.apiUrl = "https://public-api.qr-code-generator.com/v1/create/free";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://www.qr-code-generator.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.qr-code-generator.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateQRCode(params) {
    try {
      const {
        data
      } = await axios.get(this.apiUrl, {
        headers: this.headers,
        params: params,
        responseType: "arraybuffer"
      });
      return Buffer.from(data);
    } catch (error) {
      throw new Error("Error generating QR Code: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      fmt = "PNG",
        width = 500,
        fg = "#000000",
        bg = "#000000",
        frame = "no-frame",
        logo = "",
        pattern = "",
        text = "Default Text"
    } = req.method === "GET" ? req.query : req.body;
    const qrCodeGenerator = new QRCodeGenerator();
    const params = {
      image_format: fmt,
      image_width: parseInt(width, 10),
      foreground_color: fg,
      frame_color: bg,
      frame_name: frame,
      qr_code_logo: logo,
      qr_code_pattern: pattern,
      qr_code_text: text
    };
    const imageBuffer = await qrCodeGenerator.generateQRCode(params);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="qrcode.png"');
    return res.status(200).send(imageBuffer);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate QR code"
    });
  }
}