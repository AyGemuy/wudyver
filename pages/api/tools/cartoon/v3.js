import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
class ImageUpscaler {
  constructor() {
    this.baseUrl = "https://imageupscaler.com";
    this.apiUrl = `${this.baseUrl}/wp-admin/admin-ajax.php`;
    this.cookies = {};
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: `${this.baseUrl}/image-to-anime/`
    };
    this.validTypes = ["anime", "3d", "sketch", "handdrawn", "artstyle", "design", "illustration"];
    this.validFormats = ["auto", "jpeg", "png", "webp", "heic", "bmp", "pdf"];
    this.validIncreases = [2, 4, 6, 8];
    this.validImageTypes = ["Photo", "Digital Art", "Painting", "3D", "Fantasy", "Anime", "Psychedelic", "Cartoon", "Comics", "Abstraction", "Watercolour", "Collage illustration", "Cyberpunk", "Grayscale pencil on paper", "Vector image", "Morble sculpture", "Wan Gogh impressionism", "Oil on canvas", "own-variant"];
  }
  generateRandomFilename(extension = "jpg") {
    const randomString = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `${randomString}${timestamp}.${extension}`;
  }
  parseCookie(cookieString) {
    const cookie = {};
    cookieString.split(";").forEach(part => {
      const [key, ...valueParts] = part.trim().split("=");
      if (key) {
        cookie[key] = valueParts.join("=");
      }
    });
    return cookie;
  }
  updateCookies(response) {
    const setCookieHeader = response.headers["set-cookie"];
    if (setCookieHeader) {
      const cookiesToUpdate = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      cookiesToUpdate.forEach(cookieString => {
        const parsedCookie = this.parseCookie(cookieString);
        Object.assign(this.cookies, parsedCookie);
      });
      this.headers.Cookie = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
      console.log("Cookie berhasil diperbarui:", this.headers.Cookie);
    }
  }
  async getNonce(pagePath = "/image-to-anime/") {
    try {
      console.log(`Mencoba mengambil nonce dari: ${this.baseUrl}${pagePath}...`);
      const response = await axios.get(`${this.baseUrl}${pagePath}`, {
        headers: this.headers
      });
      this.updateCookies(response);
      const $ = cheerio.load(response.data);
      const nonce = $("#process_nonce").attr("value") || "";
      console.log(`Nonce berhasil diambil (${pagePath}): ${nonce}`);
      return nonce;
    } catch (error) {
      console.error(`Gagal mengambil nonce dari ${pagePath}: ${error.message}`);
      throw new Error(`Gagal mengambil nonce dari ${pagePath}: ${error.message}`);
    }
  }
  async imageUrlToBase64(imageUrl) {
    try {
      console.log(`Mencoba mengunduh gambar dari: ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        headers: {
          Accept: "image/*"
        }
      });
      const contentType = response.headers["content-type"];
      const extension = contentType ? contentType.split("/")[1] : "jpg";
      const mime = contentType || "image/jpeg";
      console.log(`MIME Type gambar: ${mime}, ekstensi: ${extension}`);
      const base64Image = Buffer.from(response.data, "binary").toString("base64");
      console.log(`Gambar berhasil diubah ke base64.`);
      return {
        base64: base64Image,
        extension: extension,
        mime: mime
      };
    } catch (error) {
      console.error(`Gagal mengambil gambar dari ${imageUrl}: ${error.message}`);
      throw new Error(`Gagal mengambil gambar: ${error.message}`);
    }
  }
  parseImageResult(html) {
    try {
      const $ = cheerio.load(html);
      const initialImage = $(".block-before img").attr("src");
      const processedImage = $(".block-after img").attr("src");
      const downloadLink = $(".result__compiled-btns a.btn-small").attr("href");
      const serverErrorMessage = $(".message_box.error").text().trim();
      if (serverErrorMessage) {
        console.error(`Pesan error dari server: ${serverErrorMessage}`);
        throw new Error(`Server error: ${serverErrorMessage}`);
      }
      if (!processedImage || !downloadLink) {
        console.error("Gagal menemukan URL hasil gambar atau link download.");
        throw new Error("Gagal memproses gambar: Hasil atau link download tidak ditemukan.");
      }
      const result = {
        original: initialImage ? `${initialImage}` : null,
        processed: processedImage ? `${processedImage}` : null,
        download: downloadLink ? `${downloadLink}` : null
      };
      console.log("Berhasil memproses hasil gambar:", result);
      return result;
    } catch (error) {
      console.error(`Gagal memproses hasil gambar: ${error.message}`);
      throw error;
    }
  }
  parseTextResult(responseData) {
    try {
      console.log("Mencoba memparsing hasil text-to-image...");
      try {
        const result = JSON.parse(responseData);
        if (result && (result.url || result.downloadUrl || result.images && result.images.length > 0)) {
          console.log("Berhasil memparsing hasil sebagai JSON:", result);
          const downloadUrl = result.url || result.downloadUrl || result.images && result.images[0].url || null;
          const processedUrl = result.processedUrl || result.images && result.images[0].url || downloadUrl;
          const originalUrl = result.originalUrl || null;
          return {
            original: originalUrl,
            processed: processedUrl,
            download: downloadUrl
          };
        }
        console.log("Respons JSON tidak dalam format yang diharapkan.");
      } catch (jsonError) {
        console.log(`Gagal memparsing sebagai JSON: ${jsonError.message}. Mencoba memparsing sebagai HTML...`);
      }
      const $ = cheerio.load(responseData);
      const initialImage = $(".block-before img").attr("src");
      const processedImage = $(".block-after img").attr("src");
      const downloadLink = $(".result__compiled-btns a.btn-small").attr("href");
      const serverErrorMessage = $(".message_box.error").text().trim();
      if (serverErrorMessage) {
        console.error(`Pesan error dari server: ${serverErrorMessage}`);
        throw new Error(`Server error: ${serverErrorMessage}`);
      }
      if (!processedImage && !downloadLink) {
        console.error("Gagal menemukan URL hasil gambar atau link download dari respons HTML.");
        console.log("Respons raw:", responseData);
        throw new Error("Gagal memproses hasil text-to-image: Hasil tidak ditemukan dalam format yang diharapkan.");
      }
      const htmlResult = {
        original: initialImage ? `${initialImage}` : null,
        processed: processedImage ? `${processedImage}` : null,
        download: downloadLink ? `${downloadLink}` : null
      };
      console.log("Berhasil memparsing hasil HTML:", htmlResult);
      return htmlResult;
    } catch (error) {
      console.error(`Gagal memproses hasil text-to-image: ${error.message}`);
      throw new Error(`Gagal memproses hasil text-to-image: ${error.message}`);
    }
  }
  async generate({
    imageUrl,
    prompt,
    type,
    format = "png",
    increase = null,
    imageType,
    ownVariant = null,
    func
  }) {
    let action;
    let effectiveFunc;
    let pagePath;
    let isImageInput;
    if (imageUrl && prompt) {
      throw new Error("Harus menyediakan 'imageUrl' ATAU 'prompt', tapi tidak keduanya.");
    } else if (!imageUrl && !prompt) {
      throw new Error("Harus menyediakan 'imageUrl' UNTUK pemrosesan gambar atau 'prompt' UNTUK text-to-image.");
    }
    if (imageUrl) {
      action = "processing_images_adv";
      pagePath = "/image-to-anime/";
      effectiveFunc = func || (increase !== null ? `upscale-image-${increase}x` : type ? "image-to-anime" : "image-to-anime");
      isImageInput = true;
      console.log(`Mode: Image Processing (Function: ${effectiveFunc})`);
    } else {
      action = "processing_text_adv";
      pagePath = "/ai-image-generator/";
      effectiveFunc = func || "ai-image-generator";
      isImageInput = false;
      console.log(`Mode: Text-to-Image Generation (Function: ${effectiveFunc})`);
      if (effectiveFunc !== "ai-image-generator") {
        console.warn(`Peringatan: Fungsi '${effectiveFunc}' digunakan dengan input teks, meskipun 'ai-image-generator' adalah fungsi default untuk mode ini.`);
      }
    }
    const nonce = await this.getNonce(pagePath);
    const form = new FormData();
    form.append("action", action);
    form.append("nonce", nonce);
    form.append("pid", "50105373613200053736095843124");
    form.append("function", effectiveFunc);
    if (isImageInput) {
      console.log(`Validasi input gambar: tipe=${type}, format=${format}, increase=${increase}`);
      if (effectiveFunc === "image-to-anime") {
        if (type === undefined || type === null || !this.validTypes.includes(type.toLowerCase())) {
          const availableTypes = this.validTypes.join(", ");
          throw new Error(`Input 'type' tidak valid atau kosong untuk function '${effectiveFunc}': '${type}'. Type yang tersedia adalah: ${availableTypes}`);
        }
        form.append("parameters[upscale-type]", type);
      } else if (effectiveFunc.startsWith("upscale-image")) {
        if (increase === undefined || increase === null || !this.validIncreases.includes(increase)) {
          const availableIncreases = this.validIncreases.join(" atau ");
          throw new Error(`Input 'increase' tidak valid atau kosong untuk function '${effectiveFunc}': '${increase}'. Increase yang tersedia adalah: ${availableIncreases}`);
        }
        form.append("parameters[increase]", increase);
      } else {
        console.warn(`Validasi 'type' dan 'increase' dilewati untuk fungsi gambar tak dikenal: ${effectiveFunc}`);
        if (type !== undefined && type !== null) form.append("parameters[upscale-type]", type);
        if (increase !== undefined && increase !== null) form.append("parameters[increase]", increase);
      }
      if (format === undefined || format === null || !this.validFormats.includes(format.toLowerCase())) {
        const availableFormats = this.validFormats.join(", ");
        throw new Error(`Input 'format' tidak valid: '${format}'. Format yang tersedia adalah: ${availableFormats}`);
      }
      form.append("parameters[save-format]", format);
      const {
        base64,
        extension
      } = await this.imageUrlToBase64(imageUrl);
      const fileName = this.generateRandomFilename(extension);
      form.append("mediaData[0][fileSrc]", `data:image/${extension};base64,${base64}`);
      form.append("mediaData[0][fileName]", fileName);
    } else {
      console.log(`Validasi input teks: prompt='${prompt}', imageType='${imageType}', ownVariant='${ownVariant}', format='${format}'`);
      if (imageType === undefined || imageType === null || !this.validImageTypes.includes(imageType)) {
        const availableImageTypes = this.validImageTypes.join(", ");
        throw new Error(`Input 'imageType' tidak valid atau kosong: '${imageType}'. Image Type yang tersedia adalah: ${availableImageTypes}`);
      }
      if (imageType === "own-variant") {
        if (ownVariant === undefined || ownVariant === null || ownVariant.trim() === "") {
          throw new Error(`Ketika 'imageType' adalah 'own-variant', 'ownVariant' (teks kustom) tidak boleh kosong.`);
        }
        form.append("parameters[own-variant]", ownVariant.trim());
      } else {
        form.append("parameters[own-variant]", "");
      }
      if (format === undefined || format === null || !this.validFormats.includes(format.toLowerCase())) {
        const availableFormats = this.validFormats.join(", ");
        throw new Error(`Input 'format' tidak valid: '${format}'. Format yang tersedia adalah: ${availableFormats}`);
      }
      form.append("mediaData", prompt);
      form.append("parameters[image-type]", imageType);
      form.append("parameters[save-format]", format);
    }
    console.log(`Mengirim permintaan proses (${action}) ke server untuk fungsi: ${effectiveFunc}...`);
    try {
      const response = await axios.post(this.apiUrl, form, {
        headers: this.headers
      });
      this.updateCookies(response);
      const responseData = response.data;
      console.log("Permintaan proses berhasil, memproses hasil...");
      if (isImageInput) {
        return this.parseImageResult(responseData);
      } else {
        return this.parseTextResult(responseData);
      }
    } catch (error) {
      console.error(`Processing request error (Func: ${effectiveFunc}, Action: ${action}): ${error.message}`);
      throw new Error(`Processing request failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const upscaler = new ImageUpscaler();
    const response = await upscaler.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}