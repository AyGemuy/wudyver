import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import crypto from "crypto";
import https from "https";
const httpsAgent = new https.Agent({
  keepAlive: true
});
const withSomeProcessing = funcResult => {
  const secretKey = "hUuPd20171206LuOnD";
  return crypto.createHash("md5").update(funcResult + secretKey).digest("hex");
};
const createIterator = obj => {
  const keys = Object.keys(obj).sort();
  let index = 0;
  return {
    s: () => {
      index = 0;
    },
    n: () => index < keys.length ? {
      value: keys[index++],
      done: false
    } : {
      done: true
    },
    e: error => {
      console.error("Error in iteration:", error);
    },
    f: () => {}
  };
};
const getObjectType = obj => typeof obj;
class AxiosClient {
  constructor() {
    this.instance = axios.create({
      httpsAgent: httpsAgent
    });
    this.chunkSize = 524288;
    this.pollingInterval = 3e3;
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://www.workintool.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.workintool.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getUTCTime() {
    try {
      const response = await this.instance.get("https://api.tool-rocket.com/api/v4/getutctime", {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mengambil UTCTime:", error);
      throw error;
    }
  }
  _generateDataSign(params) {
    let queryString = "";
    const keyIterator = createIterator(params);
    let iteratorResult;
    try {
      keyIterator.s();
      while (!(iteratorResult = keyIterator.n()).done) {
        const key = iteratorResult.value;
        let value = params[key];
        if (typeof value === "string") {
          value = value.trim();
        }
        if (getObjectType(value) === "object") {
          value = "";
        }
        if (value !== "" && value != null) {
          queryString = queryString === "" ? `${key}=${value}` : `${queryString}&${key}=${value}`;
        }
      }
    } catch (error) {
      keyIterator.e(error);
    } finally {
      keyIterator.f();
    }
    return withSomeProcessing(queryString);
  }
  async uploadImage(imageData, utcTime) {
    try {
      const buffer = imageData.buffer;
      const totalSize = buffer.length;
      const chunkCount = Math.ceil(totalSize / this.chunkSize);
      const filemd5 = crypto.createHash("md5").update(buffer).digest("hex");
      let uploadResponseData = null;
      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, totalSize);
        const chunk = buffer.slice(start, end);
        const chunkMd5 = crypto.createHash("md5").update(chunk).digest("hex");
        const form = new FormData();
        form.append("file", new Blob([chunk], {
          type: imageData.contentType
        }), imageData.filename);
        form.append("filemd5", filemd5);
        form.append("chunksize", this.chunkSize.toString());
        form.append("chunkcount", chunkCount.toString());
        form.append("chunkindex", chunkIndex.toString());
        form.append("deviceid", `3d4f45261a4843c2a8e45e5b43f0b543`);
        form.append("timestamp", utcTime.utctime);
        form.append("productinfo", `6E7383DFC29B0D7749BDAD6DA27CC6E262285EDF8D010A0BF3FC5E3F707B9255`);
        const dataSignParams = {
          chunkcount: chunkCount.toString(),
          chunkindex: chunkIndex.toString(),
          chunksize: this.chunkSize.toString(),
          deviceid: "3d4f45261a4843c2a8e45e5b43f0b543",
          filemd5: filemd5,
          productinfo: "6E7383DFC29B0D7749BDAD6DA27CC6E262285EDF8D010A0BF3FC5E3F707B9255",
          timestamp: utcTime.utctime.toString()
        };
        form.append("datasign", this._generateDataSign(dataSignParams));
        const uploadHeaders = {
          ...this.headers,
          "content-type": `multipart/form-data; boundary=${form._boundary}`
        };
        const response = await this.instance.post("https://iconvert-api.xunjietupian.com/api/v4/sub/chunk-upload/ae-image", form, {
          headers: uploadHeaders
        });
        console.log(`Unggah chunk ${chunkIndex + 1}/${chunkCount} selesai:`, response.data);
        if (chunkCount > 1 && response.data && response.data.code !== 1e4) {
          throw new Error(`Gagal mengunggah chunk ${chunkIndex + 1}: ${response.data.message || "Terjadi kesalahan"}`);
        }
        if (chunkCount === 1) {
          uploadResponseData = response.data;
        }
      }
      return uploadResponseData;
    } catch (error) {
      console.error("Gagal mengunggah gambar:", error);
      throw error;
    }
  }
  async getData(imageUrl) {
    try {
      const {
        data: buffer,
        headers
      } = await this.instance.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/jpeg";
      const ext = contentType.includes("jpeg") ? ".jpeg" : contentType.includes("png") ? ".png" : ".jpg";
      const filename = `upload${ext}`;
      return {
        buffer: buffer,
        contentType: contentType,
        filename: filename
      };
    } catch (err) {
      console.error("Gagal mengambil gambar:", err.message);
      throw new Error("Gagal ambil gambar: " + err.message);
    }
  }
  async sendReceiveCmd(imageUrl) {
    try {
      const data = {
        appkey: "3ba62880c5bc44831b313a63e1dbbc28",
        cmd: "make",
        param: {
          callback: "",
          guid: "cartoonanime_segment",
          extra: {
            server_group: "3060ti"
          },
          pics: [imageUrl]
        }
      };
      const response = await this.instance.post("https://aesystem.pptbest.com/api/v1/task/receivecmd", data, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mengirim perintah receivecmd:", error);
      throw error;
    }
  }
  async pollTaskStatus(taskId) {
    try {
      const data = {
        appkey: "3ba62880c5bc44831b313a63e1dbbc28",
        cmd: "quest",
        param: {
          taskId: taskId
        }
      };
      const response = await this.instance.post("https://aesystem.pptbest.com/api/v1/task/receivecmd", data, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Gagal melakukan polling untuk taskId ${taskId}:`, error);
      throw error;
    }
  }
  async generate({
    imageUrl
  }) {
    try {
      const imageData = await this.getData(imageUrl);
      const utcTimeResponse = await this.getUTCTime();
      if (utcTimeResponse && utcTimeResponse.code === 1e4) {
        const uploadResponse = await this.uploadImage(imageData, utcTimeResponse);
        if (uploadResponse && uploadResponse.code === 1e4 && uploadResponse.url) {
          console.log("Respon Unggah Gambar:", uploadResponse);
          const receiveCmdResponse = await this.sendReceiveCmd(uploadResponse.url);
          console.log("Respon receivecmd:", receiveCmdResponse);
          if (receiveCmdResponse && receiveCmdResponse.data && receiveCmdResponse.data.taskId) {
            const taskId = receiveCmdResponse.data.taskId;
            console.log(`Mulai polling status tugas dengan taskId: ${taskId}`);
            while (true) {
              const pollResponse = await this.pollTaskStatus(taskId);
              console.log("Respon polling:", pollResponse);
              if (pollResponse && pollResponse.data && pollResponse.data.completetime !== undefined && pollResponse.data.completetime !== null && pollResponse.data.completetime !== "") {
                console.log("Proses selesai! Waktu Selesai:", pollResponse.data.completetime);
                return pollResponse.data;
              } else {
                console.log("Menunggu completetime...");
              }
              await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
            }
          } else {
            throw new Error("Gagal mendapatkan taskId dari respons receivecmd.");
          }
        } else {
          throw new Error("Gagal dalam proses unggah gambar atau respons tidak sesuai.");
        }
      } else {
        throw new Error("Gagal mendapatkan UTCTime untuk digunakan dalam upload.");
      }
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
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
  const apiClient = new AxiosClient();
  try {
    const data = await apiClient.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}