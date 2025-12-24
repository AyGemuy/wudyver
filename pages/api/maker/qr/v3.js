import axios from "axios";
class QrCodeGenerator {
  async generateQRCode(data, options = {}) {
    if (!data) {
      throw new Error("Data for QR code generation is required.");
    }
    const {
      datatype = "Raw",
        errorcorrection = "Q",
        codepage = "Utf8",
        quietzone = 0,
        quietunit = "Mil",
        dpi = 300,
        size = "Medium",
        color = "#000000",
        istransparent = false,
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
        istransparent: typeof istransparent === "boolean" ? istransparent : String(istransparent).toLowerCase() === "true",
        backcolor: backcolor
      },
      output: {
        method: "Base64"
      }
    };
    try {
      const response = await axios.post("https://qrcode.tec-it.com/API/QRCode", payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
          Origin: "https://qrcode.tec-it.com",
          "User-Agent": "Mozilla/5.0",
          "X-Requested-With": "XMLHttpRequest"
        },
        responseType: "text"
      });
      if (!response.data) {
        throw new Error("No image data received from QR code API.");
      }
      return Buffer.from(response.data, "base64");
    } catch (error) {
      console.error("Error generating QR code:", error.response?.data || error.message);
      if (error.response?.data) {
        throw new Error(`Failed to generate QR code: ${error.response.data}`);
      }
      throw new Error("Failed to generate QR code due to network or API issues.");
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
    if (!data) {
      return res.status(400).json({
        error: "Paramenter 'data' is required."
      });
    }
    const qrImageBuffer = await qrCodeGenerator.generateQRCode(data, options);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="qrcode.png"');
    return res.status(200).send(qrImageBuffer);
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}