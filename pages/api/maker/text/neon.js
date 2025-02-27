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
const neonMaker = async text => {
  const encodedText = escapeHTML(text);
  const code = `const { chromium } = require('playwright');

async function neon(encodedText) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>CSS-only shimmering neon text</title>
  <link href="https://fonts.googleapis.com/css?family=Lato:700" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/5.0.0/normalize.min.css">
<style>
/*
This demo was very old and overly complex
I have updated it with a cleaner, more modern technique
It still uses mix-blend-modes, so the basic idea hasn't changed

Original
https://codepen.io/giana/pen/MWxONWm
*/

/* Create pseudo elements for both elements */
.text-effect-wrapper,
.text {
  &::before,
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
}

.text-effect-wrapper {
  /* Can be anything light-colored */
  --spotlight-color: white;

  overflow: hidden;
  position: relative;

  /* Shimmer animation */
  &::before {
    -webkit-animation: shimmer 5s infinite linear;
            animation: shimmer 5s infinite linear;
    background: 
      radial-gradient(circle, var(--spotlight-color), transparent 25%) 0 0 / 25% 25%,
      radial-gradient(circle, var(--spotlight-color), black 25%) 50% 50% / 12.5% 12.5%;
    inset-block-start: -100%;
    inset-inline-start: -100%;
    mix-blend-mode: color-dodge;
    z-index: 3;
  }

  /* Extra filter to boost colors and contrast */
  &::after {
    -webkit-backdrop-filter: blur(1px) brightness(90%) contrast(150%);
            backdrop-filter: blur(1px) brightness(90%) contrast(150%);
    z-index: 4;
  }
}

@-webkit-keyframes shimmer {
  100% {
    transform: translate3d(50%, 50%, 0);
  }
}

@keyframes shimmer {
  100% {
    transform: translate3d(50%, 50%, 0);
  }
}

.text {
  /* Mask colors */
  /* Should be black and white */
  --background-color: black;
  --text-color: white;

  /* Text color */
  /* Can be anything */
  --color-1: red;
  --color-2: blue;

  /* Fuzzy white outline text */
  color: transparent;
  text-shadow: 
    0 0 0.02em var(--background-color), 
    0 0 0.02em var(--text-color),
    0 0 0.02em var(--text-color), 
    0 0 0.02em var(--text-color);

  /* Improve contrast of outline */
  &::before {
    -webkit-backdrop-filter: blur(0.013em) brightness(400%);
            backdrop-filter: blur(0.013em) brightness(400%);
    z-index: 1;
  }

  /* Add text color */
  &::after {
    background: linear-gradient(45deg, var(--color-1), var(--color-2));
    mix-blend-mode: multiply;
    z-index: 2;
  }
}

/* Alternative styling */
body:has(#option-toggle:checked) {
  & .text-effect-wrapper {
    --spotlight-color: orange;
    
    &::after {
      -webkit-backdrop-filter: brightness(90%) contrast(150%);
              backdrop-filter: brightness(90%) contrast(150%);
    }
  }

  & .text {
    --angle: 5deg;
    --color-1: hsl(163, 100%, 51%);
    --color-2: hsl(295, 88%, 32%);
    --color-3: hsl(59, 100%, 50%);

    text-shadow: 
      0 0 0.03em var(--background-color),
      0 0 0.03em var(--text-color);
    
    &::before {
      -webkit-backdrop-filter: brightness(150%) contrast(200%);
              backdrop-filter: brightness(150%) contrast(200%);
    }

    &::after {
      background: linear-gradient(var(--angle), var(--color-1), var(--color-2), var(--color-3));
      mix-blend-mode: color-dodge;
    }
  } 
}

/* === Pen styling, ignore */

h1 {
  --font-size: clamp(6.25rem, 3.25rem + 15vw, 13.75rem);

  font: 700 var(--font-size)/1 "Lato", sans-serif;
  text-transform: uppercase;
  text-align: center;
  margin: 0;

  &:empty,
  &:focus {
    border: 2px dotted white;
    min-width: 1ch;
    outline-offset: 5px;
  }
}

body {
  background: black;
  display: flex;
  min-height: 100vh;
  justify-content: center;
  align-content: center;
  align-items: center;
}

label {
  background-color: hsl(240deg, 20%, 50%);
  border-radius: 5px;
  color: #fff;
  padding: 0.5em 1em;
  
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 1000;
  
  &:has(:checked) {
    background-color: hsl(350deg, 60%, 50%);
  }
}

input {
  position: absolute;
  opacity: 0;
}</style>
</head>
<body>
<!-- partial:index.partial.html -->
<!--
This demo was very old and overly complex
I have updated it with a cleaner, more modern technique
It still uses mix-blend-modes, so the basic idea hasn't changed

Original:
https://codepen.io/giana/pen/MWxONWm
-->
<div class="text-effect-wrapper">
  <!-- The contenteditable attribute means you can type your text right on the page -->
  <h1 class="text" contenteditable>${encodedText}</h1>
</div>
  
</body>
</html>
\`;

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

neon('${encodedText}').then(a => console.log(a));`;
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
    const result = await neonMaker(text);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate neon image"
    });
  }
}