import axios from "axios";
const headers = {
  accept: "application/json, text/plain, */*",
  "accept-language": "id-ID,id;q=0.9",
  "app-version-code": "1041300",
  "cache-control": "no-cache",
  "content-type": "application/json",
  "distinct-id": "1941cf43a4014a-029e2a47c740676-b457451-412898-1941cf43a4110f",
  from: "web",
  lang: "en",
  origin: "https://www.pica-ai.com",
  pragma: "no-cache",
  priority: "u=1, i",
  referer: "https://www.pica-ai.com/",
  "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  vtoken: "lu/58rFCvNbttDCrRXYAg4ZKzQYq0TqhlyA2WofjMZyxqlMxXQOD6Bfge+v6baLj7/UgjriD3sWMOKACx3zcY4qyielpRhzy3MtM2SzjVJRovogruX+6XFCHWe7IVO0ob1Fq6awEnWq37py1mj1iPqqLkp50Pypr4oc5Oe99eN8="
};
async function startUpscaling(imageUrl) {
  const data = {
    style: "upscale-pic",
    image: imageUrl
  };
  try {
    const response = await axios.post("https://api.picaapi.com/aigc/image/upscale", data, {
      headers: headers
    });
    const taskId = response.data.data.taskId;
    let taskCompleted = false;
    let result = {};
    while (!taskCompleted) {
      const checkResponse = await axios.post("https://api.picaapi.com/aigc/image/upscale/task-queue", {
        asyncTaskIds: [taskId]
      }, {
        headers: headers
      });
      const taskStatus = checkResponse.data.data[0].queueStatus;
      if (taskStatus === "SUCCESS") {
        taskCompleted = true;
        result = checkResponse.data;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
    }
    return result;
  } catch (error) {
    throw new Error("Failed to upscale image");
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
      const result = await startUpscaling(url);
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