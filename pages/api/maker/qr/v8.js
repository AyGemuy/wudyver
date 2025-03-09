import axios from "axios";
class BarcodeGenerator {
  async generateBarcode(data, code = "QRCode", imagetype = "Png", eclevel = "L", download = true) {
    const params = new URLSearchParams({
      do: "1",
      action: "text",
      ecl: eclevel,
      block: "20",
      margin: "1",
      otype: imagetype.toLowerCase(),
      ctype: code.toLowerCase(),
      fg: "%23000000",
      bg: "%23FFFFFF",
      hid: "01bad9af-61215424",
      free_text: data
    }).toString();
    const url = `https://keremerkan.net/generator/code.png?${params}`;
    const headers = {
      Accept: "image/png",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Origin: "https://keremerkan.net",
      Referer: "https://keremerkan.net/en/QRCode",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    try {
      const response = await axios.get(url, {
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
    res.send(result);
  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}