import axios from "axios";
class DataFetcher {
  constructor() {
    this.baseURL = "https://unmiss.com/anatoli_seo_tool/Upload/rest/";
    this.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGUiOiIyIiwiaWF0IjoxNjkyMjY5NTg4LCJleHAiOjE2OTI4NzQzODh9.5O5SuO9zBrK2_4-p9JzRAtS-MJJeM_Lg80MnLGkkGcg";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: `Bearer ${this.token}`,
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://unmiss.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://unmiss.com/get-source-code-of-webpage",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url,
    rest = "PR35"
  }) {
    try {
      if (!url) throw new Error("Paramenter 'url' is required.");
      const response = await axios({
        method: "POST",
        url: `${this.baseURL}${rest.toUpperCase()}`,
        headers: this.headers,
        data: {
          url: url
        }
      });
      const responseData = response.data;
      if (responseData?.data?.value?.length) {
        let html = responseData.data.value[1];
        html = html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
        return html;
      }
      throw new Error("HTML value not found in response.");
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new DataFetcher();
  try {
    const result = await api.download(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}