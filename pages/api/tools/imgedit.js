import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import CryptoJS from "crypto-js";
class ImgEditAI {
  constructor() {
    this.baseUrl = "https://uploads.imgedit.ai/api/v1/draw-cf";
    this.generateUrl = "https://imgedit.ai/api/v1/draw-cf/generate";
    this.pollingUrl = "https://imgedit.ai/api/v1/draw-cf";
    this.removeBgUrl = "https://imgedit.ai/api/v1/draw-task/al";
    this.mergeUrl = "https://imgedit.ai/api/v1/al/mergeImageFace";
    this.volcUrl = "https://imgedit.ai/api/v1/draw-task/volc";
    this.enhanceUrl = "https://imgedit.ai/api/v1/tools/imageenhan";
    this.comfyUrl = "https://imgedit.ai/api/v1/draw-task/comfy";
    this.extraUploadUrl = "https://upload.imgedit.ai/api/v1/files/uploadImgs";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: "null",
      "cache-control": "no-cache",
      origin: "https://imgedit.ai",
      referer: "https://imgedit.ai/background-remover",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.ekey = this.generateEkey();
  }
  generateEkey() {
    const letters1 = "adghko45678";
    const letters2 = "012389abcduiopmn";
    const randomNum = (min, max) => Math.floor(Math.random() * (max - min) + min);
    const randomChars = (length, chars) => Array.from({
      length: length
    }, () => chars[Math.random() * chars.length | 0]).join("");
    return `${randomNum(7e3, 1e4)}${randomChars(4, letters1)}${randomChars(4, letters2)}${randomNum(1e3, 4e3)}`;
  }
  decrypt(data) {
    if (!data) return;
    try {
      const key = CryptoJS.enc.Utf8.parse("651cc172938d5b7799a23ac245e539a6");
      const iv = CryptoJS.enc.Utf8.parse("35e5cd2d684e5c65");
      return JSON.parse(CryptoJS.AES.decrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString(CryptoJS.enc.Utf8));
    } catch {
      return undefined;
    }
  }
  async pollingTask(taskId) {
    try {
      console.log("[POLLING] Memeriksa status task ID:", taskId);
      const {
        data
      } = await axios.get(`${this.pollingUrl}/${taskId}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success") {
        return result.data.images;
      }
      throw new Error("Respon polling tidak valid");
    } catch (error) {
      console.error("[POLLING] Error:", error.message);
      throw error;
    }
  }
  async getImage(url) {
    try {
      console.log(`[FETCH] Mengambil gambar dari: ${url}`);
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"];
      if (!contentType.startsWith("image/")) throw new Error("Bukan file gambar.");
      return {
        buffer: response.data,
        mime: contentType
      };
    } catch (error) {
      console.error("[FETCH] Error:", error.message);
      throw error;
    }
  }
  async upload({
    imageUrl,
    extra = false
  }) {
    try {
      console.log("[UPLOAD] Mengunggah gambar ke ImgEditAI...");
      const {
        buffer,
        mime
      } = await this.getImage(imageUrl);
      const ext = mime.split("/")[1];
      let form;
      if (extra) {
        const base64Image = `data:image/png;base64,${buffer.toString("base64")}`;
        const payload = {
          files_base64: base64Image
        };
        const {
          data
        } = await axios.post(`${this.extraUploadUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
          headers: this.headers
        });
        const decryptedData = this.decrypt(data.data);
        if (decryptedData?.code === 0 && decryptedData?.msg === "Success" && decryptedData?.data?.image) {
          console.log("[UPLOAD] Upload berhasil, melanjutkan generate...");
          return decryptedData.data.image;
        } else {
          throw new Error("Respon upload tidak valid");
        }
      } else {
        form = new FormData();
        form.append("image", new Blob([buffer], {
          type: mime
        }), `upload.${ext}`);
        const {
          data
        } = await axios.post(`${this.baseUrl}/upload?ekey=${this.ekey}&soft_id=imgedit_web`, form, {
          headers: {
            ...this.headers,
            ...form.headers
          }
        });
        const decryptedData = this.decrypt(data.data);
        if (decryptedData?.code === 0 && decryptedData?.msg === "Success" && decryptedData?.data?.image) {
          console.log("[UPLOAD] Upload berhasil, melanjutkan generate...");
          return decryptedData.data.image;
        } else {
          throw new Error("Respon upload tidak valid");
        }
      }
    } catch (error) {
      console.error("[UPLOAD] Error:", error.message);
      throw error;
    }
  }
  async removebg({
    extra_image_key,
    layout = 7
  }) {
    try {
      console.log("[REMOVE BG] Menghapus latar belakang...");
      const payload = {
        image_key_type: 3,
        extra_image_key: extra_image_key,
        template: "segment_common",
        task_params: "background",
        layout: layout
      };
      const {
        data
      } = await axios.post(`${this.removeBgUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[REMOVE BG] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon remove background tidak valid");
    } catch (error) {
      console.error("[REMOVE BG] Error:", error.message);
      throw error;
    }
  }
  async img2img({
    extra_image_key,
    template = "anime",
    seed = "4744204771974",
    style_id = 42,
    ...params
  }) {
    try {
      console.log(`[GENERATE] Membuat gambar dengan extra_image_key: ${extra_image_key}...`);
      const payload = {
        template: template,
        seed: seed,
        style_id: style_id,
        extra_image_key: extra_image_key,
        ...params
      };
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log(`[GENERATE] Task ID: ${result.data.task_id}, Memulai polling...`);
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon generate tidak valid");
    } catch (error) {
      console.error("[GENERATE] Error:", error.message);
      throw error;
    }
  }
  async txt2img({
    template = "mx",
    content = "men",
    style_id = 1,
    seed = "9526208109331"
  }) {
    try {
      const payload = {
        template: template,
        style_id: style_id,
        content: content,
        seed: seed,
        params: ["1024", "1024", "1", "78", "15", "65", "1", "1"],
        count: 1
      };
      console.log("[TXT2IMG] Mengirim permintaan untuk membuat gambar dari teks...");
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log(`[TXT2IMG] Task ID: ${result.data.task_id}, Memulai polling...`);
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon txt2img tidak valid");
    } catch (error) {
      console.error("[TXT2IMG] Error:", error.message);
      throw error;
    }
  }
  async swap({
    mark_image_url,
    extra_image_url
  }) {
    try {
      console.log("[SWAP] Menggabungkan gambar...");
      const payload = {
        image_key_type: 3,
        mark_image_url: mark_image_url,
        extra_image_url: extra_image_url
      };
      const {
        data
      } = await axios.post(`${this.mergeUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[SWAP] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon swap tidak valid");
    } catch (error) {
      console.error("[SWAP] Error:", error.message);
      throw error;
    }
  }
  async sketch({
    extra_image_key,
    seed = "2537242552554",
    style_id = 16
  }) {
    try {
      console.log("[SKETCH] Menghasilkan gambar sketsa...");
      const payload = {
        template: "sketch_v2",
        seed: seed,
        style_id: style_id,
        extra_image_key: extra_image_key
      };
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[SKETCH] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon sketch tidak valid");
    } catch (error) {
      console.error("[SKETCH] Error:", error.message);
      throw error;
    }
  }
  async cartoon({
    extra_image_key,
    seed = "4559242669858",
    style_id = 42
  }) {
    try {
      console.log("[CARTOON] Menghasilkan gambar kartun...");
      const payload = {
        template: "anime",
        seed: seed,
        style_id: style_id,
        extra_image_key: extra_image_key
      };
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[CARTOON] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon cartoon tidak valid");
    } catch (error) {
      console.error("[CARTOON] Error:", error.message);
      throw error;
    }
  }
  async replace({
    content = "add girl",
    mask_image_key,
    extra_image_key,
    seed = "5078242823894",
    style_id = 2
  }) {
    try {
      console.log("[REPLACE] Mengganti gambar...");
      const payload = {
        template: "mx",
        style_id: style_id,
        content: content,
        count: 1,
        seed: seed,
        params: ["1024", "1024", "1", "78", "81", "119", "0.6", "1"],
        mask_image_key: mask_image_key,
        extra_image_key: extra_image_key
      };
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[REPLACE] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon replace tidak valid");
    } catch (error) {
      console.error("[REPLACE] Error:", error.message);
      throw error;
    }
  }
  async expand({
    extra_image_key,
    seed = "1429242956493",
    params = ["0", "233.33333333333331", "0", "233.33333333333331"]
  }) {
    try {
      console.log("[EXPAND] Memperluas gambar...");
      const payload = {
        template: "expand",
        extra_image_key: extra_image_key,
        params: params,
        seed: seed
      };
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[EXPAND] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon expand tidak valid");
    } catch (error) {
      console.error("[EXPAND] Error:", error.message);
      throw error;
    }
  }
  async background({
    extra_image_key,
    seed = "462824310800 0",
    style_id = 1003,
    content = "men",
    layout = 7
  }) {
    try {
      console.log("[BACKGROUND] Mengganti latar belakang gambar...");
      const payload = {
        image_key_type: 3,
        template: "commerce_v3",
        style_id: style_id,
        content: content,
        count: 1,
        seed: seed,
        params: ["181"],
        extra_image_key: extra_image_key
      };
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[BACKGROUND] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon background tidak valid");
    } catch (error) {
      console.error("[BACKGROUND] Error:", error.message);
      throw error;
    }
  }
  async filter({
    bg_image_key,
    seed = "2160243405486",
    params = ["0.5", "67", "57"]
  }) {
    try {
      console.log("[FILTER] Menerapkan filter pada gambar...");
      const payload = {
        image_key_type: 3,
        template: "style_transfer_v2",
        count: 1,
        seed: seed,
        params: params,
        bg_image_key: bg_image_key
      };
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[FILTER] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon filter tidak valid");
    } catch (error) {
      console.error("[FILTER] Error:", error.message);
      throw error;
    }
  }
  async eraser({
    extra_image_key,
    mark_image_key,
    layout = 6,
    task_params = {
      steps: 10,
      strength: 1,
      scale: 2,
      seed: 9092272922366
    }
  }) {
    try {
      console.log("[ERASER] Menghapus bagian gambar...");
      const payload = {
        extra_image_key: extra_image_key,
        mark_image_key: mark_image_key,
        image_key_type: 3,
        action: 64,
        layout: layout,
        task_params: task_params
      };
      const {
        data
      } = await axios.post(`${this.volcUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[ERASER] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon eraser tidak valid");
    } catch (error) {
      console.error("[ERASER] Error:", error.message);
      throw error;
    }
  }
  async animation({
    extra_image_key,
    seed = "2925273045621",
    style_id = 37
  }) {
    try {
      console.log("[ANIMATION] Menghasilkan gambar animasi...");
      const payload = {
        template: "anime",
        seed: seed,
        style_id: style_id,
        extra_image_key: extra_image_key
      };
      const {
        data
      } = await axios.post(`${this.generateUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[ANIMATION] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon animation tidak valid");
    } catch (error) {
      console.error("[ANIMATION] Error:", error.message);
      throw error;
    }
  }
  async unblur({
    extra_image_key,
    layout = 6
  }) {
    try {
      console.log("[UNBLUR] Menghapus blur dari gambar...");
      const payload = {
        extra_image_key: extra_image_key,
        image_key_type: 3,
        action: 66,
        layout: layout
      };
      const {
        data
      } = await axios.post(`${this.volcUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[UNBLUR] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon unblur tidak valid");
    } catch (error) {
      console.error("[UNBLUR] Error:", error.message);
      throw error;
    }
  }
  async removewm({
    extra_image_key,
    mark_image_key,
    layout = 6,
    task_params = {
      steps: 10,
      strength: 1,
      scale: 2,
      seed: 4307273307106
    }
  }) {
    try {
      console.log("[REMOVE WM] Menghapus watermark dari gambar...");
      const payload = {
        extra_image_key: extra_image_key,
        mark_image_key: mark_image_key,
        image_key_type: 3,
        action: 64,
        layout: layout,
        task_params: task_params
      };
      const {
        data
      } = await axios.post(`${this.volcUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[REMOVE WM] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon removewm tidak valid");
    } catch (error) {
      console.error("[REMOVE WM] Error:", error.message);
      throw error;
    }
  }
  async restoration({
    extra_image_key,
    layout = 6
  }) {
    try {
      console.log("[RESTORATION] Memulihkan gambar...");
      const payload = {
        extra_image_key: extra_image_key,
        image_key_type: 3,
        action: 66,
        layout: layout
      };
      const {
        data
      } = await axios.post(`${this.volcUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[RESTORATION] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon restoration tidak valid");
    } catch (error) {
      console.error("[RESTORATION] Error:", error.message);
      throw error;
    }
  }
  async signbg({
    extra_image_key,
    layout = 7
  }) {
    try {
      console.log("[SIGN BG] Menandai latar belakang...");
      const payload = {
        image_key_type: 3,
        extra_image_key: extra_image_key,
        template: "segment_common",
        task_params: "background",
        layout: layout
      };
      const {
        data
      } = await axios.post(`${this.removeBgUrl}?ekey=${this.ekey}&soft_id=imgedit_web`, payload, {
        headers: this.headers
      });
      const result = this.decrypt(data.data);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[SIGN BG] Task ID:", result.data.task_id, "Memulai polling...");
        return await this.pollingTask(result.data.task_id);
      }
      throw new Error("Respon signbg tidak valid");
    } catch (error) {
      console.error("[SIGN BG] Error:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const imgEdit = new ImgEditAI();
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  try {
    const sendImageBuffer = result => {
      if (!result?.length) {
        return res.status(400).json({
          success: false,
          message: "Data tidak valid."
        });
      }
      const imageBuffer = Buffer.from(result[0].split(",")[1], "base64");
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    };
    switch (action) {
      case "animation":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const animationResult = await imgEdit.animation(params);
        return sendImageBuffer(animationResult);
      case "background":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const backgroundResult = await imgEdit.background(params);
        return sendImageBuffer(backgroundResult);
      case "cartoon":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const cartoonResult = await imgEdit.cartoon(params);
        return sendImageBuffer(cartoonResult);
      case "eraser":
        if (!params.extra_image_key || !params.mark_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' dan 'mark_image_key' diperlukan."
          });
        }
        const eraserResult = await imgEdit.eraser(params);
        return sendImageBuffer(eraserResult);
      case "expand":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const expandResult = await imgEdit.expand(params);
        return sendImageBuffer(expandResult);
      case "filter":
        if (!params.bg_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'bg_image_key' diperlukan."
          });
        }
        const filterResult = await imgEdit.filter(params);
        return sendImageBuffer(filterResult);
      case "img2img":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const img2imgResult = await imgEdit.img2img(params);
        return sendImageBuffer(img2imgResult);
      case "removebg":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const removeBgResult = await imgEdit.removebg(params);
        return sendImageBuffer(removeBgResult);
      case "removewm":
        if (!params.extra_image_key || !params.mark_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' dan 'mark_image_key' diperlukan."
          });
        }
        const removewmResult = await imgEdit.removewm(params);
        return sendImageBuffer(removewmResult);
      case "replace":
        if (!params.mask_image_key || !params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'mask_image_key' dan 'extra_image_key' diperlukan."
          });
        }
        const replaceResult = await imgEdit.replace(params);
        return sendImageBuffer(replaceResult);
      case "restoration":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const restorationResult = await imgEdit.restoration(params);
        return sendImageBuffer(restorationResult);
      case "signbg":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const signbgResult = await imgEdit.signbg(params);
        return sendImageBuffer(signbgResult);
      case "sketch":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const sketchResult = await imgEdit.sketch(params);
        return sendImageBuffer(sketchResult);
      case "swap":
        if (!params.mark_image_url || !params.extra_image_url) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'mark_image_url' dan 'extra_image_url' diperlukan."
          });
        }
        const swapResult = await imgEdit.swap(params);
        return sendImageBuffer(swapResult);
      case "txt2img":
        if (!params.content) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'content' diperlukan."
          });
        }
        const txt2imgResult = await imgEdit.txt2img(params);
        return sendImageBuffer(txt2imgResult);
      case "unblur":
        if (!params.extra_image_key) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'extra_image_key' diperlukan."
          });
        }
        const unblurResult = await imgEdit.unblur(params);
        return sendImageBuffer(unblurResult);
      case "upload":
        if (!params.imageUrl) {
          return res.status(400).json({
            success: false,
            message: "Parameter 'imageUrl' diperlukan."
          });
        }
        const uploadResult = await imgEdit.upload(params);
        return res.status(200).json({
          success: true,
          result: uploadResult
        });
      default:
        return res.status(400).json({
          success: false,
          message: "Action tidak dikenali."
        });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}