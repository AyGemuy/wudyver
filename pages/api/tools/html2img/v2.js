import axios from "axios";
class Page2ImageConverter {
  constructor() {
    this.baseURL = "https://www.page2images.com";
    this.apiURL = `${this.baseURL}/api`;
    this.axiosInstance = axios.create({
      baseURL: this.apiURL,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
  }
  async generate({
    html,
    width = 1024,
    height = 0,
    device = 6
  }) {
    const endpoint = "/html_to_image";
    const formData = new URLSearchParams();
    formData.append("p2i_html", html);
    formData.append("p2i_device", device.toString());
    formData.append("p2i_size", `${width}x${height}`);
    formData.append("p2i_url", "");
    formData.append("flag", "mobile_emulator");
    formData.append("p2i_htmlerror", "1");
    let response = null;
    let attempts = 0;
    const startTime = Date.now();
    const timeout = 3e4;
    const headers = {
      origin: this.baseURL,
      referer: `${this.baseURL}/Convert-HTML-to-Image-or-PDF-online`,
      "User-Agent": this.axiosInstance.defaults.headers["User-Agent"],
      "X-Requested-With": this.axiosInstance.defaults.headers["X-Requested-With"]
    };
    while (Date.now() - startTime < timeout && (!response || response?.data?.status !== "finished")) {
      try {
        console.log(`Mencoba membuat gambar (Percobaan ${attempts + 1})...`);
        response = await this.axiosInstance.post(endpoint, formData, {
          headers: headers
        });
        console.log(`Permintaan berhasil (Percobaan ${attempts + 1}). Status: ${response.status}`);
        if (response.data) {
          console.log("Data respons:", response.data);
          if (response.data.status === "finished") {
            console.log('Status "finished" diterima.');
            return response.data;
          } else {
            console.log('Status belum "finished". Menunggu...');
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        attempts++;
      } catch (error) {
        console.error(`Gagal pada percobaan ${attempts + 1}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 3e3));
        attempts++;
      }
    }
    if (response?.data?.status === "finished") {
      console.log('Berhasil mendapatkan status "finished" setelah beberapa percobaan.');
      return response.data;
    } else {
      const errorMessage = `Gagal mendapatkan status "finished" dalam waktu 30 detik.`;
      console.error(errorMessage);
      if (response?.data) {
        console.error("Respons terakhir:", response.data);
      }
      throw new Error(errorMessage);
    }
  }
  async convertHTMLToImage({
    html,
    width = 1280,
    height = 1280,
    ...params
  } = {}) {
    try {
      console.log("Memulai proses konversi HTML ke gambar...");
      const result = await this.generate({
        html: html,
        width: width,
        height: height,
        ...params
      });
      console.log("Proses konversi selesai.");
      return result?.image_url;
    } catch (error) {
      console.error("Terjadi kesalahan selama konversi:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new Page2ImageConverter();
    const result = await converter.convertHTMLToImage(params);
    return res.status(200).json({
      url: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}