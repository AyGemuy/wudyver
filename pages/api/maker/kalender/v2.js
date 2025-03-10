import axios from "axios";
const runPlaywrightCode = async code => {
  try {
    const url = `https://${process.env.DOMAIN_URL}/api/tools/playwright`;
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
const pglassMaker = async (left, right) => {
  const text1 = left;
  const text2 = right;
  const code = `const { chromium } = require('playwright');

async function pglass(text1, text2) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>Calendar Glassmorphism</title>
  <style>
body{
background:linear-gradient(135deg, #2b89d6, #0e0b5d) no-repeat top center/cover;
  padding:0;
  margin:0;
  height:100%
  
}

.wrapper{
  width:420px;
  max-width:100%;
  height:690px;
  margin:2.5rem auto;
  border:1px solid rgba(0,0,0,.1);
  border-radius:25px;
 background:url(https://cdn.pixabay.com/photo/2013/07/21/13/00/rose-165819_1280.jpg) no-repeat center center/cover;
  position:relative;
  padding:3rem 1rem 1rem;
  font-family:sans-serif;
  box-shadow:1px 1px 2px rgba(0,0,0,.8),2px 2px 4px rgba(0,0,0,.6), 4px 4px 8px rgba(0,0,0,.4), 8px 8px 16px rgba(0,0,0,.2)
}

.date{
  font-weight:bold;  
  font-size:4rem;
  word-spacing:-20px;
    color:rgba(185,150,50,.9);
  mix-blend-mode:exclusion;
  margin-top:10%;
  text-align:left
    }


.date-day{
  font-size:1.5rem;
  
}
.date-month{
  font-weight:lighter
}
.date-year{
  font-size:2rem;
  display:inline-block;
  vertical-align:middle;
  margin-left:30px;
    
}

.calendar{
  border-radius:9px;
  background:rgba(255,255,255,0.1);
  border:1px solid rgba(155,155,155,0.1);
  backdrop-filter:blur(15px);
  -webkit-backdrop-filter:blur(15px);
  width:auto;
  height:auto;
  margin-top:2rem;
  display:grid;
  grid-template:auto/repeat(7,1fr);
  font-size:1.5rem;
  grid-gap:2rem 1rem;
  padding:2rem 1rem;
  color:#fff;
  place-items:center
  }

.days{
  font-weight:bold;
  font-size:1.5rem
}

.day{
  font-size:1.1rem
}

.days:nth-child(7), .day:nth-child(7n){
  color:cornflowerblue
  }

.event{
 font-weight:bold;
  color:#b58b7d !important
}


/*Mobile*/

@media only screen and (max-width:568px){
  .wrapper{
    width:auto
  }
}</style>
</head>
<body>
<!-- partial:index.partial.html -->
<!-- inspired by https://www.pinterest.de/pin/704180091762110326/-->
<body>
  <div class="wrapper">
  <div class="date">${text1}<!--Here will be displayed my phones Date/Time widget--><span class="date-day">th</span><br/>
    <span class="date-month"> November</span> <div class="date-year">${text2}<!--Here will be displayed my phones Date/Time widget--></div></div>
  <div class="calendar">
    <div class="days">Mo</div>
     <div class="days">Di</div>
     <div class="days">Mi</div>
     <div class="days">Do</div>
     <div class="days">Fr</div>
     <div class="days">Sa</div>
     <div class="days">So</div>
    <div class="day"></div>
    <div class="day"></div>
    <div class="day event">1</div>
    <div class="day">2</div>
    <div class="day">3</div>
    <div class="day">4</div>
    <div class="day">5</div>
    <div class="day">6</div>
    <div class="day">7</div>
    <div class="day">8</div>
    <div class="day">9</div>
    <div class="day">10</div>
    <div class="day">11</div>
    <div class="day event">12</div>
    <div class="day">13</div>
    <div class="day">14</div>
    <div class="day">15</div>
    <div class="day">16</div>
    <div class="day">17</div>
    <div class="day">18</div>
    <div class="day">19</div>
    <div class="day event">20</div>
    <div class="day">21</div>
    <div class="day">22</div>
    <div class="day">23</div>
    <div class="day">24</div>
    <div class="day">25</div>
    <div class="day">26</div>
    <div class="day">27</div>
    <div class="day event">28</div>
    <div class="day">29</div>
    <div class="day">30</div>
 
     </div>
  </div>
</body>
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

pglass('${text1}', '${text2}').then(a => console.log(a));`;
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
      error: "Text parameter is required"
    });
  }
  try {
    const result = await pglassMaker(text1, text2);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate pglass image"
    });
  }
}