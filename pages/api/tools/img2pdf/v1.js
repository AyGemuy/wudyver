import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class Pdf24Converter {
  constructor() {
    this.uploadUrl = "https://i.supa.codes/api/upload";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
    this.headers = {
      "user-agent": this.userAgent,
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      origin: "https://tools.pdf24.org",
      referer: "https://tools.pdf24.org/",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async uploadImage(imageUrl) {
    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        headers: {
          "user-agent": this.userAgent
        }
      });
      const mime = res.headers["content-type"] || "application/octet-stream";
      const ext = mime.split("/")[1] || "bin";
      const form = new FormData();
      form.append("file", new Blob([res.data], {
        type: mime
      }), `upload.${ext}`);
      const uploadRes = await axios.post("https://filetools26.pdf24.org/client.php?action=upload", form, {
        headers: {
          ...this.headers,
          ...form.headers
        }
      });
      return uploadRes.data;
    } catch (error) {
      throw new Error(`Upload failed for ${imageUrl}`);
    }
  }
  async convertToPdf(filesData) {
    try {
      const body = {
        files: filesData,
        rotations: Array(filesData.length).fill(0),
        joinFiles: true,
        createBookmarks: false,
        pageSize: "A4",
        pageOrientation: "auto"
      };
      const convertRes = await axios.post("https://filetools26.pdf24.org/client.php?action=imagesToPdf", body, {
        headers: {
          ...this.headers,
          "content-type": "application/json; charset=UTF-8"
        }
      });
      return convertRes.data.jobId;
    } catch (error) {
      throw new Error("Failed to start PDF conversion");
    }
  }
  async waitForResult(jobId) {
    try {
      const statusUrl = "https://filetools26.pdf24.org/client.php?action=getStatus";
      while (true) {
        const res = await axios.post(statusUrl, new URLSearchParams({
          jobId: jobId
        }), {
          headers: {
            ...this.headers,
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
          }
        });
        if (res.data.status === "done") return res.data.job;
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
    } catch (error) {
      throw new Error("Failed to get conversion result");
    }
  }
  async downloadPdf(downloadUrl) {
    try {
      const res = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        headers: this.headers
      });
      const buffer = res.data;
      const mime = "application/pdf";
      const ext = "pdf";
      return {
        buffer: buffer,
        mime: mime,
        ext: ext
      };
    } catch (error) {
      throw new Error("Failed to download PDF");
    }
  }
  async uploadPdf(buffer, mime, ext) {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mime
      }), `converted.${ext}`);
      const uploadResponse = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers
        }
      });
      return uploadResponse.data;
    } catch (error) {
      throw new Error("PDF upload failed");
    }
  }
  async convert({
    imageUrl
  }) {
    try {
      const urls = typeof imageUrl === "string" ? [imageUrl] : imageUrl;
      const filesData = [];
      for (const imageUrl of urls) {
        const uploadResult = await this.uploadImage(imageUrl);
        if (Array.isArray(uploadResult) && uploadResult.length > 0) {
          filesData.push(uploadResult[0]);
        } else {
          throw new Error(`Upload failed: ${imageUrl}`);
        }
      }
      const jobId = await this.convertToPdf(filesData);
      const result = await this.waitForResult(jobId);
      const downloadUrl = `https://filetools26.pdf24.org/client.php?mode=download&action=downloadJobResult&jobId=${jobId}`;
      const {
        buffer,
        mime,
        ext
      } = await this.downloadPdf(downloadUrl);
      const uploadResult = await this.uploadPdf(buffer, mime, ext);
      return {
        ...result,
        ...uploadResult
      };
    } catch (error) {
      throw new Error(error.message || "Conversion failed");
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
  const pdf = new Pdf24Converter();
  try {
    const data = await pdf.convert(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}