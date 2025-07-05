import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
const isValidUrl = url => {
  return /https?:\/\/(www\.)?instagram\.com\//i.test(url);
};
const rejectFSPR = message => {
  return {
    status: false,
    message: message
  };
};
const resolveFSPR = data => {
  return {
    status: true,
    data: data
  };
};
const instagramDl = async url => {
  try {
    if (!isValidUrl(url)) {
      return rejectFSPR(`Invalid URL: ${url}`);
    }
    const apiUrl = "https://v3.saveig.app/api/ajaxSearch";
    const params = {
      q: url,
      t: "media",
      lang: "en"
    };
    const headers = {
      Accept: "*/*",
      Origin: "https://saveig.app",
      Referer: "https://saveig.app/en",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
      "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Microsoft Edge";v="115", "Chromium";v="115"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.183",
      "X-Requested-With": "XMLHttpRequest"
    };
    const response = await axios.post(apiUrl, qs.stringify(params), {
      headers: headers
    });
    const responseData = response.data.data;
    const $ = cheerio.load(responseData);
    const downloadItems = $(".download-items");
    const result = [];
    downloadItems.each((index, element) => {
      const thumbnailLink = $(element).find(".download-items__thumb > img").attr("src");
      const downloadLink = $(element).find(".download-items__btn > a").attr("href");
      result.push({
        thumbnail_link: thumbnailLink,
        download_link: downloadLink
      });
    });
    return resolveFSPR(result);
  } catch (error) {
    return rejectFSPR(error.message);
  }
};
const instagramDl2 = async url => {
  try {
    if (!isValidUrl(url)) {
      return rejectFSPR(`Invalid URL: ${url}`);
    }
    const {
      data
    } = await axios.get(`https://fongsi-scraper-rest-api.vercel.app/ig?url=${url}`);
    if (!data.status) {
      return rejectFSPR(data.message);
    }
    return resolveFSPR(data.data);
  } catch (error) {
    return rejectFSPR(error.message);
  }
};
const instagramDownloader = async url => {
  const methods = [async () => {
    try {
      const data = await instagramDl(url);
      if (data.status) return data;
      return null;
    } catch (error) {
      console.log("Error using method 1");
      return null;
    }
  }, async () => {
    try {
      const data = await instagramDl2(url);
      if (data.status) return data;
      return null;
    } catch (error) {
      console.log("Error using method 2");
      return null;
    }
  }];
  for (const method of methods) {
    const info = await method();
    if (info) return info;
  }
  return rejectFSPR("All methods failed");
};
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      message: "No url provided"
    });
  }
  const result = await instagramDownloader(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}