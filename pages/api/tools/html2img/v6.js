import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Aconvert {
  constructor() {
    this.url = "https://s2.aconvert.com/convert/convert11.php";
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      withCredentials: true,
      jar: this.cookieJar,
      timeout: 3e4
    }));
  }
  async convertHTMLToImage({
    html,
    format = "png"
  }) {
    try {
      await this.client.get("https://www.aconvert.com/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        }
      });
      const boundary = "----WebKitFormBoundary9PtSdKruyBBMcOmz";
      const formData = this.createFormData(html, format, boundary);
      const headers = {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        "content-type": `multipart/form-data; boundary=${boundary}`,
        origin: "https://www.aconvert.com",
        priority: "u=1, i",
        referer: "https://www.aconvert.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      console.log("🔄 Mengirim request ke AConvert...");
      const {
        data
      } = await this.client.post(this.url, formData, {
        headers: headers
      });
      console.log("📨 Response API:", data);
      if (data.warning || data.state === "ERROR") {
        throw new Error(data.warning || "Konversi gagal");
      }
      return this.formatFileUrl(data);
    } catch (error) {
      console.error("❌ Error mengonversi HTML:", error.message);
      return null;
    }
  }
  createFormData(html, format, boundary) {
    const lines = [`--${boundary}`, 'Content-Disposition: form-data; name="file"; filename="html.html"', "Content-Type: text/html", "", html, `--${boundary}`, 'Content-Disposition: form-data; name="targetformat"', "", format, `--${boundary}`, 'Content-Disposition: form-data; name="code"', "", "86000", `--${boundary}`, 'Content-Disposition: form-data; name="filelocation"', "", "local", `--${boundary}`, 'Content-Disposition: form-data; name="oAuthToken"', "", "", `--${boundary}`, 'Content-Disposition: form-data; name="legal"', "", "Our PHP programs can only be used in aconvert.com. We DO NOT allow using our PHP programs in any third-party websites, software or apps. We will report abuse to your server provider, Google Play and App store if illegal usage found!", `--${boundary}--`, ""];
    return lines.join("\r\n");
  }
  formatFileUrl(apiData) {
    if (apiData?.state !== "SUCCESS") return null;
    const {
      filename,
      ext,
      num
    } = apiData;
    const fileCount = parseInt(num) || 1;
    if (fileCount === 1) {
      return `https://s2.aconvert.com/convert/p3r68-cdx67/${filename}${ext}`;
    }
    const files = Array.from({
      length: fileCount
    }, (_, i) => {
      const fileNumber = String(i + 1).padStart(3, "0");
      return `https://s2.aconvert.com/convert/p3r68-cdx67/${filename}-${fileNumber}${ext}`;
    });
    return fileCount === 1 ? files[0] : files;
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