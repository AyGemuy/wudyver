import axios from "axios";
class YandexTranslate {
  constructor() {
    this.apiUrls = {
      translate: "https://translate.yandex.net/api/v1/tr.json/translate",
      dictionary: "https://dictionary.yandex.net/dicservice.json/queryCorpus"
    };
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://translate.yandex.com",
      priority: "u=1, i",
      referer: "https://translate.yandex.com/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.requestsCount = 0;
  }
  generateSid() {
    const t = Date.now().toString(16);
    return t + new Array(16 - t.length).fill(null).map(() => Math.floor(16 * Math.random()).toString(16)).join("");
  }
  getId() {
    return `${this.generateSid()}-${this.requestsCount++}-0`;
  }
  async translate({
    text,
    from: sourceLang = "id",
    to: targetLang = "en"
  }) {
    try {
      console.log("Starting translation request...");
      const translateResponse = await axios.post(this.apiUrls.translate, `text=${encodeURIComponent(text)}&options=0`, {
        headers: this.headers,
        params: {
          id: this.getId(),
          srv: "tr-touch",
          source_lang: sourceLang,
          target_lang: targetLang,
          reason: "auto",
          format: "text",
          strategy: "",
          disable_cache: "",
          ajax: "1",
          yu: this.getId(),
          yum: this.getId()
        }
      });
      console.log("Translation response received:", translateResponse.data);
      const dictionaryResponse = await axios.get(this.apiUrls.dictionary, {
        headers: this.headers,
        params: {
          sid: this.getId(),
          ui: "id",
          srv: "tr-touch",
          text: text,
          type: "",
          lang: `${sourceLang}-${targetLang}`,
          flags: "1063",
          src: text,
          dst: "",
          options: "226",
          chunks: "0",
          maxlen: "200",
          v: "2",
          yu: this.getId(),
          yum: this.getId()
        }
      });
      console.log("Dictionary response received:", dictionaryResponse.data);
      return {
        translation: translateResponse?.data?.text?.join("") || null,
        dictionary: dictionaryResponse?.data?.result ? {
          tabs: dictionaryResponse.data.result.tabs || [],
          examples: dictionaryResponse.data.result.examples || []
        } : null
      };
    } catch (error) {
      console.error("Error processing request:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text is required"
    });
  }
  const translator = new YandexTranslate();
  try {
    const data = await translator.translate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}