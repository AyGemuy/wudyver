import fetch from "node-fetch";
import * as cheerio from "cheerio";
import mime from "mime-types";
class DafontHandler {
  async search(query) {
    try {
      console.log("[search] Searching for:", query);
      const response = await fetch(`https://www.dafont.com/search.php?q=${query}`);
      const html = await response.text();
      const results = [];
      const regex = /<div class="lv1left dfbg">.*?<span class="highlight">(.*?)<\/span>.*?by <a href="(.*?)">(.*?)<\/a>.*?<\/div>.*?<div class="lv1right dfbg">.*?<a href="(.*?)">(.*?)<\/a>.*?>(.*?)<\/a>.*?<\/div>.*?<div class="lv2right">.*?<span class="light">(.*?)<\/span>.*?<\/div>.*?<div style="background-image:url\((.*?)\)" class="preview">.*?<a href="(.*?)">/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        const [, title, authorLink, author, themeLink, theme, , totalDownloads, previewImage, link] = match;
        results.push({
          title: title?.trim(),
          authorLink: `https://www.dafont.com/${authorLink?.trim()}`,
          author: author?.trim(),
          themeLink: `https://www.dafont.com/${themeLink?.trim()}`,
          theme: theme?.trim(),
          totalDownloads: totalDownloads?.trim().replace(/[^0-9]/g, ""),
          previewImage: `https://www.dafont.com${previewImage?.trim()}`,
          link: `https://www.dafont.com/${link?.trim()}`
        });
      }
      return results;
    } catch (error) {
      console.error("[search] Error:", error);
      throw error;
    }
  }
  async download(link) {
    try {
      console.log("[download] Downloading from:", link);
      const response = await fetch(link);
      const html = await response.text();
      const $ = cheerio.load(html);
      const getValue = selector => $(selector).text().trim();
      return {
        title: getValue(".lv1left.dfbg strong"),
        author: getValue(".lv1left.dfbg a"),
        theme: getValue(".lv1right.dfbg a:last-child"),
        totalDownloads: getValue(".lv2right .light").replace(/\D/g, ""),
        filename: $(".filename").toArray().map(el => $(el).text().trim()),
        image: "https://www.dafont.com" + $(".preview").css("background-image").replace(/^url\(["']?|['"]?\)$/g, ""),
        note: $('[style^="border-left"]').text().trim(),
        download: $("a.dl").attr("href") ? "http:" + $("a.dl").attr("href") : ""
      };
    } catch (error) {
      console.error("[download] Error:", error);
      throw error;
    }
  }
  async detail(url) {
    try {
      console.log("[detail] Getting file info from:", url);
      const res = await fetch(url);
      const contentType = res.headers.get("content-type");
      const mimeType = mime.contentType(contentType);
      const extension = mime.extension(contentType);
      return {
        url: url,
        mimeType: mimeType || null,
        fileFormat: "." + (extension || "")
      };
    } catch (error) {
      console.error("[detail] Error:", error);
      throw error;
    }
  }
  format(num) {
    try {
      console.log("[format] Formatting number:", num);
      const numString = Math.abs(num).toString();
      const numDigits = numString.length;
      if (numDigits <= 3) return numString;
      const suffixIndex = Math.floor((numDigits - 1) / 3);
      let formattedNum = (num / Math.pow(1e3, suffixIndex)).toFixed(1);
      if (formattedNum.endsWith(".0")) {
        formattedNum = formattedNum.slice(0, -2);
      }
      return formattedNum + ["", "k", "M", "B", "T"][suffixIndex];
    } catch (error) {
      console.error("[format] Error:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query
  } = req.method === "GET" ? req.query : req.body;
  const dafont = new DafontHandler();
  console.log("[handler] Action:", action, "| Query:", query);
  try {
    switch (action) {
      case "search":
        return res.status(200).json(await dafont.search(query));
      case "download":
        return res.status(200).json(await dafont.download(query));
      case "detail":
        return res.status(200).json(await dafont.detail(query));
      case "format":
        return res.status(200).json({
          formatted: dafont.format(query)
        });
      default:
        console.warn("[handler] Invalid action:", action);
        return res.status(400).json({
          message: "Invalid action"
        });
    }
  } catch (error) {
    console.error("[handler] Internal error:", error);
    return res.status(500).json({
      message: error.message
    });
  }
}