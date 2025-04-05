import axios from "axios";
class QrCodeGenerator {
  async generateQRCode(data, options = {}) {
    const {
      datatype = "Raw",
        errorcorrection = "Q",
        codepage = "Utf8",
        quietzone = 0,
        quietunit = "Mil",
        dpi = 300,
        size = "Medium",
        color = "#000000",
        istransparent = "false",
        backcolor = "#ffffff"
    } = options;
    const payload = {
      data: {
        data: data,
        datatype: datatype
      },
      settings: {
        errorcorrection: errorcorrection,
        codepage: codepage,
        quietzone: quietzone,
        quietunit: quietunit,
        dpi: dpi,
        size: size,
        color: color,
        istransparent: istransparent,
        backcolor: backcolor
      },
      output: {
        method: "Base64"
      }
    };
    const headers = {
      Accept: "*/*",
      "Content-Type": "application/json",
      Origin: "https://qrcode.tec-it.com",
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest"
    };
    try {
      const {
        data: responseData
      } = await axios.post("https://qrcode.tec-it.com/API/QRCode", payload, {
        headers: headers
      });
      return Buffer.from(responseData, "base64");
    } catch (error) {
      console.error(error);
      throw new Error("Failed to generate QR code");
    }
  }
}
export default async function handler(req, res) {
  try {
    const qrCodeGenerator = new QrCodeGenerator();
    const {
      data,
      ...options
    } = req.method === "GET" ? req.query : req.body;
    if (!data) return res.status(400).json({
      error: "Data is required"
    });
    const result = await qrCodeGenerator.generateQRCode(data, options);
    res.setHeader("Content-Type", "image/png");
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Server error"
    });
  }
}