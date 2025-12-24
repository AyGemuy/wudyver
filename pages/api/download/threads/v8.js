import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const cookieJar = new CookieJar();
const client = wrapper(axios.create({
  jar: cookieJar,
  withCredentials: true
}));
class SnapVNDownloader {
  constructor() {
    this.baseUrl = "https://snapvn.com";
    this.maxRetries = 3;
    this.timeout = 3e4;
    this.ajaxHeaders = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID",
      "content-type": "application/x-www-form-urlencoded",
      origin: this.baseUrl,
      pragma: "no-cache",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async download({
    url,
    output = "info",
    quality = "HQ",
    retryCount = 0
  }) {
    try {
      const initialData = await this.getInitialTokens();
      if (!initialData) throw new Error("Gagal mendapatkan token yang diperlukan.");
      const infoPostData = new URLSearchParams();
      infoPostData.append("_token", initialData.formToken);
      infoPostData.append("platform", "threads");
      infoPostData.append("url", url);
      const infoResponse = await client.post(`${this.baseUrl}/fetch`, infoPostData.toString(), {
        headers: {
          ...this.ajaxHeaders,
          "x-xsrf-token": initialData.xsrfToken
        },
        timeout: this.timeout
      });
      if (!infoResponse.data.status || !infoResponse.data.data) {
        throw new Error(infoResponse.data.message || "API info mengembalikan error.");
      }
      const infoResult = this.parseResultHtml(infoResponse.data.data);
      if (output === "info") {
        return infoResult;
      }
      if (output === "download") {
        if (!infoResult.media || infoResult.media.length === 0) {
          throw new Error("Tidak ditemukan media untuk diunduh.");
        }
        const mediaItem = infoResult.media[0];
        const selectedOption = mediaItem.downloadOptions.find(opt => opt.quality === quality) || mediaItem.downloadOptions[0];
        if (!selectedOption) throw new Error(`Kualitas '${quality}' tidak ditemukan.`);
        const downloadPostData = new URLSearchParams();
        downloadPostData.append("_token", mediaItem.postDownloadInfo.token);
        downloadPostData.append("username", mediaItem.postDownloadInfo.username);
        downloadPostData.append("action_type", "download");
        downloadPostData.append("url", selectedOption.value);
        const downloadResponse = await client.post(mediaItem.postDownloadInfo.actionUrl, downloadPostData.toString(), {
          headers: {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "content-type": "application/x-www-form-urlencoded",
            origin: this.baseUrl,
            referer: `${this.baseUrl}/`
          },
          responseType: "arraybuffer"
        });
        return {
          success: true,
          buffer: downloadResponse.data,
          filename: `${infoResult.user.username}-${Date.now()}.mp4`
        };
      }
      throw new Error(`Paramenter output tidak valid: '${output}'. Gunakan 'info' atau 'download'.`);
    } catch (error) {
      console.error(`Error in SnapVNDownloader: ${error.message}`);
      throw error;
    }
  }
  async getInitialTokens() {
    try {
      const response = await client.get(this.baseUrl, {
        headers: this.ajaxHeaders
      });
      const $ = cheerio.load(response.data);
      const formToken = $('form input[name="_token"]').val();
      const cookies = await cookieJar.getCookies(this.baseUrl);
      const xsrfCookie = cookies.find(c => c.key === "XSRF-TOKEN");
      const xsrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : null;
      return formToken && xsrfToken ? {
        formToken: formToken,
        xsrfToken: xsrfToken
      } : null;
    } catch (error) {
      console.error("Gagal saat mengambil token awal:", error.message);
      return null;
    }
  }
  parseResultHtml(html) {
    const $ = cheerio.load(html);
    const userContainer = $(".d-flex.align-items-center");
    const profilePicUrlRaw = userContainer.find(".avatar").css("background-image");
    const profilePic = profilePicUrlRaw ? profilePicUrlRaw.match(/url\((.*?)\)/)[1].replace(/['"]/g, "") : null;
    const username = userContainer.find("strong").text().trim();
    const likes = parseInt(userContainer.find("small").text().trim().toLowerCase().replace("like:", ""), 10) || 0;
    const caption = $(".markdown.text-dark").text().trim();
    const media = [];
    $(".card.card-sm").each((i, el) => {
      const item = $(el);
      const thumbnail = item.find(".card-img-top").attr("data-src");
      const downloadOptions = [];
      item.find("select.select-media-quality option").each((j, opt) => {
        downloadOptions.push({
          quality: $(opt).text().trim(),
          value: $(opt).attr("value")
        });
      });
      const form = item.find("form");
      if (downloadOptions.length > 0) {
        media.push({
          thumbnail: thumbnail,
          downloadOptions: downloadOptions,
          postDownloadInfo: {
            actionUrl: form.attr("action"),
            token: form.find('input[name="_token"]').val(),
            username: form.find('input[name="username"]').val()
          }
        });
      }
    });
    return {
      success: true,
      user: {
        username: username,
        profilePic: profilePic,
        likes: likes
      },
      caption: caption,
      media: media
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    url,
    output = "info",
    quality = "HQ"
  } = params;
  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Paramenter 'url' diperlukan."
    });
  }
  const downloader = new SnapVNDownloader();
  try {
    const data = await downloader.download({
      url: url,
      output: output,
      quality: quality
    });
    if (!data.success) {
      return res.status(500).json(data);
    }
    if (output === "info") {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json(data);
    } else if (output === "download") {
      if (data.buffer) {
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.setHeader("Content-Length", data.buffer.length);
        return res.status(200).send(data.buffer);
      } else {
        throw new Error("Proses unduhan tidak menghasilkan buffer.");
      }
    }
  } catch (error) {
    console.error("API Handler Error:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan internal pada server.",
      errorDetails: error.message
    });
  }
}