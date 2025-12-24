import axios from "axios";
import crypto from "crypto";
class AILyrics {
  constructor(config = {}) {
    this.config = {
      base: {
        soft: "musica",
        api: "https://func-america.anyscanner.net/api/song/idea-v2",
        endpoints: {
          style: "/to-style",
          lyrics: "/to-lyric"
        }
      },
      secretKey: "LT17opvvp6fiJ1AeFewb1F2xga8HTcJM",
      timeout: 3e4,
      ...config
    };
    console.log("AILyrics initialized with config:", this.config.base);
  }
  getSign() {
    const time = Math.floor(Date.now() / 1e3);
    const hash = crypto.createHash("md5").update(this.config.base.soft + time + this.config.secretKey).digest("hex").toUpperCase();
    console.log("Generated sign:", {
      s: hash,
      t: time
    });
    return {
      s: hash,
      t: time
    };
  }
  async gen({
    mode = "lyrics",
    ...rest
  } = {}) {
    try {
      console.log(`Generating ${mode} with payload:`, rest);
      const prompt = rest?.prompt || rest?.idea || rest?.text || "";
      const result = mode === "style" ? await this.genStyle(prompt, rest) : await this.genLyrics(prompt, rest);
      console.log(`${mode} generation successful`);
      return result;
    } catch (error) {
      console.error(`Error generating ${mode}:`, error?.message);
      throw new Error(`Failed to generate ${mode}: ${error?.message}`);
    }
  }
  async genStyle(prompt, rest = {}) {
    try {
      const {
        s,
        t
      } = this.getSign();
      const data = new URLSearchParams({
        lyric: "",
        idea: prompt,
        instrumental: rest?.instrumental ?? "1",
        sign: s,
        time: t,
        soft: this.config.base.soft,
        ...rest
      });
      console.log("Sending style request with params:", Object.fromEntries(data));
      const response = await axios.post(`${this.config.base.api}${this.config.base.endpoints.style}`, data, {
        headers: {
          "User-Agent": rest?.userAgent || "okhttp/3.10.0",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/x-www-form-urlencoded",
          ...rest?.headers
        },
        timeout: rest?.timeout || this.config.timeout
      });
      const json = response?.data;
      const styles = json?.data?.prompts || [];
      return {
        total: styles.length,
        styles: styles,
        raw: rest?.includeRaw ? json : undefined
      };
    } catch (error) {
      console.error("Style generation failed:", error?.response?.data || error?.message);
      throw error;
    }
  }
  async genLyrics(prompt, rest = {}) {
    try {
      const {
        s,
        t
      } = this.getSign();
      const baseParams = `soft=${this.config.base.soft}&idea=${encodeURIComponent(prompt)}&time=${t}&sign=${s}`;
      const customParams = rest?.params ? `&${new URLSearchParams(rest.params).toString()}` : "";
      const url = `${this.config.base.api}${this.config.base.endpoints.lyrics}?${baseParams}${customParams}`;
      console.log("Fetching lyrics from:", url);
      const response = await axios.get(url, {
        headers: {
          "User-Agent": rest?.userAgent || "okhttp/3.10.0",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          ...rest?.headers
        },
        timeout: rest?.timeout || this.config.timeout,
        responseType: rest?.responseType || "text"
      });
      const data = response?.data || "";
      const lines = data.trim().split("\n");
      const lyrics = lines.map(l => JSON.parse(l)?.answer).filter(Boolean).pop() || "";
      return {
        lyrics: lyrics.trim(),
        raw: rest?.includeRaw ? data : undefined
      };
    } catch (error) {
      console.error("Lyrics generation failed:", error?.response?.data || error?.message);
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
    const client = new AILyrics();
    const response = await client.gen(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}