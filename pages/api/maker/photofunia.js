import apiConfig from "@/configs/apiConfig";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import {
  v4 as uuidv4
} from "uuid";
import crypto from "crypto";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
const base = "https://photofunia.com";
const baseM = "https://m.photofunia.com";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const proxyBase = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
const generateSlug = () => crypto.createHash("md5").update(`${Date.now()}-${uuidv4()}`).digest("hex").substring(0, 8);

function getCommonHeaders(cookie) {
  return {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; Flow) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/359.0.0.288 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    Host: "photofunia.com",
    cookie: cookie + "; accept_cookie=true",
    "Accept-Language": "id-ID,id;q=0.9,en-GB;q=0.8,en;q=0.7,en-US;q=0.6"
  };
}
const createFormData = async (content, fieldName = "image") => {
  try {
    const fileType = await fileTypeFromBuffer(content);
    const {
      ext = "jpg",
        mime = "image/jpeg"
    } = fileType || {};
    const blob = new Blob([content], {
      type: mime
    });
    const formData = new FormData();
    formData.append(fieldName, blob, `${generateSlug()}.${ext}`);
    return formData;
  } catch {
    throw new Error("Failed to create FormData");
  }
};
const getCookies = async url => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; Flow) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/359.0.0.288 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        Host: "photofunia.com"
      }
    });
    return response.headers.get("set-cookie")?.split(";")[0];
  } catch {
    return "";
  }
};
const getImageKey = async (url, image) => {
  try {
    const formData = await createFormData(image);
    const cookies = await getCookies("https://photofunia.com/images?server=1");
    const uploadResponse = await fetch("https://photofunia.com/images?server=1", {
      method: "POST",
      body: formData,
      headers: {
        ...getCommonHeaders(cookies),
        Referer: `https://photofunia.com${new URL(url).pathname}`
      }
    });
    if (!uploadResponse.ok) {
      throw new Error("Upload failed");
    }
    const data = await uploadResponse.json();
    return {
      key: data.response.key,
      cookies: cookies
    };
  } catch {
    return {
      status: "gagal",
      msg: "Error fetching image key"
    };
  }
};
const search = async teks => {
  try {
    const linke = `${baseM}/search?q=${encodeURIComponent(teks)}`;
    const response = await fetch(`${proxyBase}${encodeURIComponent(linke)}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = $(".effects-list li").map((_, element) => {
      const title = $(element).find(".name").text().trim();
      const link = $(element).find("a").attr("href");
      const description = $(element).find(".description").text().trim();
      const image = $(element).find("img").attr("src");
      if (title && link && description && image) {
        return {
          judul: title,
          link: baseM + link,
          desc: description,
          thumb: image
        };
      }
    }).get().filter(Boolean);
    return results;
  } catch {
    return [];
  }
};
const info = async url => {
  try {
    if (!url.includes(baseM)) {
      return {
        error: "Link Tidak Valid"
      };
    }
    const response = await fetch(`${proxyBase + encodeURIComponent(url)}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const exam = $("div > div.image-preview > a > img").attr("src");
    const judul = $("div > h2").text().trim();
    const desc = $("div.description").text().trim();
    const inputs = $("form > div > input").map((_, b) => ({
      input: $(b).attr("name")
    })).get();
    return {
      judul: judul,
      desc: desc,
      exam: exam,
      inputs: inputs
    };
  } catch {
    return {};
  }
};
const img = async (url, images = [], texts = []) => {
  try {
    if (!/^https:\/\/.+\.photofunia.+$/g.test(url)) {
      return {
        status: "gagal",
        msg: "itu bukan link dari photofunia"
      };
    }
    const formData = new FormData();
    let kuki;
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const {
        key,
        status,
        msg,
        cookies: kuks
      } = await getImageKey(url, image);
      kuki = kuks;
      if (status === "gagal") {
        return {
          status: status,
          msg: msg
        };
      }
      const fieldName = images.length === 1 ? "image" : `image${i + 1}`;
      formData.append(fieldName, key);
    }
    texts.forEach((text, index) => {
      if (text) {
        const fieldName = texts.length === 1 ? "text" : `text${index + 1}`;
        formData.append(fieldName, text);
      }
    });
    formData.append("current-category", "all_effects");
    formData.append("image:crop", "0");
    const cookies = kuki;
    const response = await fetch(`https://photofunia.com${new URL(url).pathname}?server=1`, {
      method: "POST",
      body: formData,
      headers: {
        ...getCommonHeaders(cookies),
        Referer: `https://photofunia.com${new URL(url).pathname}`
      }
    });
    if (!response.ok) {
      throw new Error("Failed to submit form data");
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const imageUrl = $(".image-container img").attr("src") || "Gambar tidak ditemukan";
    const downloadLinks = $(".downloads-container ul.links li a").map((_, el) => ({
      size: $(el).text().trim(),
      url: $(el).attr("href")
    })).get();
    return {
      status: "sukses",
      imageUrl: imageUrl,
      download: downloadLinks
    };
  } catch {
    return {
      status: "gagal",
      msg: "error nih"
    };
  }
};
const txt = async (url, texts = []) => {
  try {
    if (!/https:\/\/.+\.photofunia.+/g.test(url)) {
      return {
        status: "gagal",
        msg: "itu bukan link dari photofunia"
      };
    }
    const formData = new FormData();
    formData.append("current-category", "all_effect");
    texts.forEach((text, index) => {
      if (text) formData.append(texts.length === 1 ? "text" : `text${index + 1}`, text);
    });
    const cookies = await getCookies(`${base}/cookie-warning?server=1`);
    const response = await fetch(`${base}${new URL(url).pathname}?server=1`, {
      method: "POST",
      body: formData,
      headers: {
        ...getCommonHeaders(cookies),
        Referer: `${base}${new URL(url).pathname}`
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const imageUrl = $(".image-container img").attr("src") || "Gambar tidak ditemukan";
    const downloadLinks = $(".downloads-container ul.links li a").map((_, el) => ({
      size: $(el).text().trim(),
      url: $(el).attr("href")
    })).get();
    return {
      status: "sukses",
      imageUrl: imageUrl,
      download: downloadLinks
    };
  } catch {
    return {
      status: "gagal",
      msg: "error nih"
    };
  }
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET" || method === "POST") {
    const {
      query,
      body
    } = req;
    const data = method === "GET" ? query : body;
    const {
      action,
      url,
      images,
      texts
    } = data;
    try {
      if (action === "search") {
        const results = await search(data.teks);
        return res.status(200).json({
          results: results
        });
      } else if (action === "info") {
        const infoData = await info(url);
        return res.status(200).json(infoData);
      } else if (action === "img") {
        const imagesArr = images ? JSON.parse(images) : [];
        const textsArr = texts ? JSON.parse(texts) : [];
        const imgData = await img(url, imagesArr, textsArr);
        return res.status(200).json(imgData);
      } else if (action === "txt") {
        const textsArr = texts ? JSON.parse(texts) : [];
        const imgData = await txt(url, textsArr);
        return res.status(200).json(imgData);
      } else {
        res.status(400).json({
          error: "Invalid action"
        });
      }
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}