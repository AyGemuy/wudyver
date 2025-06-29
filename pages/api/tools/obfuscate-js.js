import pkg from "javascript-obfuscator";
const {
  obfuscate
} = pkg;
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
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
    for (let i = 0; i < len; i++) r += String.fromCharCode(19968 + Math.floor(Math.random() * (40959 - 19968 + 1)));
    return r;
  }
  _sId(str) {
    return str.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/_+/g, "_");
  }
  _gOpts(lvl, pfx = "") {
    const opts = {
      ...this.opt
    };
    opts.identifiersPrefix = pfx;
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
        return this._gOpts("medium", pfx);
    }
    return opts;
  }
  async obfs({
    code,
    level = "low",
    pass = apiConfig.PASSWORD,
    encoding = "rc4"
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
    const effEnc = "CODE_OBFUSCATED_BY_" + pass;
    const now = new Date();
    const datePart = now.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).replace(/-/g, "");
    const timePart = now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).replace(/:/g, "");
    const dayPart = now.toLocaleDateString("en-US", {
      weekday: "short"
    }).toUpperCase();
    const fullYear = now.getFullYear();
    const sTagMsg = this._sId(effEnc);
    const fullTagMsg = `${sTagMsg}_${datePart}_${timePart}_${dayPart}`;
    const pfxSEffEnc = this._sId(effEnc);
    let pfx = "";
    const tsHash = Math.abs(this._sH(`${datePart}${timePart}`)).toString(36).substring(0, 5).toUpperCase();
    const hPart = Math.abs(this._sH(effEnc)).toString(36).substring(0, 5).toUpperCase();
    const rHex = Math.floor(Math.random() * 65535).toString(16).toUpperCase();
    let bPfx = `${this._rUni(2)}${tsHash}_${pfxSEffEnc}_${dayPart}`;
    switch (level.toLowerCase()) {
      case "low":
        pfx = `${bPfx}_L_${rHex}_`;
        break;
      case "medium":
        pfx = `${bPfx}_M_${hPart}_${rHex}_`;
        break;
      case "high":
        pfx = `${bPfx}_H_${hPart}${rHex}_${this._rUni(1)}${pfxSEffEnc}_`;
        break;
      case "extreme":
        pfx = `${bPfx}_X_${hPart}${tsHash}_${fullYear}${this._rUni(2)}${pfxSEffEnc}_${rHex}_`;
        break;
      default:
        pfx = `${bPfx}_D_${rHex}_`;
    }
    const opts = this._gOpts(level, pfx);
    opts.unicodeEscapeSequence = true;
    if (encoding !== null) {
      if (Array.isArray(encoding)) {
        opts.stringArrayEncoding = encoding;
      } else {
        opts.stringArrayEncoding = [encoding];
      }
    }
    let iCode = "";
    const visObfTagStrLit = JSON.stringify(fullTagMsg);
    if (effEnc) {
      const pHPart = this._sH(effEnc).toString(36).substring(0, 8);
      const origTagB64 = Buffer.from(effEnc).toString("base64");
      switch (level.toLowerCase()) {
        case "low":
          iCode = `var __SYSTEM_LABEL = ${visObfTagStrLit}; console.log("[STATUS:INIT] ID_SYSTEM_L: "+ __SYSTEM_LABEL + " [ORIGINAL_TAG]: '${effEnc}'");`;
          break;
        case "medium":
          iCode = `var __MODULE_ID = ${visObfTagStrLit}; (function(){var sysId=${visObfTagStrLit}; console.log("[CORE:BOOT] ID_M: "+sysId+" [ORIGINAL]: '${effEnc}'");})();`;
          break;
        case "high":
        case "extreme":
          const mNum = Math.floor(Math.random() * (16777215 + 1));
          const dSaltB64 = Buffer.from(effEnc + mNum + pHPart).toString("base64");
          const dSaltDecH = Buffer.from(dSaltB64, "base64").toString("utf8");
          iCode = `
                        const _d_b64 = e => atob(e);
                        const __OBF_METADATA_SIGNATURE = ${visObfTagStrLit};
                        (function() {
                            const _mn = ${mNum};
                            let _s = 0;
                            const _ot = _d_b64('${origTagB64}');
                            const _ds_b64 = '${dSaltB64}';
                            const _ds_decoded = _d_b64(_ds_b64);

                            const _fmd = __OBF_METADATA_SIGNATURE;

                            const _integrityCheck = _gh => {
                                const expectedHash = _gh(_fmd + _ds_decoded);
                                if (!(_s % 2 === 0)) return false;
                                if (!(_gh('status_ok_' + _s) === (expectedHash ^ _s))) return false;
                                return true;
                            };

                            const _gh = s => {
                                let h = 0;
                                for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
                                return h;
                            };

                            Object.defineProperty(globalThis, '___SYSTEM_BEACON_${mNum.toString(16).toUpperCase()}__', {
                                get: () => { _s++; return _integrityCheck(_gh); },
                                configurable: false, enumerable: false
                            });
                            console.log("[SYSTEM:CORE] Initialized: " + _fmd + " | Original Input: " + _ot + " | Checksum ID: " + _mn + " | Salt Hash: " + _gh(_ds_decoded));
                        })();
                    `;
          break;
      }
    }
    const fCode = iCode + "\n" + actualCode;
    try {
      const result = obfuscate(fCode, opts);
      return result.getObfuscatedCode();
    } catch (error) {
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