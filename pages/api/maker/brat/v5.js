import axios from 'axios';

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

const runPlaywrightCode = async (code) => {
  try {
    const url = 'https://try.playwright.tech/service/control/run';
    const headers = {
      'authority': 'try.playwright.tech',
      'accept': '*/*',
      'content-type': 'application/json',
      'origin': 'https://try.playwright.tech',
      'referer': 'https://try.playwright.tech/?l=playwright-test',
      'user-agent': 'Postify/1.0.0',
    };
    const data = {
      code: code,
      language: 'javascript',
    };
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error running playwright code:', error);
    throw error;
  }
};

const bratMaker = async (text) => {
  const encodedText = escapeHTML(text).replace(/\n/g, '<br>');
  
  const code = `const { chromium } = require('playwright');

async function brat(text) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Text Box Generator</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      height: 100vh;
      background-color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;
    }

    .text-box {
      width: 800px;
      height: 800px;
      padding: 20px;
      box-sizing: border-box;
      background-color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: justify;
      word-wrap: break-word;
      overflow: hidden;
      white-space: normal;
      font-weight: 600;
      filter: blur(3px);
    }

    .text-box p {
      margin: 0;
      word-break: break-word;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="text-box">
    <p id="text-content">${encodedText}</p>
  </div>

  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script>
    var width = 800;
    var height = 800;

    var $container = $('.text-box');

    var textDimensions = (function() {
       var $div = $('<div>')
       .css({
         position: 'absolute',
         visibility: 'hidden'
       }).appendTo($('body'));
      
      return function(text, css) {
        $div.text(text);
        $div.css(css);
        
        return {
          width: $div.width(),
          height: $div.height()
        };
      };
    }) ();


    function update() {
      var low = 0;
      var high = 512;
      var fontSize = 512;
      var textHeight;
      var dimensions;
      
      while (low <= high) {
        fontSize = Math.round((low + high) / 2);
        dimensions = textDimensions($container.text(), {
          fontSize: fontSize + 'px',
          width: width - 40 + 'px'
        });
        
        textHeight = dimensions.height;
        
        if ( textHeight < height - 40 ) {
          low = fontSize + 1;
        } else if ( textHeight > height - 40 ) {
          high = fontSize - 1;
        } else {
          break;
        }
      }
      
      if ( textHeight > height - 40 ) {
        fontSize--;
      }
      
      $container.css('font-size', fontSize + 'px');
    }

    $(document).ready(function() {
      update();
    });
  </script>
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

brat('${encodedText}').then(a => console.log(a));`;

  const { output } = await runPlaywrightCode(code.trim());
  return output;
};

export default async function handler(req, res) {
  const { method } = req;
  const { text } = req.method === 'GET' ? req.query : req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  try {
    const result = await bratMaker(text);
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(Buffer.from(result, 'base64'));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate brat image' });
  }
}
