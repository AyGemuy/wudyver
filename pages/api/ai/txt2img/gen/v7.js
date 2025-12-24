import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class NetwrckAPI {
  constructor(config = {}) {
    console.log("[LOG] Menginisialisasi NetwrckAPI client...");
    const defaultHeaders = {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://netwrck.com",
      referer: config.referer || "https://netwrck.com/ai-chat/Isekai-narrator",
      "user-agent": config.userAgent || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.apiClient = axios.create({
      baseURL: "https://netwrck.com",
      headers: defaultHeaders
    });
    console.log("[LOG] API client berhasil diinisialisasi.");
  }
  async chat({
    prompt,
    ...rest
  }) {
    const methodName = "chat";
    console.log(`[LOG] -> Memulai proses: ${methodName}`);
    try {
      const data = {
        query: prompt || "say",
        context: rest?.context || "role play chat\n desirable main character Noo\nIsekai narrator",
        model_name: rest?.model_name || "thedrummer/skyfall-36b-v2",
        username: rest?.username || "Noo"
      };
      console.log(`[LOG]    Mengirim POST ke /api/chatpred_or`);
      const response = await this.apiClient.post("/api/chatpred_or", data);
      console.log(`[LOG] <- Sukses: ${methodName}`);
      return response?.data;
    } catch (error) {
      console.error(`[ERROR] <- Gagal pada ${methodName}:`, error.response?.data || error.message);
      return null;
    }
  }
  async image({
    prompt,
    ra1 = false,
    search = false,
    ...rest
  }) {
    const methodName = "image (sequential)";
    console.log(`[LOG] -> Memulai proses: ${methodName} (ra1=${ra1}, search=${search})`);
    const results = {};
    try {
      console.log("[LOG]    1. Menjalankan request utama ke /fal...");
      const mainPayload = {
        prompt: prompt || "men",
        model_name: rest?.model_name || "fal-ai/flux/schnell",
        image_size: rest?.image_size || "portrait_4_3",
        num_images: rest?.num_images || 1
      };
      const mainResponse = await this.apiClient.post("/fal", mainPayload);
      results.main = mainResponse?.data;
      console.log("[LOG]    -> Request utama berhasil.");
      if (ra1) {
        try {
          console.log("[LOG]    2. Menjalankan request opsional ke /api/ra1-unauthed...");
          const ra1Payload = {
            prompt: rest?.ra1_prompt || `amazing ${prompt} awesome portrait`,
            size: rest?.size || "portrait_4_3"
          };
          const ra1Response = await this.apiClient.post("/api/ra1-unauthed", ra1Payload);
          results.ra1 = ra1Response?.data;
          console.log("[LOG]    -> Request ra1 berhasil.");
        } catch (error) {
          console.error("[ERROR]   -> Gagal pada request ra1:", error.response?.data || error.message);
          results.ra1 = {
            error: error.response?.data || error.message
          };
        }
      }
      if (search) {
        const searchQuery = encodeURIComponent(prompt || "men");
        try {
          console.log("[LOG]    3a. Menjalankan request opsional ke /api/search-ais...");
          const searchAisResponse = await this.apiClient.get(`/api/search-ais?query=${searchQuery}`);
          results.searchAis = searchAisResponse?.data;
          console.log("[LOG]    -> Request search-ais berhasil.");
        } catch (error) {
          console.error("[ERROR]   -> Gagal pada request search-ais:", error.response?.data || error.message);
          results.searchAis = {
            error: error.response?.data || error.message
          };
        }
        try {
          console.log("[LOG]    3b. Menjalankan request opsional ke /api/search-aiimages...");
          const searchImagesResponse = await this.apiClient.get(`/api/search-aiimages?query=${searchQuery}&offset=${rest?.offset || 0}&limit=${rest?.limit || 120}`);
          results.searchImages = searchImagesResponse?.data;
          console.log("[LOG]    -> Request search-aiimages berhasil.");
        } catch (error) {
          console.error("[ERROR]   -> Gagal pada request search-aiimages:", error.response?.data || error.message);
          results.searchImages = {
            error: error.response?.data || error.message
          };
        }
      }
      console.log(`[LOG] <- Proses ${methodName} selesai.`);
      return results;
    } catch (error) {
      console.error(`[ERROR] <- Gagal pada proses ${methodName} karena request utama error:`, error.response?.data || error.message);
      return {
        ...results,
        fatalError: "Proses dihentikan karena request utama gagal."
      };
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
      error: "Paramenter 'action' dibutuhkan."
    });
  }
  const api = new NetwrckAPI();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' dibutuhkan untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        return res.status(200).json(response);
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' dibutuhkan untuk action 'image'."
          });
        }
        response = await api.image(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung adalah 'chat', dan 'image'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error.response?.data?.error || error.message || "Internal Server Error";
    return res.status(500).json({
      error: errorMessage
    });
  }
}