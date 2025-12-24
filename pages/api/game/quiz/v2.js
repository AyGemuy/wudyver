import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class QuestionGenerator {
  constructor(referer) {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://aiquestiongenerator.org",
        pragma: "no-cache",
        referer: referer || "https://aiquestiongenerator.org/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
    this.url = "https://aiquestiongenerator.org/api/generate-questions";
  }
  l(msg) {
    console.log(msg || "Log message");
  }
  async generate({
    query: content,
    language,
    questionType,
    difficulty,
    count,
    ...rest
  }) {
    try {
      this.l("Prep payload");
      const payload = {
        content: content ?? "Tech",
        language: language ?? "english",
        questionType: questionType ?? "multiple-choice",
        difficulty: difficulty ?? "medium",
        count: count || 5,
        ...rest
      };
      this.l("Send req");
      const res = await this.client.post(this.url, payload);
      this.l("Req ok");
      return res?.data ?? "No data";
    } catch (e) {
      this.l(`Err: ${e?.message || "Unknown"}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new QuestionGenerator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}