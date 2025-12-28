import axios from "axios";
import {
  randomUUID
} from "crypto";
class CompilerClient {
  constructor() {
    this.endpoints = {
      js: "https://pythontutor.com/web_exec_js.py",
      py311: "https://pythontutor.com/web_exec_py311.py",
      py3: "https://pythontutor.com/web_exec_py3.py"
    };
  }
  async run({
    code,
    lang = "js"
  }) {
    const endpoint = this.endpoints[lang] || this.endpoints.js;
    console.log(`[Execute] Running ${lang} script...`);
    try {
      const response = await axios.get(endpoint, {
        params: {
          user_script: code,
          raw_input_json: "",
          options_json: JSON.stringify({
            cumulative_mode: false,
            heap_primitives: false,
            show_only_outputs: false,
            origin: "opt-frontend.js",
            fe_disableHeapNesting: true,
            fe_textualMemoryLabels: false
          }),
          n: Math.floor(Math.random() * 900) + 100,
          user_uuid: randomUUID(),
          session_uuid: randomUUID()
        },
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
          Referer: "https://pythontutor.com/render.html#mode=display"
        },
        timeout: 15e3
      });
      const data = response.data;
      if (!data || !data.trace) {
        throw new Error("Invalid response from PythonTutor");
      }
      const trace = data.trace;
      const lastStep = trace[trace.length - 1];
      if (lastStep.event === "uncaught_exception" || lastStep.exception_msg) {
        return {
          output: null,
          error: lastStep.exception_msg || "Unknown Runtime Error"
        };
      }
      const lastStdout = [...trace].reverse().find(t => t.stdout !== undefined);
      console.log(`[Success] Execution finished.`);
      return {
        output: lastStdout ? lastStdout.stdout.trim() : "",
        error: null
      };
    } catch (err) {
      const msg = err.response?.data || err.message;
      console.error(`[Error] ${msg}`);
      return {
        output: null,
        error: msg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  const api = new CompilerClient();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}