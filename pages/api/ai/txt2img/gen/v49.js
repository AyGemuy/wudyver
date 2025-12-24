import axios from "axios";
import * as cheerio from "cheerio";
const BASE_URL = "https://unrestrictedaiimagegenerator.com/";
class ImageGenClient {
  constructor() {
    console.log("🤖 Client AI Image Generator diinisiasi (di constructor).");
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 2e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "id-ID",
        Referer: BASE_URL,
        Origin: BASE_URL
      }
    });
  }
  async fetchInitData() {
    console.log("-> Mengambil Nonce dan Daftar Style...");
    try {
      const res = await this.client.get("/");
      const $ = cheerio.load(res.data);
      const nonce = $('#imageGeneratorForm input[name="_wpnonce"]')?.val() || null;
      const styles = [];
      $("#imageStyle option").each((i, el) => {
        const value = $(el).attr("value");
        if (value || $(el).text().trim() === "Photorealistic") {
          styles.push(value);
        }
      });
      const validStyles = styles.filter(s => s);
      console.log(`-> Nonce Ditemukan: ${nonce ? "Ya" : "Tidak"}. Style Ditemukan: ${validStyles.length} buah.`);
      return {
        nonce: nonce,
        styles: validStyles.length > 0 ? validStyles : null
      };
    } catch (error) {
      console.error("❌ Gagal mengambil Nonce/Styles:", error.message);
      return {
        nonce: null,
        styles: null,
        error: error.message
      };
    }
  }
  async generate({
    prompt,
    style,
    ...rest
  }) {
    const reqPrompt = (prompt || "A robot coding in a jungle, digital art") + (rest.suffix ? `, ${rest.suffix}` : "");
    const reqStyle = style || "photorealistic";
    console.log(`\n⏳ Mulai Generasi: "${reqPrompt.substring(0, 50)}..." dengan Style: ${reqStyle}`);
    const {
      nonce,
      styles,
      error: initError
    } = await this.fetchInitData();
    if (initError) {
      return {
        success: false,
        message: `Inisialisasi gagal: ${initError}`
      };
    }
    const finalStyle = styles?.includes(reqStyle) ? reqStyle : "photorealistic";
    if (finalStyle !== reqStyle) {
      console.warn(`⚠️ Style "${reqStyle}" tidak valid/ditemukan. Menggunakan default: "${finalStyle}".`);
    }
    if (!nonce) {
      return {
        success: false,
        message: "Nonce tidak ditemukan, tidak bisa melanjutkan generasi."
      };
    }
    console.log("✅ Nonce dan Style valid. Mengirim permintaan POST...");
    try {
      const formData = new URLSearchParams();
      formData.append("generate_image", "true");
      formData.append("image_description", reqPrompt);
      formData.append("image_style", finalStyle);
      formData.append("_wpnonce", nonce);
      const res = await this.client.post("/", formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      const $ = cheerio.load(res.data);
      const resultImgSrc = $("#resultImage")?.attr("src");
      const errorText = $("#error.active")?.text()?.trim();
      if (errorText) {
        console.error(`❌ Generasi Gagal (Situs): ${errorText}`);
        return {
          success: false,
          message: errorText
        };
      }
      if (resultImgSrc) {
        console.log(`✨ Generasi Berhasil! URL Gambar: ${resultImgSrc.substring(0, 60)}...`);
        return {
          success: true,
          prompt: reqPrompt,
          style: finalStyle,
          image_url: resultImgSrc
        };
      } else {
        console.error("❌ Generasi Gagal: Gambar hasil tidak ditemukan di respons.");
        return {
          success: false,
          message: "Gambar hasil tidak ditemukan di respons situs."
        };
      }
    } catch (error) {
      console.error(`❌ Gagal saat Generasi (Axios): ${error.message}`);
      return {
        success: false,
        message: `Terjadi kesalahan jaringan/server: ${error.message}`
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ImageGenClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}