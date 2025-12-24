import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class ProxyUpdater {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
  }
  async webProxy(url, location = "uk") {
    const baseUrl = `https://${location}proxy.vpnbook.com`;
    const updateUrl = `${baseUrl}/includes/process.php?action=update`;
    const data = new URLSearchParams();
    data.append("u", url);
    data.append("webproxylocation", location);
    try {
      console.log(`Sending request to update URL: ${updateUrl}`);
      const response = await this.client.post(updateUrl, data.toString(), {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "max-age=0",
          "content-type": "application/x-www-form-urlencoded",
          origin: baseUrl,
          priority: "u=0, i",
          referer: baseUrl,
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-site",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("Received response from update URL");
      const responseData = response.data;
      const $ = cheerio.load(responseData);
      const scriptContent = $("script").filter((i, el) => $(el).html().includes("ginf")).html();
      if (scriptContent) {
        const ginfMatch = scriptContent.match(/ginf\s*=\s*(\{.*?\});/);
        if (ginfMatch) {
          const ginf = JSON.parse(ginfMatch[1].replace(/'/g, '"'));
          if (ginf.enc.u && ginf.enc.x) {
            ginf.target.h = this.arcfour(ginf.enc.u, this.base64_decode(ginf.target.h));
            ginf.target.p = this.arcfour(ginf.enc.u, this.base64_decode(ginf.target.p));
            ginf.target.u = this.arcfour(ginf.enc.u, this.base64_decode(ginf.target.u));
          }
          const siteURL = `${ginf.url}/${ginf.script}`;
          console.log(`Fetching from site URL: ${siteURL}`);
          const getResponse = await this.client.get(siteURL, {
            headers: {
              accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
              "accept-language": "id-ID,id;q=0.9",
              "cache-control": "max-age=0",
              priority: "u=0, i",
              referer: "https://www.vpnbook.com/",
              "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
              "sec-ch-ua-mobile": "?1",
              "sec-ch-ua-platform": '"Android"',
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "same-site",
              "sec-fetch-user": "?1",
              "upgrade-insecure-requests": "1",
              "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
            }
          });
          console.log("Successfully fetched data from site URL");
          return getResponse.data;
        }
      }
      console.log("No ginf object found in the response");
      return responseData;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }
  base64_encode(d) {
    var q = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var z, y, x, w, v, u, t, s, i = 0,
      j = 0,
      p = "",
      r = [];
    if (!d) {
      return d;
    }
    do {
      z = d.charCodeAt(i++);
      y = d.charCodeAt(i++);
      x = d.charCodeAt(i++);
      s = z << 16 | y << 8 | x;
      w = s >> 18 & 63;
      v = s >> 12 & 63;
      u = s >> 6 & 63;
      t = s & 63;
      r[j++] = q.charAt(w) + q.charAt(v) + q.charAt(u) + q.charAt(t);
    } while (i < d.length);
    p = r.join("");
    var r = d.length % 3;
    return (r ? p.slice(0, r - 3) : p) + "===".slice(r || 3);
  }
  base64_decode(d) {
    var q = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var z, y, x, w, v, u, t, s, i = 0,
      j = 0,
      r = [];
    if (!d) {
      return d;
    }
    d += "";
    do {
      w = q.indexOf(d.charAt(i++));
      v = q.indexOf(d.charAt(i++));
      u = q.indexOf(d.charAt(i++));
      t = q.indexOf(d.charAt(i++));
      s = w << 18 | v << 12 | u << 6 | t;
      z = s >> 16 & 255;
      y = s >> 8 & 255;
      x = s & 255;
      if (u == 64) {
        r[j++] = String.fromCharCode(z);
      } else if (t == 64) {
        r[j++] = String.fromCharCode(z, y);
      } else {
        r[j++] = String.fromCharCode(z, y, x);
      }
    } while (i < d.length);
    return r.join("");
  }
  arcfour(k, d) {
    var o = "";
    var s = new Array();
    var n = 256;
    var l = k.length;
    for (var i = 0; i < n; i++) {
      s[i] = i;
    }
    for (var j = i = 0; i < n; i++) {
      j = (j + s[i] + k.charCodeAt(i % l)) % n;
      var x = s[i];
      s[i] = s[j];
      s[j] = x;
    }
    for (var i = j = y = 0; y < d.length; y++) {
      i = (i + 1) % n;
      j = (j + s[i]) % n;
      var x = s[i];
      s[i] = s[j];
      s[j] = x;
      o += String.fromCharCode(d.charCodeAt(y) ^ s[(s[i] + s[j]) % n]);
    }
    return o;
  }
}
export default async function handler(req, res) {
  const {
    url,
    location
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: 'Paramenter "url" wajib disertakan.'
    });
  }
  const proxyUpdater = new ProxyUpdater();
  try {
    const result = await proxyUpdater.webProxy(url, location);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}