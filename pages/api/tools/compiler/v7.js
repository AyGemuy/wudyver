import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class CompilerClient {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true,
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    }));
  }
  async getCsrf() {
    try {
      const {
        data
      } = await this.client.get("https://www.codechef.com/javascript-online-compiler");
      const $ = cheerio.load(data);
      const script = $("script").filter((_, el) => $(el).html()?.includes("window.csrfToken")).html();
      return script?.match(/window\.csrfToken\s*=\s*"(.*?)"/)?.[1] || null;
    } catch (e) {
      throw new Error(`Auth Error: ${e.message}`);
    }
  }
  async run({
    code,
    lang = "56",
    input = "",
    visual = "0",
    contest = "PRACTICE"
  }) {
    try {
      const token = await this.getCsrf();
      if (!token) throw new Error("CSRF not found");
      const form = new FormData();
      const fields = {
        sourceCode: code,
        language: lang,
        input: input,
        contestCode: contest,
        isCodeVisualizer: visual
      };
      Object.entries(fields).forEach(([k, v]) => form.append(k, v));
      const {
        data
      } = await this.client.post("https://www.codechef.com/api/ide/run/all", form, {
        headers: {
          ...form.getHeaders(),
          "x-csrf-token": token
        }
      });
      const res = await this.poll(data.timestamp);
      return {
        success: true,
        output: res.output?.trim() || ""
      };
    } catch (e) {
      return {
        success: false,
        error: e.message
      };
    }
  }
  async poll(timestamp) {
    try {
      while (true) {
        await new Promise(r => setTimeout(r, 1e3));
        const {
          data
        } = await this.client.get("https://www.codechef.com/api/ide/run/all", {
          params: {
            timestamp: timestamp,
            isCodeVisualizer: 0
          }
        });
        if (data.code_status === 0) return data;
        if (data.code_status === 1) throw new Error(data.cmpinfo || "Compile Error");
      }
    } catch (e) {
      throw new Error(`Polling failed: ${e.message}`);
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
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}