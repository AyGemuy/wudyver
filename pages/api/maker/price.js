import apiConfig from "@/configs/apiConfig";
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
    const url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    const headers = {
      accept: "*/*",
      "content-type": "application/json",
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
const priceMaker = async (a, b, c, d) => {
  const desc = escapeHTML(text);
  const code = `const { chromium } = require('playwright');

async function price(a, b, c, d) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>ui card</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/5.0.0/normalize.min.css">
<link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css'><style>* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: Lato, sans-serif;
}

.container {
  height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.box {
  background: linear-gradient(0deg, #202022, #464646);
  margin-top: 10px;
  margin-left: 30px;
  margin-right: 30px;
  width: 230px;
  min-height: 400;
  padding-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-top-left-radius: 50px;
  border-top-right-radius: 50px;
  border-bottom-left-radius: 150px;
  border-bottom-right-radius: 150px;
  border: 3px solid #ffc98e;
  box-shadow: 0 0 0 6px #323232, 0 0 0 10px #ffc98e, 0 0 0 20px #323232, 0 10px 150px black;
  position: relative;
  z-index: 999;
  overflow: hidden;
  transition: 0.5s;
}
.box:hover {
  transform: scale(1.1);
}
.box:after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 50%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  z-index: -1;
}
.box .title {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.box .title i {
  color: #ffc98e;
  font-size: 40px;
  margin-bottom: 20px;
}
.box .title h4 {
  color: #fff;
  font-size: 20px;
  font-weight: normal;
  letter-spacing: 1px;
  margin-bottom: 20px;
}
.box .price {
  color: #ffc98e;
  font-size: 40px;
  margin-bottom: 10px;
}
.box .options li {
  list-style: none;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
  line-height: 30px;
  letter-spacing: 2px;
  font-size: 12px;
}
.box .button {
  margin-top: 30px;
  margin-bottom: 30px;
}
.box .button a {
  text-decoration: none;
  font-weight: 700;
  font-size: 12px;
  padding: 7px 19px;
  background: #ffc98e;
  border-radius: 5px;
  color: #464646;
}</style>

</head>
<body>
<!-- partial:index.partial.html -->
<div class="container">
  <div class="box">
    <div class="title"><i class="fa fas fa-paper-plane"></i>
      <h4>${a}</h4>
    </div>
    <div class="price">
      <h4><sup>$</sup>${b}</h4>
    </div>
    <div class="options">
      <ul>
        <li> <i class="fa fas fa-check">${c}</i></li>
      </ul>
    </div>
    <div class="button"><a href="#">${d}</a></div>
  </div>
  
</div>
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

price('${a}', '${b}', '${c}', '${d}').then(a => console.log(a));`;
  const {
    output
  } = await runPlaywrightCode(code.trim());
  return output;
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  let {
    title,
    text,
    usd,
    button
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Text parameter is required"
    });
  }
  try {
    const result = await priceMaker(title = "Title", text = "Text", usd = "50", button = "Get it");
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate price image"
    });
  }
}