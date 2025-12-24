import axios from "axios";
class SlideSaver {
  constructor() {
    this.api = "https://slidesaver.app/api";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
      Referer: "https://slidesaver.app/"
    };
  }
  async getImages(url) {
    try {
      console.log(`[GET] Fetching images: ${url}`);
      const {
        data
      } = await axios.get(`${this.api}/get-images`, {
        params: {
          url: url
        },
        headers: this.headers
      });
      console.log(`[SUCCESS] Found ${data?.all_slides?.length || 0} quality options`);
      return data;
    } catch (err) {
      console.error(`[ERROR] getImages:`, err?.message || err);
      throw err;
    }
  }
  async createSlide(images, type) {
    try {
      console.log(`[POST] Creating ${type} with ${images?.length || 0} images`);
      const {
        data
      } = await axios.post(`${this.api}/get-slide`, {
        images: images,
        type: type
      }, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        }
      });
      console.log(`[SUCCESS] File ready: ${data?.download_url || "N/A"}`);
      return data;
    } catch (err) {
      console.error(`[ERROR] createSlide:`, err?.message || err);
      throw err;
    }
  }
  async download({
    url,
    quality = 2048,
    format,
    type,
    ...rest
  }) {
    try {
      const finalType = format || type || "pdf";
      console.log(`[START] Download: quality=${quality}, type=${finalType}`);
      const imgData = await this.getImages(url);
      const slides = imgData?.all_slides || [];
      const selected = slides.find(s => s?.quality == quality) || slides[0];
      const images = selected?.images || [];
      if (!images.length) throw new Error("No images found");
      const result = await this.createSlide(images, finalType);
      const {
        download_url: download,
        ...info
      } = result || {};
      console.log(`[DONE] Download ready`);
      return {
        download: download,
        ...info,
        ...imgData,
        ...rest
      };
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
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SlideSaver();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}