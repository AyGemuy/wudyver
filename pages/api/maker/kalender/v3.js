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
const pornhubMaker = async (left, right) => {
  const text1 = left;
  const text2 = right;
  const code = `const { chromium } = require('playwright');

async function pornhub(text1, text2) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const content = \`<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>Daily CSS Images | 09 | Calendar</title>
  <link href="https://fonts.googleapis.com/css?family=Kanit:300,700" rel="stylesheet"><style>
body {
  width: 50%;
  margin: 100px auto;
  background-color: lightgray;
  font-family: 'Kanit', sans-serif;
}

.calendar-base {
  width: 900px;
  height: 500px;
  border-radius: 20px;
  background-color: white;
  position: relative;
  z-index: -1;
  color: black;
}

.year {
  color: #E8E8E8;
  font-size: 30px;
  float: right;
  position: relative;
  right: 75px;
  top: 20px;
  font-weight: bold;
}

.triangle-left {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-right: 10px solid #E8E8E8;
  border-bottom: 5px solid transparent;
  float: right;
  position: relative;
  right: 90px;
  top: 36px;
}

.triangle-right {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-left: 10px solid #E8E8E8;
  border-bottom: 5px solid transparent;
  float: right;
  position: relative;
  left: 20px;
  top: 36px;
}
.triangle-left:hover{
  border-right: 10px solid#2ECC71;
}
.triangle-right:hover{
  border-left: 10px solid#2ECC71;
}

.month-color {
  color: #27AE60;
}
.month-hover:hover{
  color:#27e879 !important;
}

.months {
  color: #AAAAAA;
  position: relative;
  left: 350px;
  top: 90px;
  word-spacing: 10px;
}

.month-line {
  border-color: #E8E8E8;
  position: relative;
  top: 85px;
  width: 57%;
  left: 178px;
}

.days {
  color: #AAAAAA;
  position: relative;
  font-size: 18px;
  left: 355px;
  top: 80px;
  word-spacing: 35px;
  font-weight: 600;
}

.num-dates {
  float: right;
  position: relative;
  top: 110px;
  right: 50px;
  z-index: 1;
}

.first-week {
  margin-bottom: 25px;
  word-spacing: 55px;
}

.second-week {
  margin-bottom: 25px;
  word-spacing: 53px;
}

.third-week {
  margin-bottom: 25px;
  word-spacing: 58px;
}

.fourth-week {
  margin-bottom: 25px;
  word-spacing: 58px;
}

.fifth-week {
  margin-bottom: 25px;
  word-spacing: 56px;
}

.sixth-week {
  margin-bottom: 25px;
  word-spacing: 55px;
}

.active-day {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background-color: #2ECC71;
  position: relative;
  top: 295px;
  left: 661px;
}

.white {
  color: white;
}

.event-indicator {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #2980B9;
  position: relative;
  top: 304px;
  left: 695px;
}

.two {
  position: relative;
  top: 168px;
  left: 535px;
}

.grey {
  color: #AAAAB1;
}

.calendar-left {
  width: 300px;
  height: 500px;
  border-radius: 20px 0px 0px 20px;
  background-color: #2ECC71;
  position: relative;
  z-index: -1;
  bottom: 500px;
  color: white;
}

.hamburger {
  position: relative;
  top: 25px;
  left: 25px;
}

.burger-line:hover, .hamburger:hover{
  background-color:#27e879 !important;
}

.burger-line {
  width: 25px;
  height: 3px;
  background-color: white;
  border-radius: 15%;
  margin-bottom: 3px;
}

.num-date {
  font-size: 150px;
  width: 50%;
  margin: 0 auto;
  font-weight: 700;
}

.day {
  width: 50%;
  margin: 0px auto;
  font-size: 30px;
  position: relative;
  bottom: 60px;
}

.current-events {
  font-size: 15px;
  position: relative;
  margin-left: 25px;
  bottom: 30px;
}

.posts {
  text-decoration: underline dotted;
}
.posts:hover{
  color:#27e879 !important;
}

.create-event {
  font-size: 18px;
  position: relative;
  margin-top: 30px;
  margin-left: 25px;
}

.event-line {
  width: 90%;
}

.add-event {
  width: 20px;
  height: 20px;
  padding: 0px;
  border-radius: 50%;
  border: solid white 2px;
  position: relative;
  bottom: 42px;
  left: 260px;
}

.add {
  font-size: 25px;
  position: relative;
  left: 4px;
  bottom: 10px;
}

.add:hover, .create-event:hover, .add-event:hover{
  color:#27e879 !important;
  border-color: #27e879 !important;
}</style>
</head>
<body>
<!-- partial:index.partial.html -->
<div class="container">

  <div class="calendar-base">

    <div class="year">2025</div>
    <!-- year -->

    <div class="triangle-left"></div>
    <!--triangle -->
    <div class="triangle-right"></div>
    <!--  triangle -->

    <div class="months">
      <span class="month-hover">Jan</span>
      <span class="month-hover">Feb</span> 
      <span class="month-hover">Mar</span> 
      <strong class="month-color">Apr</strong>
      <span class="month-hover">May</span>
      <span class="month-hover">Jun</span>
      <span class="month-hover">July</span> 
      <span class="month-hover">Aug</span> 
      <span class="month-hover">Sep</span> 
      <span class="month-hover">Oct</span> 
      <span class="month-hover">Nov</span> 
      <span class="month-hover">Dec</span>
    </div><!-- months -->
    <hr class="month-line" />

    <div class="days">SUN MON TUE WED THU FRI SAT</div>
    <!-- days -->

    <div class="num-dates">

      <div class="first-week"><span class="grey">26 27 28 29 30 31</span> 01</div>
      <!-- first week -->
      <div class="second-week">02 03 04 05 06 07 08</div>
      <!-- week -->
      <div class="third-week"> 09 10 11 12 13 14 15</div>
      <!-- week -->
      <div class="fourth-week"> 16 17 18 19 20 21 22</div>
      <!-- week -->
      <div class="fifth-week"> 23 24 25 26 <strong class="white">27</strong> 28 29</div>
      <!-- week -->
      <div class="sixth-week"> 30 <span class="grey">01 02 03 04 05 06</span></div>
      <!-- week -->
    </div>
    <!-- num-dates -->
    <div class="event-indicator"></div>
    <!-- event-indicator -->
    <div class="active-day"></div>
    <!-- active-day -->
    <div class="event-indicator two"></div>
    <!-- event-indicator -->

  </div>
  <!-- calendar-base -->
  <div class="calendar-left">

    <div class="hamburger">
      <div class="burger-line"></div>
      <!-- burger-line -->
      <div class="burger-line"></div>
      <!-- burger-line -->
      <div class="burger-line"></div>
      <!-- burger-line -->
    </div>
    <!-- hamburger -->


    <div class="num-date">${text1}</div>
    <!--num-date -->
    <div class="day">${text2}</div>
    <!--day -->
    <div class="current-events">Current Events
      <br/>
      <ul>
        <li>Day 09 Daily CSS Image</li>
      </ul>
      <span class="posts">See post events</span></div>
    <!--current-events -->

    <div class="create-event">Create an Event</div>
    <!-- create-event -->
    <hr class="event-line" />
    <div class="add-event"><span class="add">+</span></div>
    <!-- add-event -->

  </div>
  <!-- calendar-left -->

</div>
<!-- container -->
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

pornhub('${text1}', '${text2}').then(a => console.log(a));`;
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
    const result = await pornhubMaker(text1, text2);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result, "base64"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to generate pornhub image"
    });
  }
}