import axios from "axios";
import * as cheerio from "cheerio";
const y2mate = {
  create: async () => {
    try {
      const {
        data
      } = await axios.get("https://y2mate.nu/en-o3iJ/");
      const script = cheerio.load(data)("script").filter((_, el) => el.children[0]?.data.includes("atob")).html();
      if (!script) throw new Error("Kagak nemu base64 ceunah bree 😂.");
      const decoded = Buffer.from(script.match(/atob\('([^']+)'\)/)[1], "base64").toString("utf-8");
      const [, gCStr, gEStr] = decoded.match(/gC\s*=\s*(\[[^\]]+\]).*?gE\s*=\s*(\[[^\]]+\])/s) || [];
      const gC = JSON.parse(gCStr.replace(/'/g, '"'));
      const gE = JSON.parse(gEStr.replace(/'/g, '"'));
      const key = gC[2].split(",").map(i => (gC[1] > 0 ? [...gC[0]].reverse().join("") : gC[0])[i]).join("");
      const {
        data: itil
      } = await axios.get(`https://nu.${String.fromCharCode(109, 110, 117, 117, 46, 110, 117)}/api/v1/init?_=${Math.random()}`, {
        headers: {
          "x-request-c": gC[4],
          "x-request-k": key,
          "x-request-u": gC[3]
        }
      });
      if (itil.error !== "0") throw new Error("Gagal ceunah bree 🤣");
      return {
        gC: gC,
        gE: gE,
        convertURL: itil.convertURL
      };
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  },
  convert: async (url, format = "mp4") => {
    try {
      const {
        convertURL
      } = await y2mate.create();
      const sig = new URL(convertURL).searchParams.get("sig");
      const response = await axios.get(`https://nmuu.mnuu.nu/api/v1/convert`, {
        params: {
          sig: sig,
          v: url,
          f: format,
          _: Math.random()
        },
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-MM,id;q=0.9,ms-MM;q=0.8,ms;q=0.7,en-MM;q=0.6,en;q=0.5,es-MX;q=0.4,es;q=0.3,fil-PH;q=0.2,fil;q=0.1,id-ID;q=0.1,en-US;q=0.1",
          Origin: "https://y2mate.nu",
          Referer: "https://y2mate.nu/",
          "User-Agent": "Postify/1.0.0"
        }
      });
      return response.data;
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  },
  progress: async (progressURL, videoUrl) => {
    try {
      const sig = new URL(progressURL).searchParams.get("sig");
      let completed = false;
      let title = "";
      while (!completed) {
        const response = await axios.get(`https://nmuu.mnuu.nu/api/v1/progress`, {
          params: {
            sig: sig
          },
          headers: {
            Accept: "*/*",
            "Accept-Language": "id-MM,id;q=0.9,ms-MM;q=0.8,ms;q=0.7,en-MM;q=0.6,en;q=0.5,es-MX;q=0.4,es;q=0.3,fil-PH;q=0.2,fil;q=0.1,id-ID;q=0.1,en-US;q=0.1",
            Origin: "https://y2mate.nu",
            Referer: "https://y2mate.nu/",
            "User-Agent": "Postify/1.0.0"
          }
        });
        const {
          progress,
          error,
          title: videoTitle
        } = response.data;
        console.log(`==> Progress: ${progress}%, Judul: ${videoTitle}`);
        if (title === "" && videoTitle !== "") {
          title = videoTitle;
        }
        if (progress >= 3) {
          const finalResult = await y2mate.convert(videoUrl);
          return {
            ...finalResult,
            title: title
          };
        }
        if (progress === 100 || error !== 0) {
          completed = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1e3));
        }
      }
      return {
        completed: completed,
        title: title
      };
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }
};
export default async function handler(req, res) {
  try {
    const {
      method,
      query
    } = req;
    const {
      url,
      format = "mp4"
    } = query;
    if (!url) return res.status(400).json({
      error: "URL is required."
    });
    const resultc = await y2mate.convert(url, format);
    if (!resultc) return res.status(400).json({
      error: resultc
    });
    const result = await y2mate.progress(resultc, url);
    if (!resultc) return res.status(400).json({
      error: result
    });
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}