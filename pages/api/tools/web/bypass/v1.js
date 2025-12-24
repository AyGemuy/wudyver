import axios from "axios";
class RedirectDetective {
  constructor() {
    this.api = {
      base: "https://redirectdetective.com/ld.px"
    };
    this.headers = {
      authority: "redirectdetective.com",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://redirectdetective.com",
      referer: "https://redirectdetective.com/",
      "user-agent": "Postify/1.0.0"
    };
  }
  generateCookie(count = 1) {
    const timestamp = Math.floor(Date.now() / 1e3);
    const random = Math.floor(Math.random() * 1e9);
    return `__utma=132634637.${random}.${timestamp}.${timestamp}.${timestamp}.1; __utmz=132634637.${timestamp}.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utmc=132634637; __utmt=1; __utmb=132634637.6.10.${timestamp}; c=${count}`;
  }
  parse(data) {
    const redirects = [];
    const urlRegex = /<a href="([^"]+)" class="tooltips[^>]+>/g;
    const statusRegex = /<button[^>]+>([\d]+ - [^<]+)<\/button>/g;
    let urlx;
    let statusx;
    while ((urlx = urlRegex.exec(data)) !== null) {
      redirects.push({
        url: urlx[1]
      });
    }
    let i = 0;
    while ((statusx = statusRegex.exec(data)) !== null) {
      if (redirects[i]) {
        redirects[i].status = statusx[1];
        i++;
      }
    }
    return redirects;
  }
  isUrl(url) {
    if (!url || url.trim() === "") {
      return {
        isValid: false,
        message: "Input kosong? 😑"
      };
    }
    try {
      new URL(url);
      return {
        isValid: true,
        message: "Input valid! 👹"
      };
    } catch (err) {
      return {
        isValid: false,
        message: "URL ga valid, cek lagi! 🤷🏻"
      };
    }
  }
  isFollow(follow) {
    if (typeof follow === "undefined" || follow === null) {
      return {
        isValid: false,
        message: "Isi follow (true/false)!"
      };
    }
    if (typeof follow !== "boolean") {
      return {
        isValid: false,
        message: "Follow harus boolean (true/false)"
      };
    }
    return {
      isValid: true,
      message: "Follow valid 😀",
      value: follow
    };
  }
  async checkRedirect({
    url,
    follow = "true"
  }) {
    try {
      const isUrlx = this.isUrl(url);
      if (!isUrlx.isValid) {
        return {
          status: false,
          code: 400,
          message: isUrlx.message,
          result: {
            redirects: []
          }
        };
      }
      const isFollowx = this.isFollow(follow);
      const followOpts = isFollowx.isValid ? isFollowx.value : true;
      if (!isFollowx.isValid) {
        return {
          status: false,
          code: 400,
          message: isFollowx.message,
          result: {
            redirects: []
          }
        };
      }
      const formData = new URLSearchParams();
      formData.append("w", url);
      formData.append("f", followOpts.toString());
      const count = Math.floor(Math.random() * 5) + 1;
      const cookie = this.generateCookie(count);
      const response = await axios.post(this.api.base, formData, {
        headers: {
          ...this.headers,
          cookie: cookie
        }
      });
      const redirects = this.parse(response.data);
      return {
        status: true,
        code: 200,
        result: {
          redirects: redirects
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        message: error.message,
        result: {
          redirects: []
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new RedirectDetective();
  try {
    const response = await api.checkRedirect(params);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}