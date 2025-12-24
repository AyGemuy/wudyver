import axios from "axios";
import * as cheerio from "cheerio";
class YTUtil {
  constructor() {
    this.cookie = "";
    this.redirectId = "";
    this.axios = axios.create();
    this.axios.interceptors.response.use(res => {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        const newCookies = setCookie.map(c => c.split(";")[0]).join("; ");
        if (!this.cookie.includes(newCookies)) {
          this.cookie = [this.cookie, newCookies].filter(Boolean).join("; ");
        }
      }
      return res;
    });
  }
  async fetchInfo({
    url: youtubeUrl,
    format = "mp4",
    quality = "240p"
  }) {
    try {
      const homepage = "https://s.gets-top.com/";
      const getHeaders = {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID,id;q=0.9",
        accept: "*/*"
      };
      const getRes = await this.axios.get(homepage, {
        headers: getHeaders,
        maxRedirects: 0,
        validateStatus: status => status === 302
      });
      const redirectLocation = getRes.headers.location;
      if (!redirectLocation) throw new Error("No redirect location");
      this.redirectId = redirectLocation.split("/").pop();
      this.cookie = (getRes.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
      const postUrl = `https://s.gets-top.com/s/${this.redirectId}`;
      const postHeaders = {
        ...getHeaders,
        cookie: this.cookie,
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://s.gets-top.com",
        referer: `https://s.gets-top.com/${this.redirectId}`
      };
      const postData = `q=${encodeURIComponent(youtubeUrl)}`;
      const res = await this.axios.post(postUrl, postData, {
        headers: postHeaders
      });
      const $ = cheerio.load(res.data);
      const title = $("h3.item-title").text().trim();
      const thumbStyle = $(".search-item__image").attr("style") || "";
      const thumb = (thumbStyle.match(/url\(['"]?(.*?)['"]?\)/) || [])[1] || null;
      const formats = [];
      $("#dl_format option").each((_, el) => {
        formats.push({
          label: $(el).text().trim(),
          value: $(el).attr("value")
        });
      });
      let selectedFormat = format === "mp3" ? "mp3" : `${format}_${quality}`;
      let downloadPath = $(".item__download").attr("data-url");
      if (downloadPath && selectedFormat) downloadPath += `/${selectedFormat}`;
      const downloads = [];
      if (downloadPath) {
        const downloadUrl = `https://s.gets-top.com${downloadPath}`;
        const pollingInterval = 2e3;
        const maxAttempts = 15;
        let attempts = 0;
        let ready = false;
        while (attempts++ < maxAttempts && !ready) {
          console.log(`Polling ${attempts}/${maxAttempts}...`);
          const downloadRes = await this.axios.get(downloadUrl, {
            headers: postHeaders
          });
          const $poll = cheerio.load(downloadRes.data);
          const downloadEl = $poll("#dl_wrap .content__description .search-item__download.dl_progress_finished.btn_clck_spec");
          if (downloadEl.length > 0) {
            ready = true;
            downloadEl.each((_, el) => {
              const el$ = $poll(el);
              const url = el$.attr("data-href");
              const text = el$.text().trim().split("\n").map(t => t.trim()).filter(Boolean);
              const label = text.find(t => /^MP/i.test(t)) || null;
              const size = text.find(t => /\d+(\.\d+)?\s?(MB|KB)/i.test(t)) || null;
              if (url) {
                downloads.push({
                  url: url,
                  format: label,
                  size: size
                });
              }
            });
          } else {
            console.log(`Waiting for file to be ready...`);
            await new Promise(r => setTimeout(r, pollingInterval));
          }
        }
        if (!ready) {
          console.warn("Timeout: download not ready after polling.");
        }
      }
      return {
        title: title,
        thumb: thumb,
        id: this.redirectId,
        formats: formats,
        downloads: downloads
      };
    } catch (err) {
      console.error("fetchInfo error:", err.message);
      if (err.response) {
        console.error("Status:", err.response.status);
        console.error("Data:", err.response.data);
      }
      throw err;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: "No URL"
      });
    }
    const yt = new YTUtil();
    const result = await yt.fetchInfo(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}