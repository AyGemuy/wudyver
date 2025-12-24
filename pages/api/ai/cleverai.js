import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
const logger = {
  info: message => console.log(`[${new Date().toISOString()}] [INFO] ${message}`),
  warn: message => console.warn(`[${new Date().toISOString()}] [WARN] ${message}`),
  error: (context, error) => {
    const timestamp = `[${new Date().toISOString()}] [ERROR]`;
    const errorMessage = error.message || "Unknown error";
    const axiosResponse = error.response?.data?.toString() || "No additional response data";
    console.error(`${timestamp} [Context: ${context}] ${errorMessage}\n--- Axios Response: ---\n${axiosResponse}\n----------------------`);
  }
};
class CleverAI {
  constructor() {
    logger.info("Menginisialisasi CleverAI client...");
    const cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: cookieJar,
      baseURL: "https://mycleverai.com/api",
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        Origin: "https://mycleverai.com",
        Referer: "https://mycleverai.com/chat",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
      }
    }));
    this.initialized = false;
    logger.info("CleverAI client siap. Inisialisasi token akan terjadi pada panggilan API pertama.");
  }
  _handleError(error, context) {
    logger.error(context, error);
  }
  async _initialize() {
    if (this.initialized) return true;
    logger.info("Memulai handshake untuk mendapatkan CSRF token...");
    try {
      await this.client.get("https://mycleverai.com/chat");
      const cookies = await this.client.defaults.jar.getCookies("https://mycleverai.com");
      const csrfCookie = cookies.find(c => c.key === "csrftoken");
      if (!csrfCookie?.value) {
        throw new Error('Gagal menemukan "csrftoken" di dalam cookie jar.');
      }
      const csrfToken = csrfCookie.value;
      logger.info(`Berhasil mendapatkan CSRF Token: ${csrfToken.substring(0, 10)}...`);
      this.client.defaults.headers.common["X-CSRFToken"] = csrfToken;
      this.initialized = true;
      return true;
    } catch (error) {
      this._handleError(error, "CSRF Initialization");
      return false;
    }
  }
  async _img(imageUrl) {
    if (!imageUrl) return null;
    logger.info("Memulai pemrosesan gambar...");
    try {
      if (Buffer.isBuffer(imageUrl)) {
        return imageUrl;
      }
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      if (typeof imageUrl === "string" && imageUrl.startsWith("data:image")) {
        const base64Data = imageUrl.split(",")[1] || "";
        return Buffer.from(base64Data, "base64");
      }
      logger.warn(`Format gambar tidak dikenali atau tidak didukung: ${typeof imageUrl}`);
      return null;
    } catch (error) {
      this._handleError(error, "Image Processing");
      return null;
    }
  }
  async chat({
    prompt,
    imageUrl,
    ...rest
  }) {
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      logger.error("Invalid Input", new Error("Prompt tidak boleh kosong."));
      return null;
    }
    const isReady = await this._initialize();
    if (!isReady) {
      logger.error("Chat Aborted", new Error("Proses chat dibatalkan karena inisialisasi gagal."));
      return null;
    }
    logger.info(`Memulai proses chat untuk prompt: "${prompt}"`);
    let mainResult = null;
    try {
      const form = new FormData();
      form.append("message", prompt);
      const imageBuffer = await this._img(imageUrl);
      if (imageBuffer) {
        form.append("image", imageBuffer, {
          filename: "image.jpg",
          contentType: "image/jpeg"
        });
      }
      const response = await this.client.post("/consecutive_message_streaming/", form, {
        headers: form.getHeaders(),
        responseType: "stream",
        ...rest
      });
      let fullContent = "";
      let finalData = {};
      logger.info("Menerima stream data dari server...");
      for await (const chunk of response.data) {
        const lines = chunk.toString("utf8").split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonData = JSON.parse(line.substring(5));
              fullContent += jsonData?.content || "";
              if (jsonData?.done) {
                finalData.conversation_id = jsonData?.conversation_id;
              }
            } catch (e) {
              logger.warn(`Melewati baris data stream yang tidak valid: ${line}`);
            }
          }
        }
      }
      logger.info("Stream data selesai.");
      mainResult = {
        ...finalData,
        result: fullContent.trim()
      };
    } catch (error) {
      this._handleError(error, "Main Chat Stream");
      return null;
    }
    if (!mainResult.result) {
      logger.warn("Chat utama berhasil tetapi tidak menghasilkan konten. Melewati pengambilan data tambahan.");
      return mainResult;
    }
    logger.info("Mengambil data tambahan secara sekuensial...");
    const additionalData = {};
    const additionalTasks = [{
      name: "rank",
      task: () => this.rank()
    }, {
      name: "emoji",
      task: () => this.emoji(prompt)
    }, {
      name: "replies",
      task: () => this.replies(mainResult.result)
    }, {
      name: "fact",
      task: () => this.fact(mainResult.result)
    }];
    for (const {
        name,
        task
      }
      of additionalTasks) {
      try {
        logger.info(`Memproses tugas tambahan: ${name}...`);
        const result = await task();
        if (result) {
          additionalData[name] = result;
        }
      } catch (error) {
        this._handleError(error, `Fetch ${name}`);
      }
    }
    logger.info("Semua proses selesai.");
    return {
      ...mainResult,
      ...additionalData
    };
  }
  async emoji(message) {
    try {
      const r = await this.client.post("/get_emoji/", {
        message: message
      });
      return r.data?.emoji;
    } catch (e) {
      throw e;
    }
  }
  async rank() {
    try {
      const r = await this.client.post("/get_rank/", {});
      return r.data?.rank;
    } catch (e) {
      throw e;
    }
  }
  async replies(ai_message) {
    try {
      const r = await this.client.post("/get_possible_replies/", {
        ai_message: ai_message
      });
      return r.data?.possible_replies;
    } catch (e) {
      throw e;
    }
  }
  async fact(ai_message) {
    try {
      const r = await this.client.post("/get_interesting_fact/", {
        ai_message: ai_message
      });
      return r.data?.interesting_fact;
    } catch (e) {
      throw e;
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
    const api = new CleverAI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}