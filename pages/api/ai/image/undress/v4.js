import axios from "axios";
class Ismartta {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      authorization: "Bearer null",
      "content-type": "application/json",
      origin: "https://www.ismartta.com",
      priority: "u=1, i",
      referer: "https://www.ismartta.com/",
      "request-origin": "ismartta",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  log(msg) {
    console.log(`[Ismartta] ${msg}`);
  }
  async toBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          this.log("Fetching image from URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(input.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      throw new Error("Format gambar tidak dikenali");
    } catch (e) {
      throw new Error(`Gagal proses buffer: ${e.message}`);
    }
  }
  async getSign() {
    try {
      this.log("Getting upload sign...");
      const filename = `image_${Date.now()}.png`;
      const {
        data
      } = await axios.post("https://tool-api.ismartta.com/ai/source/get-upload-url", {
        file_name: filename
      }, {
        headers: this.headers
      });
      return data?.data || null;
    } catch (e) {
      this.log(`Error getSign: ${e.message}`);
      return null;
    }
  }
  async upImg(uploadUrl, buffer) {
    try {
      this.log("Uploading image buffer...");
      await axios.put(uploadUrl, buffer, {
        headers: {
          "Content-Type": "image/png",
          "User-Agent": this.headers["user-agent"]
        }
      });
      return true;
    } catch (e) {
      this.log(`Error upImg: ${e.message}`);
      return false;
    }
  }
  async add(uploadData, params) {
    try {
      this.log("Adding AI task...");
      const payload = {
        action: "undress",
        param: {
          sex: params.sex || 2,
          style_id: params.style_id || 201,
          body_type_id: params.body_type_id || 2001,
          key: uploadData.key,
          url: uploadData.access_url,
          color_id: params.color_id || 30,
          watermark_type: params.watermark_type || 3
        }
      };
      const {
        data
      } = await axios.post("https://tool-api.ismartta.com/ai/ai-tool/add-task", payload, {
        headers: this.headers
      });
      return data?.data?.task_id || null;
    } catch (e) {
      this.log(`Error add task: ${e.message}`);
      return null;
    }
  }
  async poll(taskId) {
    this.log(`Polling task ${taskId}...`);
    let attempt = 0;
    const max = 60;
    while (attempt < max) {
      try {
        const {
          data
        } = await axios.post("https://tool-api.ismartta.com/ai/tool/get-task", {
          id: taskId
        }, {
          headers: this.headers
        });
        const info = data?.data;
        const progress = info?.progress || 0;
        if (progress >= 100 && info?.additional_data?.url) {
          this.log("Task completed!");
          return info;
        }
        attempt++;
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        this.log(`Polling error: ${e.message}, retrying...`);
        attempt++;
        await new Promise(r => setTimeout(r, 3e3));
      }
    }
    throw new Error("Timeout waiting for task result");
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      this.log("Starting generation process...");
      const buffer = await this.toBuf(imageUrl);
      const signData = await this.getSign();
      if (!signData?.upload_url) throw new Error("Gagal mendapatkan upload URL");
      const isUploaded = await this.upImg(signData.upload_url, buffer);
      if (!isUploaded) throw new Error("Gagal upload gambar ke server");
      const taskId = await this.add(signData, rest);
      if (!taskId) throw new Error("Gagal membuat task ID");
      const finalData = await this.poll(taskId);
      const resultUrl = finalData?.additional_data?.url;
      const coverUrl = finalData?.additional_data?.cover_url;
      return {
        result: resultUrl || null,
        cover: coverUrl || null,
        width: finalData?.additional_data?.width || 0,
        height: finalData?.additional_data?.height || 0,
        size: finalData?.additional_data?.size || 0,
        task_id: finalData?.id,
        created_at: finalData?.created_at
      };
    } catch (error) {
      this.log(`Generate Failed: ${error.message}`);
      return {
        result: null,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new Ismartta();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}