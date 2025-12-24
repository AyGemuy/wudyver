import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class ApiClient {
  constructor() {
    this.a = axios.create({
      baseURL: "https://background-remover.com",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        origin: "https://background-remover.com",
        referer: "https://background-remover.com/upload",
        ...SpoofHead()
      }
    });
  }
  async generate({
    imageUrl,
    ...r
  } = {}) {
    console.log("start", {
      imageUrl: (imageUrl ?? "").toString().slice(0, 50)
    });
    let b64, mime, title;
    try {
      if (Buffer.isBuffer(imageUrl)) {
        b64 = imageUrl.toString("base64");
        mime = imageUrl[0] === 255 && imageUrl[1] === 216 ? "image/jpeg" : "image/png";
        title = "img.jpg";
        console.log("buf");
      } else if (imageUrl?.startsWith?.("http")) {
        const {
          data,
          headers
        } = await this.a.get(imageUrl, {
          responseType: "arraybuffer"
        });
        b64 = Buffer.from(data).toString("base64");
        const ct = headers["content-type"] || "";
        mime = ct.includes("jpeg") || ct.includes("jpg") ? "image/jpeg" : "image/png";
        title = (imageUrl.split("/").pop() || "img").split("?")[0] || "img.jpg";
        console.log("url");
      } else if (imageUrl?.startsWith?.("data:")) {
        const [head, tail] = imageUrl.split(",");
        b64 = tail;
        mime = head.match(/:(image\/[^;]+)/)?.[1] || "image/png";
        title = "img.jpg";
        console.log("b64");
      } else {
        throw new Error("invalid image");
      }
      const p = {
        encodedImage: `data:${mime};base64,${b64}`,
        title: title,
        mimeType: mime,
        ...r
      };
      console.log("req");
      const {
        data
      } = await this.a.post("/removeImageBackground", p);
      const out = data?.encodedImageWithoutBackground?.split(",")[1] || null;
      if (!out) throw new Error("no result");
      console.log("ok");
      const resultBuffer = Buffer.from(out, "base64");
      return {
        resultBuffer: resultBuffer,
        contentType: mime
      };
    } catch (e) {
      console.error("err", e?.message || e);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' wajib diisi."
    });
  }
  try {
    const apiClient = new ApiClient();
    const resultGen = await apiClient.generate(params);
    res.setHeader("Content-Type", resultGen.contentType);
    return res.status(200).send(resultGen.resultBuffer);
  } catch (error) {
    console.error("API Handler Error:", error.message);
    if (error.isApiError) {
      return res.status(error.status).json({
        error: error.message
      });
    }
    return res.status(500).json({
      error: "Terjadi kesalahan internal pada server."
    });
  }
}