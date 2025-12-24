import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class GhibliAI {
  constructor() {
    this.baseUrl = "https://ghibliai.info";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.prompts = ["Convert this image into a whimsical, magical Ghibli-style, keeping all elements the same, but applying soft textures, gentle shading, and pastel tones.", "Change the style of this image to Studio Ghibli, but do not add any new elements. Apply subtle shading, lighting, and hand-painted textures to create a dreamy atmosphere.", "Recreate this image in Studio Ghibli's signature style, preserving the composition and details, focusing on soft textures, lighting, and vibrant pastel colors.", "Apply a Studio Ghibli-style transformation to this image, using magical lighting, smooth shading, and soft colors, while keeping the original scene and objects unchanged.", "Transform this image into a gentle, Ghibli-style illustration without adding new elements, using warm, pastel colors, soft textures, and whimsical lighting.", "Transform this image into a soft, Ghibli-style illustration with gentle textures, warm pastel colors, and no new elements added to the scene.", "Convert this image into a dreamy Ghibli-style artwork, maintaining the original scene but applying soft shading, whimsical lighting, and painterly textures.", "Turn this picture into a Studio Ghibli animated style, maintaining 100% of the original image’s composition, details, and subjects.", "Reimagine this image in Studio Ghibli style, preserving the composition and adding magical lighting, soft colors, and painterly textures for a whimsical look."];
  }
  getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
  }
  buildHeaders(extra = {}) {
    return {
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": this.defaultHeaders["user-agent"],
      ...SpoofHead(),
      ...this.defaultHeaders,
      ...extra
    };
  }
  async generate({
    imageUrl,
    prompt = this.getRandomPrompt()
  }) {
    const userId = this.randomID(8);
    const orderDetails = {
      imageUrl: imageUrl,
      prompt: prompt
    };
    const data = {
      userId: userId,
      orderDetails: JSON.stringify(orderDetails),
      originImageUrl: imageUrl,
      orderType: "IMAGE_TO_IMAGE",
      credit: 1,
      loginFlag: false
    };
    const headers = this.buildHeaders({
      "content-type": "application/json"
    });
    try {
      console.log(`[Generate] Membuat order baru untuk userId: ${userId} dengan imageUrl: ${imageUrl}`);
      const orderResponse = await axios.post(`${this.baseUrl}/api/order/genOrder/`, data, {
        headers: headers
      });
      if (orderResponse.data.code === 200) {
        const orderId = orderResponse.data.data.orderId;
        console.log(`[Generate] Order berhasil dibuat dengan orderId: ${orderId}`);
        return await this.pollOrderStatus(orderId, headers);
      } else {
        console.error(`[Generate] Gagal membuat order: ${orderResponse.data.message}`);
        throw new Error(`Gagal membuat order: ${orderResponse.data.message}`);
      }
    } catch (error) {
      console.error("[Generate] Terjadi kesalahan saat membuat order:", error.message);
      throw error;
    }
  }
  async pollOrderStatus(orderId, headers, interval = 3e3, maxRetries = 60) {
    let retries = 0;
    console.log(`[Poll] Memulai polling status untuk orderId: ${orderId}`);
    while (retries < maxRetries) {
      try {
        console.log(`[Poll] Memeriksa status order ke-${retries + 1} untuk orderId: ${orderId}`);
        const statusResponse = await axios.get(`${this.baseUrl}/api/order/cache/getStatus/?orderId=${orderId}`, {
          headers: headers
        });
        if (statusResponse.data.code === 200 && statusResponse.data.data === "SUCCEED") {
          console.log(`[Poll] Status order ${orderId} berhasil: SUCCEED`);
          return await this.getImageUrl(orderId, headers);
        } else if (statusResponse.data.code !== 200) {
          console.error(`[Poll] Gagal mendapatkan status order ${orderId}: ${statusResponse.data.message}`);
          throw new Error(`Gagal mendapatkan status order: ${statusResponse.data.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        retries++;
      } catch (error) {
        console.error(`[Poll] Terjadi kesalahan saat polling status order ${orderId}:`, error.message);
        throw error;
      }
    }
    console.error(`[Poll] Batas waktu polling status order ${orderId} tercapai.`);
    throw new Error("Batas waktu polling status order tercapai.");
  }
  async getImageUrl(orderId, headers) {
    try {
      console.log(`[GetImageURL] Mendapatkan URL gambar untuk orderId: ${orderId}`);
      const imageResponse = await axios.get(`${this.baseUrl}/api/order/getOrderImageUrl/?orderId=${orderId}`, {
        headers: headers
      });
      if (imageResponse.data.code === 200) {
        const imageUrl = imageResponse.data.data;
        console.log(`[GetImageURL] Berhasil mendapatkan URL gambar untuk orderId ${orderId}: ${imageUrl}`);
        return imageUrl;
      } else {
        console.error(`[GetImageURL] Gagal mendapatkan URL gambar untuk orderId ${orderId}: ${imageResponse.data.message}`);
        throw new Error(`Gagal mendapatkan URL gambar: ${imageResponse.data.message}`);
      }
    } catch (error) {
      console.error(`[GetImageURL] Terjadi kesalahan saat mendapatkan URL gambar untuk orderId ${orderId}:`, error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibliAI = new GhibliAI();
  try {
    const data = await ghibliAI.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}