import fetch from "node-fetch";
class PaintByText {
  constructor() {
    this.url = "https://paintbytext.chat/api/predictions";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://paintbytext.chat/?ref=taaft&utm_source=taaft&utm_medium=referral"
    };
  }
  async create(imageBuffer, prompt = "4k", mimeType = "image/jpeg") {
    try {
      const imageDataUri = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
      const response = await fetch(this.url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          prompt: prompt,
          image: imageDataUri
        })
      });
      if (!response.ok) throw new Error(`Prediction request failed: ${response.status}`);
      const {
        id: predictionId
      } = await response.json();
      const maxPollingTime = Date.now() + 6e4;
      while (Date.now() < maxPollingTime) {
        const pollResponse = await fetch(`${this.url}/${predictionId}`, {
          method: "GET",
          headers: this.headers
        });
        if (!pollResponse.ok) throw new Error(`Polling error: ${pollResponse.status}`);
        const pollResult = await pollResponse.json();
        if (pollResult.status === "succeeded") return pollResult;
        await new Promise(resolve => setTimeout(resolve, 2e3));
      }
      throw new Error("Polling timed out after 1 minute");
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    imageUrl,
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl || !prompt) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' dan 'prompt' diperlukan"
    });
  }
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Gagal mengambil gambar dari URL: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const paintByText = new PaintByText();
    const result = await paintByText.create(Buffer, from(buffer), prompt);
    return res.status(200).json({
      status: "success",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}