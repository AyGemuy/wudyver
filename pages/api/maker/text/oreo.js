import axios from "axios";

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
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
const oreoMaker = async text => {
  const encodedText = escapeHTML(text);
  const code = `const { chromium } = require('playwright');

async function oreo(encodedText) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>OREO Cookie 3D Text - CSS</title>
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Lilita+One&display=swap');

    :root {
      --shadow1: #b5b5b5;
      --shadow2: #333333;
      --shadow3: #222222;
    }

    body {
      margin: 0;
      padding: 0;
      background: radial-gradient(#0081cc 25%, #0155b6 50%, #000 );
      font-family: "Lilita One", sans-serif;
      overflow: hidden;
    }

    .content {
      height: 100vh;
      width: 100vw;
      text-align: center;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .oreo {
      color: #ffffff;
      font-size: 30vmin;
      text-shadow:
          0vmin 0.25vmin 0vmin var(--shadow1), 
          0vmin 0.5vmin 0vmin var(--shadow1), 
          0vmin 0.75vmin 0vmin var(--shadow1),
          0vmin 1vmin 0vmin var(--shadow1),
          0vmin 1.25vmin 0vmin var(--shadow1),
          0.5vmin -0.5vmin 0 var(--shadow2), 
          -0.5vmin -0.5vmin 0 var(--shadow2), 
          0.5vmin -0.25vmin 0 var(--shadow2), 
          -0.5vmin -0.25vmin 0 var(--shadow2), 
          0.5vmin 0vmin 0 var(--shadow2), 
          -0.5vmin 0vmin 0 var(--shadow2), 
          0.5vmin 0.25vmin 0 var(--shadow2), 
          -0.5vmin 0.25vmin 0 var(--shadow2), 
          0.5vmin 0.5vmin 0 var(--shadow2), 
          -0.5vmin 0.5vmin 0 var(--shadow2), 
          0.5vmin 0.75vmin 0 var(--shadow2), 
          -0.5vmin 0.75vmin 0 var(--shadow2), 
          0.5vmin 1vmin 0 var(--shadow2), 
          -0.5vmin 1vmin 0 var(--shadow2), 
          0.5vmin 1.25vmin 0 var(--shadow2), 
          -0.5vmin 1.25vmin 0 var(--shadow2), 
          0.5vmin 1.5vmin 0 var(--shadow2), 
          -0.5vmin 1.5vmin 0 var(--shadow2), 
          0.5vmin 1.75vmin 0 var(--shadow2), 
          -0.5vmin 1.75vmin 0 var(--shadow2), 
          0.5vmin 2vmin 0 var(--shadow2), 
          -0.5vmin 2vmin 0 var(--shadow2), 
          0.5vmin 2.25vmin 0 var(--shadow2), 
          -0.5vmin 2.25vmin 0 var(--shadow2), 
          -0.5vmin 3vmin 0 var(--shadow3), 
          0.5vmin 3vmin 0 var(--shadow3),
          -0.5vmin 4vmin 0 var(--shadow3), 
          0.5vmin 4vmin 0 var(--shadow3), 
          0.5vmin 2vmin 0 var(--shadow3),	
          0.5vmin 2.25vmin 0 var(--shadow3), 
          0.5vmin 2.5vmin 0 var(--shadow3), 
          0.5vmin 2.75vmin 0 var(--shadow3), 
          0.5vmin 3vmin 0 var(--shadow3), 
          0.5vmin 3.25vmin 0 var(--shadow3), 
          0.5vmin 3.5vmin 0 var(--shadow3), 
          0.5vmin 3.75vmin 0 var(--shadow3), 
          0.5vmin 4vmin 0 var(--shadow3),
          0.1vmin 0.5vmin 10vmin #fff4;
      transform: scaleY(0.7);
      letter-spacing: 0.25vmin;
    }
    </style>
  </head>
  <body>
    <div class="content">
        <div class="oreo">${encodedText}</div>
    </div>
    <script type="module" src="https://unpkg.com/@deckdeckgo/highlight-code@latest/dist/deckdeckgo-highlight-code/deckdeckgo-highlight-code.esm.js"></script>
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

oreo('${encodedText}').then(a => console.log(a));`;
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
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Text parameter is required"
    });
  }
  try {
    const result = await oreoMaker(text);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate oreo image"
    });
  }
}