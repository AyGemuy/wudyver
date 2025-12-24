import WebSocket from "ws";
class YiMeta {
  constructor() {
    try {
      this.cfg = {
        payload: {
          style: "Anime",
          scale: 7,
          neg: "(worst quality, low quality:1.4), (greyscale, monochrome:1.1), cropped, lowres , username, blurry, trademark, watermark, title, multiple view, Reference sheet, curvy, plump, fat, strabismus, clothing cutout, side slit,worst hand, (ugly face:1.2), extra leg, extra arm, bad foot, text, name"
        },
        style: ["Realistic", "Anime"],
        scale_range: {
          min: 1,
          max: 30
        },
        endpoint: "wss://app.yimeta.ai/nsfw-ai-art-generator/queue/join?__theme=light",
        base_url: "https://app.yimeta.ai",
        fn_index: 20
      };
      this.url = this.cfg.endpoint;
      this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
      this.defNeg = this.cfg.payload.neg;
    } catch (e) {
      throw new Error(`Config failed: ${e.message}`);
    }
  }
  uid() {
    try {
      return Math.random().toString(36).substring(2);
    } catch (e) {
      throw new Error(`UID failed: ${e.message}`);
    }
  }
  async generate({
    prompt,
    style = this.cfg.payload.style,
    scale = this.cfg.payload.scale,
    neg = this.cfg.payload.neg
  }) {
    try {
      console.log(`[init] "${prompt}"`);
      if (!prompt) throw new Error("Prompt empty");
      const selectedStyle = this.cfg.style.includes(style) ? style : this.cfg.payload.style;
      const validScale = Math.min(Math.max(scale, this.cfg.scale_range.min), this.cfg.scale_range.max);
      const negPrompt = neg || this.defNeg;
      const sh = this.uid();
      console.log(`[config] ${selectedStyle} | Scale: ${validScale}`);
      return new Promise((resolve, reject) => {
        try {
          const ws = new WebSocket(this.url, {
            headers: {
              "User-Agent": this.ua
            }
          });
          ws.on("open", () => console.log("[ws] ✓"));
          ws.on("message", raw => {
            try {
              const msg = JSON.parse(raw);
              if (msg.msg === "process_completed") {
                console.log("[ws] ✓ Done");
                ws.close();
                const outputData = msg?.output?.data?.[0];
                if (msg.success && outputData?.length > 0) {
                  const imgInfo = outputData[0];
                  let finalUrl = imgInfo.name;
                  if (finalUrl && !finalUrl.startsWith("http")) {
                    finalUrl = `${this.cfg.base_url}/file=${finalUrl}`;
                  }
                  resolve({
                    url: finalUrl,
                    raw_name: imgInfo.name,
                    meta: {
                      duration: msg.output.duration,
                      average_duration: msg.output.average_duration,
                      is_generating: msg.output.is_generating,
                      success: msg.success
                    }
                  });
                } else {
                  reject(new Error("No image data"));
                }
              }
              switch (msg.msg) {
                case "send_hash":
                  console.log("[ws] ← Hash");
                  ws.send(JSON.stringify({
                    fn_index: this.cfg.fn_index,
                    session_hash: sh
                  }));
                  break;
                case "send_data":
                  console.log("[ws] ← Data");
                  ws.send(JSON.stringify({
                    data: [selectedStyle, prompt, negPrompt, validScale, ""],
                    event_data: null,
                    fn_index: this.cfg.fn_index,
                    session_hash: sh
                  }));
                  break;
                case "estimation":
                  console.log(`[ws] Queue: ${msg.rank}`);
                  break;
              }
            } catch (e) {
              console.log("[ws] ✗ Parse");
              ws.close();
              reject(new Error(`Parse: ${e.message}`));
            }
          });
          ws.on("error", err => {
            console.log("[ws] ✗ Error");
            reject(new Error(`WS: ${err.message}`));
          });
          ws.on("close", () => console.log("[ws] Close"));
        } catch (e) {
          reject(new Error(`WS create: ${e.message}`));
        }
      });
    } catch (e) {
      throw new Error(`Generate: ${e.message}`);
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
  const api = new YiMeta();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}