import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class RegemSlideShare {
  constructor() {
    this.api = "https://internal-services.2api.in/slideshare";
    this.uploadApi = "https://www.digitalofficepro.com/file-converter/assembly/upload-file.php";
    this.headers = {
      Accept: "*/*",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
      Referer: "https://regem.in/slideshare-downloader/"
    };
  }
  log(message) {
    console.log(`[RegemSlideShare] ${message}`);
  }
  async getImages(url) {
    try {
      this.log(`Fetching images from: ${url}`);
      const {
        data
      } = await axios.post(`${this.api}/api/ft.php`, `surl=${encodeURIComponent(url)}`, {
        headers: {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      const $ = cheerio.load(data);
      const imageUrls = [];
      const seenUrls = new Set();
      $("img[src]").each((i, elem) => {
        const imgUrl = $(elem).attr("src");
        if (imgUrl && imgUrl.includes("slidesharecdn.com") && !seenUrls.has(imgUrl)) {
          imageUrls.push(imgUrl);
          seenUrls.add(imgUrl);
        }
      });
      this.log(`Found ${imageUrls.length} unique images`);
      if (!imageUrls.length) {
        throw new Error("No images found in response");
      }
      return imageUrls;
    } catch (err) {
      console.error(`[ERROR] getImages:`, err?.message || err);
      throw err;
    }
  }
  async downloadPDF(url) {
    try {
      this.log(`Creating PDF from URL: ${url}`);
      const {
        data
      } = await axios.get(`${this.api}/pdf.php`, {
        params: {
          d: url
        },
        headers: this.headers,
        responseType: "arraybuffer"
      });
      this.log(`PDF buffer created successfully`);
      return data;
    } catch (err) {
      console.error(`[ERROR] downloadPDF:`, err?.message || err);
      throw err;
    }
  }
  async upload({
    buffer,
    filename
  }) {
    try {
      this.log(`Uploading to digitalofficepro.com (${filename})...`);
      const formData = new FormData();
      formData.append("file", buffer, filename);
      const res = await axios.post(this.uploadApi, formData, {
        headers: {
          ...formData.getHeaders(),
          Accept: "application/json"
        }
      });
      const downloadUrl = `https://s3.us-west-2.amazonaws.com/temp.digitalofficepro.com/${res.data}`;
      this.log(`Upload successful: ${downloadUrl}`);
      return {
        url: downloadUrl,
        raw_response: res.data
      };
    } catch (err) {
      console.error(`[ERROR] upload:`, err?.message || err);
      throw err;
    }
  }
  async download({
    url,
    format = "pdf",
    uploadToIcu = true,
    filename,
    returnImages = false
  }) {
    try {
      const finalFormat = format.toLowerCase();
      this.log(`[START] Download: format=${finalFormat}, upload=${uploadToIcu}`);
      const imageUrls = await this.getImages(url);
      const result = {
        success: true,
        image_urls: imageUrls,
        image_count: imageUrls.length,
        format: finalFormat
      };
      if (returnImages) {
        this.log(`[DONE] Returning images only`);
        return result;
      }
      let buffer;
      let ext;
      switch (finalFormat) {
        case "pdf":
          buffer = await this.downloadPDF(url);
          ext = "pdf";
          break;
        default:
          throw new Error(`Unsupported format: ${finalFormat}. Only 'pdf' is available`);
      }
      result.buffer = buffer;
      if (uploadToIcu) {
        const uploadFilename = filename || `slideshare-${Date.now()}.${ext}`;
        const uploadResult = await this.upload({
          buffer: buffer,
          filename: uploadFilename
        });
        result.download_url = uploadResult?.url;
        result.upload_info = uploadResult;
      }
      this.log(`[DONE] Process completed successfully`);
      return result;
    } catch (err) {
      console.error(`[FAILED] download:`, err?.message || err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      success: false,
      error: "Parameter 'url' diperlukan (URL SlideShare)"
    });
  }
  const api = new RegemSlideShare();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}