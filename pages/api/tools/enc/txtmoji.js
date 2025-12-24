import CryptoJS from "crypto-js";
class Encryption {
  constructor() {
    this.v = this.initializeDictionary();
    this.invertedV = Object.fromEntries(Object.entries(this.v).map(([key, value]) => [value, key]));
  }
  initializeDictionary() {
    try {
      const jsonData = {
        30: "0x1F630",
        31: "0x1F631",
        32: "0x1F632",
        33: "0x1F633",
        34: "0x1F634",
        35: "0x1F635",
        36: "0x1F636",
        37: "0x1F637",
        38: "0x1F638",
        39: "0x1F639",
        41: "0x1F641",
        42: "0x1F642",
        43: "0x1F643",
        44: "0x1F644",
        45: "0x1F645",
        46: "0x1F646",
        47: "0x1F647",
        48: "0x1F648",
        49: "0x1F649",
        50: "0x1F450",
        51: "0x1F451",
        52: "0x1F452",
        53: "0x1F453",
        54: "0x1F454",
        55: "0x1F455",
        56: "0x1F456",
        57: "0x1F457",
        58: "0x1F458",
        59: "0x1F459",
        61: "0x1F461",
        62: "0x1F462",
        63: "0x1F463",
        64: "0x1F464",
        65: "0x1F465",
        66: "0x1F466",
        67: "0x1F467",
        68: "0x1F468",
        69: "0x1F469",
        70: "0x1F470",
        71: "0x1F471",
        72: "0x1F472",
        73: "0x1F473",
        74: "0x1F474",
        75: "0x1F475",
        76: "0x1F476",
        77: "0x1F477",
        78: "0x1F478",
        79: "0x1F479",
        "4a": "0x1F64A",
        "4b": "0x1F64B",
        "4c": "0x1F44C",
        "4d": "0x1F64D",
        "4e": "0x1F64E",
        "4f": "0x1F44F",
        "5a": "0x1F45A",
        "6a": "0x1F46A",
        "6b": "0x1F46B",
        "6c": "0x1F46C",
        "6d": "0x1F46D",
        "6e": "0x1F46E",
        "6f": "0x1F46F",
        "7a": "0x1F47A",
        "2b": "0x1F62B",
        "2f": "0x1F62F",
        "3d": "0x1F63D"
      };
      const dictionary = {};
      for (const key in jsonData) {
        if (Object.hasOwnProperty.call(jsonData, key)) {
          const codePoint = parseInt(jsonData[key], 16);
          if (!isNaN(codePoint)) {
            dictionary[key.toLowerCase()] = String.fromCodePoint(codePoint);
          }
        }
      }
      return dictionary;
    } catch (error) {
      console.error("Error initializing dictionary:", error);
      return {};
    }
  }
  encrypt({
    input,
    pass
  }) {
    try {
      if (!input || !pass) return "";
      const fullBase64 = CryptoJS.AES.encrypt(input, pass).toString();
      const partialBase64 = fullBase64.substring(10);
      let mappedOutput = "";
      for (const char of partialBase64) {
        const hexKeyCode = char.charCodeAt(0).toString(16);
        mappedOutput += this.v[hexKeyCode] || "";
      }
      return mappedOutput;
    } catch (error) {
      console.error("Encryption error:", error);
      return "";
    }
  }
  decrypt({
    input,
    pass
  }) {
    try {
      if (!input || !pass) return "";
      const graphemes = [...input];
      let partialBase64 = "";
      for (const emoji of graphemes) {
        const hexKeyCode = this.invertedV[emoji];
        if (hexKeyCode) {
          partialBase64 += String.fromCharCode(parseInt(hexKeyCode, 16));
        }
      }
      if (!partialBase64) return "";
      const fullBase64 = "U2FsdGVkX1" + partialBase64;
      const decryptedBytes = CryptoJS.AES.decrypt(fullBase64, pass);
      return decryptedBytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return "";
    }
  }
  run({
    type,
    input,
    pass
  }) {
    if (type === "enc") {
      return this.encrypt({
        input: input,
        pass: pass
      });
    } else if (type === "dec") {
      return this.decrypt({
        input: input,
        pass: pass
      });
    } else {
      console.error(`Invalid type specified: '${type}'. Use 'enc' for encrypt or 'dec' for decrypt.`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const {
      type,
      input,
      pass
    } = params;
    if (!type || !input || !pass) {
      return res.status(400).json({
        error: "Missing required parameters: type, input, and pass are all required"
      });
    }
    if (type !== "enc" && type !== "dec") {
      return res.status(400).json({
        error: "Invalid type specified. Use 'enc' for encrypt or 'dec' for decrypt."
      });
    }
    const crypto = new Encryption();
    const result = crypto.run({
      type: type,
      input: input,
      pass: pass
    });
    if (result === null) {
      return res.status(400).json({
        error: "Encryption/decryption failed"
      });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}