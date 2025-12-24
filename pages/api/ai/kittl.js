import axios from "axios";
import CryptoJS from "crypto-js";
class KittlAPI {
  constructor() {
    this.base = "https://api.kittl.com";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.cachedStyles = null;
  }
  log(msg, data = "") {
    if (data) {
      console.log(`[Kittl] ${msg}`, data);
    } else {
      console.log(`[Kittl] ${msg}`);
    }
  }
  hash(text) {
    try {
      return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
    } catch (err) {
      this.log("Hash error:", err.message);
      throw err;
    }
  }
  solve(nonce, difficulty, maxSolutions = 10) {
    try {
      const prefix = "0".repeat(difficulty);
      const solutions = [];
      for (let i = 0; i < 500 && solutions.length < maxSolutions; i++) {
        const hash = this.hash(nonce + i);
        if (hash.startsWith(prefix)) {
          solutions.push(i);
        }
      }
      if (solutions.length === 0) {
        throw new Error("No solution found");
      }
      this.log(`Found ${solutions.length} solutions`);
      return solutions;
    } catch (err) {
      this.log("Solve error:", err.message);
      throw err;
    }
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async getValidStyles() {
    if (this.cachedStyles) return this.cachedStyles;
    try {
      const {
        data
      } = await axios.get(`${this.base}/promptstyles/groups/index?model=turbo`, {
        headers: {
          "user-agent": this.ua
        }
      });
      this.cachedStyles = data.results.flatMap(g => g.styles || []);
      return this.cachedStyles;
    } catch (err) {
      this.log("Failed to fetch styles:", err.message);
      return [];
    }
  }
  async resolveStyleId(inputStyle) {
    if (!inputStyle) return null;
    try {
      const styles = await this.getValidStyles();
      const search = String(inputStyle).toLowerCase();
      const match = styles.find(s => String(s.id).toLowerCase() === search || String(s.name).toLowerCase() === search);
      if (!match) {
        const available = styles.map(s => s.name).slice(0, 10).join(", ");
        throw new Error(`Style "${inputStyle}" not found. Available: ${available}...`);
      }
      this.log(`Style: ${match.name} (${match.id})`);
      return match.id;
    } catch (err) {
      this.log("Style resolve error:", err.message);
      throw err;
    }
  }
  async generate(params) {
    const {
      prompt,
      style,
      ...rest
    } = params;
    try {
      const resolvedId = await this.resolveStyleId(style);
      for (let attempt = 1; attempt <= 60; attempt++) {
        try {
          if (attempt > 1) {
            await this.sleep(500);
          }
          const resChallenge = await axios.post(`${this.base}/auth/challenges/create`, {}, {
            headers: {
              "user-agent": this.ua,
              origin: "https://www.kittl.com",
              accept: "application/json"
            }
          });
          const {
            nonce,
            complexity,
            success
          } = resChallenge.data;
          if (!success) throw new Error("Challenge failed");
          const rawCookies = resChallenge.headers["set-cookie"];
          const cookieHeader = rawCookies ? rawCookies.map(c => c.split(";")[0]).join("; ") : "";
          const solutions = this.solve(nonce, complexity, 10);
          const payload = {
            prompt: prompt || "ai artwork",
            signal: {},
            ...resolvedId && {
              style: resolvedId
            },
            ...rest
          };
          const requests = solutions.map(solution => axios.post(`${this.base}/generators/public/image`, payload, {
            headers: {
              accept: "*/*",
              "accept-language": "id-ID",
              "content-type": "application/json",
              origin: "https://www.kittl.com",
              "user-agent": this.ua,
              cookie: cookieHeader,
              "x-challenge-nonce": nonce,
              "x-challenge-solution": String(solution)
            }
          }).then(res => ({
            success: true,
            solution: solution,
            data: res.data
          })).catch(err => ({
            success: false,
            solution: solution,
            error: err.response?.data?.error
          })));
          const results = await Promise.all(requests);
          const successResult = results.find(r => r.success);
          if (successResult) {
            this.log(`✓ SUCCESS with solution ${successResult.solution} (attempt ${attempt})!`);
            return successResult.data;
          }
          throw new Error("All solutions rejected");
        } catch (err) {
          const errorMsg = err.response?.data?.error || err.message;
          if (errorMsg === "WRONG_CHALLENGE_SOLUTION" || errorMsg === "INVALID_CHALLENGE_SOLUTION" || errorMsg === "All solutions rejected") {
            if (attempt % 3 === 0) {
              this.log(`Progress: ${attempt}/60 attempts...`);
            }
            continue;
          }
          this.log(`✗ Fatal error: ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }
      throw new Error("Failed after 60 attempts");
    } catch (err) {
      this.log("Generate error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new KittlAPI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}