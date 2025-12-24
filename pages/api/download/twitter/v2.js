import fetch from "node-fetch";
import cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  let targetUrl = `https://twitsave.com/info?url=${url}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    Connection: "keep-alive"
  };
  try {
    const resFetch = await fetch(targetUrl, {
      method: "GET",
      headers: headers,
      follow: 5
    });
    if (resFetch.status !== 200) {
      throw new Error(`HTTP status ${resFetch.status}`);
    }
    const body = await resFetch.text();
    const $ = cheerio.load(body);
    if ($('div.bg-white.dark\\:bg-slate-800.shadow-md.rounded.border-slate-200.p-5 div.flex.w-full.justify-center.items-start div.flex div.text-xl.text-center:contains("Sorry, we could not find any video on this tweet. It may also be a tweet from a private account.")').length > 0) {
      return await handleSecondServer(req, res, url);
    }
    const filteredHrefs = $('a[href^="https://twitsave.com/download?file="]').map((index, element) => {
      return $(element).attr("href");
    }).get();
    const finalURLs = await Promise.all(filteredHrefs.map(async href => {
      const response = await fetch(href);
      return response.redirected ? response.url : href;
    }));
    let server = 0;
    for (const finalURL of finalURLs) {
      server++;
      res.json({
        video: {
          url: finalURL
        },
        caption: `Menggunakan server ${server}`
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}
async function handleSecondServer(req, res, url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    Accept: "*/*",
    "Accept-Language": "id,en-US;q=0.7,en;q=0.3",
    "HX-Request": "true",
    "HX-Target": "target",
    "HX-Current-URL": "https://ssstwitter.com/",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Origin: "https://ssstwitter.com",
    "Alt-Used": "ssstwitter.com",
    Connection: "keep-alive",
    Referer: "https://ssstwitter.com/"
  };
  const data = {
    id: url,
    locale: "en",
    tt: generateRandomAlphanumericString(32),
    ts: generateRandomNumericString(10),
    source: "form"
  };
  try {
    const response = await fetch("https://ssstwitter.com/", {
      method: "POST",
      headers: headers,
      body: new URLSearchParams(data)
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const getDownload = $("div.result_overlay a.pure-button.pure-button-primary.is-center.u-bl.dl-button.download_link.without_watermark.vignette_active");
    getDownload.each((index, element) => {
      const encodedUrl = $(element).attr("href").split("ssstwitter/")[1];
      const decodedUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
      res.json({
        video: {
          url: decodedUrl
        },
        caption: "Video Downloaded"
      });
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}

function generateRandomAlphanumericString(length = 10) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateRandomNumericString(length = 10) {
  const characters = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}