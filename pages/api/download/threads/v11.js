import axios from "axios";
class Downloader {
  constructor(timeout = 3e4) {
    this.baseUrl = "https://www.dolphinradar.com/api/threads";
    this.client = axios.create({
      timeout: timeout
    });
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "biz-func-name": "threads",
      "cache-control": "no-cache",
      "is-free": "true",
      pragma: "no-cache",
      referer: "https://www.dolphinradar.com/threads-downloader",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      tenantid: "6",
      "time-zone": "Asia/Makassar",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _parseUrl(threadsUrl) {
    try {
      const urlObject = new URL(threadsUrl);
      const pathSegments = urlObject.pathname.split("/").filter(Boolean);
      if (pathSegments.length >= 3 && pathSegments[1] === "post") {
        const username = pathSegments[0].startsWith("@") ? pathSegments[0].substring(1) : pathSegments[0];
        const postCode = pathSegments[2];
        return {
          postCode: postCode,
          username: username
        };
      }
      return {
        postCode: null,
        username: null
      };
    } catch (error) {
      console.error("URL tidak valid:", threadsUrl);
      return {
        postCode: null,
        username: null
      };
    }
  }
  async getPostDetail(postCode) {
    if (!postCode) {
      console.error("💥 postCode tidak boleh kosong.");
      return null;
    }
    const url = `${this.baseUrl}/post_detail/${postCode}`;
    console.log(`🔍 Mengambil detail postingan dari: ${url}`);
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error(`💥 Gagal mengambil detail postingan untuk [${postCode}]:`, error.message);
      return null;
    }
  }
  async getUserPosts(username, existCode) {
    if (!username || !existCode) {
      console.error("💥 username dan existCode tidak boleh kosong.");
      return null;
    }
    const url = `${this.baseUrl}/${username}/user_post?existCode=${existCode}`;
    console.log(`🔍 Mengambil daftar postingan untuk pengguna [${username}]`);
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error(`💥 Gagal mengambil postingan pengguna untuk [${username}]:`, error.message);
      return null;
    }
  }
  async download({
    url: threadsUrl
  }) {
    const {
      postCode,
      username
    } = this._parseUrl(threadsUrl);
    if (!postCode || !username) {
      console.error("💥 Gagal mem-parsing URL. Pastikan format URL benar.");
      return {
        success: false,
        error: "Invalid URL format."
      };
    }
    const tasks = [{
      name: "postDetail",
      func: () => this.getPostDetail(postCode)
    }, {
      name: "userPosts",
      func: () => this.getUserPosts(username, postCode)
    }];
    let finalResult = {
      success: false
    };
    for (const task of tasks) {
      const result = await task.func();
      if (!result || result.code !== 0) {
        console.error(` Gagal pada tugas '${task.name}'. Menghentikan proses.`);
        if (task.name === "postDetail") {
          return {
            success: false,
            error: `Failed to fetch main post detail for task: ${task.name}`
          };
        }
        continue;
      }
      if (task.name === "postDetail") {
        finalResult = {
          ...finalResult,
          success: true,
          ...result.data
        };
      } else if (task.name === "userPosts") {
        finalResult = {
          ...finalResult,
          related_posts: result.data
        };
      }
    }
    if (!finalResult.related_posts) {
      finalResult.related_posts = [];
    }
    return finalResult;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}