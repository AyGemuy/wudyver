import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
const youtube = {
  getData: async url => {
    const config = {
      method: "GET",
      url: `https://qdownloader.cc/button/?url=${encodeURIComponent(url)}`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8",
        "Accept-Language": "id-ID",
        "Upgrade-Insecure-Requests": "1",
        Referer: "https://qdownloader.cc/en24/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "same-origin",
        "Sec-Fetch-Site": "same-origin",
        Priority: "u=4",
        Cookie: "PHPSESSID=r1a0kjve8mq8tr4v9ik04cft8i; _ga_PQPFKL0J3L=GS1.1.1732027732.1.0.1732027732.0.0.0; _ga=GA1.1.1621456882.1732027733"
      }
    };
    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.error("Error fetching YouTube conversion:", error);
      throw error;
    }
  },
  audioJob: async url => {
    const html = await youtube.getData(url);
    const $ = cheerio.load(html);
    const tokenId = $("button#dlbutton").data("token_id");
    const tokenValidTo = $("button#dlbutton").data("token_validto");
    const convert = "gogogo";
    const title = $("button#dlbutton div").text().trim();
    let data = qs.stringify({
      url: url,
      convert: convert,
      token_id: tokenId,
      token_validto: tokenValidTo
    });
    let postConfig = {
      method: "POST",
      url: "https://qdownloader.cc/convert/",
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "id-ID",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: `https://qdownloader.cc/button/?url=${encodeURIComponent(url)}`,
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://qdownloader.cc",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Priority: "u=0",
        Cookie: "PHPSESSID=r1a0kjve8mq8tr4v9ik04cft8i; _ga_PQPFKL0J3L=GS1.1.1732027732.1.0.1732027732.0.0.0; _ga=GA1.1.1621456882.1732027733"
      },
      data: data
    };
    try {
      const postResponse = await axios.request(postConfig);
      const jobid = postResponse.data.jobid;
      return {
        success: true,
        title: title,
        audio: await youtube.getAudio(jobid)
      };
    } catch (error) {
      console.error("Error during conversion:", error);
      throw error;
    }
  },
  getAudio: async jobid => {
    const time = Date.now();
    const config = {
      method: "GET",
      url: `https://qdownloader.cc/convert/?jobid=${jobid}&time=${time}`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "id-ID",
        Referer: `https://qdownloader.cc/button/?url=https://www.youtube.com/watch?v=P-P7NVn4vbQ`,
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Cookie: "PHPSESSID=r1a0kjve8mq8tr4v9ik04cft8i; _ga_PQPFKL0J3L=GS1.1.1732027732.1.0.1732027732.0.0.0; _ga=GA1.1.1621456882.1732027733"
      }
    };
    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.error("Error checking conversion status:", error);
      throw error;
    }
  },
  download: async url => {
    try {
      const data = await youtube.audioJob(url);
      return data;
    } catch (error) {
      return error;
    }
  }
};
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Video URL is required"
    });
  }
  try {
    const data = await youtube.download(url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}