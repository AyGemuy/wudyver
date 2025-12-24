import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
class ImageDescriber {
  constructor() {
    this.axiosInstance = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: "https://imagedescriber.app",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://imagedescriber.app/chat-with-image",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  _md5(input) {
    return CryptoJS.MD5(input).toString();
  }
  _generateYY(e) {
    let {
      hasSearchParamsPath: t,
      bodyToYY: r,
      method: n,
      time: a,
      body: o
    } = e;
    let l = "{}";
    if (n.toLowerCase() === "post") {
      l = JSON.stringify(o || {});
    }
    if (r) {
      l = r;
    }
    let s = "".concat(encodeURIComponent(t), "_").concat(l).concat(this._md5(a.toString()), "ooui");
    return this._md5(s);
  }
  _generateDeviceId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  async describe({
    imageUrl,
    prompt = "describe this",
    history = [],
    lang = "en",
    deviceId = this._generateDeviceId(),
    C = null
  }) {
    try {
      const formData = new FormData();
      if (imageUrl) {
        const defaultMimeType = "image/jpeg";
        const fileName = "image.jpeg";
        const imageResponse = await this.axiosInstance.get(imageUrl, {
          responseType: "arraybuffer"
        });
        const imageBuffer = Buffer.from(imageResponse.data);
        const imageBlob = new Blob([imageBuffer], {
          type: defaultMimeType
        });
        formData.append("file", imageBlob, fileName);
      }
      formData.append("prompt", prompt);
      const formattedHistory = history.flatMap(entry => [{
        role: "user",
        parts: [{
          text: entry.ask
        }]
      }, {
        role: "model",
        parts: [{
          text: entry.answer
        }]
      }]);
      formData.set("history", JSON.stringify(formattedHistory));
      console.log("Formatted History:", formattedHistory);
      formData.set("lang", lang);
      formData.set("deviceId", deviceId);
      if (C) {
        formData.set("input_image_type", C.input_image_type || "");
        formData.set("input_image_url", C.input_image_url || "");
        if (imageUrl) {
          formData.delete("file");
        }
      }
      const unixTime = Date.parse(new Date().toString());
      const apiPath = "/api/freechat";
      const urlWithUnix = `${apiPath}?unix=${unixTime}`;
      const requestBodyForYY = {
        prompt: formData.get("prompt") || "",
        input_image_type: (C ? C.input_image_type : "") || "",
        input_image_url: (C ? C.input_image_url : "") || "",
        lang: lang,
        deviceId: deviceId
      };
      const yyHeader = this._generateYY({
        hasSearchParamsPath: urlWithUnix,
        bodyToYY: null,
        method: "post",
        time: unixTime,
        body: requestBodyForYY
      });
      console.log("Generated YY header:", yyHeader);
      const response = await this.axiosInstance.post(`https://imagedescriber.app${urlWithUnix}`, formData, {
        headers: {
          ...formData.headers,
          yy: yyHeader
        }
      });
      let rawData = response.data;
      let parsedResults = [];
      let startIndex = 0;
      while (startIndex < rawData.length) {
        const openBraceIndex = rawData.indexOf("{", startIndex);
        if (openBraceIndex === -1) break;
        let closeBraceIndex = -1;
        let braceCount = 0;
        for (let i = openBraceIndex; i < rawData.length; i++) {
          if (rawData[i] === "{") {
            braceCount++;
          } else if (rawData[i] === "}") {
            braceCount--;
          }
          if (braceCount === 0 && rawData[i] === "}") {
            closeBraceIndex = i;
            break;
          }
        }
        if (closeBraceIndex === -1) {
          console.warn("Could not find matching '}' for JSON object starting at index", openBraceIndex);
          break;
        }
        const jsonString = rawData.substring(openBraceIndex, closeBraceIndex + 1);
        try {
          parsedResults.push(JSON.parse(jsonString));
        } catch (parseError) {
          console.error("Failed to parse JSON segment:", jsonString, parseError);
        }
        startIndex = closeBraceIndex + 1;
      }
      let fullDescription = "";
      let inputInfo = {};
      parsedResults.forEach(item => {
        if (item.description) {
          fullDescription += item.description;
        }
        if (item.input_image_url && item.input_image_type) {
          inputInfo = {
            input_image_url: item.input_image_url,
            input_image_type: item.input_image_type
          };
        }
      });
      return {
        ...inputInfo,
        description: fullDescription.trim(),
        rawParsedObjects: parsedResults
      };
    } catch (error) {
      console.error("Error describing image:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const describer = new ImageDescriber();
    const response = await describer.describe(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}