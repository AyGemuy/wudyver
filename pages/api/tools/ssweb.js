import axios from "axios";
class ScreenshotProvider {
  async fetchBuffer(url, options = {}) {
    try {
      const response = await axios({
        url: url,
        responseType: "arraybuffer",
        ...options
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Error fetching buffer from ${url}:`, error);
      throw error;
    }
  }
  async fetchJson(url, options = {}) {
    try {
      const response = await axios({
        url: url,
        responseType: "json",
        ...options
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching JSON from ${url}:`, error);
      throw error;
    }
  }
  async webss(link) {
    return await this.fetchBuffer(`https://webss.yasirweb.eu.org/api/screenshot?resX=1280&resY=900&outFormat=jpg&waitTime=1000&isFullPage=true&dismissModals=false&url=${link}`);
  }
  async apiFlash(link) {
    return await this.fetchBuffer(`https://api.apiflash.com/v1/urltoimage?access_key=7eea5c14db5041ecb528f68062a7ab5d&wait_until=page_loaded&url=${link}`);
  }
  async thumIO(link) {
    return await this.fetchBuffer(`https://image.thum.io/get/fullpage/${link}`);
  }
  async sShot(link) {
    return await this.fetchBuffer(`https://mini.s-shot.ru/2560x1600/PNG/2560/Z100/?${link}`);
  }
  async webshotElzinko(link) {
    return await this.fetchBuffer(`https://webshot-elzinko.vercel.app/api/webshot?url=${link}`);
  }
  async screenshotLayer(link) {
    return await this.fetchBuffer(`https://api.screenshotlayer.com/api/capture?access_key=de547abee3abb9d3df2fc763637cac8a&url=${link}`);
  }
  async urlbox(link) {
    return await this.fetchBuffer(`https://api.urlbox.io/v1/ln9ptArKXobLRpDQ/png?url=${link}`);
  }
  async backup15(link) {
    return await this.fetchBuffer(`https://backup15.terasp.net/api/screenshot?resX=1280&resY=900&outFormat=jpg&waitTime=100&isFullPage=false&dismissModals=false&url=${link}`);
  }
  async shotsnap(link) {
    return await this.fetchBuffer(`https://shotsnap.vercel.app/api/screenshot?page=${link}`);
  }
  async pptr(link) {
    return await this.fetchBuffer(`https://pptr.io/api/screenshot?width=400&height=300&deviceScaleFactor=1&dark=1&url=${link}`);
  }
  async screenshotMachine(link) {
    try {
      const form = new URLSearchParams({
        url: link,
        device: "desktop",
        cacheLimit: 0,
        full: "on"
      });
      const response = await axios.post("https://www.screenshotmachine.com/capture.php", form, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const imageResponse = await axios.get(`https://www.screenshotmachine.com/${response.data.link}`, {
        responseType: "arraybuffer"
      });
      return Buffer.from(imageResponse.data);
    } catch (error) {
      console.error("Error with ScreenshotMachine:", error);
      throw error;
    }
  }
  async pikwy(link) {
    try {
      const response = await this.fetchJson(`https://api.pikwy.com/v1/screenshot?url=${link}`);
      return await this.fetchBuffer(`https://api.pikwy.com/v1/screenshot/${response.id}`);
    } catch (error) {
      console.error("Error with Pikwy:", error);
      throw error;
    }
  }
  async fetchFox(link) {
    try {
      const response = await this.fetchJson(`https://fetchfox.ai/api/v2/fetch?url=${link}`);
      return await this.fetchBuffer(response.screenshot);
    } catch (error) {
      console.error("Error with FetchFox:", error);
      throw error;
    }
  }
  async googleApis(link) {
    try {
      const response = await this.fetchJson(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?screenshot=true&url=${link}`);
      const dataURL = response.lighthouseResult?.fullPageScreenshot?.screenshot?.data;
      return dataURL ? Buffer.from(dataURL.replace(/^data:image\/\w+;base64,/, ""), "base64") : null;
    } catch (error) {
      console.error("Error with GoogleApis:", error);
      throw error;
    }
  }
  async euCentral(link) {
    return await this.fetchBuffer(`https://2s9e3bif52.execute-api.eu-central-1.amazonaws.com/production/screenshot?url=${link}`);
  }
  async hexometer(link) {
    try {
      const response = await axios.post("https://api.hexometer.com/v2/ql", {
        query: `{Property{liveScreenshot(address: "${link}"){width height hash}}}`
      }, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      });
      const imageHash = response.data.data.Property.liveScreenshot.hash;
      return await this.fetchBuffer(`https://fullpagescreencapture.com/screen/${imageHash}.jpg`);
    } catch (error) {
      console.error("Error with Hexometer:", error);
      throw error;
    }
  }
  async microlink(link) {
    try {
      const response = await axios.post("https://api.microlink.io/", {
        url: link,
        screenshot: true,
        meta: false,
        pdf: false
      }, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      });
      return await this.fetchBuffer(response.data.data.screenshot.url);
    } catch (error) {
      console.error("Error with Microlink:", error);
      throw error;
    }
  }
  async geoBrowse(link, code = "us") {
    try {
      const response = await axios.post("https://us-central1-geotargetly-1a441.cloudfunctions.net/free-tool_geobrowse-gen-screenshots", {
        code: code,
        url: link
      }, {
        headers: {
          "Content-Type": "application/json",
          Referer: "https://geotargetly.com/geo-browse"
        }
      });
      return Buffer.from(response.data, "base64");
    } catch (error) {
      console.error("Error with GeoBrowse:", error);
      throw error;
    }
  }
}
class ScreenshotService {
  constructor() {
    this.provider = new ScreenshotProvider();
    this.methods = [this.provider.googleApis, this.provider.hexometer, this.provider.pikwy, this.provider.fetchFox, this.provider.microlink, this.provider.euCentral, this.provider.apiFlash, this.provider.backup15, this.provider.pptr, this.provider.sShot, this.provider.screenshotLayer, this.provider.screenshotMachine, this.provider.shotsnap, this.provider.thumIO, this.provider.urlbox, this.provider.webshotElzinko, this.provider.webss, this.provider.geoBrowse];
  }
  async screenshot(link, index = 1) {
    if (index < 1 || index > this.methods.length) throw new Error("Provider tidak ditemukan");
    try {
      return await this.methods[index - 1](link);
    } catch (error) {
      console.error(`Error pada metode ke-${index}:`, error);
    }
    for (let i = 0; i < this.methods.length; i++) {
      if (i !== index - 1) {
        try {
          return await this.methods[i](link);
        } catch (err) {
          console.error(`Fallback error pada metode ke-${i + 1}:`, err);
          continue;
        }
      }
    }
    throw new Error("Semua provider gagal.");
  }
}
export default async function handler(req, res) {
  const {
    url,
    type: v = 2
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Paramenter url diperlukan"
    });
  }
  const screenshotService = new ScreenshotService();
  try {
    const result = await screenshotService.screenshot(url, v);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Gagal mengambil gambar dari provider"
    });
  }
}