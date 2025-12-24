import axios from "axios";
import FormData from "form-data";
class HtmlToImageConverter {
  constructor() {
    this.baseUrl = "https://api.products.fileformat.app/word-processing/conversion/api/convert?outputType=PNG";
  }
  async convertHtmlToImage({
    html: htmlContent
  }) {
    try {
      const formData = new FormData();
      formData.append("1", Buffer.from(htmlContent), {
        filename: "html.html",
        contentType: "text/html"
      });
      const headers = {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        origin: "https://products.fileformat.app",
        priority: "u=1, i",
        referer: "https://products.fileformat.app/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...formData.getHeaders()
      };
      const response = await axios.post(this.baseUrl, formData, {
        headers: headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      if (response.data && response.data.id) {
        const fileId = encodeURIComponent(response.data.id);
        return {
          url: `https://products.fileformat.app/image/conversion/Download?id=${fileId}`
        };
      } else {
        throw new Error("Format respons API tidak valid");
      }
    } catch (error) {
      console.error("Error dalam konversi HTML ke gambar:", error.message);
      if (error.response) {
        console.error("Detail error:", error.response.data);
        console.error("Status error:", error.response.status);
      }
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
    const converter = new HtmlToImageConverter();
    const result = await converter.convertHtmlToImage(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}