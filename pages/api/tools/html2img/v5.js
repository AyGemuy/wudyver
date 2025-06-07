import axios from "axios";
import * as cheerio from "cheerio";
class HtmlToImageGenerator {
  constructor() {
    this.baseURL = "https://htmlcsstoimage.com";
    this.csrfToken = null;
    this.cookie = "";
    this.instance = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://htmlcsstoimage.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://htmlcsstoimage.com/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      },
      withCredentials: true
    });
    this.instance.interceptors.response.use(response => {
      const newCookie = response.headers["set-cookie"];
      if (newCookie) {
        this.cookie = Array.isArray(newCookie) ? newCookie.join("; ") : newCookie;
        response.config.headers["Cookie"] = this.cookie;
      }
      return response;
    });
    this.instance.interceptors.request.use(async config => {
      if (config.method === "post" && !config.headers["X-CSRF-Token"]) {
        if (!this.csrfToken) {
          await this.fetchCsrfToken();
        }
        config.headers["X-CSRF-Token"] = this.csrfToken;
      }
      config.headers["Cookie"] = this.cookie;
      return config;
    }, error => {
      return Promise.reject(error);
    });
  }
  async fetchCsrfToken() {
    try {
      const response = await this.instance.get("/");
      const $ = cheerio.load(response.data);
      this.csrfToken = $('meta[name="csrf-token"]').attr("content");
      console.log("CSRF Token fetched:", this.csrfToken);
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      throw error;
    }
  }
  async convertHTMLToImage({
    html,
    width = 1280,
    height = 1280,
    mode = "",
    url = "",
    css = "",
    selector = "",
    delay = "",
    render = false,
    fonts = "",
    scale = 2
  }) {
    try {
      const response = await this.instance.post("/demo_run", {
        html: html,
        console_mode: mode,
        url: url,
        css: css,
        selector: selector,
        ms_delay: delay,
        render_when_ready: render,
        viewport_height: height,
        viewport_width: width,
        google_fonts: fonts,
        device_scale: scale
      });
      return `${response.data?.url}?filename=image.png`;
    } catch (error) {
      console.error("Error generating image:", error);
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
    const converter = new HtmlToImageGenerator();
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