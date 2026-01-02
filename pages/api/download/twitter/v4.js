import axios from "axios";
import ws from "ws";
import * as cheerio from "cheerio";
class X2Twitter {
  constructor() {
    this.base_url = "https://x2twitter.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "en-EN,en;q=0.9,en-US;q=0.8,en;q=0.7,ms;q=0.6",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
      Referer: "https://x2twitter.com/en",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
  }
  async download({
    url
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!/x.com\/.*?\/status/gi.test(url)) {
          throw new Error(`Url is invalid!`);
        }
        const t = await axios.post(`${this.base_url}/api/userverify`, {
          url: url
        }, {
          headers: {
            ...this.headers,
            origin: this.base_url
          }
        }).then(v => v.data?.token || "").catch(e => {
          throw new Error(`Failed to get JWT ${e}`);
        });
        let r = await axios.post(`${this.base_url}/api/ajaxSearch`, new URLSearchParams({
          q: url,
          lang: "id",
          cftoken: t || ""
        }).toString(), {
          headers: {
            ...this.headers,
            origin: this.base_url
          }
        }).then(v => v.data).catch(e => {
          throw new Error(`Failed to get x data ${e}`);
        });
        if (r.status !== "ok") throw new Error(`Failed to get x data: ${r}`);
        const htmlData = r.data;
        const $ = cheerio.load(htmlData);
        let type = $("div").eq(0).attr("class");
        type = type.includes("tw-video") ? "video" : type.includes("video-data") && $(".photo-list").length ? "image" : "hybrid";
        let d = {
          type: type
        };
        if (type == "video") {
          d = {
            ...d,
            title: $(".content").find("h3").text().trim(),
            duration: $(".content").find("p").text().trim(),
            thumbnail: $(".thumbnail").find("img").attr("src"),
            download: await Promise.all($(".dl-action").find("p").map(async (i, el) => {
              let name = $(el).text().trim().split(" ");
              name = name.slice(name.length - 2).join(" ");
              const mediaType = name.includes("MP4") ? "mp4" : name.includes("MP3") ? "mp3" : "image";
              const item = {
                name: mediaType === "mp3" ? "MP3" : mediaType === "image" ? "IMG" : name,
                type: mediaType,
                reso: mediaType == "mp4" ? name.split(" ").pop().replace(/\(\)/, "") : null
              };
              if (mediaType === "mp3") {
                item.url = await this._convertToMp3(htmlData, el);
              } else {
                item.url = $(el).find("a").attr("href");
              }
              return item;
            }).get())
          };
        } else if (type == "image") {
          d = {
            ...d,
            title: null,
            duration: null,
            thumbnail: null,
            download: $("ul.download-box").find("li").map((i, el) => ({
              name: "Image " + (i + 1),
              thumbnail: $(el).find("img").attr("src"),
              type: type,
              url: $(el).find("a").attr("href")
            })).get()
          };
        }
        resolve(d);
      } catch (e) {
        reject(`Error in X2Twitter: ${e.message || e}`);
      }
    });
  }
  async _convertToMp3(rawHtml, el) {
    const $ = cheerio.load(rawHtml);
    return new Promise(async (res, rej) => {
      try {
        const convUrl = /k_url_convert ?= ?"(.*?)";/.exec(rawHtml)[1];
        const a = await axios.post(convUrl, new URLSearchParams({
          ftype: "mp3",
          v_id: $(el).attr("data-mediaid"),
          audioUrl: $(el).find("a").attr("data-audiourl"),
          audioType: "video/mp4",
          fquality: "128",
          fname: "X2Twitter.com",
          exp: /k_exp ?= ?"(.*?)";/.exec(rawHtml)[1],
          token: /k_token ?= ?"(.*?)";/.exec(rawHtml)[1]
        }).toString(), {
          headers: this.headers
        }).then(v => v.data);
        if (a.statusCode === 200) return res(a.result);
        if (a.statusCode === 300) {
          const s = new ws(`${new URL(convUrl).origin.replace("https", "wss")}/sub/${a.jobId}?fname=X2Twitter.com`);
          s.on("message", data => {
            const d = JSON.parse(data.toString("utf8"));
            if (d.action === "success" && d.url) res(d.url);
          });
        }
      } catch (e) {
        rej(e);
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new X2Twitter();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}