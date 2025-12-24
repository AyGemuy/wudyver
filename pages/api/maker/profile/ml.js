import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching image buffer:", error.message);
      throw error;
    }
  }
  async generate({
    profile = `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
    name = "Aurora_Queen",
    model: template = 1,
    type = "v5"
  }) {
    const templateSizes = {
      1: {
        width: 899,
        height: 1599
      }
    };
    const {
      width,
      height
    } = templateSizes[template] || templateSizes[1];
    const data = {
      width: width,
      height: height,
      html: `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Fake Mobile Legends Profile</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #000
      }

      canvas {
        display: block;
        margin: 0 auto;
        width: 100vw;
        height: 100vh;
        object-fit: contain
      }
    </style>
  </head>
  <body>
    <canvas id="resultCanvas"></canvas>
    <script>
      const config = {
        userImageUrl: '${profile}',
        backgroundUrl: 'https://files.catbox.moe/liplnf.jpg',
        frameUrl: 'https://files.catbox.moe/2vm2lt.png',
        nickname: '${name}',
        avatarSize: 205,
        frameSize: 293,
        centerYOffset: -282,
        maxFontSize: 36,
        minFontSize: 24,
        maxChar: 11,
        fontFamily: 'Arial',
        textOffsetX: 13,
        textOffsetY: 15
      };

      function loadImage(url) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url
        })
      }
      async function drawCanvas() {
        const canvas = document.getElementById('resultCanvas'),
          ctx = canvas.getContext('2d');
        try {
          const [bg, frameOverlay, userImage] = await Promise.all([loadImage(config.backgroundUrl), loadImage(config.frameUrl), loadImage(config.userImageUrl)]);
          canvas.width = bg.width;
          canvas.height = bg.height;
          ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
          const centerX = (canvas.width - config.frameSize) / 2,
            centerY = (canvas.height - config.frameSize) / 2 + config.centerYOffset,
            avatarX = centerX + (config.frameSize - config.avatarSize) / 2,
            avatarY = centerY + (config.frameSize - config.avatarSize) / 2 - 3,
            {
              width,
              height
            } = userImage,
            minSide = Math.min(width, height),
            cropX = (width - minSide) / 2,
            cropY = (height - minSide) / 2;
          ctx.drawImage(userImage, cropX, cropY, minSide, minSide, avatarX, avatarY, config.avatarSize, config.avatarSize);
          ctx.drawImage(frameOverlay, centerX, centerY, config.frameSize, config.frameSize);
          let fontSize = config.maxFontSize;
          if (config.nickname.length > config.maxChar) {
            const excess = config.nickname.length - config.maxChar;
            fontSize -= excess * 2;
            if (fontSize < config.minFontSize) fontSize = config.minFontSize
          }
          ctx.font = fontSize + 'px ' + config.fontFamily;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(config.nickname, canvas.width / 2 + config.textOffsetX, centerY + config.frameSize + config.textOffsetY)
        } catch (e) {
          console.error('Error:', e);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#fff';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Terjadi error saat memuat gambar', canvas.width / 2, canvas.height / 2)
        }
      }
      window.addEventListener('load', drawCanvas);
      window.addEventListener('resize', drawCanvas);
    </script>
  </body>
</html>`
    };
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      if (response.data) {
        return response.data?.url;
      }
    } catch (error) {
      console.error("Error during API call:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } else {
      res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}