import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
async function searchAppVn(query) {
  try {
    const link = "https://appvn.com";
    const response = await fetch(randomProxyUrl + encodeURIComponent(link + "/android/search?keyword=" + encodeURIComponent(query)));
    const body = await response.text();
    const $ = cheerio.load(body);
    const resultArray = [];
    $("div.section-content li.item").each((index, element) => {
      const item = {
        title: $(element).find("div.info > a").text().trim(),
        url: link + $(element).find("div.info > a").attr("href"),
        image: $(element).find("img.lazy").attr("data-src"),
        version: $(element).find("div.vol-chap.ver.text-left > p:first-child").text().trim(),
        date: $(element).find("div.vol-chap.ver.text-left > p.new-chap").text().trim(),
        author: $(element).find("div.new-chap.author > a").text().trim(),
        detailLink: link + $(element).find("div.btn.btn-download > a").attr("href")
      };
      resultArray.push(item);
    });
    return resultArray;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function infoAppVn(url) {
  try {
    const response = await fetch(randomProxyUrl + encodeURIComponent(url));
    const html = await response.text();
    const $ = cheerio.load(html);
    const infoTab = $("#info");
    return {
      version: infoTab.find("p:nth-child(1)").text().trim().replace("Version: ", ""),
      req: infoTab.find("p:nth-child(2)").text().trim().replace("Req: ", ""),
      latestUpdate: infoTab.find("p:nth-child(3)").text().trim().replace("Latest update: ", ""),
      downloadLink: "https://appvn.com" + $(".btn-download a").attr("href"),
      descriptionTitle: $("#des h2").text().trim(),
      descriptionShort: $("#des span._without_desc").text().trim(),
      descriptionFull: $("#des span._full_desc div").text().trim(),
      screenshots: $("#screenshots img").map((_, element) => $(element).attr("src")).get(),
      ogTitle: $('meta[property="og:title"]').attr("content"),
      ogImage: $('meta[property="og:image"]').attr("content")
    };
  } catch (error) {
    console.error("Error:", error);
  }
}
async function getAppVn(url) {
  try {
    const data = await infoAppVn(url);
    const response = await fetch(randomProxyUrl + encodeURIComponent(data.downloadLink));
    const html = await response.text();
    const $ = cheerio.load(html);
    const onclickValue = $("#info").find(".btn-download a").attr("onclick");
    const downloadArgs = onclickValue.match(/dowload\('([^']*)', '([^']*)', '([^']*)', '([^']*)'\);return false;/).slice(1);
    const get_app = await downloadApk(downloadArgs[0], downloadArgs[1], downloadArgs[2], downloadArgs[3]);
    return {
      versionId: downloadArgs[0],
      sopcastId: downloadArgs[1],
      packageName: downloadArgs[2],
      versionCode: downloadArgs[3],
      about: data,
      download: get_app
    };
  } catch (error) {
    console.error("Error:", error);
  }
}
async function downloadApk(latestVersion, sopcastId, package_name, version_code = 0) {
  try {
    const response = await fetch("https://appvn.com/link-download-direct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        latest: latestVersion,
        sopcast_id: sopcastId,
        package_name: package_name,
        version_code: version_code
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
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
      const results = await searchAppVn(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const appInfo = await infoAppVn(url);
      return res.status(200).json(appInfo);
    } else if (action === "app") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const appData = await getAppVn(url);
      return res.status(200).json(appData);
    } else if (action === "download") {
      const {
        latestVersion,
        sopcastId,
        package_name,
        version_code
      } = req.body;
      if (!latestVersion || !sopcastId || !package_name) {
        return res.status(400).json({
          message: "Required fields are missing"
        });
      }
      const downloadData = await downloadApk(latestVersion, sopcastId, package_name, version_code);
      return res.status(200).json(downloadData);
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