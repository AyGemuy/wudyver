import pkg from "javascript-obfuscator";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const {
  obfuscate
} = pkg;
class ObfsMgr {
  constructor() {
    this.opt = {
      compact: true,
      controlFlowFlattening: false,
      controlFlowFlatteningThreshold: .75,
      deadCodeInjection: false,
      deadCodeInjectionThreshold: .5,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: "hexadecimal",
      log: false,
      renameProperties: false,
      selfDefending: false,
      splitStrings: true,
      splitStringsChunkLength: 5,
      stringArray: true,
      stringArrayEncoding: ["base64"],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 3,
      stringArrayWrappersType: "variable",
      transformObjectKeys: true,
      unicodeEscapeSequence: false,
      identifiersPrefix: ""
    };
  }
  _rUni(len = 3) {
    let r = "";
    for (let i = 0; i < len; i++) {
      r += String.fromCharCode(19968 + Math.floor(Math.random() * (40959 - 19968 + 1)));
    }
    return r;
  }
  _sId(str) {
    return str.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/_+/g, "_");
  }
  _gOpts(lvl) {
    const opts = {
      ...this.opt
    };
    switch (lvl.toLowerCase()) {
      case "low":
        Object.assign(opts, {
          controlFlowFlattening: false,
          deadCodeInjection: false,
          debugProtection: false,
          disableConsoleOutput: false,
          renameProperties: false,
          selfDefending: false,
          unicodeEscapeSequence: true,
          stringArray: true,
          stringArrayEncoding: ["none"],
          identifierNamesGenerator: "mangled"
        });
        break;
      case "medium":
        Object.assign(opts, {
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: .5,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: .3,
          debugProtection: false,
          disableConsoleOutput: false,
          renameProperties: false,
          selfDefending: false,
          unicodeEscapeSequence: true,
          stringArray: true,
          stringArrayEncoding: ["base64"],
          identifierNamesGenerator: "hexadecimal"
        });
        break;
      case "high":
        Object.assign(opts, {
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: .99,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: .99,
          debugProtection: false,
          debugProtectionInterval: 4e3,
          disableConsoleOutput: false,
          identifierNamesGenerator: "hexadecimal",
          renameProperties: true,
          selfDefending: true,
          splitStrings: true,
          stringArray: true,
          stringArrayEncoding: ["base64", "rc4"],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 10,
          stringArrayWrappersType: "function",
          transformObjectKeys: true,
          unicodeEscapeSequence: true
        });
        break;
      case "extreme":
        Object.assign(opts, {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 1,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 1,
          debugProtection: false,
          debugProtectionInterval: 4e3,
          disableConsoleOutput: false,
          identifierNamesGenerator: "hexadecimal",
          log: false,
          renameProperties: true,
          selfDefending: true,
          splitStrings: true,
          stringArray: true,
          stringArrayEncoding: ["base64", "rc4"],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 10,
          stringArrayWrappersType: "function",
          transformObjectKeys: true,
          unicodeEscapeSequence: true,
          domainLock: [],
          sourceMap: false
        });
        break;
      default:
        return this._gOpts("medium");
    }
    return opts;
  }
  _sH(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }
  async obfs({
    code,
    level = "low",
    encoding = null,
    ...customOptions
  }) {
    let actualCode = code;
    if (typeof code === "string" && code.startsWith("https://")) {
      try {
        const response = await axios.get(code, {
          headers: {
            Accept: "text/plain, application/javascript, application/json"
          },
          validateStatus: function(status) {
            return status >= 200 && status < 300;
          }
        });
        const contentType = response.headers["content-type"];
        if (!contentType || !contentType.includes("text/") && !contentType.includes("application/javascript") && !contentType.includes("application/json")) {
          console.warn(`[WARNING] Content-Type for ${code} is '${contentType}'. Expected text/javascript/json. Proceeding anyway.`);
        }
        actualCode = response.data;
      } catch (error) {
        console.error(`Error fetching code from URL: ${code}`, error.message);
        throw new Error(`Failed to fetch code from URL: ${error.message}`);
      }
    }
    const opts = this._gOpts(level);
    if (encoding !== null) {
      opts.stringArrayEncoding = Array.isArray(encoding) ? encoding : [encoding];
    }
    const finalOpts = {
      ...opts,
      ...customOptions
    };
    try {
      const result = obfuscate(actualCode, finalOpts);
      return result.getObfuscatedCode();
    } catch (error) {
      console.error("JavaScript Obfuscator error:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Code is required"
    });
  }
  try {
    const obfsManager = new ObfsMgr();
    const response = await obfsManager.obfs(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}