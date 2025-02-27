import axios from "axios";
const playwright = {
  avLang: ["javascript", "python", "java", "csharp"],
  request: async function(language = "javascript", code) {
    if (!this.avLang.includes(language.toLowerCase())) {
      throw new Error(`Language "${language}" tidak support. Pilih Language yang tersedia: ${this.avLang.join(", ")}`);
    }
    const url = "https://try.playwright.tech/service/control/run";
    const headers = {
      authority: "try.playwright.tech",
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://try.playwright.tech",
      referer: "https://try.playwright.tech/?l=playwright-test",
      "user-agent": "Postify/1.0.0"
    };
    const data = {
      code: code,
      language: language
    };
    try {
      const response = await axios.post(url, data, {
        headers: headers
      });
      const {
        success,
        error,
        version,
        duration,
        output,
        files
      } = response.data;
      return {
        success: success,
        error: error,
        version: version,
        duration: duration,
        output: output,
        files: files
      };
    } catch (error) {
      if (error.response) {
        const {
          success,
          error: errMsg,
          version,
          duration,
          output,
          files
        } = error.response.data;
        return {
          success: success,
          error: errMsg,
          version: version,
          duration: duration,
          output: output,
          files: files
        };
      } else {
        throw new Error(error.message);
      }
    }
  }
};
export default async function handler(req, res) {
  const {
    lang: language,
    code
  } = req.method === "POST" ? req.body : req.query;
  if (!language || !code) {
    return res.status(400).json({
      error: "Lang and code are required"
    });
  }
  try {
    const result = await playwright.request(language, code);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}