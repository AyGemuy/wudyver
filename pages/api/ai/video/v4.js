import axios from "axios";
class VideoGenerator {
  constructor(authorizationToken = "eyJzdWIiwsdeOiIyMzQyZmczNHJ0MzR0weMzQiLCJuYW1lIjorwiSm9objMdf0NTM0NT") {
    this.authorizationToken = authorizationToken;
    this.baseUrl = "https://soli.aritek.app";
  }
  _generateDeviceId() {
    return Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8);
  }
  async txt2video(prompt) {
    try {
      const {
        data: k
      } = await axios.post(`${this.baseUrl}/txt2videov3`, {
        deviceID: this._generateDeviceId(),
        prompt: prompt,
        used: [],
        versionCode: 51
      }, {
        headers: {
          authorization: this.authorizationToken,
          "content-type": "application/json; charset=utf-8",
          "accept-encoding": "gzip",
          "user-agent": "okhttp/4.11.0"
        }
      });
      const {
        data
      } = await axios.post(`${this.baseUrl}/video`, {
        keys: [k.key]
      }, {
        headers: {
          authorization: this.authorizationToken,
          "content-type": "application/json; charset=utf-8",
          "accept-encoding": "gzip",
          "user-agent": "okhttp/4.11.0"
        }
      });
      return data.datas[0].url;
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    if (!prompt) {
      throw new Error("Prompt is required for video generation.");
    }
    const videoUrl = await this.txt2video(prompt);
    return {
      result: videoUrl
    };
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
    const generator = new VideoGenerator();
    const response = await generator.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}