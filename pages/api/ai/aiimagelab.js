import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class AIImageLab {
  constructor() {
    this.jar = new CookieJar();
    this.baseURL = "https://www.aiimagelab.cc";
    this.jar.setCookieSync("NEXT_LOCALE=en", this.baseURL);
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: this.baseURL,
      headers: {
        "accept-language": "id-ID",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-trpc-source": "nextjs-react",
        "trpc-accept": "application/jsonl",
        ...SpoofHead()
      }
    }));
    this.sessionId = `guest_${Math.random().toString(36).substring(2, 8)}`;
    this.supportedRatios = [{
      value: ""
    }, {
      value: "1:1"
    }, {
      value: "16:9"
    }, {
      value: "9:16"
    }, {
      value: "4:3"
    }, {
      value: "3:4"
    }, {
      value: "2:3"
    }, {
      value: "3:2"
    }];
  }
  validateRatio(ratio) {
    if (!ratio) return true;
    const isValid = this.supportedRatios.some(r => r.value === ratio);
    if (!isValid) {
      const validRatios = this.supportedRatios.map(r => r.value).filter(Boolean);
      throw new Error(`Invalid aspect ratio: ${ratio}. Supported ratios: ${validRatios.join(", ")}`);
    }
    return true;
  }
  async req(config) {
    try {
      console.log(`Membuat permintaan ${config.method?.toUpperCase() || "GET"} ke ${config.url}`);
      const response = await this.client(config);
      return response.data;
    } catch (error) {
      console.error("Permintaan gagal:", error.message);
      throw error;
    }
  }
  async initializeSession() {
    try {
      console.log("Menginisialisasi sesi dan mengambil token CSRF...");
      await this.req({
        url: "/api/auth/csrf",
        method: "GET",
        headers: {
          accept: "*/*",
          referer: `${this.baseURL}/image-studio`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("Sesi diinisialisasi, cookie CSRF diatur secara otomatis.");
    } catch (error) {
      console.error("Gagal mengambil token CSRF:", error.message);
      throw new Error("Tidak dapat menginisialisasi sesi dengan token CSRF.");
    }
  }
  async createSession() {
    try {
      console.log("Membuat sesi tamu...");
      const data = {
        0: {
          json: {
            sessionId: this.sessionId,
            fingerprint: this.sessionId.substring(6),
            userAgent: this.client.defaults.headers["user-agent"]
          }
        }
      };
      await this.req({
        url: `/api/trpc/dailyCredits.createGuestSession?batch=1`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: this.baseURL,
          referer: `${this.baseURL}/image-studio`
        },
        data: data
      });
      console.log("Sesi tamu berhasil dibuat");
    } catch (error) {
      console.log("Pembuatan sesi selesai dengan potensi error (dapat diabaikan)");
      return null;
    }
  }
  async getCredits() {
    try {
      console.log("Memeriksa kredit...");
      const result = await this.req({
        url: `/api/trpc/dailyCredits.getCreditStatus?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22sessionId%22%3A%22${this.sessionId}%22%7D%7D%7D`,
        headers: {
          "content-type": "application/json",
          referer: `${this.baseURL}/image-studio`
        }
      });
      console.log("Status kredit berhasil diambil");
      return this.parseTRPCResponse(result);
    } catch (error) {
      console.log("Pemeriksaan kredit selesai");
      return null;
    }
  }
  async uploadImage(imageData, filename, contentType) {
    try {
      console.log("Memulai unggah gambar...");
      const initResponse = await this.req({
        url: "/api/fal/proxy",
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: this.baseURL,
          referer: `${this.baseURL}/image-studio`,
          "x-fal-target-url": "https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3"
        },
        data: {
          content_type: contentType,
          file_name: filename
        }
      });
      const {
        file_url,
        upload_url
      } = initResponse;
      if (!file_url || !upload_url) throw new Error("Gagal mendapatkan URL unggah");
      console.log("Mengunggah gambar...");
      await axios.put(upload_url, imageData, {
        headers: {
          "content-type": contentType,
          origin: this.baseURL
        }
      });
      console.log("Gambar berhasil diunggah");
      return {
        fileUrl: file_url,
        uploadUrl: upload_url,
        ...initResponse
      };
    } catch (error) {
      console.error("Unggah gambar gagal:", error.message);
      throw error;
    }
  }
  async processImage({
    imageUrl,
    instruction = "",
    aspectRatio = "9:16",
    ...rest
  }) {
    try {
      this.validateRatio(aspectRatio);
      console.log("Memproses gambar...");
      const result = await this.req({
        url: "/api/trpc/imageProcessing.processImage?batch=1",
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: this.baseURL,
          referer: `${this.baseURL}/image-studio`
        },
        data: {
          0: {
            json: {
              imageUrls: [imageUrl],
              instruction: instruction,
              sessionId: this.sessionId,
              aspectRatio: aspectRatio,
              ...rest
            }
          }
        }
      });
      console.log("Pemrosesan gambar selesai");
      return this.parseTRPCResponse(result);
    } catch (error) {
      console.error("Pemrosesan gambar gagal:", error.message);
      throw error;
    }
  }
  async generateImage({
    prompt,
    aspectRatio = "9:16",
    ...rest
  }) {
    try {
      this.validateRatio(aspectRatio);
      console.log("Membuat gambar baru...");
      const result = await this.req({
        url: "/api/trpc/imageProcessing.generateImage?batch=1",
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: this.baseURL,
          referer: `${this.baseURL}/image-studio`
        },
        data: {
          0: {
            json: {
              prompt: prompt,
              sessionId: this.sessionId,
              aspectRatio: aspectRatio,
              ...rest
            }
          }
        }
      });
      console.log("Pembuatan gambar selesai");
      return this.parseTRPCResponse(result);
    } catch (error) {
      console.error("Pembuatan gambar gagal:", error.message);
      throw error;
    }
  }
  parseTRPCResponse(response) {
    if (typeof response !== "string") {
      console.log("parseTRPCResponse menerima data non-string, mengembalikan apa adanya.");
      return response;
    }
    try {
      const jsonLines = response.split("\n").filter(line => line.trim() !== "");
      const lastLine = jsonLines[jsonLines.length - 1];
      if (!lastLine) {
        console.log("Tidak dapat menemukan baris JSON terakhir di dalam respons.");
        return response;
      }
      const parsedJson = JSON.parse(lastLine);
      const resultData = parsedJson?.json?.[2]?.[0]?.[0];
      if (resultData) {
        return resultData;
      } else {
        console.log("Tidak dapat mengekstrak data hasil dari JSON. Mengembalikan baris terakhir yang diparsing.");
        return parsedJson;
      }
    } catch (error) {
      console.error("Gagal mem-parsing respons TRPC multi-baris:", error);
      return response;
    }
  }
  async generate({
    prompt,
    imageUrl,
    aspectRatio = "9:16",
    ...rest
  }) {
    try {
      await this.initializeSession();
      this.validateRatio(aspectRatio);
      console.log("Memulai proses pembuatan...");
      await this.createSession();
      const creditResult = await this.getCredits();
      let uploadResult = null;
      let finalResultData = null;
      if (imageUrl) {
        let imageData, filename = "image.jpg",
          contentType = "image/jpeg";
        if (imageUrl.startsWith("http")) {
          const imageResponse = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageData = imageResponse.data;
          const headers = imageResponse.headers;
          contentType = headers["content-type"] || contentType;
          const contentDisposition = headers["content-disposition"];
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1];
            }
          } else {
            try {
              const url = new URL(imageUrl);
              const pathname = url.pathname;
              const lastSegment = pathname.substring(pathname.lastIndexOf("/") + 1);
              if (lastSegment) {
                filename = lastSegment;
              }
            } catch (e) {
              console.error("URL tidak valid, menggunakan nama file default", e);
            }
          }
        } else if (imageUrl.startsWith("data:image/")) {
          const match = imageUrl.match(/^data:(image\/\w+);base64,/);
          if (match && match[1]) {
            contentType = match[1];
          }
          imageData = Buffer.from(imageUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
        } else if (Buffer.isBuffer(imageUrl)) {
          imageData = imageUrl;
        } else {
          imageData = Buffer.from(imageUrl);
        }
        uploadResult = await this.uploadImage(imageData, filename, contentType);
        if (uploadResult?.fileUrl) {
          finalResultData = await this.processImage({
            imageUrl: uploadResult.fileUrl,
            instruction: prompt,
            aspectRatio: aspectRatio,
            ...rest
          });
        }
      } else {
        finalResultData = await this.generateImage({
          prompt: prompt,
          aspectRatio: aspectRatio,
          ...rest
        });
      }
      console.log("Pembuatan berhasil diselesaikan");
      return finalResultData;
    } catch (error) {
      console.error("Pembuatan gagal:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const ai = new AIImageLab();
    const response = await ai.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}