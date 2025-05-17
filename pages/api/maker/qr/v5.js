import axios from "axios";
class QRCodeGenerator {
  async generateQRCode({
    data = "",
    color = "000000",
    bgcolor = "FFFFFF",
    qzone = 1,
    margin = 0,
    size = "200x200",
    ecc = "L"
  }) {
    const url = `https://api.qrserver.com/v1/create-qr-code/`;
    const params = {
      data: data,
      color: color,
      bgcolor: bgcolor,
      qzone: qzone,
      margin: margin,
      size: size,
      ecc: ecc
    };
    try {
      const response = await axios.get(url, {
        params: params,
        responseType: "arraybuffer",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Referer: "https://goqr.me/",
          "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "Sec-CH-UA-Mobile": "?1",
          "Sec-CH-UA-Platform": '"Android"',
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error("Failed to generate QR code: " + (error.response ? error.response.data : error.message));
    }
  }
}
export default async function handler(req, res) {
  const qrCodeGenerator = new QRCodeGenerator();
  const {
    data = "",
      color = "000000",
      bgcolor = "FFFFFF",
      qzone = 1,
      margin = 0,
      size = "200x200",
      ecc = "L"
  } = req.method === "GET" ? req.query : req.body;
  if (!data) {
    return res.status(400).json({
      error: "Data is required"
    });
  }
  try {
    const qrCodeImage = await qrCodeGenerator.generateQRCode({
      data: data,
      color: color,
      bgcolor: bgcolor,
      qzone: qzone,
      margin: margin,
      size: size,
      ecc: ecc
    });
    res.setHeader("Content-Type", "image/png");
    res.send(qrCodeImage);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}