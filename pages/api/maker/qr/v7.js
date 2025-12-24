import axios from "axios";
class QRTigerQRCodeGenerator {
  constructor() {
    this.url = "https://qrtiger.com/qrcodes/qr2";
  }
  async generateQRCode(params = {}) {
    const defaultParams = {
      size: 500,
      colorDark: "#054080",
      logo: null,
      eye_outer: "eyeOuter2",
      eye_inner: "eyeInner1",
      qrData: "pattern0",
      backgroundColor: "rgb(255,255,255)",
      transparentBkg: false,
      qrCategory: "text",
      text: ""
    };
    const finalParams = {
      ...defaultParams,
      ...params
    };
    const payload = {
      size: finalParams.size,
      colorDark: finalParams.colorDark,
      logo: finalParams.logo,
      eye_outer: finalParams.eye_outer,
      eye_inner: finalParams.eye_inner,
      qrData: finalParams.qrData,
      backgroundColor: finalParams.backgroundColor,
      transparentBkg: finalParams.transparentBkg,
      qrCategory: finalParams.qrCategory,
      text: finalParams.text
    };
    try {
      const response = await axios.post(this.url, payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://www.qrcode-tiger.com/",
          Origin: "https://www.qrcode-tiger.com",
          "Cache-Control": "no-cache",
          Pragma: "no-cache"
        },
        responseType: "json"
      });
      if (response.data && response.data.data) {
        const base64Data = response.data.data;
        return Buffer.from(base64Data, "base64");
      } else {
        throw new Error("No QR code data found in the response");
      }
    } catch (error) {
      throw new Error("Failed to generate QR code");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const generator = new QRTigerQRCodeGenerator();
  if (!params.data) {
    return res.status(400).json({
      error: "Data parameter is required"
    });
  }
  try {
    const result = await generator.generateQRCode(params);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="qrcode.png"');
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate QR code"
    });
  }
}