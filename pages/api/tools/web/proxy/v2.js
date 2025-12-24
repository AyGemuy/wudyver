import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class Proxysite {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.proksi = {
      US: Array.from({
        length: 20
      }, (_, i) => `US${i + 1}`),
      EU: Array.from({
        length: 20
      }, (_, i) => `EU${i + 1}`)
    };
  }
  async submit(link, server = "US1") {
    const init = `https://${server.toLowerCase()}.proxysite.com/includes/process.php?action=update`;
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://www.proxysite.com",
      Referer: "https://www.proxysite.com/",
      "User-Agent": "Postify/1.0.0"
    };
    const data = new URLSearchParams({
      "server-option": server.toLowerCase(),
      d: link,
      allowCookies: "on"
    });
    try {
      const result = await this.client.post(init, data, {
        headers: headers,
        maxRedirects: 0
      });
      return result.data;
    } catch (error) {
      if (error.response && error.response.status === 302) {
        console.log("Redirect Link:", error.response.headers.location);
        return await this.handleRedirect(error.response.headers.location);
      } else {
        console.error(error.message);
        throw error;
      }
    }
  }
  async handleRedirect(redirectUrl) {
    try {
      const response = await this.client.get(redirectUrl, {
        headers: {
          Referer: "https://www.proxysite.com/"
        }
      });
      return response.data;
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url: link,
    server
  } = req.method === "GET" ? req.query : req.body;
  if (!link) {
    return res.status(400).json({
      error: 'Paramenter "url" wajib disertakan.'
    });
  }
  const proxysite = new Proxysite();
  try {
    const result = await proxysite.submit(link, server || "US1");
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}