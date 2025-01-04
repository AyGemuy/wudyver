import fetch from "node-fetch";
const ScreenshotMachine = async (url = "", full = false, type = "desktop") => {
  try {
    const form = new URLSearchParams({
      url: url,
      device: type.toLowerCase(),
      cacheLimit: 0
    });
    if (full) form.append("full", "on");
    const response = await fetch("https://www.screenshotmachine.com/capture.php", {
      method: "POST",
      body: form,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    const jsonResponse = await response.json();
    const imageResponse = await fetch(`https://www.screenshotmachine.com/${jsonResponse.link}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    return Buffer.from(await imageResponse.arrayBuffer());
  } catch (e) {
    console.log(e);
  }
};
const pikwy = async url => {
  try {
    const response = await fetch(`https://api.pikwy.com/v1/screenshot?url=${url}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    const jsonResponse = await response.json();
    return `https://api.pikwy.com/v1/screenshot/${jsonResponse.id}`;
  } catch (e) {
    console.log(e);
  }
};
const googleApis = async url => {
  try {
    const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?screenshot=true&url=${url}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    const jsonResponse = await response.json();
    const dataURL = jsonResponse.lighthouseResult?.fullPageScreenshot?.screenshot?.data;
    return dataURL ? Buffer.from(dataURL.replace(/^data:image\/\w+;base64,/, ""), "base64") : null;
  } catch (e) {
    console.log(e);
  }
};
const v8Screenshot = async url => {
  try {
    const response = await fetch(`https://2s9e3bif52.execute-api.eu-central-1.amazonaws.com/production/screenshot?url=${url}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    return Buffer.from(await response.arrayBuffer());
  } catch (e) {
    console.log(e);
  }
};
const wudyScreenshot = async url => {
  try {
    const response = await fetch(`https://wudysoft-cookie.hf.space/screenshot?url=${url}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    return Buffer.from(await response.arrayBuffer());
  } catch (e) {
    console.log(e);
  }
};
const hexometerScreenshot = async url => {
  try {
    const response = await fetch("https://api.hexometer.com/v2/ql", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        query: `{Property{liveScreenshot(address: "${url}"){width height hash}}}`
      })
    });
    const {
      data
    } = await response.json();
    const responseBuff = await fetch(`https://fullpagescreencapture.com/screen/${data.Property.liveScreenshot.hash}.jpg`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    return Buffer.from(await responseBuff.arrayBuffer());
  } catch (e) {
    console.log(e);
  }
};
const v13Screenshot = async url => {
  try {
    const response = await fetch("https://api.microlink.io/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        url: url,
        screenshot: true,
        meta: false,
        pdf: false
      })
    });
    const jsonResponse = await response.json();
    const imageResponse = await fetch(jsonResponse.data.screenshot.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    return Buffer.from(await imageResponse.arrayBuffer());
  } catch (e) {
    console.log(e);
  }
};
class ScreenshotProvider {
  constructor(apiKey) {}
  async webss(link) {
    return Buffer.from(await (await fetch(`https://webss.yasirweb.eu.org/api/screenshot?resX=1280&resY=900&outFormat=jpg&waitTime=1000&isFullPage=true&dismissModals=false&url=${link}`)).arrayBuffer());
  }
  async apiFlash(link) {
    return Buffer.from(await (await fetch(`https://api.apiflash.com/v1/urltoimage?access_key=7eea5c14db5041ecb528f68062a7ab5d&wait_until=page_loaded&url=${link}`)).arrayBuffer());
  }
  async thumIO(link) {
    return Buffer.from(await (await fetch(`https://image.thum.io/get/fullpage/${link}`)).arrayBuffer());
  }
  async sShot(link) {
    return Buffer.from(await (await fetch(`https://mini.s-shot.ru/2560x1600/PNG/2560/Z100/?${link}`)).arrayBuffer());
  }
  async webshotElzinko(link) {
    return Buffer.from(await (await fetch(`https://webshot-elzinko.vercel.app/api/webshot?url=${link}`)).arrayBuffer());
  }
  async screenshotLayer(link) {
    return Buffer.from(await (await fetch(`https://api.screenshotlayer.com/api/capture?access_key=de547abee3abb9d3df2fc763637cac8a&url=${link}`)).arrayBuffer());
  }
  async urlbox(link) {
    return Buffer.from(await (await fetch(`https://api.urlbox.io/v1/ln9ptArKXobLRpDQ/png?url=${link}`)).arrayBuffer());
  }
  async backup15(link) {
    return Buffer.from(await (await fetch(`https://backup15.terasp.net/api/screenshot?resX=1280&resY=900&outFormat=jpg&waitTime=100&isFullPage=false&dismissModals=false&url=${link}`)).arrayBuffer());
  }
  async shotsnap(link) {
    return Buffer.from(await (await fetch(`https://shotsnap.vercel.app/api/screenshot?page=${link}`)).arrayBuffer());
  }
  async pptr(link) {
    return Buffer.from(await (await fetch(`https://pptr.io/api/screenshot?width=400&height=300&deviceScaleFactor=1&dark=1&url=${link}`)).arrayBuffer());
  }
  async screenshotMachine(link) {
    try {
      const imageResponse = await ScreenshotMachine(link);
      return imageResponse;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
  async Pikwy(link) {
    try {
      const imageResponse = await pikwy(link);
      return imageResponse;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
  async GoogleApis(link) {
    try {
      const imageResponse = await googleApis(link);
      return imageResponse;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
  async V8Screenshot(link) {
    try {
      const imageResponse = await v8Screenshot(link);
      return imageResponse;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
  async HexometerScreenshot(link) {
    try {
      const imageResponse = await hexometerScreenshot(link);
      return imageResponse;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
  async V13Screenshot(link) {
    try {
      const imageResponse = await v13Screenshot(link);
      return imageResponse;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
}
const ssweb = async (link, index = 1) => {
  const provider = new ScreenshotProvider();
  const methods = [provider.GoogleApis, provider.HexometerScreenshot, provider.Pikwy, provider.V13Screenshot, provider.V8Screenshot, provider.apiFlash, provider.backup15, provider.pptr, provider.sShot, provider.screenshotLayer, provider.screenshotMachine, provider.shotsnap, provider.thumIO, provider.urlbox, provider.webshotElzinko, provider.webss, provider.wudyScreenshot];
  if (index < 1 || index > methods.length) throw new Error("Provider tidak ditemukan");
  const selectedMethod = methods[index - 1];
  try {
    return await selectedMethod(link);
  } catch (error) {
    console.error(`Error pada metode terpilih: ${error}`);
    for (const method of methods) {
      try {
        return await method(link);
      } catch (error) {
        console.error(`Error pada metode ${method.name}: ${error}`);
      }
    }
    throw new Error("Semua provider gagal");
  }
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    url,
    type: v = 2
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Parameter url diperlukan"
    });
  }
  try {
    const result = await ssweb(url, v);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Gagal mengambil gambar dari provider"
    });
  }
}