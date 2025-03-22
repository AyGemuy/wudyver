import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class QuizTestUploader {
  constructor(imageUrl, id = 56321) {
    this.imageUrl = imageUrl;
    this.id = id;
    this.baseUrl = "https://www.quiztest.me";
    this.lang = "en";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: `${this.baseUrl}/${this.lang}/quizzes/details/id/${this.id}/type/image_lab_new.html?cat=AI+&month=202501&cpa=/test/`
    };
  }
  async fetchImage() {
    try {
      const response = await this.client.get(this.imageUrl, {
        responseType: "arraybuffer"
      });
      return encodeURIComponent(`data:image/jpeg;base64,${Buffer.from(response.data).toString("base64")}`);
    } catch (error) {
      console.log("[ERROR] Gagal mengambil gambar.");
      return null;
    }
  }
  async upload() {
    try {
      const pic = await this.fetchImage();
      if (!pic) return null;
      const data = `pic=${pic}&qid=${this.id}`;
      const response = await this.client.post(`${this.baseUrl}/${this.lang}/upload`, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.log("[ERROR] Gagal mengunggah gambar.");
      return null;
    }
  }
  async getResult(data) {
    try {
      const response = await this.client.post(`${this.baseUrl}/${this.lang}/result/getResult`, data, {
        headers: this.headers
      });
      if (response.data.data?.resultInfo?.state === 2) {
        data.imgQuiz = {
          order_id: response.data.data.resultInfo.order_id
        };
        return await this.taskManager(data, 0, response.data.data.resultUrl);
      }
      return response.data.data.resultUrl;
    } catch (error) {
      console.log("[ERROR] Gagal mendapatkan hasil.");
      return null;
    }
  }
  async taskManager(info, step, url) {
    try {
      if (step < 10) {
        const response = await this.client.post(`${this.baseUrl}/${this.lang}/task-manager/result`, info, {
          headers: this.headers
        });
        if (response.data.data?.resultInfo?.state === 2) {
          return await this.taskManager(info, step + 1, url);
        }
      }
      return url;
    } catch (error) {
      console.log("[ERROR] Gagal dalam task manager.");
      return null;
    }
  }
  async extractLinks(url) {
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const links = response.data.match(/https?:\/\/[^\s"']+/g) || [];
      return [...new Set(links.filter(link => link.includes("cloudfront.net/quiz/upload/user")))];
    } catch (error) {
      console.log("[ERROR] Gagal mengambil link.");
      return [];
    }
  }
  async process() {
    console.log("[START] Proses dimulai...");
    const uploadResult = await this.upload();
    if (uploadResult?.code === 200 && uploadResult.data) {
      console.log("[UPLOAD] Berhasil.");
      const resultUrl = await this.getResult({
        qid: this.id,
        "img[img_1]": uploadResult.data,
        "img[img_2]": "",
        "img[content]": ""
      });
      if (resultUrl) {
        console.log("[RESULT] Mengambil link...");
        const links = await this.extractLinks(resultUrl);
        console.log("[DONE] Hasil:", links);
        return links;
      }
    }
    console.log("[UPLOAD] Gagal.");
    return [];
  }
}
export default async function handler(req, res) {
  const {
    url,
    id
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: 'Parameter "url" diperlukan'
  });
  const uploader = new QuizTestUploader(url, id);
  try {
    const result = await uploader.process();
    res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}