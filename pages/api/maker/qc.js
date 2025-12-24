import axios from "axios";
class Quotly {
  constructor() {
    this.headers = {
      "content-type": "application/json"
    };
    this.urls = ["https://quotly.netorare.codes/generate", "https://btzqc.betabotz.eu.org/generate", "https://qc.botcahx.eu.org/generate"];
    this.fallbackUrl = "https://widipe.com/quotely";
  }
  async generateQuote(data) {
    try {
      for (const url of this.urls) {
        try {
          const response = await axios.post(url, data, {
            headers: this.headers
          });
          if (response.data?.result?.image) {
            return Buffer.from(response.data.result.image, "base64");
          }
        } catch (error) {
          console.error(`Quotly Error: Failed to connect to ${url} - ${error.message}`);
        }
      }
      return await this.generateFallback(data);
    } catch (error) {
      console.error("Quotly Error: Unable to generate quote -", error.message);
      throw new Error("Failed to generate quote image");
    }
  }
  async generateFallback(data) {
    try {
      const response = await axios.get(this.fallbackUrl, {
        headers: this.headers,
        params: {
          avatar: data.messages[0]?.from?.photo?.url,
          name: data.messages[0]?.from?.name,
          text: data.messages[0]?.text
        },
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("Fallback Error: Failed to fetch from fallback URL -", error.message);
      throw new Error("Fallback generation failed");
    }
  }
}
export default async function handler(req, res) {
  try {
    const data = req.method === "GET" ? req.query : req.body;
    const text = "Hello World";
    const username = "Alι_Aryαɴ";
    const avatar = "https://telegra.ph/file/59952c903fdfb10b752b3.jpg";
    const formattedData = {
      type: data.type || "quote",
      format: data.format || "png",
      backgroundColor: data.backgroundColor || "#FFFFFF",
      width: data.width || 512,
      height: data.height || 768,
      scale: data.scale || 2,
      messages: [{
        entities: [],
        avatar: data.avatar || true,
        from: {
          id: data.id || 1,
          name: data.username || username,
          photo: {
            url: data.photo || avatar
          }
        },
        text: data.text || text,
        replyMessage: data.reply ? {
          id: data.replyId || 1,
          name: data.replyUsername || username,
          photo: {
            url: data.replyPhoto || avatar
          },
          text: data.replyText || text
        } : {}
      }]
    };
    const quotly = new Quotly();
    const imageBuffer = await quotly.generateQuote(req.method === "POST" ? data : formattedData);
    if (imageBuffer) {
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } else {
      res.status(500).json({
        error: "Failed to generate quote image"
      });
    }
  } catch (error) {
    console.error("Handler Error:", error.message);
    res.status(500).json({
      error: error.message
    });
  }
}