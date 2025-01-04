import axios from "axios";
import * as cheerio from "cheerio";
import fakeUserAgent from "fake-useragent";
import {
  FormData
} from "formdata-node";
async function facebook(url) {
  try {
    const date = String(Date.now()).slice(0, 10);
    const {
      data
    } = await axios.post("https://yt5s.io/api/ajaxSearch/facebook", {
      q: url,
      vt: "facebook"
    }, {
      headers: {
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: "https://yt5s.io",
        Referer: "https://yt5s.io/en20/facebook-downloader",
        Cookie: `.AspNetCore.Culture=c%3Den%7Cuic%3Den; _ga=GA1.1.2011585369.${date}; _ga_P5PP4YVN0Y=GS1.1.${date}.4.1.${date}.0.0.0`,
        "User-Agent": fakeUserAgent(),
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    return data;
  } catch (e) {
    return await facebookdlv2(url);
  }
}
async function facebookdlv2(url) {
  try {
    const date = String(Date.now()).slice(0, 10);
    const {
      data
    } = await axios.post("https://getmyfb.com/process", {
      id: url,
      locale: "en"
    }, {
      headers: {
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: `PHPSESSID=k3eqo1f3rsq8fld57fgs9ck0q9; _token=1AHD0rRsiBSwwh7ypRad; __cflb=04dToeZfC9vebXjRcJCMjjSQh5PprejvCpooJf5xhb; _ga=GA1.2.193364307.1690654540; _gid=GA1.2.326360651.1690654544; _gat_UA-3524196-5=1; _ga_96G5RB4BBD=GS1.1.1690654539.1.0.1690654555.0.0.0`,
        Origin: "https://getmyfb.com",
        Referer: "https://getmyfb.com/",
        "Hx-Current-Url": "https://getmyfb.com",
        "Hx-Request": true,
        "Hx-Target": "target",
        "Hx-Trigger": "form",
        "User-Agent": fakeUserAgent()
      }
    });
    const $ = cheerio.load(data);
    const urls = [];
    $("ul > li").map((a, b) => {
      urls.push({
        quality: $(b).text().trim(),
        url: $(b).find("a").attr("href")
      });
    });
    const result = {
      description: $("div.results-item > div.results-item-text").text().trim(),
      urls: urls
    };
    if (urls.length === 0) return $("h4").text();
    return result;
  } catch (e) {
    throw e;
  }
}

function decryptSnapSave(data) {
  return data?.split('getElementById("download-section").innerHTML = "')[1]?.split('"; document.getElementById("inputData").remove(); ')[0]?.replace(/\\(\\)?/g, "");
}
async function snapsave(url) {
  try {
    const date = String(Date.now()).slice(0, 10);
    const form = new FormData();
    form.append("url", url);
    let {
      data
    } = await axios.post("https://snapsave.app/action.php?lang=en", form, {
      headers: {
        Origin: "https://snapsave.app",
        Referer: "https://snapsave.app/",
        Cookie: `_ga=GA1.1.2035716653.${date}; _ga_WNPZGVDWE9=GS1.1.${date}.2.1.${date}.49.0.0`,
        "User-Agent": fakeUserAgent()
      }
    });
    data = decryptSnapSave(data);
    const $ = cheerio.load(data);
    const results = [];
    $("table > tbody > tr").each((c, d) => {
      const render = $(d).find("a").attr("href");
      results.push({
        quality: $(d).find("td.video-quality").text().trim(),
        url: render
      });
    });
    return {
      description: $("div.media-content > div.content > p > span.video-des").text().trim(),
      urls: results.filter(a => a)
    };
  } catch (e) {
    return await facebook(url);
  }
}
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Only GET method is allowed"
    });
  }
  const {
    url
  } = req.body;
  if (!url) {
    return res.status(400).json({
      error: "The 'url' parameter is required."
    });
  }
  try {
    const result = await snapsave(url);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}