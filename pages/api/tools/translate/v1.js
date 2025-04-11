import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method === "POST" || req.method === "GET") {
    const {
      text,
      target = "ID",
      source = "auto"
    } = req.method === "POST" ? req.body : req.query;
    if (!text) {
      return res.status(400).json({
        status: 1,
        error: "Text is required"
      });
    }
    const payload = {
      jsonrpc: "2.0",
      method: "LMT_handle_jobs",
      params: {
        jobs: [{
          kind: "default",
          sentences: [{
            text: text,
            id: 1,
            prefix: ""
          }],
          raw_en_context_before: [],
          raw_en_context_after: [],
          preferred_num_beams: 4
        }],
        lang: {
          target_lang: target,
          preference: {
            weight: {},
            default: "default"
          },
          source_lang_computed: source
        },
        priority: -1,
        commonJobParams: {
          quality: "fast",
          mode: "translate",
          browserType: 1,
          textType: "plaintext"
        },
        timestamp: Date.now()
      },
      id: Math.floor(Math.random() * 1e8)
    };
    try {
      const response = await fetch("https://www2.deepl.com/jsonrpc?method=LMT_handle_jobs", {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: `https://www.deepl.com/translator#${source}/${target}/${encodeURIComponent(text)}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.result?.translations?.[0]?.beams) {
        const translations = data.result.translations[0].beams.map(beam => beam.sentences.map(sentence => sentence.text).join(" "));
        return res.status(200).json({
          status: 0,
          translations: translations
        });
      }
      return res.status(500).json({
        status: 1,
        error: "Translation failed",
        details: data
      });
    } catch (error) {
      console.error("Error:", error.message);
      return res.status(500).json({
        status: 1,
        error: "Internal Server Error"
      });
    }
  }
  return res.status(405).json({
    status: 1,
    error: "Method Not Allowed"
  });
}