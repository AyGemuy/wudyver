import axios from "axios";
const themes = {
  1: {
    bodyColor: "#000000",
    bgColor: "#FFFFFF"
  },
  2: {
    bodyColor: "#FF5733",
    bgColor: "#C70039"
  },
  3: {
    bodyColor: "#28B463",
    bgColor: "#DAF7A6"
  },
  4: {
    bodyColor: "#900C3F",
    bgColor: "#FFC300"
  },
  5: {
    bodyColor: "#581845",
    bgColor: "#F1C40F"
  },
  6: {
    bodyColor: "#154360",
    bgColor: "#AED6F1"
  },
  7: {
    bodyColor: "#6C3483",
    bgColor: "#E8DAEF"
  },
  8: {
    bodyColor: "#1C2833",
    bgColor: "#D5DBDB"
  },
  9: {
    bodyColor: "#117A65",
    bgColor: "#76D7C4"
  },
  10: {
    bodyColor: "#2E4053",
    bgColor: "#ABB2B9"
  }
};
class QRCodeGenerator {
  constructor() {
    this.defaultPayload = {
      config: {
        body: "japnese",
        eye: "frame2",
        eyeBall: "ball2",
        erf1: ["fv"],
        erf2: [],
        erf3: [],
        brf1: ["fv"],
        brf2: [],
        brf3: [],
        eye1Color: "#0277bd",
        eye2Color: "#0277bd",
        eye3Color: "#0277bd",
        eyeBall1Color: "#000000",
        eyeBall2Color: "#000000",
        eyeBall3Color: "#000000",
        gradientColor1: "#000000",
        gradientColor2: "#0277bd",
        gradientType: "linear",
        gradientOnEyes: false,
        logo: "",
        logoMode: "default"
      },
      size: 2e3,
      download: "imageUrl",
      file: "png"
    };
  }
  getThemeConfig(theme) {
    if (theme === "random") {
      theme = Math.floor(Math.random() * 10) + 1;
    }
    return themes[theme] || themes[1];
  }
  async generate({
    data,
    theme,
    ...rest
  }) {
    if (!data) {
      throw new Error("Paramenter 'data' wajib disertakan.");
    }
    const themeConfig = this.getThemeConfig(theme);
    const payload = {
      ...this.defaultPayload,
      data: data,
      config: {
        ...this.defaultPayload.config,
        ...themeConfig,
        ...rest.config
      },
      ...rest
    };
    try {
      const {
        data: responseData
      } = await axios.post("https://api.qrcode-monkey.com/qr/custom", payload, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://www.qrcode-monkey.com",
          "user-agent": "Mozilla/5.0",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      return responseData;
    } catch (error) {
      throw new Error(error.response?.data || error.message);
    }
  }
  async getQRImageBuffer(input) {
    const imageData = await this.generate(input);
    if (imageData && imageData.imageUrl) {
      const imageUrl = "https:" + imageData.imageUrl;
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return Buffer.from(imageResponse.data);
    } else if (imageData && imageData.base64) {
      const base64Data = imageData.base64.replace(/^data:image\/png;base64,/, "");
      return Buffer.from(base64Data, "base64");
    } else {
      throw new Error("Tidak dapat mengambil data gambar dari API.");
    }
  }
}
export default async function handler(req, res) {
  const qrGenerator = new QRCodeGenerator();
  try {
    const input = req.method === "GET" ? req.query : req.body;
    const imageBuffer = await qrGenerator.getQRImageBuffer(input);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="qrcode.png"');
    return res.status(200).send(imageBuffer);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Gagal membuat QR Code."
    });
  }
}