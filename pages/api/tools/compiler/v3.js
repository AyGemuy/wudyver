import axios from "axios";
class CompilerClient {
  constructor() {
    this.codeIds = {
      kotlin: 2960,
      java: 10,
      lua: 66,
      nodejs: 22,
      go: 21,
      swift: 20,
      rust: 19,
      ruby: 13,
      "c#": 14,
      "c++": 12,
      c: 11,
      python: 9,
      php: 1
    };
    this.extName = {
      kotlin: "kt",
      java: "java",
      lua: "lua",
      nodejs: "node.js",
      go: "go",
      swift: "swift",
      rust: "rs",
      ruby: "rb",
      "c#": "cs",
      "c++": "cpp",
      c: "c",
      python: "py3",
      php: "php"
    };
  }
  async runoob(code, language) {
    if (!this.codeIds[language] || !this.extName[language]) {
      return {
        error: "Unsupported language"
      };
    }
    const url = "https://www.runoob.com/try/compile2.php";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.jyshare.com/compile/22/"
    };
    const data = new URLSearchParams({
      code: code,
      token: "dadefd4c8adfb0e7d2221d31e1639f0c",
      stdin: "",
      language: this.codeIds[language],
      fileext: this.extName[language]
    }).toString();
    try {
      const response = await axios.post(url, data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async leez(code) {
    const url = "https://code.leez.tech/runcode";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://code.leez.tech/runcode"
    };
    const data = new URLSearchParams({
      code: code
    }).toString();
    try {
      const response = await axios.post(url, data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async run({
    service = "1",
    code,
    lang
  }) {
    try {
      let out;
      if (service === "1") {
        out = await this.runoob(code, lang);
      } else if (service === "2") {
        out = await this.leez(code);
      } else {
        return {
          error: "Invalid service",
          available: "1 (Runoob) / 2 (Leez)"
        };
      }
      return out;
    } catch (error) {
      return {
        error: "Execution failed",
        message: error.message
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