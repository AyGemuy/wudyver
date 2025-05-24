import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class Aconvert {
  constructor() {
    this.url = "https://s2.aconvert.com/convert/convert10.php";
    this.client = axios.create({
      withCredentials: true
    });
  }
  async convertHTMLToImage({
    html,
    format = "png"
  }) {
    try {
      const blob = new Blob([html], {
        type: "text/html"
      });
      const form = new FormData();
      form.append("file", blob, "file.html");
      form.append("targetformat", format);
      form.append("code", "86000");
      form.append("filelocation", "local");
      form.append("oAuthToken", "");
      form.append("legal", "Our PHP programs can only be used in aconvert.com. We DO NOT allow using our PHP programs in any third-party websites, software or apps. We will report abuse to your server provider, Google Play and App store if illegal usage found!");
      const {
        data
      } = await this.client.post(this.url, form, {
        headers: {
          accept: "*/*",
          "content-type": "multipart/form-data",
          origin: "https://www.aconvert.com",
          referer: "https://www.aconvert.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const output = data?.state === "SUCCESS" ? data.ext ? Array.from({
        length: data.num
      }, (_, i) => `https://s2.aconvert.com/convert/p3r68-cdx67/${data.filename}-${String(i + 1).padStart(3, "0")}${data.ext}`) : [`https://s2.aconvert.com/convert/p3r68-cdx67/${data.filename}`] : [];
      return output[0];
    } catch (error) {
      console.error("Error mengonversi HTML:", error.message);
      return {
        error: error.message
      };
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
    const converter = new Aconvert();
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