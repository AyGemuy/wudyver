import axios from "axios";
class YouTubeGPT {
  constructor(baseUrl = "https://youtube-gpt.herokuapp.com") {
    this.baseUrl = baseUrl;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.askyoutube.ai/"
    };
  }
  async createJob(query, videoId = [], userId = "", planType = "") {
    const response = await axios.post(`${this.baseUrl}/ask-youtube`, {
      query: query,
      video_ids: videoId,
      userId: userId,
      planType: planType
    }, {
      headers: this.headers
    });
    return response.data.job_id;
  }
  async pollingJob(jobId) {
    while (true) {
      const response = await axios.get(`${this.baseUrl}/ask-youtube-result-stream`, {
        headers: this.headers,
        params: {
          job_id: jobId
        }
      });
      const data = response.data;
      if (data.progress === "job_finished") return data;
      await new Promise(resolve => setTimeout(resolve, 3e3));
    }
  }
}
export default async function handler(req, res) {
  const {
    query,
    videoId,
    userId,
    planType
  } = req.method === "GET" ? req.query : req.body;
  const ytGPT = new YouTubeGPT();
  try {
    const jobId = await ytGPT.createJob(query, videoId || [], userId || "", planType || "");
    const result = await ytGPT.pollingJob(jobId);
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}