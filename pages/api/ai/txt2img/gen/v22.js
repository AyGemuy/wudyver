import axios from "axios";
class ArtingAIClient {
  constructor() {
    this.baseURL = "https://api.arting.ai/api/cg";
    this.commonHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9",
      Accept: "*/*",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://arting.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://arting.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "X-Forwarded-For": this.generateRandomIp(),
      "X-Client-IP": this.generateRandomIp()
    };
  }
  generateRandomIp() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 255) + 1).join(".");
  }
  async generate({
    prompt,
    model_id = "cyberrealisticPony_v65",
    samples = 1,
    height = 768,
    width = 512,
    negative_prompt = "painting, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, deformed, ugly, blurry, bad anatomy, bad proportions, extra limbs, cloned face, skinny, glitchy, double torso, extra arms, extra hands, mangled fingers, missing lips, ugly face, distorted face, extra legs, anime",
    seed = -1,
    lora_ids = "",
    lora_weight = "0.7",
    sampler = "Euler a",
    steps = 25,
    guidance = 7,
    clip_skip = 2,
    pollingInterval = 2e3,
    ...rest
  }) {
    const payload = {
      prompt: prompt,
      model_id: model_id,
      samples: samples,
      height: height,
      width: width,
      negative_prompt: negative_prompt,
      seed: seed,
      lora_ids: lora_ids,
      lora_weight: lora_weight,
      sampler: sampler,
      steps: steps,
      guidance: guidance,
      clip_skip: clip_skip,
      ...rest
    };
    console.log("Memulai permintaan pembuatan gambar...");
    let createResponse;
    try {
      createResponse = await axios.post(`${this.baseURL}/text-to-image/create`, payload, {
        headers: this.commonHeaders
      });
      if (createResponse.data.code !== 1e5) {
        throw new Error(createResponse.data.message || "Gagal memulai pembuatan gambar.");
      }
      console.log("Permintaan berhasil. Request ID:", createResponse.data.data.request_id);
    } catch (error) {
      console.error("Error saat memulai pembuatan gambar:", error.response ? error.response.data : error.message);
      return null;
    }
    const requestId = createResponse.data.data.request_id;
    console.log(`Memulai polling untuk Request ID: ${requestId} hingga gambar siap...`);
    let imageUrls = null;
    let attempts = 0;
    while (imageUrls === null) {
      attempts++;
      console.log(`Percobaan polling ke-${attempts} untuk Request ID: ${requestId}...`);
      try {
        const response = await axios.post(`${this.baseURL}/text-to-image/get`, {
          request_id: requestId
        }, {
          headers: this.commonHeaders
        });
        if (response.data.code === 1e5) {
          if (response.data.data && Array.isArray(response.data.data.output) && response.data.data.output.length > 0) {
            const hasValidLinks = response.data.data.output.every(link => typeof link === "string" && link.startsWith("http"));
            if (hasValidLinks) {
              imageUrls = response.data.data.output;
              console.log("Gambar siap! URL hasil:", imageUrls);
            } else {
              console.log("Output ditemukan tapi isinya tidak valid (bukan link gambar), menunggu...");
            }
          } else {
            console.log("Gambar masih dalam proses atau output belum tersedia, menunggu...");
          }
        } else {
          console.error(`Polling API mengembalikan kode error: ${response.data.code}. Pesan: ${response.data.message || "Tidak diketahui"}`);
          return null;
        }
      } catch (error) {
        console.error("Error saat polling:", error.response ? error.response.data : error.message);
        return null;
      }
      if (imageUrls === null) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }
    }
    return imageUrls;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const artingClient = new ArtingAIClient();
  try {
    const data = await artingClient.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}