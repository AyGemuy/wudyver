import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class MusicMintLyricsGenerator {
  constructor() {
    this.baseUrl = "https://server.musicmint.ai/music/public/v1";
    this.defaultHeaders = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "text/json",
      "X-CLIENT-VERSION": "1.0.0",
      "X-CLIENT-VERSION-CODE": "182",
      "X-PLATFORM": "web",
      "X-PLATFORM-VERSION": "1.0.0",
      "X-CHANNEL": "web",
      "x-language": "en_US",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.musicmint.ai/lyrics-generator",
      "Accept-Encoding": "gzip, deflate, br",
      ...SpoofHead()
    };
    this.defaultConfig = {
      style: "R&B",
      moods: "Romantic",
      songer_name: "Bruno Mars",
      structurePreference: "Verse-Chorus-Bridge"
    };
  }
  async generate({
    prompt,
    ...rest
  }) {
    const payload = {
      topics: prompt || "love",
      ...this.defaultConfig,
      ...rest,
      keyword: "",
      image: "",
      title: rest.title || ""
    };
    try {
      const taskResponse = await axios.post(`${this.baseUrl}/lyrics`, payload, {
        headers: this.defaultHeaders,
        timeout: 1e4
      });
      const taskId = taskResponse.data?.data?.task_id;
      if (!taskId) throw new Error("No task ID received");
      return await this._pollForResults(taskId);
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
        status: error.response?.status || 500,
        config: payload
      };
    }
  }
  async _pollForResults(taskId, maxRetries = 60, interval = 3e3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(`${this.baseUrl}/result`, {
          task_id: taskId
        }, {
          headers: this.defaultHeaders,
          timeout: 8e3
        });
        const result = response.data?.data;
        if (result?.status === 3) {
          return {
            success: true,
            lyrics: result.lyrics_data?.text || "",
            details: {
              prompt: result.req?.topics,
              title: result.req?.title || "Untitled",
              mood: result.req?.moods || this.defaultConfig.moods,
              style: result.req?.style || this.defaultConfig.style,
              artist: result.req?.songer_name || this.defaultConfig.songer_name,
              duration: `${result.generate_time || 0}s`
            },
            raw: result
          };
        }
        if (result?.status === 4) {
          throw new Error(result.fail_reason || "Generation failed");
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
    throw new Error(`Max retries (${maxRetries}) reached`);
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const generator = new MusicMintLyricsGenerator();
    const generated = await generator.generate(params);
    return res.status(200).json(generated);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}