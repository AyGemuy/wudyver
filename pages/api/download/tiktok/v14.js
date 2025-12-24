import axios from "axios";
import {
  parse as cookieParser
} from "set-cookie-parser";
import FakeUserAgent from "fake-useragent";
class TikTokScraper {
  constructor() {
    this.userAgent = FakeUserAgent();
  }
  async getAwemeId(input) {
    const awemeIdRegex = /^\d+$/;
    return awemeIdRegex.test(input) ? input : input.match(/https:\/\/(?:www\.)?tiktok\.com\/(?:@[\w\.]+\/)?video\/(\d+)/)?.[1] || await axios.get(input, {
      maxRedirects: 5,
      headers: {
        "User-Agent": this.userAgent
      }
    }).then(({
      request
    }) => request.res.responseUrl.split("/").pop().split("?")[0]).catch(() => {
      throw new Error("Invalid TikTok URL");
    });
  }
  async download(input) {
    try {
      const awemeId = await this.getAwemeId(input);
      const res = await axios.get(`https://www.tiktok.com/@i/video/${awemeId}`, {
        headers: {
          "User-Agent": this.userAgent
        }
      });
      const cookies = cookieParser(res.headers["set-cookie"] || []);
      const resJson = res.data.split('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">')[1]?.split("<\/script>")[0];
      const json = resJson ? JSON.parse(resJson) : null;
      const videoData = json?.["__DEFAULT_SCOPE__"]?.["webapp.video-detail"]?.["itemInfo"]?.["itemStruct"];
      const apiUrl = new URL("https://api22-normal-c-alisg.tiktokv.com/aweme/v1/feed/");
      apiUrl.search = new URLSearchParams({
        region: "US",
        carrier_region: "US",
        aweme_id: awemeId,
        iid: "7318518857994389254",
        device_id: "7318517321748022790",
        channel: "googleplay",
        app_name: "musical_ly",
        version_code: "300904",
        device_platform: "android",
        device_type: "ASUS_Z01QD",
        os_version: "9"
      }).toString();
      const apiRes = await axios.get(apiUrl.toString(), {
        headers: {
          "User-Agent": this.userAgent
        }
      });
      const apiData = apiRes.data;
      return {
        videoData: videoData,
        apiData: apiData
      };
    } catch (error) {
      console.error("Error:", error.message);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url: input
  } = req.method === "GET" ? req.query : req.body;
  if (!input) {
    return res.status(400).json({
      error: "Input url is required"
    });
  }
  try {
    const tiktokScraper = new TikTokScraper();
    const result = await tiktokScraper.download(input);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}