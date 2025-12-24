import axios from "axios";
class PikwyAPI {
  constructor() {
    this.baseURL = "https://api.pikwy.com/";
    console.log("[PikwyAPI] Instance created");
  }
  async generate({
    url,
    ...rest
  } = {}) {
    const targetUrl = url || rest.u || "https://chatgpt.com/";
    console.log("[generate] Starting screenshot generation for:", targetUrl);
    try {
      const params = {
        tkn: rest.tkn || 125,
        d: rest.d || 3e3,
        u: encodeURIComponent(targetUrl),
        fs: rest.fs || 0,
        w: rest.w || 1280,
        h: rest.h || 1200,
        s: rest.s || 100,
        z: rest.z || 100,
        f: rest.f || "jpg",
        rt: rest.rt || "jweb",
        ...rest
      };
      console.log("[generate] Request parameters:", params);
      const response = await axios.get(this.baseURL, {
        params: params
      });
      const data = response?.data || {};
      console.log("[generate] Raw API response:", data);
      return data;
    } catch (error) {
      console.error("[generate] Error:", error?.response?.status || error?.code || error?.message);
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || "Unknown error occurred",
        code: error?.response?.status || error?.code
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const client = new PikwyAPI();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}