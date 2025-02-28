import axios from "axios";
class QRTigerQRCodeGenerator {
  async generateQRCode({
    size = 500,
    colorDark = "#054080",
    logo = null,
    eye_outer = "eyeOuter2",
    eye_inner = "eyeInner1",
    qrData = "pattern0",
    backgroundColor = "rgb(255,255,255)",
    transparentBkg = false,
    qrCategory = "text",
    text = ""
  }) {
    const url = "https://qrtiger.com/qrcodes/qr2";
    const payload = {
      size: size,
      colorDark: colorDark,
      logo: logo,
      eye_outer: eye_outer,
      eye_inner: eye_inner,
      qrData: qrData,
      backgroundColor: backgroundColor,
      transparentBkg: transparentBkg,
      qrCategory: qrCategory,
      text: text
    };
    try {
      const response = await axios.post(url, payload, {
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
      return {
        error: "Failed to generate QR code"
      };
    }
  }
}
export default async function handler(req, res) {
  const qRTigerQRCodeGenerator = new QRTigerQRCodeGenerator();
  const {
    size = 500,
      colorDark = "#054080",
      logo = null,
      eye_outer = "eyeOuter2",
      eye_inner = "eyeInner1",
      qrData = "pattern0",
      backgroundColor = "rgb(255,255,255)",
      transparentBkg = false,
      qrCategory = "text",
      data: text = ""
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Data parameter is required"
    });
  }
  try {
    const result = await qRTigerQRCodeGenerator.generateQRCode({
      size: size,
      colorDark: colorDark,
      logo: logo,
      eye_outer: eye_outer,
      eye_inner: eye_inner,
      qrData: qrData,
      backgroundColor: backgroundColor,
      transparentBkg: transparentBkg,
      qrCategory: qrCategory,
      text: text
    });
    if (result.error) {
      return res.status(500).json({
        error: result.error
      });
    }
    res.setHeader("Content-Type", "image/png");
    res.send(result);
  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}