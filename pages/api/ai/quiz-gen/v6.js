import axios from "axios";
class QuizGenerator {
  constructor() {
    this.api = axios.create({
      baseURL: "https://ai-test-maker-server.onrender.com/api",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log(`[LOG] Process start for topic: "${prompt}"`);
    try {
      const diff = rest.diff || "Medium";
      const count = rest.count || 5;
      const rawMode = rest.mode?.toLowerCase();
      const isValidMode = rawMode === "choice" || rawMode === "tf";
      if (!isValidMode) {
        throw new Error('Invalid mode. Use "choice" or "tf".');
      }
      const answerType = rawMode === "choice" ? "multipleChoice" : "trueOrFalse";
      const payload = {
        topic: prompt,
        difficulty: diff,
        answerType: answerType,
        numOfQuestions: count
      };
      console.log("[LOG] Payload:", payload);
      const res = await this.api.post("/quizmaker", payload);
      const body = res?.data;
      return body;
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      console.error(`[ERR] Generate failed: ${serverMsg || err.message}`);
      return null;
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
  const api = new QuizGenerator();
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