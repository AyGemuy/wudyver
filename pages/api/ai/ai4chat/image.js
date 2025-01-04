import fetch from 'node-fetch';

class ImageGeneratorAI4Chat {
  constructor() {
    this.headers = {
      'Accept': '*/*',
      'Accept-Language': 'id-ID,id;q=0.9',
      'Cookie': '_gcl_au=1.1.1336476884.1735699581; _fbp=fb.1.1735699590394.53830370462445697; userid=usersmjb2oaz7y',
      'Priority': 'u=1, i',
      'Referer': 'https://www.ai4chat.co/image-pages/ai-text-to-image-generator',
      'Sec-CH-UA': '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      'Sec-CH-UA-Mobile': '?1',
      'Sec-CH-UA-Platform': '"Android"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    };
  }

  async generateImage(prompt, aspectRatio = '9:16') {
    try {
      const imageRequest = await fetch(`https://www.ai4chat.co/api/image/generate?prompt=${encodeURIComponent(prompt)}&aspect_ratio=${encodeURIComponent(aspectRatio)}`, {
        method: 'GET',
        headers: this.headers,
      });

      const result = await imageRequest.json();
      return result;
    } catch (error) {
      throw new Error('Error generating image: ' + error.message);
    }
  }
}

export default async function handler(req, res) {
  try {
    const { prompt, ratio: aspectRatio } = req.method === "GET" ? req.query : req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const generator = new ImageGeneratorAI4Chat();
    const response = await generator.generateImage(prompt, aspectRatio);

    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
