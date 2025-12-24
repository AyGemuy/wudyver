import axios from "axios";
import FormData from "form-data";
class AsciiArtGen {
  constructor() {
    this.host = "https://www.ascii-art-generator.org";
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "id-ID",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Connection: "keep-alive",
      Origin: this.host,
      Referer: this.host + "/"
    };
  }
  extract(str, startToken, endToken) {
    const startIdx = str.indexOf(startToken);
    if (startIdx === -1) return null;
    const actualStart = startIdx + startToken.length;
    const endIdx = str.indexOf(endToken, actualStart);
    if (endIdx === -1) return null;
    return str.slice(actualStart, endIdx);
  }
  async req(url, method = "GET", data = null, headers = {}, responseType = "text") {
    try {
      return await axios({
        url: url,
        method: method,
        data: data,
        headers: {
          ...this.headers,
          ...headers
        },
        responseType: responseType,
        maxBodyLength: Infinity
      });
    } catch (e) {
      return null;
    }
  }
  async solve(input) {
    if (!input) return null;
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === "string") {
      if (input.match(/^https?:\/\//)) {
        console.log("[LOG] Downloading image from URL...");
        const res = await this.req(input, "GET", null, {}, "arraybuffer");
        return res && res.data ? Buffer.from(res.data) : null;
      }
      if (input.length > 200 && !input.includes(" ")) {
        const base64Clean = input.replace(/^data:image\/\w+;base64,/, "");
        if (/^[A-Za-z0-9+/=]+$/.test(base64Clean)) {
          return Buffer.from(base64Clean, "base64");
        }
      }
    }
    return null;
  }
  async poll(name) {
    console.log("[LOG] Polling result...");
    for (let i = 0; i < 15; i++) {
      const res = await this.req(`${this.host}/FW/result.php?name=${name}`);
      const data = res?.data || "";
      const token = "FW/getfile.php?file=";
      if (data.includes(token)) {
        const path = this.extract(data, token, '"');
        if (path) return `${token}${path}`;
      }
      if (data.includes("error") && !data.includes('class="error hide"')) throw new Error("Server returned error inside polling.");
      await new Promise(r => setTimeout(r, 2e3));
    }
    throw new Error("Timeout waiting for result.");
  }
  async generate({
    input = "",
    type = "banner",
    width = "300",
    ...rest
  }) {
    try {
      console.log(`[LOG] Generating ${type}...`);
      const isBanner = type === "banner";
      const form = new FormData();
      let imgBuffer = null;
      if (!isBanner) {
        imgBuffer = await this.solve(input);
        if (!imgBuffer) throw new Error("Input gambar tidak valid (Gagal download URL atau parse Base64).");
      }
      if (imgBuffer) {
        form.append("userfile", imgBuffer, {
          filename: "image.jpg",
          contentType: "image/jpeg"
        });
      } else {
        form.append("userfile", Buffer.alloc(0), {
          filename: "",
          contentType: "application/octet-stream"
        });
      }
      const params = {
        art_type: isBanner ? "banner" : type === "mono" ? "mono" : "color",
        banner_text: isBanner ? input : "",
        userfile_url: "",
        outFormat_caca: "ansi",
        figlet_font: isBanner ? "8" : "0",
        width: String(width),
        banner_width: "100",
        user_screen_width: "414",
        ...rest
      };
      Object.keys(params).forEach(k => form.append(k, params[k]));
      const resUpload = await this.req(this.host + "/", "POST", form, form.getHeaders());
      if (!resUpload) throw new Error("Failed to upload data.");
      const html = resUpload.data;
      let link = this.extract(html, "FW/getfile.php?file=", '"');
      if (link) {
        link = "FW/getfile.php?file=" + link;
      } else {
        const id = this.extract(html, "result.php?name=", "'") || this.extract(html, "result.php?name=", '"');
        if (!id) throw new Error("Gagal parsing HTML: Link atau Job ID tidak ditemukan.");
        link = await this.poll(id);
      }
      console.log("[LOG] Downloading result...");
      const cleanLink = link.startsWith("/") ? link.slice(1) : link;
      const resResult = await this.req(`${this.host}/${cleanLink}`);
      return {
        success: true,
        result: resResult?.data || ""
      };
    } catch (e) {
      console.error(`[ERROR] ${e.message}`);
      return {
        success: false,
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new AsciiArtGen();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}