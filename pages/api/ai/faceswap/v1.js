import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import fetch from "node-fetch";
class FaceSwapClient {
  constructor() {
    this.headers = {
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Referer: "https://aifaceswap.io/"
    };
  }
  async fetchBuffer(url) {
    try {
      console.log(`Fetching image from ${url}`);
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());
      console.log(`Fetched ${buffer.length} bytes`);
      return buffer;
    } catch (err) {
      console.error("Error fetching image:", err);
      throw err;
    }
  }
  async upload(buffer) {
    try {
      const fileType = await fileTypeFromBuffer(buffer);
      const mimeType = fileType?.mime || "image/jpeg";
      const fileName = `img.${fileType?.ext || "jpeg"}`;
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      console.log("Uploading image...");
      const res = await fetch("https://aifaceswap.io/api/upload_img", {
        method: "POST",
        headers: this.headers,
        body: formData
      });
      const json = await res.json();
      if (json.code !== 200) throw new Error("Upload failed.");
      console.log("Upload success:", json.data);
      return json.data;
    } catch (err) {
      console.error("Error uploading image:", err);
      throw err;
    }
  }
  async generate({
    source,
    target
  }) {
    try {
      const sourceBuffer = await this.fetchBuffer(source);
      const faceBuffer = await this.fetchBuffer(target);
      const sourceImage = await this.upload(sourceBuffer);
      const faceImage = await this.upload(faceBuffer);
      console.log("Requesting face generation...");
      const res = await fetch("https://aifaceswap.io/api/generate_face", {
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
          Accept: "application/json, text/javascript, */*; q=0.01"
        },
        body: JSON.stringify({
          source_image: sourceImage,
          face_image: faceImage
        })
      });
      const json = await res.json();
      if (json.code !== 200) throw new Error("Failed to initiate generation.");
      const taskId = json.data.task_id;
      console.log("Task started with ID:", taskId);
      const start = Date.now();
      while (true) {
        if (Date.now() - start > 6e4) throw new Error("Timeout: Task took too long.");
        await new Promise(res => setTimeout(res, 5e3));
        console.log("Polling task status...");
        const pollRes = await fetch("https://aifaceswap.io/api/check_status", {
          method: "POST",
          headers: {
            ...this.headers,
            "Content-Type": "application/json",
            Accept: "application/json, text/javascript, */*; q=0.01"
          },
          body: JSON.stringify({
            task_id: taskId
          })
        });
        const pollJson = await pollRes.json();
        if (pollJson.code !== 200) throw new Error("Failed to check status.");
        const resultImage = pollJson.data.result_image;
        if (resultImage) {
          const finalUrl = "https://art-global.yimeta.ai/" + resultImage;
          console.log("Result ready:", finalUrl);
          return finalUrl;
        }
        console.log("Result not ready yet...");
      }
    } catch (err) {
      console.error("Error in generate process:", err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.source || !params.target) {
    return res.status(400).json({
      error: "source and target images are required"
    });
  }
  try {
    const api = new FaceSwapClient();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}