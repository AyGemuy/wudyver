import axios from "axios";
const runPlaywrightCode = async code => {
  try {
    const url = "https://try.playwright.tech/service/control/run";
    const headers = {
      authority: "try.playwright.tech",
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://try.playwright.tech",
      referer: "https://try.playwright.tech/?l=playwright-test",
      "user-agent": "Postify/1.0.0"
    };
    const data = {
      code: code,
      language: "javascript"
    };
    const response = await axios.post(url, data, {
      headers: headers
    });
    return response.data;
  } catch (error) {
    console.error("Error running playwright code:", error);
    throw error;
  }
};
const retroMaker = async (up, down) => {
  const text1 = up;
  const text2 = down;
  const code = `const { chromium } = require('playwright');

async function retro(encodedText) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>Retro Text Effect (Pure CSS)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/meyer-reset/2.0/reset.min.css">
<style>
@import url("https://fonts.googleapis.com/css2?family=Mr+Dafoe&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Exo:wght@900&display=swap");
body, html {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

body {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: radial-gradient(rgba(118, 0, 191, 0.5) 0%, transparent 70%), linear-gradient(#0b161e 40%, #202076 70%);
  perspective: 700px;
  font-size: clamp(10px, 2vw, 20px);
}

.lines {
  position: fixed;
  width: 100vw;
  height: 4em;
  background: linear-gradient(rgba(89, 193, 254, 0.2) 20%, #59c1fe 40%, #59c1fe 60%, rgba(89, 193, 254, 0.2) 80%);
  background-size: 1px 0.5em;
  box-shadow: 0 0 1em rgba(89, 193, 254, 0.4);
  transform: translateY(-1em);
  left: 0;
}

h1 {
  position: relative;
  font-family: "Exo";
  font-size: 9em;
  margin: 0;
  transform: skew(-15deg);
  letter-spacing: 0.03em;
}
h1::after {
  content: "";
  position: absolute;
  top: -0.1em;
  right: 0.05em;
  width: 0.4em;
  height: 0.4em;
  background: radial-gradient(white 3%, rgba(255, 255, 255, 0.3) 15%, rgba(255, 255, 255, 0.05) 60%, transparent 80%), radial-gradient(rgba(255, 255, 255, 0.2) 50%, transparent 60%) 50% 50%/5% 100%, radial-gradient(rgba(255, 255, 255, 0.2) 50%, transparent 60%) 50% 50%/70% 5%;
  background-repeat: no-repeat;
}
h1 span:first-child {
  display: block;
  text-shadow: 0 0 0.1em #8ba2d0, 0 0 0.2em black, 0 0 5em #165ff3;
  -webkit-text-stroke: 0.06em rgba(0, 0, 0, 0.5);
}
h1 span:last-child {
  position: absolute;
  left: 0;
  top: 0;
  background-image: linear-gradient(#032d50 25%, #00a1ef 35%, white 50%, #20125f 50%, #8313e7 55%, #ff61af 75%);
  -webkit-text-stroke: 0.01em #94a0b9;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

h2 {
  font-family: "Mr Dafoe";
  margin: 0;
  font-size: 5.5em;
  margin-top: -0.6em;
  color: white;
  text-shadow: 0 0 0.05em #fff, 0 0 0.2em #fe05e1, 0 0 0.3em #fe05e1;
  transform: rotate(-7deg);
}

.grid {
  background: linear-gradient(transparent 65%, rgba(46, 38, 255, 0.4) 75%, #7d41e6 80%, rgba(46, 38, 255, 0.4) 85%, transparent 95%), linear-gradient(90deg, transparent 65%, rgba(46, 38, 255, 0.4) 75%, #7d41e6 80%, rgba(46, 38, 255, 0.4) 85%, transparent 95%);
  background-size: 30px 30px;
  width: 200vw;
  height: 300vh;
  position: absolute;
  bottom: -120vh;
  transform: rotateX(-100deg);
  -webkit-mask-image: linear-gradient(black, rgba(0, 0, 0, 0) 80%);
}</style>
</head>
<body>
<!-- partial:index.partial.html -->
<div class="grid"></div>
<div class="lines"></div>
<h1>
  <span>${text1}</span>
  <span>${text1}</span>
</h1>
<h2>${text2}</h2>
<!-- partial -->
  
</body>
</html>\`;

    await page.setContent(content);
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    await browser.close();
    return screenshotBuffer.toString('base64');
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await browser.close();
  }
}

retro('${text1}', '${text2}').then(a => console.log(a));`;
  const {
    output
  } = await runPlaywrightCode(code.trim());
  return output;
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    text1,
    text2
  } = req.method === "GET" ? req.query : req.body;
  if (!(text1 || text2)) {
    return res.status(400).json({
      error: "Text1 and text2 parameter is required"
    });
  }
  try {
    const result = await retroMaker(text1, text2);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate retro image"
    });
  }
}