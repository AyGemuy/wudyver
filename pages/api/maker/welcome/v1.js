import apiConfig from "@/configs/apiConfig";
import Html from "@/data/html/welcome/list";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImageBuffer(url) {
    console.log(`[HtmlToImg] Fetching image buffer from URL: ${url}`);
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      console.log(`[HtmlToImg] Image buffer fetched successfully.`);
      return response.data;
    } catch (error) {
      console.error("[HtmlToImg] Error fetching image buffer:", error.message);
      throw error;
    }
  }
  async generate({
    group_avatar = `https://${apiConfig.DOMAIN_URL}/assets/images/all-img/image-3.png`,
    group_name = "Grup Nexus",
    status_dot = "On",
    avatar = `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
    status = "ACTIVE",
    userid = "UID-786B-44F9-22C1",
    usertype = "netizen",
    title = "Welcome",
    username = "AnonX-42",
    message = "Welcome to this server, go read the rules please!",
    foot_up = "Terhubung ke Jaringan Global",
    foot_end = "Hak Cipta © 2077, Cyberdyne Systems",
    model: template = 1,
    type = "v5"
  }) {
    const templateSizes = {
      1: {
        width: 800,
        height: 400
      },
      2: {
        width: 800,
        height: 400
      },
      3: {
        width: 800,
        height: 400
      },
      4: {
        width: 800,
        height: 400
      },
      5: {
        width: 800,
        height: 400
      },
      6: {
        width: 800,
        height: 400
      },
      7: {
        width: 800,
        height: 400
      },
      8: {
        width: 800,
        height: 400
      },
      9: {
        width: 800,
        height: 400
      },
      10: {
        width: 800,
        height: 400
      }
    };
    const {
      width,
      height
    } = templateSizes[template] || templateSizes[1];
    const data = {
      width: width,
      height: height,
      html: Html({
        template: template,
        group_avatar: group_avatar,
        group_name: group_name,
        status_dot: status_dot,
        avatar: avatar,
        status: status,
        userid: userid,
        usertype: usertype,
        title: title,
        username: username,
        message: message,
        foot_up: foot_up,
        foot_end: foot_end
      })
    };
    console.log(`[HtmlToImg] Sending POST request to: ${this.url}${type}`, data);
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      console.log("[HtmlToImg] POST request successful. Response data:", response.data);
      return response.data?.url;
    } catch (error) {
      console.error("[HtmlToImg] Error during API call:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } else {
      res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("[handler] Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}