import axios from "axios";
class Web2PDFConverter {
  constructor() {
    this.baseUrl = "https://www.web2pdfconvert.com";
    this.url = `${this.baseUrl}/api/convert/html/to/jpg?storefile=true&filename=file.html`;
    this.client = axios.create({
      withCredentials: true
    });
  }
  async getCookies() {
    try {
      const response = await this.client.get(this.baseUrl, {
        headers: {
          "user-agent": "Mozilla/5.0"
        }
      });
      return response.headers["set-cookie"]?.join("; ") || "";
    } catch (error) {
      console.error("Gagal mengambil cookie:", error.message);
      return "";
    }
  }
  async convertHTMLToImage({
    html,
    ...params
  }) {
    try {
      const cookies = await this.getCookies();
      const headers = {
        accept: "*/*",
        "content-type": "application/json",
        cookie: cookies,
        origin: this.baseUrl,
        referer: `${this.baseUrl}/html/to/img/`,
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      };
      const data = {
        Paramenters: [{
          Name: "File",
          FileValue: {
            Name: "file.html",
            Data: Buffer.from(html).toString("base64")
          }
        }, {
          Name: "StoreFile",
          Value: true
        }, {
          Name: "html",
          Value: html
        }, {
          Name: "DstFileFormat",
          Value: "jpg"
        }, ...Object.entries(params).map(([key, value]) => ({
          Name: key,
          Value: value
        }))]
      };
      const response = await this.client.post(this.url, data, {
        headers: headers
      });
      return response.data?.Files[0]?.Url;
    } catch (error) {
      console.error("Error mengonversi HTML ke gambar:", error.message);
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
    const converter = new Web2PDFConverter();
    const result = await converter.convertHTMLToImage({
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