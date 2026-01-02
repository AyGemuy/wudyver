import axios from "axios";
import FormData from "form-data";
class KobaltGen {
  constructor() {
    this.url = "https://msgboxgen.kobalt.dev/submit/";
    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Referer: "https://msgboxgen.kobalt.dev/",
      Origin: "https://msgboxgen.kobalt.dev",
      Priority: "u=0, i"
    };
  }
  log(msg) {
    console.log(`[Kobalt] ${new Date().toLocaleTimeString()} > ${msg}`);
  }
  async generate({
    text: message,
    ...rest
  }) {
    this.log("Initializing form construction...");
    try {
      const form = new FormData();
      const msg = message || "Save changes to 'untitled'?";
      const title = rest?.title || "Message";
      const btns = rest?.buttons || "Yes;No;Cancel";
      form.append("title", title);
      form.append("message", msg);
      form.append("buttons", btns);
      form.append("icon", rest?.icon || "");
      form.append("font", rest?.font || "tahoma");
      form.append("width", rest?.width ? String(rest.width) : "300");
      form.append("windowBackgroundColor", rest?.winColor || "#c0c0c0");
      form.append("titleBarStartColor", rest?.barStart || "#000080");
      form.append("titleBarEndColor", rest?.barEnd || "#1084d0");
      form.append("titleBarTextColor", rest?.barText || "#ffffff");
      form.append("buttonTextColor", rest?.btnText || "#000000");
      form.append("buttonBackgroundColor", rest?.btnBg || "#c0c0c0");
      form.append("submit", "Generate");
      this.log(`Payload set: "${title}" -> "${msg}"`);
      const headers = {
        ...this.defaultHeaders,
        ...form.getHeaders()
      };
      this.log("Sending request...");
      const response = await axios.post(this.url, form, {
        headers: headers,
        responseType: "arraybuffer"
      });
      const buffer = response?.data;
      const valid = buffer instanceof Buffer;
      this.log(valid ? `Success! Received ${buffer.length} bytes.` : "Failed to receive buffer.");
      return valid ? buffer : Buffer.from([]);
    } catch (err) {
      const status = err?.response?.status ? `[${err.response.status}]` : "";
      this.log(`Error ${status}: ${err?.message || "Unknown Error"}`);
      return Buffer.from([]);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new KobaltGen();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}