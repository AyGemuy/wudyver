import axios from "axios";
const splitAndFormat = input => {
  const [llm, related] = ["__LLM_RESPONSE__", "__RELATED_QUESTIONS__"].map(tag => input.indexOf(tag));
  return {
    answer: JSON.parse(input.slice(0, llm).trim()),
    llm: input.slice(llm + 16, related).replace(/\s*\[citation:\d+\]\s*/g, "").trim(),
    related: JSON.parse(input.slice(related + 21).trim())
  };
};
class HeuristSearch {
  constructor(token) {
    this.token = token;
    this.url = "https://search.heurist.ai/query";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: `Bearer ${this.token}`,
      "content-type": "application/json",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      cookie: "_ga=GA1.1.1762423261.1735607627; _ga_B94HB7EM0Q=GS1.1.1735607626.1.1.1735608231.0.0.0; _ga_ZBT81YRRRC=GS1.1.1735608233.1.0.1735608236.0.0.0; _ga_QFXBMVNG4V=GS1.1.1735608236.1.0.1735608241.0.0.0",
      Referer: "https://search.heurist.ai/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
  }
  async search({
    query,
    searchUuid
  }) {
    const payload = {
      query: query || "Wibu",
      search_uuid: searchUuid || "AVOZ52QdfFXdWwhOVqy15"
    };
    try {
      const response = await axios.post(this.url, payload, {
        headers: this.headers
      });
      return splitAndFormat(response.data);
    } catch (error) {
      throw new Error("Failed to fetch search response: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const heurist = new HeuristSearch("ks5mn1yavasotm5p55cw90j4scbm6cm7");
  const {
    query,
    searchUuid
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const result = await heurist.search({
      query: query,
      searchUuid: searchUuid
    });
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}