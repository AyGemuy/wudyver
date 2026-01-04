import axios from "axios";
class DolphinAI {
  constructor() {
    this.msgs = [];
    this.api = "https://chat.dphn.ai/api/chat";
    this.cfg = {
      defaults: {
        model: "dolphinserver:24B",
        template: "creative",
        ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      models: [{
        id: "dolphinserver:24B",
        label: "Dolphin 24B"
      }],
      templates: [{
        name: "logical",
        label: "Logical"
      }, {
        name: "creative",
        label: "Creative"
      }, {
        name: "summary",
        label: "Summarize"
      }, {
        name: "code-beginner",
        label: "Code Beginner"
      }, {
        name: "code-advanced",
        label: "Code Advanced"
      }]
    };
  }
  prs(raw) {
    let result = "";
    let meta = {};
    const lines = raw.toString().split("\n");
    for (const line of lines) {
      const trim = line.trim();
      if (!trim || trim === "data: [DONE]") continue;
      if (trim.startsWith("data: ")) {
        try {
          const json = JSON.parse(trim.substring(6));
          result += json?.choices?.[0]?.delta?.content || "";
          if (!meta.id) {
            meta = {
              id: json?.id,
              object: json?.object,
              created: json?.created,
              model: json?.model
            };
          }
        } catch (e) {}
      }
    }
    return {
      result: result,
      ...meta
    };
  }
  async chat({
    prompt,
    messages,
    model,
    template,
    ...rest
  }) {
    console.log("[LOG] Init chat process...");
    try {
      const isModelValid = this.cfg.models.some(m => m.id === model);
      const useModel = isModelValid ? model : this.cfg.defaults.model;
      const isTempValid = this.cfg.templates.some(t => t.name === template);
      const useTemp = isTempValid ? template : this.cfg.defaults.template;
      const hist = messages && Array.isArray(messages) ? messages : this.msgs;
      if (prompt) hist.push({
        role: "user",
        content: prompt
      });
      console.log(`[LOG] Config -> Model: ${useModel}, Template: ${useTemp}`);
      const resp = await axios.post(this.api, {
        messages: hist,
        model: useModel,
        template: useTemp,
        ...rest
      }, {
        headers: {
          accept: "text/event-stream",
          "accept-language": "id-ID",
          "content-type": "application/json",
          origin: "https://chat.dphn.ai",
          referer: "https://chat.dphn.ai/",
          "user-agent": this.cfg.defaults.ua,
          "sec-ch-ua-platform": '"Android"',
          "sec-ch-ua-mobile": "?1"
        },
        responseType: "stream"
      });
      console.log("[LOG] Stream connected, reading data...");
      let rawData = "";
      for await (const chunk of resp.data) {
        rawData += chunk.toString();
      }
      const final = this.prs(rawData);
      if (final?.result) {
        hist.push({
          role: "assistant",
          content: final.result
        });
        if (!messages) this.msgs = hist;
      }
      console.log("[LOG] Done.");
      return final;
    } catch (err) {
      console.error("[LOG] Error:", err?.message || err);
      return {
        result: null,
        error: err?.message
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
  const api = new DolphinAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}