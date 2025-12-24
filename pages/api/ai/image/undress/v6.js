import axios from "axios";
class EaseHow {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      authorization: "Bearer null",
      "content-type": "application/json",
      origin: "https://www.easehow.com",
      priority: "u=1, i",
      referer: "https://www.easehow.com/",
      "request-origin": "easehow",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async getBuff(input) {
    try {
      console.log("[LOG] Processing input image...");
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof input === "string") {
        return Buffer.from(input.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      throw new Error("Format gambar tidak dikenali");
    } catch (e) {
      throw e;
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("=== Mulai Generate EaseHow ===");
      const buffer = await this.getBuff(imageUrl);
      const fileName = `EaseHow_${Date.now()}.png`;
      console.log("[LOG] Requesting upload URL...");
      const uploadMeta = await this.req("https://tool-api.easehow.com/ai/source/get-upload-url", {
        file_name: fileName
      });
      const uploadUrl = uploadMeta?.upload_url;
      const accessUrl = uploadMeta?.access_url;
      const key = uploadMeta?.key;
      if (!uploadUrl) throw new Error("Gagal mendapatkan upload URL");
      console.log("[LOG] Uploading image to cloud...");
      await axios.put(uploadUrl, buffer, {
        headers: {
          "Content-Type": "image/png",
          Authorization: undefined,
          "Request-Origin": undefined
        }
      });
      console.log("[LOG] Adding task...");
      const param = {
        color_id: rest.color_id || 30,
        sex: rest.sex || 2,
        style_id: rest.style_id || 201,
        body_type_id: rest.body_type_id || 2001,
        key: key,
        url: accessUrl
      };
      const taskPayload = {
        action: rest.action || "undress",
        param: param,
        watermark_type: rest.watermark_type || 3
      };
      const taskRes = await this.req("https://tool-api.easehow.com/ai/ai-tool/add-task", taskPayload);
      const taskId = taskRes?.task_id;
      if (!taskId) throw new Error("Gagal membuat task ID");
      console.log(`[LOG] Task ID: ${taskId} created. Waiting for completion...`);
      const finalData = await this.poll(taskId);
      console.log("[LOG] Process Finished.");
      return {
        result: finalData?.additional_data?.url || finalData?.additional_data?.cover_url || null,
        ...finalData
      };
    } catch (error) {
      console.error("[ERROR] Generate Failed:", error?.response?.data || error?.message);
      return {
        error: error.message
      };
    }
  }
  async req(url, data) {
    try {
      const res = await axios.post(url, data, {
        headers: this.headers
      });
      const code = res?.data?.code;
      return code === 200 ? res?.data?.data : null;
    } catch (e) {
      console.error(`[REQ ERROR] ${url}`, e.message);
      throw e;
    }
  }
  async poll(id) {
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      try {
        await new Promise(r => setTimeout(r, 3e3));
        const res = await axios.post("https://tool-api.easehow.com/ai/tool/get-task", {
          id: id
        }, {
          headers: this.headers
        });
        const data = res?.data?.data;
        const progress = data?.progress || 0;
        console.log(`[LOG] Polling... Progress: ${progress}%`);
        if (progress === 100 || data?.additional_data?.url) {
          return data;
        }
        attempts++;
      } catch (e) {
        console.log("[LOG] Polling error, retrying...", e.message);
        attempts++;
      }
    }
    throw new Error("Timeout waiting for task completion");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new EaseHow();
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