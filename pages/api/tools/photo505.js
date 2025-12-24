import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData,
  Blob
} from "formdata-node";
class ImageUploader {
  constructor() {
    this.cookie = "";
    this.baseUrl = "https://photo505.com";
  }
  updateCookie(response) {
    const newCookies = response.headers["set-cookie"];
    if (newCookies) {
      this.cookie = newCookies.join("; ");
      console.log("Cookie diperbarui:", this.cookie);
    }
  }
  async style({
    type = ""
  }) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/en/${type}`);
      const $ = cheerio.load(data);
      return $(".photoPattern-pattern").map((_, el) => {
        const em = $(el);
        const link = em.find("a").attr("href") || "";
        const stars = em.find('img[src*="star"]').get().map(s => {
          const src = $(s).attr("src");
          return src.includes("star.gif") ? 1 : src.includes("half") ? .5 : 0;
        }).reduce((a, b) => a + b, 0);
        return {
          id: link.split("/").pop(),
          title: em.attr("title") || "",
          link: link,
          icon: new URL(em.find("img.icon").attr("src") || "", this.url).href,
          stars: stars
        };
      }).get();
    } catch (err) {
      console.error("Error fetching patterns:", err.message);
      return [];
    }
  }
  async create({
    imageUrl,
    id = "244"
  }) {
    try {
      let currentGetUrl = `${this.baseUrl}/en/photoPattern/${id}`;
      let responseGet = await axios.get(currentGetUrl, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          connection: "keep-alive",
          cookie: this.cookie,
          origin: `${this.baseUrl}`,
          pragma: "no-cache",
          referer: `${this.baseUrl}/en/photoPattern/${id}`,
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400 || status === 302 || status === 301
      });
      this.updateCookie(responseGet);
      while (responseGet.headers.location) {
        console.log("Redirect GET ditemukan:", responseGet.headers.location);
        currentGetUrl = responseGet.headers.location;
        responseGet = await axios.get(currentGetUrl, {
          headers: {
            ...responseGet.config.headers,
            cookie: this.cookie
          },
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400 || status === 302 || status === 301
        });
        this.updateCookie(responseGet);
      }
      const $ = cheerio.load(responseGet.data);
      const csrfToken = $('input[name="_csrf_token"]').val();
      const fileToken = $('input[name="file_token"]').val();
      const submitted = $('input[name="submitted"]').val();
      const postUrl = currentGetUrl;
      let currentPostUrl = postUrl;
      let responsePost;
      if (!csrfToken) {
        console.log("Gagal mendapatkan CSRF token.");
        return "";
      }
      console.log("CSRF Token:", csrfToken);
      console.log("File Token:", fileToken);
      console.log("Submitted:", submitted);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      let contentType = "image/jpeg";
      if (imageResponse?.headers?.["content-type"]) {
        contentType = imageResponse.headers["content-type"];
        console.log("Content Type Gambar:", contentType);
        console.log("Ukuran Buffer Gambar:", Buffer.from(imageResponse.data).length);
      } else {
        console.log("Gagal mendapatkan informasi header gambar, menggunakan default image/jpeg.");
      }
      const imageBuffer = Buffer.from(imageResponse.data);
      const formData = new FormData();
      formData.append("file", new Blob([imageBuffer], {
        type: contentType
      }), "image.jpg");
      formData.append("_csrf_token", csrfToken);
      formData.append("file_token", fileToken);
      formData.append("submitted", submitted);
      const headersPost = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": `multipart/form-data`,
        "content-length": Buffer.from(imageBuffer).length,
        cookie: this.cookie,
        origin: `${this.baseUrl}`,
        pragma: "no-cache",
        referer: postUrl,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      };
      while (true) {
        responsePost = await axios.post(currentPostUrl, formData, {
          headers: headersPost,
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400 || status === 302 || status === 301
        });
        this.updateCookie(responsePost);
        if (responsePost.headers.location) {
          console.log("Redirect POST ditemukan:", responsePost.headers.location);
          currentPostUrl = responsePost.headers.location;
        } else {
          break;
        }
      }
      console.log("Status POST:", responsePost.status);
      const $post = cheerio.load(responsePost.data);
      let imageUrlResult = $post(".card a").attr("href");
      if (imageUrlResult && imageUrlResult.startsWith("/")) {
        imageUrlResult = this.baseUrl + imageUrlResult;
      }
      const result = {
        result: imageUrlResult
      };
      return result;
    } catch (error) {
      console.log("Terjadi kesalahan:", error);
      return "";
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  try {
    const uploader = new ImageUploader();
    let response;
    switch (action) {
      case "create":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "imageUrl is required for action 'create'"
          });
        }
        response = await uploader.create(params);
        break;
      case "style":
        response = await uploader.style(params);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'style' or 'create'."
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}