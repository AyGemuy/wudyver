import axios from "axios";
class ImageGenerator {
  constructor() {
    this.baseURL = "https://stablediffusion3net.erweima.ai/api/v1/generate";
    this.pollingInterval = 3e3;
  }
  async generate(options) {
    const uniqueid = Math.random().toString(36).substring(2, 15);
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://stablediffusion3.net",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://stablediffusion3.net/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      uniqueid: uniqueid,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    const payload = {
      prompt: options.prompt ? options.prompt : "",
      negativePrompt: options.negativePrompt ? options.negativePrompt : "",
      model: options.model ? options.model : "superAnime",
      size: options.size ? options.size : "1:1",
      batchSize: options.batchSize ? options.batchSize : "1",
      imageUrl: options.imageUrl ? options.imageUrl : "",
      rangeValue: options.rangeValue !== undefined ? options.rangeValue : null
    };
    try {
      const response = await axios.post(`${this.baseURL}/create`, payload, {
        headers: headers
      });
      if (response.data && response.data.code === 200 && response.data.data.recordUuid) {
        const recordUuid = response.data.data.recordUuid;
        console.log(`Task Dibuat. ID: ${recordUuid}`);
        return await this.pollTask(recordUuid, headers);
      } else {
        console.error("Gagal membuat task atau UUID tidak ditemukan:", response.data);
        throw new Error("Gagal membuat task atau UUID tidak ditemukan");
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat membuat gambar:", error);
      throw error;
    }
  }
  async pollTask(recordUuid, baseHeaders) {
    const headers = {
      ...baseHeaders
    };
    delete headers["content-type"];
    const pollingURL = `${this.baseURL}/record-detail?recordUuid=${recordUuid}`;
    return new Promise(async (resolve, reject) => {
      while (true) {
        try {
          const response = await axios.get(pollingURL, {
            headers: headers
          });
          const taskData = response.data;
          if (taskData && taskData.code === 200 && taskData.data) {
            const picState = taskData.data.picState;
            console.log(`Status Task ID ${recordUuid}: ${picState}`);
            if (picState === "success") {
              try {
                const parsedPicUrl = JSON.parse(taskData.data.picUrl);
                const parsedPicParam = JSON.parse(taskData.data.picParam);
                resolve({
                  ...taskData.data,
                  picUrl: parsedPicUrl,
                  picParam: parsedPicParam
                });
              } catch (error) {
                console.error("Gagal memparse picUrl atau picParam:", error);
                reject(new Error("Gagal memparse picUrl atau picParam"));
              }
              break;
            } else if (picState === "fail") {
              console.error(`Task ID ${recordUuid} gagal:`, taskData);
              reject(new Error(`Task ID ${recordUuid} gagal dengan pesan: ${taskData.msg}`));
              break;
            }
          } else if (taskData && taskData.code !== 200) {
            console.error(`Polling gagal untuk Task ID ${recordUuid}:`, taskData);
            reject(new Error(`Polling gagal dengan kode: ${taskData.code} dan pesan: ${taskData.msg}`));
            break;
          }
          await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
        } catch (error) {
          console.error(`Terjadi kesalahan saat polling Task ID ${recordUuid}:`, error);
          reject(error);
          break;
        }
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new ImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}