import fetch from "node-fetch";
class ImageGenerator {
  constructor(prompt) {
    this.prompt = prompt;
    this.apiUrl = "https://pixiebrix-demo-api.herokuapp.com/calculators/generate-image/";
  }
  async generateImage() {
    if (!this.prompt) {
      throw new Error("Prompt tidak boleh kosong");
    }
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          Connection: "keep-alive",
          Origin: "https://pixiebrix-demo-api.herokuapp.com",
          Referer: "https://pixiebrix-demo-api.herokuapp.com/calculators/embed/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "Content-Type": "application/json",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        body: JSON.stringify({
          prompt: this.prompt
        })
      });
      if (!response.ok) {
        throw new Error(`Error from image generator API: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Gagal memanggil API: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt wajib diberikan."
    });
  }
  try {
    const imageGenerator = new ImageGenerator(prompt);
    const imageData = await imageGenerator.generateImage();
    return res.status(200).json(imageData);
  } catch (error) {
    console.error("Error while generating image:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}