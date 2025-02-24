import axios from "axios";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
async function ephoto(data) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!/https:\/\/en\.ephoto360\.com/.test(data.url)) {
        throw new Error("Enter a valid ephoto360 link!");
      }
      const _url = new URL(data.url);
      const headers = {
        Host: _url.host,
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-CH-UA": '"Safari";v="17", "Chromium";v="117", "Not-A.Brand";v="24"',
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"IOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_7_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        Referer: _url.origin + "/",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,ms;q=0.6",
        Priority: "u=0, i",
        Connection: "keep-alive"
      };
      let {
        headers: _h,
        data: _d
      } = await axios.get(data.url, {
        headers: headers
      });
      let $ = cheerio.load(_d);
      let cookie = _h?.["set-cookie"]?.map(v => v.split(";")[0]).join("; ");
      const _cred = {
        token: $("input#token").val(),
        server: $("input#build_server").val(),
        id: $("input#build_server_id").val()
      };
      let d = new FormData();
      const texts = Object.keys(data).filter(key => key.startsWith("text")).sort((a, b) => a.localeCompare(b));
      texts.forEach(key => d.append("text[]", data[key]));
      if (texts.length === 0 && data.text) {
        d.append("text[]", data.text);
      }
      d.append("submit", "GO");
      d.append("token", _cred.token);
      d.append("build_server", _cred.server);
      d.append("build_server_id", _cred.id);
      let _r = await axios.post(data.url, d, {
        headers: {
          ...headers,
          cookie: cookie,
          origin: _url.origin,
          referer: data.url
        }
      });
      $ = cheerio.load(_r.data);
      let formData = JSON.parse($("input#form_value_input").val() || "{}");
      _r = await axios.post(_url.origin + "/effect/create-image", formData, {
        headers: {
          ...headers,
          Accept: "*/*",
          cookie: cookie,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      if (!_r.data.success) {
        throw new Error("Create image is not successful: " + _r.data.info);
      }
      await new Promise(res => setTimeout(res, 5e3));
      resolve({
        success: true,
        image: formData.build_server.replace("/", "/").concat(_r.data.image),
        name: _r.data.image.split("/").pop()
      });
    } catch (e) {
      reject(e);
    }
  });
}
export default async function handler(req, res) {
  const {
    url = "https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html", ...texts
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      success: false,
      message: "Missing required 'url' parameter"
    });
  }
  try {
    const result = await ephoto({
      url: url,
      ...texts
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}