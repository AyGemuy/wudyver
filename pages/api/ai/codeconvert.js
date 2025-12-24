import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class CodeConvert {
  constructor() {
    this.cfg = {
      base: "https://www.codeconvert.ai/api",
      ep: {
        generate: "/free-generate",
        convert: "/free-convert",
        explain: "/free-explain",
        remove: "/free-remove-code-comments"
      },
      langs: ["C++", "Golang", "Java", "JavaScript", "Python", "R", "C", "Csharp", "Julia", "Perl", "Matlab", "Kotlin", "PHP", "Ruby", "Rust", "TypeScript", "Lua", "SAS", "Fortran", "Lisp", "Scala", "Assembly", "ActionScript", "Clojure", "CoffeeScript", "Dart", "COBOL", "Elixir", "Groovy", "Erlang", "Haskell", "Pascal", "Swift", "Scheme", "Racket", "OCaml", "Elm", "Haxe", "Crystal", "Fsharp", "Tcl", "VB.NET", "Objective_C", "Ada", "Vala", "PySpark", "SQL", "PostgreSQL", "MySQL", "MongoDB", "CQL", "Redis", "Elasticsearch", "VB6", "VBA", "VBScript", "PowerShell", "Bash", "Delphi", "Zig", "Carbon", "Nim", "Grain", "Gleam", "Wren"],
      hdr: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://www.codeconvert.ai",
        referer: "https://www.codeconvert.ai",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      },
      rules: {
        generate: ["code", "lang"],
        convert: ["code", "lang", "target"],
        explain: ["code", "lang"],
        remove: ["code", "lang"]
      },
      map: {
        generate: {
          code: "inputText",
          lang: "inputLang"
        },
        convert: {
          code: "inputCodeText",
          lang: "inputLang",
          target: "outputLang",
          instruction: "customInstruction"
        },
        explain: {
          code: "inputCodeText",
          lang: "inputLang",
          instruction: "customInstruction"
        },
        remove: {
          code: "inputCodeText",
          lang: "inputLang"
        }
      }
    };
  }
  resolveLang(input) {
    if (!input) return null;
    const cleanInput = input.trim().toLowerCase();
    return this.cfg.langs.find(l => l.toLowerCase() === cleanInput);
  }
  validMode(mode) {
    return mode && this.cfg.ep?.[mode];
  }
  validInput(mode, data) {
    const rules = this.cfg.rules?.[mode] || [];
    const missing = rules.filter(k => !data?.[k]);
    if (missing.length > 0) {
      return {
        valid: false,
        errorObject: {
          text: "Missing required fields",
          missingFields: missing
        }
      };
    }
    if (data?.lang) {
      const correctedLang = this.resolveLang(data.lang);
      if (!correctedLang) {
        return {
          valid: false,
          errorObject: {
            text: "Invalid source language",
            input: data.lang,
            availableLanguages: this.cfg.langs
          }
        };
      }
      data.lang = correctedLang;
    }
    if (data?.target) {
      const correctedTarget = this.resolveLang(data.target);
      if (!correctedTarget) {
        return {
          valid: false,
          errorObject: {
            text: "Invalid target language",
            input: data.target,
            availableLanguages: this.cfg.langs
          }
        };
      }
      data.target = correctedTarget;
    }
    return {
      valid: true
    };
  }
  mapInput(mode, data) {
    const mapping = this.cfg.map?.[mode] || {};
    const payload = {};
    Object.keys(data).forEach(k => {
      const key = mapping[k] || k;
      payload[key] = data[k];
    });
    return payload;
  }
  parseResult(data) {
    const result = data?.outputCodeText || data?.outputText || null;
    const {
      outputCodeText,
      outputText,
      ...info
    } = data || {};
    return {
      result: result,
      ...info
    };
  }
  req(url, data) {
    return axios.post(url, data, {
      headers: this.cfg.hdr
    });
  }
  async chat({
    mode,
    ...rest
  }) {
    console.log(`[chat] Mode: ${mode || "undefined"}`);
    if (!this.validMode(mode)) {
      const err = {
        error: true,
        message: {
          text: "Invalid mode provided",
          input: mode,
          availableModes: Object.keys(this.cfg.ep)
        }
      };
      console.error(`[chat] Invalid Mode`);
      return err;
    }
    const validation = this.validInput(mode, rest);
    if (!validation.valid) {
      const err = {
        error: true,
        message: validation.errorObject
      };
      console.error(`[chat] Validation Failed:`, validation.errorObject.text);
      return err;
    }
    const payload = this.mapInput(mode, rest);
    const ep = this.cfg.ep[mode];
    const url = `${this.cfg.base}${ep}`;
    try {
      const res = await this.req(url, payload);
      const parsed = this.parseResult(res?.data);
      console.log(`[chat] Success`);
      return {
        error: false,
        ...parsed,
        message: {
          text: "Success",
          mode: mode
        }
      };
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Request failed";
      const error = {
        error: true,
        message: {
          text: "Internal API Error",
          details: errorMsg
        },
        result: null
      };
      console.error(`[chat] Error:`, errorMsg);
      return error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new CodeConvert();
  try {
    const data = await api.chat(params);
    const status = data.error ? 400 : 200;
    return res.status(status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: {
        text: "Server Error",
        details: error.message || "Unknown error"
      }
    });
  }
}