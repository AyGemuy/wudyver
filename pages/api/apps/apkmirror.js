import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchApkmirror(query) {
  const url = `https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const body = await response.text();
    const $ = cheerio.load(body);
    return $(".appRow").map((_, element) => ({
      image: "https://www.apkmirror.com" + $(element).find(".ellipsisText").attr("src"),
      link: "https://www.apkmirror.com" + $(element).find(".appRowTitle a").attr("href"),
      title: $(element).find(".appRowTitle a").text().trim(),
      developer: $(element).find(".byDeveloper").text().trim(),
      uploadDate: $(element).find(".dateyear_utc").text().trim(),
      version: $(element).next(".infoSlide").find(".infoSlide-value").eq(0).text().trim(),
      fileSize: $(element).next(".infoSlide").find(".infoSlide-value").eq(2).text().trim(),
      downloads: $(element).next(".infoSlide").find(".infoSlide-value").eq(3).text().trim()
    })).get().filter(obj => Object.values(obj).every(value => value !== ""));
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function getApkmirror(url) {
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const link = "https://www.apkmirror.com" + $(".downloadButton").attr("href");
    if (link.includes("#downloads")) {
      const link2 = $('meta[property="og:url"]').attr("content") + "#downloads";
      const responses2 = await fetch(randomProxyUrl + encodeURIComponent(link2));
      const htmls2 = await responses2.text();
      const $s = cheerio.load(htmls2);
      const result = [];
      $s(".table-row.headerFont").each((index, row) => {
        const rowData = {
          version: $s(row).find("a.accent_color").text().trim(),
          bundle: $s(row).find(".apkm-badge.success").eq(0).text().trim(),
          splits: $s(row).find(".apkm-badge.success").eq(1).text().trim(),
          apkUrl: "https://www.apkmirror.com" + $s(row).find("a.accent_color").attr("href"),
          downloadDate: $s(row).find(".dateyear_utc").data("utcdate")
        };
        if (Object.values(rowData).some(value => value !== undefined && value !== "")) {
          result.push(rowData);
        }
      });
      const response3 = await fetch(randomProxyUrl + encodeURIComponent(result[1]?.apkUrl));
      const html3 = await response3.text();
      const link3 = "https://www.apkmirror.com" + cheerio.load(html3)(".downloadButton").attr("href");
      const response2 = await fetch(randomProxyUrl + encodeURIComponent(link3));
      const html2 = await response2.text();
      const formElement2 = cheerio.load(html2)("#filedownload");
      const id2 = formElement2.find('input[name="id"]').attr("value");
      const linkdl = `https://www.apkmirror.com/wp-content/themes/APKMirror/download.php?id=${id2}&key=${formElement2.find('input[name="key"]').attr("value")}`;
      return {
        title: $('meta[property="og:title"]').attr("content"),
        gambar: $('meta[property="og:image"]').attr("content"),
        link: link,
        linkdl: linkdl,
        downloadText: $(".downloadButton").text().trim(),
        author: url.split("/")[4].toUpperCase(),
        info: $(".infoSlide").text().trim(),
        description: $("#description .notes").text().trim()
      };
    } else {
      const response2 = await fetch(randomProxyUrl + encodeURIComponent(link));
      const html2 = await response2.text();
      const formElement = cheerio.load(html2)("#filedownload");
      const id = formElement.find('input[name="id"]').attr("value");
      const key = formElement.find('input[name="key"]').attr("value");
      const linkdl = `https://www.apkmirror.com/wp-content/themes/APKMirror/download.php?id=${id}&key=${key}&forcebaseapk=${formElement.find('input[name="forcebaseapk"]').attr("value")}`;
      return {
        title: $('meta[property="og:title"]').attr("content"),
        gambar: $('meta[property="og:image"]').attr("content"),
        link: link,
        linkdl: linkdl,
        downloadText: $(".downloadButton").text().trim(),
        author: url.split("/")[4].toUpperCase(),
        info: $(".appspec-value").text().trim(),
        description: $("#description .notes").text().trim(),
        size: $(".appspec-row:nth-child(2) .appspec-value").text().trim(),
        tanggal: $(".appspec-row:last-child .appspec-value .datetime_utc").attr("data-utcdate")
      };
    }
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (action === "search") {
      if (!query) {
        return res.status(400).json({
          message: "Query is required"
        });
      }
      const results = await searchApkmirror(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const appDetails = await getApkmirror(url);
      return res.status(200).json(appDetails);
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
}