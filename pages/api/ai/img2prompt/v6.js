import axios from "axios";
class ImageToPrompt {
  constructor() {
    this.listModel = ["general", "flux", "midjourney", "stableDiffusion"];
    this.listLanguage = ["en", "zh", "ru", "de", "es", "it"];
    this.apiUrl = "https://imagetoprompt.org/api/describe/generate";
    this.wsrvBaseUrl = "https://wsrv.nl/?url=";
  }
  async getPrompt(imageUrl, options = {}) {
    try {
      const {
        model = "general",
          language = "en",
          resize = {
            width: 768,
            fit: "inside",
            quality: 50
          }
      } = options;
      if (!this.listModel.includes(model)) {
        throw new Error(`Model '${model}' tidak valid.`);
      }
      if (!this.listLanguage.includes(language)) {
        throw new Error(`Bahasa '${language}' tidak valid.`);
      }
      let processedImageUrl = imageUrl;
      if (resize) {
        let wsrvParams = "";
        if (resize.width) wsrvParams += `&w=${resize.width}`;
        if (resize.height) wsrvParams += `&h=${resize.height}`;
        if (resize.fit) wsrvParams += `&fit=${resize.fit}`;
        if (resize.quality) wsrvParams += `&q=${resize.quality}`;
        processedImageUrl = `${this.wsrvBaseUrl}${encodeURIComponent(imageUrl)}${wsrvParams}`;
      }
      const imageResponse = await axios.get(processedImageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      const headers = {
        "Content-Type": "application/json",
        Referer: "https://imagetoprompt.org/"
      };
      const payload = {
        image: imageBuffer.toString("base64"),
        model: model,
        language: language
      };
      const response = await axios.post(this.apiUrl, payload, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Gagal mendapatkan prompt: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`Tidak ada respons dari server: ${error.message}`);
      } else {
        throw new Error(`Kesalahan dalam permintaan: ${error.message}`);
      }
    }
  }
}
export default async function handler(req, res) {
  const imageToPromptService = new ImageToPrompt();
  const {
    imageUrl,
    model,
    language,
    resize
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    return res.status(400).json({
      error: 'Paramenter "imageUrl" diperlukan.'
    });
  }
  try {
    const promptData = await imageToPromptService.getPrompt(imageUrl, {
      model: model,
      language: language,
      resize: resize
    });
    return res.status(200).json(promptData);
  } catch (error) {
    console.error("Kesalahan di API:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}