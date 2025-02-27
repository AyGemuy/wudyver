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
const glitchMaker = async text => {
  const encodedText = escapeHTML(text);
  const code = `const { chromium } = require('playwright');

async function glitch(encodedText) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>CSS Glitch Text Animation</title>
    </head>
    <body>
      <style>
      * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
      }

      .container {
          width: 100vw;
          height: 100vh;
          background: #000;
          display: grid;
          place-items: center;
          overflow: hidden;
      }

      .glitch {
          font-family: 'Segoe UI', sans-serif;
          font-weight: 900;
          font-size: 20vw;
          line-height: 1;
          position: relative;
          text-transform: uppercase;
          text-shadow: 0.05em 0 0 #00fffc, -0.025em -0.05em 0 #fc00ff, 0.025em 0.05em 0 #fffc00;
          animation: glitch 2s infinite;
      }

      .glitch span {
          position: absolute;
          top: 0;
          left: 0;
      }

      .glitch span:first-child {
          animation: glitch 650ms infinite;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          transform: translate(-0.025em, -0.0125em);
          opacity: 0.75;
      }

      .glitch span:last-child {
          animation: glitch 375ms infinite;
          clip-path: polygon(0 80%, 100% 20%, 100% 100%, 0 100%);
          transform: translate(0.0125em, 0.025em);
          opacity: 0.75;
      }

      @keyframes glitch {
          0% {
              text-shadow: 0.05em 0 0 #00fffc, -0.05em -0.025em 0 #fc00ff, -0.025em 0.05em 0 #fffc00;
          }
          14% {
              text-shadow: 0.05em 0 0 #00fffc, -0.05em -0.025em 0 #fc00ff, -0.025em 0.05em 0 #fffc00;
          }
          15% {
              text-shadow: -0.05em -0.025em 0 #00fffc, 0.025em 0.025em 0 #fc00ff, -0.05em -0.05em 0 #fffc00;
          }
          49% {
              text-shadow: -0.05em -0.025em 0 #00fffc, 0.025em 0.025em 0 #fc00ff, -0.05em -0.05em 0 #fffc00;
          }
          50% {
              text-shadow: 0.025em 0.05em 0 #00fffc, 0.05em 0 0 #fc00ff, 0 -0.05em 0 #fffc00;
          }
          99% {
              text-shadow: 0.025em 0.05em 0 #00fffc, 0.05em 0 0 #fc00ff, 0 -0.05em 0 #fffc00;
          }
          100% {
              text-shadow: -0.025em 0 0 #00fffc, -0.025em -0.025em 0 #fc00ff, -0.025em -0.05em 0 #fffc00;
          }
      }

      @keyframes noise {
          0%, 3%, 5%, 42%, 44%, 100% { opacity: 1; transform: scaleY(1); }  
          4.5% { opacity: 1; transform: scaleY(4); }
          43% { opacity: 1; transform: scaleX(10) rotate(60deg); }
      }

      .glitch::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 2px);
          animation: noise 1.5s infinite linear alternate-reverse;
          pointer-events: none;
      }

      .glitch::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 8%, rgba(255,255,255,0.2) 16%, rgba(255,255,255,0.1) 32%, transparent 100%);
          mix-blend-mode: overlay;
          pointer-events: none;
      }
      </style>
      <div class="container">
          <div class="glitch">
              ${encodedText}
              <span>${encodedText}</span>
              <span>${encodedText}</span>
          </div>
      </div>
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

glitch('${encodedText}').then(a => console.log(a));`;
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
    const result = await glitchMaker(text);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate glitch image"
    });
  }
}