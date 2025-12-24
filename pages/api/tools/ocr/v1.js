import axios from "axios";
import {
  FormData
} from "formdata-node";

function detectInput(input) {
  if (input.startsWith("http")) return "url";
  if (input.startsWith("data:")) return "base64Image";
  return "file";
}
async function ocrSpace(url, options = {}) {
  try {
    if (!url || typeof url !== "string") {
      throw Error("Param url is required and must be typeof string");
    }
    const {
      apiKey,
      ocrUrl,
      language,
      isOverlayRequired,
      filetype,
      detectOrientation,
      isCreateSearchablePdf,
      isSearchablePdfHideTextLayer,
      scale,
      isTable,
      OCREngine
    } = options;
    const formData = new FormData();
    const detectedInput = detectInput(url);
    switch (detectedInput) {
      case "file":
        throw new Error("File handling is not supported. Please provide a URL or base64 image.");
      case "url":
      case "base64Image":
        formData.append(detectedInput, url);
        break;
    }
    formData.append("language", String(language || "eng"));
    formData.append("isOverlayRequired", String(isOverlayRequired || "false"));
    if (filetype) {
      formData.append("filetype", String(filetype));
    }
    formData.append("detectOrientation", String(detectOrientation || "false"));
    formData.append("isCreateSearchablePdf", String(isCreateSearchablePdf || "false"));
    formData.append("isSearchablePdfHideTextLayer", String(isSearchablePdfHideTextLayer || "false"));
    formData.append("scale", String(scale || "false"));
    formData.append("isTable", String(isTable || "false"));
    formData.append("OCREngine", String(OCREngine || "1"));
    const request = {
      method: "POST",
      url: String(ocrUrl || "https://api.ocr.space/parse/image"),
      headers: {
        apikey: String(apiKey || "helloworld")
      },
      data: formData,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    };
    const {
      data
    } = await axios(request);
    return data;
  } catch (error) {
    console.error(error);
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      apiKey,
      ocrUrl,
      language,
      isOverlayRequired,
      filetype,
      detectOrientation,
      isCreateSearchablePdf,
      isSearchablePdfHideTextLayer,
      scale,
      isTable,
      OCREngine
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        message: "URL is required"
      });
    }
    const options = {
      apiKey: apiKey,
      ocrUrl: ocrUrl,
      language: language,
      isOverlayRequired: isOverlayRequired,
      filetype: filetype,
      detectOrientation: detectOrientation,
      isCreateSearchablePdf: isCreateSearchablePdf,
      isSearchablePdfHideTextLayer: isSearchablePdfHideTextLayer,
      scale: scale,
      isTable: isTable,
      OCREngine: OCREngine
    };
    const result = await ocrSpace(url, options);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "An unexpected error occurred."
    });
  }
}