import axios from "axios";
import qs from "qs";
class Bigjpg {
  constructor() {
    this.url = "https://bigjpg.com/task";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: "Hm_lvt_a4a2f7cbd98dc814e4cda6bfc8bebb6b=1736080330; Hm_lpvt_a4a2f7cbd98dc814e4cda6bfc8bebb6b=1736080330; HMACCOUNT=B0FC95D862555E12",
      Origin: "https://bigjpg.com",
      Pragma: "no-cache",
      Referer: "https://bigjpg.com/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async upscale(url) {
    const data = qs.stringify({
      conf: JSON.stringify({
        x2: "1",
        style: "art",
        noise: "-1",
        file_name: "IMG-20250105-WA0184.jpg",
        files_size: 264664,
        file_height: 1344,
        file_width: 686,
        input: url
      })
    });
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      const taskId = response.data.info;
      let taskStatus = "pending";
      let result = null;
      while (taskStatus !== "success") {
        const statusUrl = `https://bigjpg.com/free?fids=[%22${taskId}%22]&_=${Date.now()}`;
        const statusResponse = await axios.get(statusUrl, {
          headers: this.headers
        });
        const taskInfo = statusResponse.data[taskId];
        if (taskInfo && taskInfo[0] === "success") {
          taskStatus = "success";
          result = taskInfo[1];
        } else {
          await new Promise(resolve => setTimeout(resolve, 5e3));
        }
      }
      return {
        result: result
      };
    } catch (error) {
      throw new Error("Error during the process");
    }
  }
}
export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "Image URL is required"
      });
    }
    try {
      const big = new Bigjpg();
      const result = await big.upscale(url);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        error: error.message
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}