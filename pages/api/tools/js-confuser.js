import Confuser from "js-confuser";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class ObfsMgr {
  constructor() {
    this.opt = {
      target: "node",
      compact: true,
      minify: true,
      renameVariables: true,
      renameGlobals: true,
      preset: "medium",
      stringConcealing: true,
      globalConcealing: true,
      identifierGenerator: "mangled",
      movedDeclarations: true,
      stringCompression: false,
      stringEncoding: false,
      stringSplitting: false,
      calculator: true,
      objectExtraction: true,
      shuffle: false,
      duplicateLiteralsRemoval: .2,
      controlFlowFlattening: false,
      dispatcher: .2,
      opaquePredicates: .1,
      deadCode: false,
      flatten: false,
      rgf: false,
      pack: false
    };
  }
  setOptions(newOptions) {
    this.opt = {
      ...this.opt,
      ...newOptions
    };
  }
  _rUni(len = 3) {
    let r = "";
    for (let i = 0; i < len; i++) r += String.fromCharCode(19968 + Math.floor(Math.random() * (40959 - 19968 + 1)));
    return r;
  }
  _sId(str) {
    return str.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/_+/g, "_");
  }
  async obfs({
    code,
    pass = apiConfig.PASSWORD,
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
    const finalOpts = {
      ...this.opt,
      ...customOptions
    };
    finalOpts.target = "node";
    if (finalOpts.lock && finalOpts.lock.domains) {
      delete finalOpts.lock.domains;
    }
    try {
      const result = await Confuser.obfuscate(actualCode, finalOpts);
      return result.code;
    } catch (error) {
      console.error("JS-Confuser obfuscation error:", error);
      throw error;
    }
  }
  _sH(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Code are required"
    });
  }
  try {
    const obfsMgr = new ObfsMgr();
    const response = await obfsMgr.obfs(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}