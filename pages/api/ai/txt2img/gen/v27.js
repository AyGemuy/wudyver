import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
class AimageClient {
  constructor() {
    this.client = axios.create({
      baseURL: "https://aimage.ai/api",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        Origin: "https://aimage.ai",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      },
      maxRedirects: 5
    });
    this.cookies = [];
    this.client.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookieString => {
          const [cookieNameAndValue] = cookieString.split(";");
          const cookieKey = cookieNameAndValue.split("=")[0].trim();
          if (!this.cookies.some(c => c.startsWith(cookieKey))) {
            this.cookies.push(cookieNameAndValue.trim());
          }
        });
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
    this.client.interceptors.request.use(config => {
      if (this.cookies.length > 0) {
        config.headers["Cookie"] = this.cookies.join("; ");
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async getBase64Image(url) {
    console.log(`-> Mengambil gambar dari URL: ${url}`);
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(response.data, "binary");
      const base64Image = `data:${response.headers["content-type"]};base64,${imageBuffer.toString("base64")}`;
      console.log("✓ Gambar berhasil dikonversi ke Base64.");
      return base64Image;
    } catch (error) {
      console.error(`✗ Gagal mengambil atau mengonversi gambar dari URL: ${url}.`);
      throw new Error(`Gagal mengambil atau mengonversi gambar dari URL: ${url}. Error: ${error.message}`);
    }
  }
  async getTempEmail() {
    console.log("-> Mengambil email sementara...");
    try {
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = response.data.email;
      console.log(`✓ Email sementara berhasil didapatkan: ${email}`);
      return email;
    } catch (error) {
      console.error("✗ Gagal mendapatkan email sementara.");
      throw error;
    }
  }
  async register(email) {
    console.log(`-> Mendaftar akun dengan email: ${email}`);
    try {
      await this.client.post("/auth/sign-up/email", {
        email: email,
        password: email,
        name: email,
        callbackURL: "/"
      }, {
        headers: {
          "Content-Type": "application/json",
          Referer: "https://aimage.ai/auth/register"
        }
      });
      console.log("✓ Pendaftaran berhasil. Menunggu email verifikasi...");
    } catch (error) {
      console.error("✗ Pendaftaran gagal.");
      throw error;
    }
  }
  async getVerificationLink(email) {
    console.log("-> Mencari link verifikasi dalam email...");
    await new Promise(resolve => setTimeout(resolve, 5e3));
    try {
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
      const textContent = response.data.data[0].text_content;
      const regex = /https:\/\/aimage\.ai\/api\/auth\/verify-email\?token=([^&]+)/;
      const match = textContent.match(regex);
      if (match && match[0]) {
        console.log("✓ Link verifikasi ditemukan.");
        return match[0];
      } else {
        throw new Error("Link verifikasi tidak ditemukan.");
      }
    } catch (error) {
      console.error("✗ Gagal mendapatkan link verifikasi.");
      throw error;
    }
  }
  async verifyAccount(verificationLink) {
    console.log("-> Mengikuti link verifikasi dan memverifikasi akun...");
    try {
      await this.client.get(verificationLink);
      console.log("✓ Akun berhasil diverifikasi.");
    } catch (error) {
      console.error("✗ Verifikasi akun gagal.");
      throw error;
    }
  }
  async create({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("\n--- Memulai alur autentikasi dan pembuatan gambar ---");
    try {
      const email = await this.getTempEmail();
      await this.register(email);
      const verificationLink = await this.getVerificationLink(email);
      await this.verifyAccount(verificationLink);
      console.log("--- Autentikasi berhasil, melanjutkan ke pembuatan gambar ---");
    } catch (error) {
      console.error("✗ Gagal dalam alur autentikasi.");
      throw error;
    }
    console.log("-> Memulai permintaan pembuatan gambar...");
    const payload = {
      prompt: prompt,
      ...rest,
      style: "realistic",
      size: "2:3"
    };
    if (imageUrl) {
      if (imageUrl.startsWith("http")) {
        console.log(`Input gambar adalah URL, mengonversi ke Base64...`);
        payload.referenceImages = [await this.getBase64Image(imageUrl)];
      } else {
        console.log(`Input gambar sudah dalam format Base64.`);
        payload.referenceImages = [imageUrl];
      }
    }
    try {
      const response = await this.client.post("/generate-image", payload, {
        headers: {
          "Content-Type": "application/json",
          Referer: "https://aimage.ai/ai-image-generator"
        }
      });
      const responseData = response.data;
      console.log(responseData);
      const dataToEncrypt = {
        api_response: responseData,
        cookies: this.cookies
      };
      const task_id = await this.enc(dataToEncrypt);
      console.log(`✓ Permintaan pembuatan gambar berhasil. Task ID: ${task_id}`);
      return {
        task_id: task_id,
        status: "pending"
      };
    } catch (error) {
      console.error("✗ Gagal membuat gambar.");
      throw error;
    }
  }
  async status({
    task_id
  }) {
    console.log(`-> Memeriksa status untuk Task ID: ${task_id}`);
    let decryptedData;
    let apiTaskId;
    try {
      decryptedData = await this.dec(task_id);
      apiTaskId = decryptedData.api_response?.taskId;
      if (!apiTaskId) {
        throw new Error("Task ID API tidak ditemukan dalam data terdekripsi.");
      }
    } catch (error) {
      console.error("✗ Gagal mendekripsi Task ID.");
      throw error;
    }
    try {
      const storedCookies = decryptedData.cookies.join("; ");
      const response = await this.client.get(`/task-status?taskId=${apiTaskId}`, {
        headers: {
          Referer: "https://aimage.ai/ai-image-generator",
          Cookie: storedCookies
        }
      });
      const status = response.data.status;
      console.log(`Status saat ini: ${status}`);
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("✗ Gagal mendapatkan status tugas.");
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (create or status) is required."
    });
  }
  const aimage = new AimageClient();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await aimage.create(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await aimage.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}