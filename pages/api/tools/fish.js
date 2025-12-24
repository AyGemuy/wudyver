import axios from "axios";
class FshApi {
  constructor() {
    this.endpoint = {
      "8ball": {
        method: "GET",
        params: "/8ball"
      },
      apis: {
        method: "GET",
        params: "/apis"
      },
      base64: {
        method: "POST",
        params: "/base64"
      },
      binary: {
        method: "POST",
        params: "/binary"
      },
      color: {
        method: "GET",
        params: "/color"
      },
      fandom: {
        method: "GET",
        params: "/fandom"
      },
      file: {
        method: "GET",
        params: "/file"
      },
      filter: {
        method: "POST",
        params: "/filter"
      },
      generate: {
        method: "POST",
        params: "/generate"
      },
      hex: {
        method: "POST",
        params: "/hex"
      },
      html: {
        method: "GET",
        params: "/html"
      },
      http: {
        method: "GET",
        params: "/http"
      },
      ip: {
        method: "GET",
        params: "/ip"
      },
      math: {
        method: "POST",
        params: "/math"
      },
      md5: {
        method: "POST",
        params: "/md5"
      },
      mock: {
        method: "POST",
        params: "/mock"
      },
      morse: {
        method: "POST",
        params: "/morse"
      },
      "periodic-table": {
        method: "GET",
        params: "/periodic-table"
      },
      puny: {
        method: "GET",
        params: "/puny"
      },
      reverse: {
        method: "POST",
        params: "/reverse"
      },
      roman: {
        method: "POST",
        params: "/roman"
      },
      sha256: {
        method: "POST",
        params: "/sha256"
      },
      sha512: {
        method: "POST",
        params: "/sha512"
      },
      site: {
        method: "GET",
        params: "/site"
      },
      status: {
        method: "GET",
        params: "/status"
      },
      time: {
        method: "GET",
        params: "/time"
      },
      translate: {
        method: "POST",
        params: "/translate"
      },
      unit: {
        method: "POST",
        params: "/unit"
      },
      unshorten: {
        method: "GET",
        params: "/unshorten"
      },
      uuid: {
        method: "POST",
        params: "/uuid"
      },
      uwuify: {
        method: "POST",
        params: "/uwuify"
      },
      whois: {
        method: "GET",
        params: "/whois"
      },
      wikipedia: {
        method: "GET",
        params: "/wikipedia"
      },
      ytsearch: {
        method: "GET",
        params: "/ytsearch"
      },
      ad: {
        method: "POST",
        params: "/ad"
      },
      animal: {
        method: "GET",
        params: "/animal"
      },
      ascii: {
        method: "POST",
        params: "/ascii"
      },
      bi: {
        method: "POST",
        params: "/bi"
      },
      biden: {
        method: "POST",
        params: "/biden"
      },
      blur: {
        method: "POST",
        params: "/blur"
      },
      colorify: {
        method: "POST",
        params: "/colorify"
      },
      communism: {
        method: "POST",
        params: "/communism"
      },
      deepfry: {
        method: "POST",
        params: "/deepfry"
      },
      fandomImage: {
        method: "GET",
        params: "/fandom-image"
      },
      flip: {
        method: "POST",
        params: "/flip"
      },
      flop: {
        method: "POST",
        params: "/flop"
      },
      gay: {
        method: "POST",
        params: "/gay"
      },
      greyscale: {
        method: "POST",
        params: "/greyscale"
      },
      gun: {
        method: "POST",
        params: "/gun"
      },
      hue: {
        method: "POST",
        params: "/hue"
      },
      imageFormat: {
        method: "POST",
        params: "/image-format"
      },
      imagine: {
        method: "POST",
        params: "/imagine"
      },
      invert: {
        method: "POST",
        params: "/invert"
      },
      jail: {
        method: "POST",
        params: "/jail"
      },
      join: {
        method: "POST",
        params: "/join"
      },
      meme: {
        method: "GET",
        params: "/meme"
      },
      pixelate: {
        method: "POST",
        params: "/pixelate"
      },
      resize: {
        method: "POST",
        params: "/resize"
      },
      rmqr: {
        method: "POST",
        params: "/rmqr"
      },
      uncover: {
        method: "POST",
        params: "/uncover"
      },
      wanted: {
        method: "POST",
        params: "/wanted"
      },
      audio: {
        method: "POST",
        params: "/audio"
      },
      sam: {
        method: "POST",
        params: "/sam"
      },
      tts: {
        method: "POST",
        params: "/tts"
      }
    };
  }
  async request(endpointKey, data = {}, options = {}) {
    try {
      const {
        method,
        params
      } = this.endpoint[endpointKey] || {};
      if (!method) throw new Error(`Endpoint "${endpointKey}" not found`);
      const url = `https://api.fsh.plus${params}`;
      const config = {
        method: method,
        url: url,
        data: method === "POST" ? data : null,
        params: method === "GET" ? data : null,
        ...options
      };
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Error in ${endpointKey}: `, error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const fshApi = new FshApi();
  const {
    endpoint,
    ...queryParams
  } = req.method === "GET" ? req.query : req.body;
  if (!endpoint) {
    return res.status(400).json({
      error: "Endpoint is required."
    });
  }
  try {
    if (typeof fshApi[endpoint] === "function") {
      const response = await fshApi[endpoint](queryParams);
      if (typeof response === "object" || Array.isArray(response)) {
        return res.status(200).json(response);
      }
      return res.status(200).send(response);
    } else {
      const availableEndpoints = Object.getOwnPropertyNames(FshApi.prototype).filter(method => method !== "constructor");
      return res.status(400).json({
        error: "Invalid endpoint.",
        message: `Available endpoints: ${availableEndpoints.join(", ")}`
      });
    }
  } catch (error) {
    console.error("Error in API call:", error.message);
    return res.status(500).json({
      error: "Failed to fetch data from FSH API"
    });
  }
}