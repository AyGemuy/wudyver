import fetch from "node-fetch";
import * as cheerio from "cheerio";
import mime from "mime-types";
async function searchDafont(q) {
  const response = await fetch(`https://www.dafont.com/search.php?q=${q}`);
  const html = await response.text();
  const results = [];
  const regex = /<div class="lv1left dfbg">.*?<span class="highlight">(.*?)<\/span>.*?by <a href="(.*?)">(.*?)<\/a>.*?<\/div>.*?<div class="lv1right dfbg">.*?<a href="(.*?)">(.*?)<\/a>.*?>(.*?)<\/a>.*?<\/div>.*?<div class="lv2right">.*?<span class="light">(.*?)<\/span>.*?<\/div>.*?<div style="background-image:url\((.*?)\)" class="preview">.*?<a href="(.*?)">/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const [, title, authorLink, author, themeLink, theme, , totalDownloads, previewImage, link] = match;
    const result = {
      title: title.trim() || "Tidak diketahui",
      authorLink: `https://www.dafont.com/${authorLink.trim()}` || "Tidak diketahui",
      author: author.trim() || "Tidak diketahui",
      themeLink: `https://www.dafont.com/${themeLink.trim()}` || "Tidak diketahui",
      theme: theme.trim() || "Tidak diketahui",
      totalDownloads: totalDownloads.trim().replace(/[^0-9]/g, "") || "Tidak diketahui",
      previewImage: `https://www.dafont.com${previewImage.trim()}` || "Tidak diketahui",
      link: `https://www.dafont.com/${link.trim()}` || "Tidak diketahui"
    };
    results.push(result);
  }
  return results;
}
async function downloadDafont(link) {
  const response = await fetch(link);
  const html = await response.text();
  const $ = cheerio.load(html);
  const getValue = selector => $(selector).text().trim();
  return {
    title: getValue(".lv1left.dfbg strong"),
    author: getValue(".lv1left.dfbg a"),
    theme: getValue(".lv1right.dfbg a:last-child"),
    totalDownloads: getValue(".lv2right .light").replace(/\D/g, ""),
    filename: $(".filename").toArray().map(element => $(element).text().trim()),
    image: "https://www.dafont.com" + $(".preview").css("background-image").replace(/^url\(["']?|['"]?\)$/g, ""),
    note: $('[style^="border-left"]').text().trim(),
    download: $("a.dl").attr("href") ? "http:" + $("a.dl").attr("href") : ""
  };
}
async function getFileDetails(url) {
  const contentType = (await fetch(url)).headers.get("content-type");
  const mimeType = mime.contentType(contentType);
  const extension = mime.extension(contentType);
  return {
    url: url,
    mimeType: mimeType || null,
    fileFormat: "." + (extension || "")
  };
}

function formatNumber(num) {
  const numString = Math.abs(num).toString();
  const numDigits = numString.length;
  if (numDigits <= 3) return numString;
  const suffixIndex = Math.floor((numDigits - 1) / 3);
  let formattedNum = (num / Math.pow(1e3, suffixIndex)).toFixed(1);
  if (formattedNum.endsWith(".0")) {
    formattedNum = formattedNum.slice(0, -2);
  }
  return formattedNum + ["", "k", "M", "B", "T"][suffixIndex];
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
    const {
      action,
      query
    } = req.method === "GET" ? req.query : req.body;
    try {
      if (action === "searchDafont") {
        const results = await searchDafont(query);
        return res.status(200).json(results);
      } else if (action === "downloadDafont") {
        const result = await downloadDafont(query);
        return res.status(200).json(result);
      } else if (action === "getFileDetails") {
        const details = await getFileDetails(query);
        return res.status(200).json(details);
      } else if (action === "formatNumber") {
        const formatted = formatNumber(query);
        return res.status(200).json({
          formatted: formatted
        });
      } else {
        return res.status(400).json({
          message: "Invalid action"
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: error.message
      });
    }
  } else {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }
}