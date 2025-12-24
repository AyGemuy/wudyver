import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class FlashcardGenerator {
  constructor(referer) {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        baggage: "sentry-environment=vercel-production,sentry-release=087e4d0aa28566c4122dd6eca1a67926d84bc678,sentry-public_key=f6bbb7b197a2a7e09bc25634f533bdeb,sentry-trace_id=1161bd29252e485999c384b84419d1f0",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.heuristi.ca",
        pragma: "no-cache",
        referer: referer || "https://www.heuristi.ca/tools/free-ai-quiz-generator",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sentry-trace": "1161bd29252e485999c384b84419d1f0-b1add7a35d24010e",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
    this.url = "https://www.heuristi.ca/api/free-flashcard-generator";
  }
  l(msg) {
    console.log(msg || "Log message");
  }
  async generate({
    query: input,
    language,
    count,
    ...rest
  }) {
    try {
      this.l("Prep payload");
      const payload = {
        operation: "quiz-from-text",
        input: input ?? "Tech",
        language: language ?? "English",
        count: count || 0,
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
    const api = new FlashcardGenerator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}