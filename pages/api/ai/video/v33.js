import axios from "axios";
const API_BASE_URL = "https://api.pictory.ai/pictoryapis";
const CLIENT_ID = "7n3gkamqknqc4eisek9q3gniv0";
const CLIENT_SECRET = "AQICAHj6D/xxh0/2YyK+uvq1tF8IPsJO/sPk3uFhnRuOfl6yvAEWf1VYFWcGcp/HlovktLToAAAAlDCBkQYJKoZIhvcNAQcGoIGDMIGAAgEAMHsGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMENmzlyBkvHcc+T6tAgEQgE5siNOW1jc7LvHSVhMq5Qy9tOgcT+f0u69mhbjO5k7ejbD075+C9ulWDPk9XVtF3taBmY3nHPZ3KZ3fEP4C20De2Tjvn4f0euvds1nZfSs=";
const SAMPLE_TEXT = "AI is poised to significantly impact educators... [text lengkap]";
class PictoryVideo {
  constructor(clientId = CLIENT_ID, clientSecret = CLIENT_SECRET, baseUrl = API_BASE_URL) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl;
    this.accessToken = null;
  }
  async getToken() {
    try {
      const res = await axios.post(`${this.baseUrl}/v1/oauth2/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      this.accessToken = res.data?.access_token;
      console.log("Token OK");
      return this.accessToken;
    } catch (e) {
      console.error("Token error:", e.response?.data || e.message);
      throw e;
    }
  }
  async generate({
    videoName = "video",
    story = SAMPLE_TEXT,
    voiceSpeaker = "Brian"
  } = {}) {
    try {
      if (!this.accessToken) await this.getToken();
      const res = await axios.post(`${this.baseUrl}/v2/video/storyboard/render`, {
        videoName: videoName,
        voiceOver: {
          enabled: true,
          aiVoices: [{
            speaker: voiceSpeaker
          }]
        },
        scenes: [{
          story: story,
          createSceneOnNewLine: true,
          createSceneOnEndOfSentence: true
        }]
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: this.accessToken
        }
      });
      const data = res.data;
      console.log("Job ID:", data);
      return data;
    } catch (e) {
      console.error("Storyboard error:", e.response?.data || e.message);
      throw e;
    }
  }
  async status({
    jobId
  }) {
    try {
      if (!this.accessToken) await this.getToken();
      const res = await axios.get(`${this.baseUrl}/v1/jobs/${jobId}`, {
        headers: {
          Authorization: this.accessToken
        }
      });
      const data = res.data;
      console.log("Job ID:", data);
      return data;
    } catch (e) {
      console.error("Status error:", e.response?.data || e.message);
      throw e;
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
      error: "Action is required."
    });
  }
  const api = new PictoryVideo();
  try {
    switch (action) {
      case "generate": {
        if (!params.story) {
          return res.status(400).json({
            error: "story is required for 'generate'."
          });
        }
        const result = await api.generate(params);
        return res.status(200).json(result);
      }
      case "status": {
        if (!params.jobId) {
          return res.status(400).json({
            error: "jobId is required for 'status'."
          });
        }
        const result = await api.status(params);
        return res.status(200).json(result);
      }
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions: 'generate', 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}