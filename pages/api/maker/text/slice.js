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
const sliceMaker = async text => {
  const encodedText = escapeHTML(text);
  const code = `const { chromium } = require('playwright');

async function slice(encodedText) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>Slice! No JS, no text duplication! (contenteditable)</title>
  <style>
@charset "UTF-8";
@import url("https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&display=swap");
html, body {
  display: grid;
}

html {
  min-height: 100%;
  background: #121212;
  /* pseudo needed because of no support yet for
   * filter(linear-gradient(#121212), url(#noisey)) */
}
html::before {
  /* stack it in the one HTML grid cell */
  grid-area: 1/1;
  background: #0001;
  /* add noise to backdrop underneath */
  backdrop-filter: url(#noisey);
  content: "";
}

/* stack it in the one HTML grid cell */
body {
  grid-area: 1/1;
}

/* svg element only used to hold filters, 
 * not used to display an graphics, 
 * take it out of document flow */
svg[width="0"][height="0"] {
  position: fixed;
}

div {
  /* needed for absolutely positioned pseudo */
  position: relative;
  /* in the middle of the one body grid cell */
  place-self: center;
  /* so italic text doesn't overflow laterally */
  padding: 0 0.125em;
  color: #00f;
  /* text on blue channel */
  font: italic 900 clamp(2em, 21.5vw, 25em) montserrat, sans-serif;
  overflow-wrap: anywhere;
  text-align: center;
  text-transform: uppercase;
  /* prevent blending pseudo with what's behind div */
  isolation: isolate;
  filter: url(#sliced) url(#noisey) hue-rotate(calc(var(--hov, 0)*120deg));
  transition: filter 0.3s;
  /* needed ONLY because of Firefox and Safari bugs 
   * when it comes to background-clip: text
   * 🪲 Firefox https://bugzilla.mozilla.org/show_bug.cgi?id=1481498
   * 🪲 Safari https://bugs.webkit.org/show_bug.cgi?id=267129 */
}
div::after {
  /* to place it on top of text */
  position: absolute;
  /* make it cover parent's entire padding-box */
  inset: 0;
  /* slice lines on red & green chanels */
  background: linear-gradient(-4deg, #0000 calc(58.5% + -.5px), #f00 calc(58.5% + .5px)), linear-gradient(-2.5deg, #0f0 calc(31% + -.5px), #000 calc(31% + .5px));
  background-size: 100% 1lh;
  /* blend gradients with text */
  mix-blend-mode: lighten;
  /* allow text selection & right click menu */
  pointer-events: none;
  content: "";
}
div:focus {
  outline: none;
}
div:hover, div:focus {
  --hov: 1 ;
}</style>
</head>
<body>
<!-- partial:index.partial.html -->
<!-- zero SVG dimensions, doesn't hold any graphics-->
<svg width="0" height="0">
  <filter id="sliced" color-interpolation-filters="sRGB">
    <!-- extract top strip & paint it dirty white-->
    <feColorMatrix values="0 0 0 0 .93 
		                      0 0 0 0 .93 
													0 0 0 0 .93
													1 0 1 0 -1"></feColorMatrix>
    <!-- offset it to top left-->
    <feOffset dx="-16" dy="-2" result="topstrip"></feOffset>
    <!-- extract bottom strip & paint it dirty white-->
    <feColorMatrix in="SourceGraphic" values="0 0 0 0 .93 
		                      0 0 0 0 .93 
													0 0 0 0 .93
													0 1 1 0 -1"></feColorMatrix>
    <!-- offset it to bottom right-->
    <feOffset dx="16" dy="2"></feOffset>
    <!-- join it with top strip-->
    <feBlend in="topstrip"></feBlend>
    <!-- give the outer strips group a couple of shadows-->
    <feDropShadow stdDeviation="5"></feDropShadow>
    <feDropShadow stdDeviation="7" result="outstrip"></feDropShadow>
    <!-- extract middle strip & paint it light green-->
    <feColorMatrix in="SourceGraphic" values=" 0  0 0 0 .945 
		                       0  0 0 0 .965 
													 0  0 0 0 .4 
													-1 -1 1 0 0"></feColorMatrix>
    <!-- add the outer strips with shadows on top-->
    <feBlend in="outstrip"></feBlend>
  </filter>
  <filter id="noisey">
    <!-- generate noise-->
    <feTurbulence type="fractalNoise" baseFrequency="3.17"></feTurbulence>
    <!-- tame limit its alpha effect-->
    <feComponentTransfer>
      <feFuncA type="table" tableValues="0 .3"></feFuncA>
    </feComponentTransfer>
    <!-- subtract noise alpha out of the SourceGraphic-->
    <feComposite in="SourceGraphic" operator="out"></feComposite>
  </filter>
</svg>
<div contenteditable="true">${encodedText}</div>
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

slice('${encodedText}').then(a => console.log(a));`;
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
    const result = await sliceMaker(text);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate slice image"
    });
  }
}