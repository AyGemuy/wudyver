import crypto from "crypto";
import fetch from "node-fetch";

class ImageGenerator {
  constructor() {
    this.uniqueId = crypto.randomUUID();
    this.pollingTimeout = 60000;
    this.headers = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'id-ID,id;q=0.9',
      'Content-Type': 'application/json',
      'Cookie': '__Host-next-auth.csrf-token=9fc3701ea60ea1c4465c8e459495d88d6746ef835721e370c4628c34ab7e9761%7C2fdc226527a5412c7b70cc17c7647e24ba136fd6cc2f91cd4bccbc082388121b; __Secure-next-auth.callback-url=https%3A%2F%2Fmagichour.ai; _ga=GA1.1.1060534614.1735696796; ph_phc_alQUfkpaPAKpcFu1oDxyNpgZoUIQFGUosCJC3VtvNOh_posthog=%7B%22distinct_id%22%3A%2201941f97-39fb-72df-a0ca-2803b50fb14b%22%2C%22%24sesid%22%3A%5B1735696799582%2C%2201941f97-39f7-7e77-b881-5e501e072f5a%22%2C1735696792055%5D%2C%22%24initial_person_info%22%3A%7B%22r%22%3A%22https%3A%2F%2Fwww.google.com%2F%22%2C%22u%22%3A%22https%3A%2F%2Fmagichour.ai%2Fproducts%2Fai-image-generator%22%7D%7D; _ga_PX0XW62L06=GS1.1.1735696796.1.0.1735696799.57.0.1036323783',
      'Origin': 'https://magichour.ai',
      'Referer': 'https://magichour.ai/products/ai-image-generator',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'X-Timezone-Offset': '-480',
    };
  }

  async generateImage(prompt, orientation) {
    try {
      const imageRequest = await fetch('https://magichour.ai/api/free-tools/v1/ai-image-generator', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          prompt: prompt || 'Men',
          orientation: orientation || 'square',
          task_id: this.uniqueId
        }),
      });

      const result = await imageRequest.json();
      if (result.status === 'QUEUED') {
        console.log('Image request has been queued, now checking status...');
      }

      return await this.checkStatus();
    } catch (error) {
      throw new Error('Error generating image: ' + error.message);
    }
  }

  async checkStatus() {
    try {
      const startTime = Date.now();
      let statusResult = { status: 'QUEUED' };

      while (statusResult.status !== 'SUCCESS' && Date.now() - startTime < this.pollingTimeout) {
        const statusRequest = await fetch(`https://magichour.ai/api/free-tools/v1/ai-image-generator/${this.uniqueId}/status`, {
          method: 'GET',
          headers: this.headers,
        });

        statusResult = await statusRequest.json();
        if (statusResult.status !== 'SUCCESS') {
          console.log('Image generation still in progress...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (statusResult.status === 'SUCCESS') {
        console.log('Image generation success.');
        return statusResult;
      } else {
        console.log('Image generation timed out.');
        return { error: 'Image generation timed out' };
      }
    } catch (error) {
      throw new Error('Error checking status: ' + error.message);
    }
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt, orientation } = req.method === "GET" ? req.query : req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const magic = new ImageGenerator();
    const response = await magic.generateImage(prompt, orientation);

    if (response.error) {
      return res.status(500).json(response);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
