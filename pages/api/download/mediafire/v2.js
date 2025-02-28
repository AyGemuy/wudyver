import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function MediaFire(url, action = "info") {
  try {
    const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const data = await fetch(allOriginsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.178 Safari/537.36"
      }
    }).then(res => res.text());
    const $ = cheerio.load(data);
    const downloadUrl = ($("#downloadButton").attr("href") || "").trim();
    const alternativeUrl = ($("#download_link > a.retry").attr("href") || "").trim();
    const $intro = $("div.dl-info > div.intro");
    const filename = $intro.find("div.filename").text().trim();
    const filetype = $intro.find("div.filetype > span").eq(0).text().trim();
    const ext = /\(\.(.*?)\)/.exec($intro.find("div.filetype > span").eq(1).text())?.[1]?.trim() || "bin";
    const uploaded = $("div.dl-info > ul.details > li").eq(1).find("span").text().trim();
    const filesize = $("div.dl-info > ul.details > li").eq(0).find("span").text().trim();
    let response = {
      link: downloadUrl || alternativeUrl,
      alternativeUrl: alternativeUrl,
      name: filename,
      filetype: filetype,
      mime: ext,
      uploaded: uploaded,
      size: filesize
    };
    if (action === "get") {
      const downloadResponse = await fetch(downloadUrl || alternativeUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
        }
      });
      const buffer = Buffer.from(await downloadResponse.arrayBuffer());
      response.media = buffer;
    }
    return response;
  } catch (error) {
    console.error(error);
    throw new Error("Error fetching data from MediaFire");
  }
}
export default async function handler(req, res) {
  const {
    url,
    action = "info"
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  try {
    const result = await MediaFire(url, action);
    if (action === "info") {
      return res.status(200).json(result);
    }
    if (action === "get") {
      if (result.media) {
        res.setHeader("Content-Type", result.filetype);
        return res.status(200).send(result.media);
      } else {
        return res.status(404).json({
          message: "Media not found"
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}