import axios from "axios";
class CodeCompiler {
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
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    code = `console.log('hello')`,
      lang: language = "javascript",
      service = "2"
  } = method === "POST" ? req.body : req.query;
  if (!code) {
    return res.status(400).json({
      error: `Missing required field: code (required for action)`
    });
  }
  const compiler = new CodeCompiler();
  try {
    const result = service === "1" ? await compiler.runoob(code, language) : service === "2" ? await compiler.leez(code) : res.status(400).json({
      error: "Invalid service"
    });
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}