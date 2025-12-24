import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class AIClient {
  constructor(referer) {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.proprofs.com",
        pragma: "no-cache",
        referer: referer || "https://www.proprofs.com/quiz-school/ugc/story.php?title=ndq1ntc2mw100e",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest",
        priority: "u=1, i"
      }
    }));
    this.url = "https://www.proprofs.com/quiz-school/SQplay/_ajax_ai.php";
  }
  l(msg) {
    console.log(msg || "Log message");
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    try {
      this.l("Prep history");
      const hist = messages?.length ? messages : [];
      const sys = hist[0]?.role === "system" ? [] : [{
        role: "system",
        content: "The response should be in the proper format with paragraphs and lists, and it must contain exactly 100 words."
      }];
      const fullHist = [...sys, ...hist, {
        role: "user",
        content: [{
          type: "text",
          text: prompt ?? "Default prompt"
        }],
        ...rest
      }];
      const histStr = JSON.stringify(fullHist);
      const data = `history=${encodeURIComponent(histStr)}`;
      this.l("Send req");
      const res = await this.client.post(this.url, data);
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
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const client = new AIClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}