import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class QuizGenerator {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://www.explainx.ai",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.explainx.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.explainx.ai/tools/ai-quiz-maker",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async generate({
    prompt: text,
    numQuestions = 5,
    numOptions = 4,
    difficulty = "Medium",
    questionType = "MCQ"
  }) {
    const validDifficulties = ["Easy", "Medium", "Hard"];
    if (!validDifficulties.includes(difficulty)) {
      return {
        success: false,
        error: true,
        message: `Difficulty tidak valid. Gunakan salah satu: ${validDifficulties.join(", ")}`
      };
    }
    const validTypes = ["MCQ", "TrueFalse"];
    if (!validTypes.includes(questionType)) {
      return {
        success: false,
        error: true,
        message: `QuestionType tidak valid. Gunakan salah satu: ${validTypes.join(", ")}`
      };
    }
    if (questionType === "TrueFalse" && numOptions !== 4) {
      console.warn("numOptions diabaikan untuk TrueFalse (selalu 2 opsi: True/False)");
    }
    try {
      console.log("Memulai generate quiz dari ExplainX.ai...");
      const payload = {
        text: text || "general knowledge",
        numQuestions: parseInt(numQuestions),
        numOptions: parseInt(numOptions),
        difficulty: difficulty,
        questionType: questionType
      };
      const response = await this.client.post("/api/tools/ai-quize-generator", payload);
      console.log("Generate quiz berhasil");
      return response.data;
    } catch (error) {
      console.error("Generate quiz gagal:", error.response?.data || error.message);
      return {
        success: false,
        error: true,
        message: error.response?.data || error.message,
        response: error.response?.data || null
      };
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