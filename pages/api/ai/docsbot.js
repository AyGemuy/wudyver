import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class DocsBotAI {
  constructor() {
    this.base = "https://docsbot.ai";
    this.api = axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: this.base,
        referer: this.base,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.modes = ["text", "image", "youtube", "yt"];
    this.tones = ["Neutral Expert", "Academic Researcher", "Friendly Guide", "Persuasive Pitch", "Support Hero", "Technical Mentor"];
    this.lengths = ["Quick Snapshot", "Balanced Breakdown", "Deep Dive"];
    this.formats = ["Guided Paragraphs", "Bullet Answers", "Step-by-Step Playbook"];
    this.imgTypes = ["description", "caption", "prompt"];
    this.vibes = ["fun", "joke", "funny", "happy", "serious", "sad", "angry", "ecstatic", "curious", "informative", "cute", "cool", "controversial"];
    this.ytTypes = ["summary", "transcript", "chapters"];
  }
  validate(value, list, def) {
    return list?.includes?.(value) ? value : def || list?.[0];
  }
  validateRequired(fields, data) {
    const missing = [];
    for (const f of fields) {
      if (!data?.[f]) missing.push(f);
    }
    if (missing?.length > 0) {
      return {
        error: true,
        message: "Validation failed",
        missing: missing
      };
    }
    return {
      error: false
    };
  }
  async toBase64(input) {
    console.log("🔄 Converting to base64...");
    try {
      if (!input) throw new Error("Input is required");
      if (typeof input === "string") {
        if (input.startsWith("data:")) return input.split(",")[1];
        if (input.startsWith("/9j/") || input.startsWith("iVBOR")) return input;
        if (input.startsWith("http")) {
          const {
            data
          } = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(data).toString("base64");
        }
        return Buffer.from(input).toString("base64");
      }
      if (Buffer.isBuffer(input)) return input.toString("base64");
      throw new Error("Invalid input type");
    } catch (e) {
      console.error("❌ Base64 conversion failed:", e.message);
      throw e;
    }
  }
  extractYtId(url) {
    console.log("🔍 Extracting YouTube ID...");
    if (!url) throw new Error("YouTube URL is required");
    const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/, /^([a-zA-Z0-9_-]{11})$/];
    for (const p of patterns) {
      const m = url?.match?.(p);
      if (m?.[1]) return m[1];
    }
    return url;
  }
  async generate({
    mode,
    prompt,
    url,
    context,
    tone,
    answerLength,
    formatPreference,
    vibe,
    instructions,
    type,
    ...rest
  }) {
    console.log(`🚀 Starting generation...`);
    try {
      const m = this.validate((mode || "").toLowerCase(), this.modes, "");
      console.log(`📋 Mode: ${m}`);
      if (m === "text") {
        console.log("📝 Processing text mode...");
        const input = prompt || rest?.input;
        const check = this.validateRequired(["input"], {
          input: input
        });
        if (check.error) return check;
        const payload = {
          type: "answer-generator",
          input: input || "",
          context: context || rest?.context || "",
          tone: this.validate(tone, this.tones),
          answerLength: this.validate(answerLength, this.lengths),
          formatPreference: this.validate(formatPreference, this.formats)
        };
        console.log(`✓ Tone: ${payload.tone}`);
        console.log(`✓ Length: ${payload.answerLength}`);
        console.log(`✓ Format: ${payload.formatPreference}`);
        console.log("📤 Sending text request...");
        const {
          data
        } = await this.api.post("/api/tools/text-prompter", payload);
        console.log("✅ Text generation success");
        return {
          error: false,
          status: true,
          mode: "text",
          data: data
        };
      }
      if (m === "image") {
        console.log("🖼️ Processing image mode...");
        const imgInput = url || rest?.image || prompt;
        const check = this.validateRequired(["image"], {
          image: imgInput
        });
        if (check.error) return check;
        const imgType = this.validate(type || rest?.type, this.imgTypes);
        console.log(`✓ Type: ${imgType}`);
        const base64 = await this.toBase64(imgInput);
        const payload = {
          type: imgType,
          image: base64
        };
        if (imgType === "caption") {
          payload.vibe = this.validate(vibe || rest?.vibe, this.vibes);
          console.log(`✓ Vibe: ${payload.vibe}`);
        }
        if (imgType === "prompt") {
          const inst = instructions || rest?.instructions;
          const check2 = this.validateRequired(["instructions"], {
            instructions: inst
          });
          if (check2.error) return check2;
          payload.instructions = inst;
        }
        console.log(`📤 Sending ${imgType} request...`);
        const {
          data
        } = await this.api.post("/api/tools/image-prompter", payload);
        console.log("✅ Image processing success");
        return {
          error: false,
          status: true,
          mode: "image",
          type: imgType,
          data: data
        };
      }
      if (m === "youtube" || m === "yt") {
        console.log("🎥 Processing YouTube mode...");
        const ytUrl = url || prompt || rest?.videoUrl || rest?.url;
        const check = this.validateRequired(["videoUrl"], {
          videoUrl: ytUrl
        });
        if (check.error) return check;
        const ytId = this.extractYtId(ytUrl);
        const ytType = this.validate(type || rest?.type, this.ytTypes);
        console.log(`✓ Type: ${ytType}`);
        console.log(`✓ Video ID: ${ytId}`);
        console.log(`📤 Fetching YouTube ${ytType}...`);
        const {
          data
        } = await this.api.post("/api/tools/youtube-prompter", {
          videoUrl: ytUrl,
          type: ytType
        });
        console.log("✅ YouTube processing success");
        return {
          error: false,
          status: true,
          mode: "youtube",
          type: ytType,
          videoId: ytId,
          data: data
        };
      }
      return {
        error: true,
        message: "Invalid mode",
        detail: `Mode must be one of: ${this.modes.slice(0, -1)}`,
        available: this.modes
      };
    } catch (e) {
      console.error("❌ Generation failed:", e?.response?.data || e.message);
      return {
        error: true,
        message: e?.response?.data?.error || e.message,
        details: e?.response?.data || null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new DocsBotAI();
  try {
    const data = await api.generate(params);
    const status = data.error ? 400 : 200;
    return res.status(status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: {
        text: "Server Error",
        details: error.message || "Unknown error"
      }
    });
  }
}