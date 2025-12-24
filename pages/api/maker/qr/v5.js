import axios from "axios";
import FormData from "form-data";
class QRCodeAPI {
  async read(options) {
    try {
      if (options.imageBuffer) {
        if (!Buffer.isBuffer(options.imageBuffer)) {
          throw new Error(`Invalid buffer input`);
        }
        const formData = new FormData();
        formData.append("file", options.imageBuffer, {
          filename: "qr_image.png",
          contentType: "image/png"
        });
        const {
          data: responseData
        } = await axios.post("http://api.qrserver.com/v1/read-qr-code/", formData, {
          headers: formData.getHeaders()
        });
        const result = responseData?.[0]?.symbol?.[0]?.data;
        if (!result) {
          throw new Error(`Request OK but result anomalous: ${JSON.stringify(responseData, null, 2)}`);
        }
        return result;
      } else if (options.url) {
        try {
          new URL(options.url);
        } catch (e) {
          throw new Error(`URL is invalid or cannot be empty`);
        }
        const {
          data: responseData
        } = await axios.get(`https://api.qrserver.com/v1/read-qr-code/?fileurl=${encodeURIComponent(options.url)}`);
        const result = responseData?.[0]?.symbol?.[0]?.data;
        if (!result) {
          throw new Error(`Request OK but result anomalous: ${JSON.stringify(responseData, null, 2)}`);
        }
        return result;
      } else {
        throw new Error("No valid input (imageBuffer or url) provided for reading QR code.");
      }
    } catch (error) {
      console.error("Error reading QR code:", error.message);
      throw error;
    }
  }
  async create({
    data = "",
    color = "000000",
    bgcolor = "FFFFFF",
    qzone = 1,
    margin = 0,
    size = "200x200",
    ecc = "L"
  } = {}) {
    try {
      if (typeof data !== "string" || data.length === 0) {
        throw new Error(`Input 'data' must be a non-empty string`);
      }
      const params = new URLSearchParams({
        data: data,
        color: color,
        bgcolor: bgcolor,
        qzone: qzone,
        margin: margin,
        size: size,
        ecc: ecc
      }).toString();
      const {
        data: buffer
      } = await axios.get(`http://api.qrserver.com/v1/create-qr-code/?${params}`, {
        responseType: "arraybuffer"
      });
      return Buffer.from(buffer);
    } catch (error) {
      console.error("Error creating QR code:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "create | read"
      }
    });
  }
  const qr = new QRCodeAPI();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.data) {
          return res.status(400).json({
            error: `Missing required field: data (for action 'create')`
          });
        }
        const qrImageBuffer = await qr.create(params);
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Disposition", 'inline; filename="qrcode.png"');
        return res.status(200).send(qrImageBuffer);
      case "read":
        if (params.url) {
          result = await qr.read({
            url: params.url
          });
        } else if (params.base64Image) {
          const imageBuffer = Buffer.from(params.base64Image, "base64");
          result = await qr.read({
            imageBuffer: imageBuffer
          });
        } else {
          return res.status(400).json({
            error: `Missing required field: url or base64Image (for action 'read')`
          });
        }
        return res.status(200).json(result);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed actions: create | read`
        });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Processing error: ${error.message}`
    });
  }
}