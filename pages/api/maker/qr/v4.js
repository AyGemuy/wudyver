import axios from "axios";
class BarcodeGenerator {
  async generateBarcode(data, code = "QRCode", imagetype = "Png", eclevel = "L", download = true) {
    const payload = new URLSearchParams({
      data: data,
      code: code,
      imagetype: imagetype,
      eclevel: eclevel,
      download: download.toString()
    }).toString();
    const headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://barcode.tec-it.com",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://barcode.tec-it.com/en/QRCode",
      "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "Sec-CH-UA-Mobile": "?1",
      "Sec-CH-UA-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "X-Requested-With": "XMLHttpRequest"
    };
    try {
      const response = await axios.post("https://barcode.tec-it.com/barcode.ashx", payload, {
        headers: headers,
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      return {
        error: "Failed to generate barcode"
      };
    }
  }
}
export default async function handler(req, res) {
  const barcodeGenerator = new BarcodeGenerator();
  const {
    data,
    code = "QRCode",
    imagetype = "Png",
    eclevel = "L",
    download = true
  } = req.method === "GET" ? req.query : req.body;
  if (!data) {
    return res.status(400).json({
      error: "Data is required"
    });
  }
  try {
    const result = await barcodeGenerator.generateBarcode(data, code, imagetype, eclevel, download);
    if (result.error) {
      return res.status(500).json({
        error: result.error
      });
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="qrcode.png"');
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}