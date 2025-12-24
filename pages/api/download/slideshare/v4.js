import axios from "axios";
import FormData from "form-data";
class DownloderSlides {
  constructor() {
    this.api = "https://downloderslides.com";
    this.uploadApi = "https://www.digitalofficepro.com/file-converter/assembly/upload-file.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://downloderslides.com",
      referer: "https://downloderslides.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      "sec-ch-ua-mobile": "?1",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
  }
  log(message) {
    console.log(`[DownloderSlides] ${message}`);
  }
  async getImages(url) {
    try {
      this.log(`Fetching images from: ${url}`);
      const formData = new FormData();
      formData.append("action", "slideshare_action_slide");
      formData.append("code", "getimages");
      formData.append("slideshare", `slideshare_video_url=${encodeURIComponent(url)}`);
      const {
        data
      } = await axios.post(`${this.api}/wp-admin/admin-ajax.php`, formData, {
        headers: {
          ...this.headers,
          ...formData.getHeaders()
        }
      });
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch images");
      }
      this.log(`Found ${data?.data?.length || 0} images`);
      return data;
    } catch (err) {
      console.error(`[ERROR] getImages:`, err?.message || err);
      throw err;
    }
  }
  async downloadPDF(imageUrls) {
    try {
      this.log(`Creating PDF from ${imageUrls?.length || 0} images`);
      const {
        data
      } = await axios.post(`${this.api}/wp-content/plugins/slideshare-downloader/generate_pdf.php`, {
        image_urls: imageUrls
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        },
        responseType: "arraybuffer"
      });
      this.log(`PDF buffer created successfully`);
      return data;
    } catch (err) {
      console.error(`[ERROR] downloadPDF:`, err?.message || err);
      throw err;
    }
  }
  async downloadPPT(imageUrls) {
    try {
      this.log(`Creating PPT from ${imageUrls?.length || 0} images`);
      const {
        data
      } = await axios.post(`${this.api}/wp-content/plugins/slideshare-downloader/generate_ppt.php`, {
        image_urls: imageUrls
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        },
        responseType: "arraybuffer"
      });
      this.log(`PPT buffer created successfully`);
      return data;
    } catch (err) {
      console.error(`[ERROR] downloadPPT:`, err?.message || err);
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
    filename
  }) {
    try {
      const finalFormat = format.toLowerCase();
      this.log(`[START] Download: format=${finalFormat}, upload=${uploadToIcu}`);
      const imgData = await this.getImages(url);
      const imageUrls = imgData?.data || [];
      if (!imageUrls.length) {
        throw new Error("No images found");
      }
      let buffer;
      let ext;
      switch (finalFormat) {
        case "pdf":
          buffer = await this.downloadPDF(imageUrls);
          ext = "pdf";
          break;
        case "ppt":
        case "pptx":
          buffer = await this.downloadPPT(imageUrls);
          ext = "pptx";
          break;
        default:
          throw new Error(`Unsupported format: ${finalFormat}. Available: pdf, ppt`);
      }
      const result = {
        success: true,
        image_urls: imageUrls,
        image_count: imageUrls.length,
        format: finalFormat,
        buffer: buffer
      };
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
  const api = new DownloderSlides();
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