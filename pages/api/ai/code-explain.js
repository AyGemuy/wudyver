import axios from "axios";
class Wdtc {
  async check(code) {
    const validateInput = text => {
      if (!text?.trim()) {
        throw new Error("Code is required.");
      }
      if (text.length > 5e3) {
        throw new Error("Code exceeds maximum length of 5000 characters.");
      }
    };
    const processResult = text => {
      return text.split("\n").filter(line => !line.includes("Share this explanation")).join("\n").trim();
    };
    try {
      validateInput(code);
      const {
        data
      } = await axios.post("https://whatdoesthiscodedo.com/api/stream-text", {
        code: code
      }, {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          Origin: "https://whatdoesthiscodedo.com",
          Referer: "https://whatdoesthiscodedo.com/",
          "User-Agent": "Postify/1.0.0"
        },
        responseType: "text"
      });
      return {
        data: processResult(data)
      };
    } catch (error) {
      return {
        error: error.response?.data || "Error processing code."
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const wdtc = new Wdtc();
    const code = req.method === "GET" ? req.query.code : req.body.code;
    if (!code) {
      return res.status(400).json({
        error: "Code is required."
      });
    }
    const result = await wdtc.check(code);
    if (result.error) {
      return res.status(500).json({
        error: result.error
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Server error."
    });
  }
}