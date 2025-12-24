import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar: jar
}));
class Gen {
  async generate({
    url,
    ...rest
  } = {}) {
    const u = url ?? rest.url ?? "https://x.com";
    console.log("[start] generate url:", u);
    try {
      const payload = new URLSearchParams({
        module: "tools",
        task: "tool-detail",
        tool_file: "url-to-png",
        do: "list_save",
        url: u,
        ...rest
      });
      console.log("[request] POST index.php");
      const res = await client.post("https://tools.simpletools.nl/index.php", payload, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://tools.simpletools.nl",
          pragma: "no-cache",
          referer: "https://tools.simpletools.nl/url-to-png.html",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          "x-requested-with": "XMLHttpRequest",
          ...SpoofHead()
        }
      });
      const data = res.data ?? {};
      const result = {
        url: null,
        success: data.status === 1,
        message: data.msg || ""
      };
      if (!data.returnactions_target_element_value) {
        console.warn("[warn] No HTML result found in response");
        return result;
      }
      const html = data.returnactions_target_element_value;
      const $ = cheerio.load(html);
      const downloadLink = $('a.btn-primary[href$=".png"]').attr("href");
      if (downloadLink) {
        result.url = downloadLink.startsWith("http") ? downloadLink : `https://tools.simpletools.nl${downloadLink}`;
      } else {
        console.warn("[warn] PNG download link not found in HTML");
      }
      return result;
    } catch (e) {
      console.error("[exception]", e?.response?.status ?? e?.code ?? e?.message);
      return {
        url: null,
        success: false,
        message: e?.message || "Network error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const client = new Gen();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}