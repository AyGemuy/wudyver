import axios from "axios";
class ImageEnhancer {
  constructor() {
    this.baseUrl = "https://api.maxstudio.ai/image-enhancer";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://www.superupscaler.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.superupscaler.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async pollJobStatus(jobId) {
    const url = `${this.baseUrl}/${jobId}`;
    while (true) {
      const response = await axios.get(url, {
        headers: this.headers
      });
      const {
        status
      } = response.data;
      if (status === "completed") {
        return response.data;
      }
      await new Promise(resolve => setTimeout(resolve, 3e3));
    }
  }
  async enhanceImage(input) {
    const isBase64 = /^data:image\/[a-z]+;base64,/.test(input);
    const imageBase64 = isBase64 ? input.replace(/^data:image\/[a-z]+;base64,/, "") : Buffer.from((await axios.get(input, {
      responseType: "arraybuffer"
    })).data, "binary").toString("base64");
    const response = await axios.post(this.baseUrl, {
      image: imageBase64
    }, {
      headers: {
        ...this.headers,
        "content-type": "application/json",
        "x-captcha-type": "manual",
        "x-project-id": "superUpscaler",
        "x-token": "0.3QhociSnkLyARwTtjkqqh9xILiXvGWSMGPMAibl-2Hq3JlV6J5fhfKXROOhyLcyE1ECTFKpxe7QoX0arDwNuZBeSrOQJgCDJq2_g5GoMRa02-vfSRld0z1-4Myp50TMitaUc3VzKEk1nSnwHIsoqt3EUjdFWfo-u-E4ZfafSsEeCenq4EmFvDHUTimQ93XLl4KDT_8fOXXxIMGHnl3cSkOV2H1OVKkycwDI5lgWL5iclJCy57B2A9ONd42LcNAz_Iw4Tg3IwFSwpPaIYeeHnbyDWgSvorKlIy07IyslHkC2x5LjuNhgP1-I3O8dhNNtUN5zOriEjzhfkAXVKDbGzYJ-KFESDm_VvEepQAC9W9sVGVi-0Tw6JnJoYdJiOr5RcVK2t_IW1vfPmvYzHVLmtENyhd8eBmqHrnqmkRL7yvHGmKEJmvariwzDMzqNafEQIAau56Wrdzv5gFae30RjxDISEiQkVVZQQnZ0l_IvOE-pORKWhVp422BhT6ibAAEBeRkFgqU5AKHDykjICLMM5WzvEooze6vwuYYRRuTP06On-djw7DRX_w-JPPxY0OujSnw8OCI9uAsVb17inPpia9cYIAjtWlZ76p2BrzW2K3idSOfS5gKbaefUxIJnWubO_Gt8nKcrKCUY3N1E7llY0lSj9kJ86GRWikqp90WaNP3_B2bKFu1o8fwOHq1WfkPuY8Nf84jZzDeMjWhyxImtfvdfM3a78KBNuXcZH7fpQdNOrrEzJTeRPK_2n_8X75mvGWSe__60EN-poG2cW2jZoM01IqibzvrYJ-66eYE6Zlvs.ThMuXn9bV9mIWbtswFrHSg.225fe4f7318d122f37098c4f5596cf7d6d229e952ec26ffbbdb29783fe272921"
      }
    });
    return await this.pollJobStatus(response.data.jobId);
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing url in request"
    });
  }
  const enhancer = new ImageEnhancer();
  try {
    const result = await enhancer.enhanceImage(url);
    res.setHeader("Content-Type", "image/png");
    res.send(Buffer.from(result.result, "base64"));
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}