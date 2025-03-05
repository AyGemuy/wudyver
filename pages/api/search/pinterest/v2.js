import axios from "axios";
import * as cheerio from "cheerio";
import {
  fileTypeFromBuffer
} from "file-type";
import {
  FormData
} from "formdata-node";
import fakeUserAgent from "fake-useragent";
const isUrl = url => url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/, "gi"));

function getRandomNoRepeat(array, batasan) {
  const arrayAcak = [];
  while (arrayAcak.length < batasan && array.length > 0) {
    const randomIndex = Math.floor(Math.random() * array.length);
    const elemenAcak = array[randomIndex];
    arrayAcak.push(elemenAcak);
    array.splice(randomIndex, 1);
  }
  return Array.from(new Set(arrayAcak));
}
async function pindl(url) {
  try {
    const {
      data
    } = await axios.get("https://www.savepin.app/download.php", {
      params: {
        url: url,
        lang: "en",
        type: "redirect"
      }
    });
    const $ = cheerio.load(data);
    const formats = [];
    $("table > tbody > tr").map((_, b) => {
      formats.push("https://www.savepin.app/" + $(b).find("#submiturl").attr("href"));
    });
    return {
      thumbnail: $("article > figure > p > img").attr("src"),
      description: $("article > div > div > p").text().trim(),
      formats: formats
    };
  } catch {
    const {
      data
    } = await axios({
      url: "https://www.expertsphp.com/facebook-video-downloader.php",
      method: "POST",
      headers: {
        "User-Agent": fakeUserAgent()
      },
      data: new URLSearchParams({
        url: url
      })
    });
    const $ = cheerio.load(data);
    const html = $("#showdata").html();
    const arr = html?.match(/(https?:\/\/.*\.(?:png|jpg|jpeg|webp|mov|mp4|webm|gif))/g) || isUrl(html);
    return {
      formats: arr.filter(a => /videos/.test(a))[0] || arr[0]
    };
  }
}
async function pinterest(query) {
  const {
    data
  } = await axios.get(`https://www.pinterest.com/resource/BaseSearchResource/get/`, {
    params: {
      source_url: `/search/pins/?q=${query}`,
      data: JSON.stringify({
        options: {
          isPrefetch: false,
          query: query,
          scope: "pins",
          no_fetch_context_on_resource: false
        },
        context: {}
      })
    }
  });
  const container = [];
  const results = data.resource_response.data.results.filter(v => v.images?.orig);
  results.forEach(result => {
    container.push({
      upload_by: result.pinner.username,
      fullname: result.pinner.full_name,
      followers: result.pinner.follower_count,
      caption: result.grid_title,
      image: result.images.orig.url,
      source: "https://id.pinterest.com/pin/" + result.id
    });
  });
  return container;
}
async function pinterestReverse(image) {
  const {
    ext
  } = await fileTypeFromBuffer(image);
  const form = new FormData();
  form.append("image", image, Math.floor(Math.random() * 99999999) + "." + ext);
  form.append("x", "0");
  form.append("y", "0");
  form.append("w", "1");
  form.append("h", "1");
  form.append("base_scheme", "https");
  const {
    data
  } = await axios.put("https://api.pinterest.com/v3/visual_search/extension/image/", form, {
    headers: {
      "User-Agent": fakeUserAgent()
    }
  });
  return data;
}
export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      let p;
      if (req.body.url) p = await pindl(req.body.url);
      if (req.body.query) p = await pinterest(req.body.query);
      if (req.body.base64) p = await pinterestReverse(Buffer.from(req.body.base64, "base64"));
      return res.json(p);
    } else if (req.method === "GET") {
      const {
        url,
        query
      } = req.method === "GET" ? req.query : req.body;
      if (url) return res.json(await pindl(url));
      if (query) return res.json(await pinterest(query));
      return res.status(400).json({
        error: "Invalid GET parameters. Use 'url' or 'query'."
      });
    } else {
      return res.status(405).json({
        error: "Only POST and GET methods are allowed."
      });
    }
  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}