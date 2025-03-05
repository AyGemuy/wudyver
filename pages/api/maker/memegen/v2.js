import axios from "axios";
class MemeGenerator {
  constructor() {
    this.apiUrl = `https://${process.env.DOMAIN_URL}/api/tools/playwright`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    };
  }
  async create({
    url = "https://i.pinimg.com/originals/4d/be/22/4dbe22882d18d64cc97f852fb8c6673c.jpg",
    top = " ",
    bottom = " "
  }) {
    const code = `
        const { chromium } = require('playwright');
        (async () => {
            const browser = await chromium.launch();
            const page = await browser.newPage();
            const htmlContent = \`
            <!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; height: 100vh; background: black; }
        canvas { max-width: 100vw; max-height: 100vh; }
    </style>
</head>
<body>

    <canvas id="memeCanvas"></canvas>

    <script>
        function generateMeme() {
            const canvas = document.getElementById('memeCanvas');
            const ctx = canvas.getContext('2d');

            const img = new Image();
            img.src = '${url}'; // Ganti dengan URL gambar
            img.crossOrigin = "anonymous"; 

            const topText = "${top}";
            const bottomText = "${bottom}";

            img.onload = function() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                
                // Hitung skala gambar agar sesuai dengan layar
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const imgWidth = img.width * scale;
                const imgHeight = img.height * scale;
                const x = (canvas.width - imgWidth) / 2;
                const y = (canvas.height - imgHeight) / 2;

                ctx.drawImage(img, x, y, imgWidth, imgHeight);

                // Set font style
                const fontSize = imgWidth / 10;
                ctx.font = 'bold ' + fontSize + 'px Impact';
                ctx.fillStyle = "white";
                ctx.strokeStyle = "black";
                ctx.lineWidth = fontSize / 10;
                ctx.textAlign = "center";

                // Fungsi menggambar teks dengan stroke
                function drawText(text, x, y) {
                    ctx.strokeText(text, x, y);
                    ctx.fillText(text, x, y);
                }

                // Teks atas
                drawText(topText, canvas.width / 2, y + fontSize);

                // Teks bawah
                drawText(bottomText, canvas.width / 2, y + imgHeight - 20);
            };
        }

        window.onload = generateMeme;
    </script>

</body>
</html>\`;

            await page.setContent(htmlContent);
            await page.waitForTimeout(1000);
            const memeContainer = await page.$('.meme-container');
            const screenshot = await memeContainer.screenshot();
            await browser.close();

            console.log(JSON.stringify({ output: screenshot.toString('base64') }));
        })();
        `;
    try {
      const response = await axios.post(this.apiUrl, {
        code: code,
        language: "javascript"
      }, {
        headers: this.headers
      });
      const {
        output
      } = JSON.parse(response.data.output);
      return Buffer.from(output, "base64");
    } catch (error) {
      throw new Error(`Gagal membuat meme: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const memeGen = new MemeGenerator();
    const imageBuffer = await memeGen.create(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (err) {
    res.status(500).json({
      message: "Terjadi kesalahan.",
      error: err.message
    });
  }
}