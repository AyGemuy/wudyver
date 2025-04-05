import axios from "axios";
class Page2Images {
  constructor() {
    this.url = "https://www.page2images.com/api/html_to_image";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.page2images.com/Convert-HTML-to-Image-or-PDF-online"
    };
  }
  async convertHTMLToImage({
    html,
    width = 1280,
    height = 1280,
    ...params
  }) {
    try {
      const defaultParams = {
        p2i_html: encodeURIComponent(html),
        p2i_device: "6",
        p2i_size: `${height}x${width}`,
        p2i_url: "",
        flag: "mobile_emulator",
        p2i_htmlerror: "1"
      };
      const data = new URLSearchParams({
        ...defaultParams,
        ...params
      });
      let response;
      while (true) {
        response = await axios.post(this.url, data.toString(), {
          headers: this.headers
        });
        if (response.data?.status === "finished") {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2e3));
      }
      return response.data?.image_url;
    } catch (error) {
      console.error("Error converting HTML to image:", error.message);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      html,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    if (!html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const page2Images = new Page2Images();
    const result = await page2Images.convertHTMLToImage({
      html: html,
      ...params
    });
    return res.status(200).json({
      url: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}