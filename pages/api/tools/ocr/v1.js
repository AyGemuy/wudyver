import { fileTypeFromBuffer } from 'file-type';
import { FormData } from 'formdata-node';
import fetch from 'node-fetch';

const detectInput = (input) =>
  typeof input === "string" && input.startsWith("http")
    ? "url"
    : Buffer.isBuffer(input)
      ? "file"
      : typeof input === "string" && input.startsWith("data:")
        ? "base64Image"
        : "file";

const ocrSpace = async (input, options = {}) => {
  try {
    const {
      apiKey = "helloworld",
      ocrUrl = "https://api.ocr.space/parse/image",
      language = "eng",
    } = options;

    const formData = new FormData();
    const detectedInput = detectInput(input);

    const { ext, mime } = (await fileTypeFromBuffer(input)) || {
      ext: "jpg",
      mime: "image/jpg",
    };

    if (detectedInput === "file") {
      formData.append("file", input, {
        filename: `ocr.${ext || "jpg"}`,
        contentType: mime,
      });
    } else if (detectedInput === "url") {
      formData.append("url", input);
    } else if (detectedInput === "base64Image") {
      formData.append("base64Image", input);
    }

    formData.append("language", language);
    formData.append("filetype", mime);

    const response = await fetch(ocrUrl, {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body: formData,
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default async function handler(req, res) {
  try {
    // Handle input from query (GET) or body (POST)
    const { input, apiKey, language } = req.method === 'GET' ? req.query : req.body;

    if (!input) {
      return res.status(400).json({ success: false, message: "Input is required." });
    }

    const options = {
      apiKey: apiKey || "helloworld",
      language: language || "eng",
    };

    const result = await ocrSpace(input, options);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
