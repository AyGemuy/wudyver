import axios from "axios";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class BuzzFun {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      ...SpoofHead()
    };
    this.cookie = "";
    this.listHost = ["buzzfun.me", "quiztest.me"];
  }
  async generate({
    imageUrl,
    magic = true,
    id = "59728",
    host = "buzzfun.me"
  }) {
    if (!this.listHost.includes(host)) {
      throw new Error(`Host "${host}" tidak tersedia. Pilihan yang tersedia: ${this.listHost.join(", ")}`);
    }
    try {
      console.log("Fetching cookies and QID...");
      const response = await axios.get(`https://${host}/en/quizzes/details/id/${id}/type/image_lab_new.html`, {
        headers: {
          ...this.headers,
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      this.cookie = response.headers["set-cookie"].join("; ");
      const $ = cheerio.load(response.data);
      const qid = $(".jogar_container").data("qid");
      console.log("Successfully fetched QID:", qid);
      console.log("Downloading image from URL...");
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const mimeType = imageResponse.headers["content-type"];
      const base64Image = Buffer.from(imageResponse.data, "binary").toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      console.log("Preparing data for image upload...");
      const postData = new URLSearchParams();
      postData.append("pic", dataUri);
      postData.append("qid", qid);
      if (magic) {
        postData.append("otherType[type]", "aiImg");
        console.log("Magic option is enabled, adding aiImg type to post data.");
      }
      console.log("Uploading image...");
      const uploadResponse = await axios.post(`https://${host}/en/upload`, postData, {
        headers: {
          ...this.headers,
          cookie: this.cookie
        }
      });
      this.cookie = uploadResponse.headers["set-cookie"].join("; ");
      const uploadedImageUrl = uploadResponse.data.data;
      console.log("Image uploaded successfully:", uploadedImageUrl);
      console.log("Submitting result...");
      const resultPostData = new URLSearchParams();
      resultPostData.append("qid", qid);
      resultPostData.append("img[img_1]", uploadedImageUrl);
      resultPostData.append("img[img_2]", "");
      resultPostData.append("img[content]", "");
      const resultResponse = await axios.post(`https://${host}/en/result/getResult`, resultPostData, {
        headers: {
          ...this.headers,
          cookie: this.cookie
        }
      });
      console.log("Result submitted successfully:", resultResponse.data);
      console.log("Waiting for task manager result...");
      const taskManagerPostData = new URLSearchParams();
      taskManagerPostData.append("qid", qid);
      taskManagerPostData.append("img[img_1]", uploadedImageUrl);
      taskManagerPostData.append("img[img_2]", "");
      taskManagerPostData.append("img[content]", "");
      let taskManagerResult;
      while (true) {
        const taskResponse = await axios.post(`https://${host}/en/task-manager/result`, taskManagerPostData, {
          headers: {
            ...this.headers,
            cookie: this.cookie
          }
        });
        if (!taskResponse.data.data.resultImg.includes("results_default")) {
          taskManagerResult = taskResponse.data;
          console.log("Task manager result has been updated.");
          break;
        }
        console.log("Task manager result is still pending, retrying in 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
      return taskManagerResult;
    } catch (error) {
      console.error("An error occurred during the process:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const buzzFun = new BuzzFun();
  try {
    const data = await buzzFun.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}