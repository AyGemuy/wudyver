const templates = [{
  html: ({
    text1,
    text2
  }) => `<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>Calendar</title>
  <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700,900" rel="stylesheet"><style>
  body {
	background: #ccc;
  display: grid;
	font: 87.5%/1.5em 'Lato', sans-serif;
	margin: 0;
  min-height: 100vh;
  -webkit-box-align: center;
      -ms-flex-align: center;
          align-items: center;
  justify-items: center;
  place-items: center;
}

table {
	border-collapse: collapse;
	border-spacing: 0;
}

td {
	padding: 0;
}

.calendar-container {
	position: relative;
	width: 450px;
}

.calendar-container header {
	border-radius: 1em 1em 0 0;
	background: #e66b6b;
	color: #fff;
	padding: 3em 2em;
}

.day {
	font-size: 8em;
	font-weight: 900;
	line-height: 1em;
}

.month {
	font-size: 4em;
	line-height: 1em;
	text-transform: lowercase;
}

.calendar {
	background: #fff;
	border-radius: 0 0 1em 1em;
	-webkit-box-shadow: 0 2px 1px rgba(0, 0, 0, .2), 0 3px 1px #fff;
	box-shadow: 0 2px 1px rgba(0, 0, 0, .2), 0 3px 1px #fff;
	color: #555;
	display: inline-block;
	padding: 2em;
}

.calendar thead {
	color: #e66b6b;
	font-weight: 700;
	text-transform: uppercase;
}

.calendar td {
	padding: .5em 1em;
	text-align: center;
}

.calendar tbody td:hover {
	background: #cacaca;
	color: #fff;
}

.current-day {
	color: #e66b6b;
}

.prev-month,
.next-month {
	color: #cacaca;
}

.ring-left,
.ring-right {
	position: absolute;
	top: 230px;
}

.ring-left { left: 2em; }
.ring-right { right: 2em; }

.ring-left:before,
.ring-left:after,
.ring-right:before,
.ring-right:after {
	background: #fff;
	border-radius: 4px;
	-webkit-box-shadow: 0 3px 1px rgba(0, 0, 0, .3), 0 -1px 1px rgba(0, 0, 0, .2);
	box-shadow: 0 3px 1px rgba(0, 0, 0, .3), 0 -1px 1px rgba(0, 0, 0, .2);
	content: "";
	display: inline-block;
	margin: 8px;
	height: 32px;
	width: 8px;
}</style>

</head>
<body>
<!-- partial:index.partial.html -->
<div class="container">

  <div class="calendar-container">

    <header>
      
      <div class="day">${text1}</div>
      <div class="month">${text2}</div>

    </header>

    <table class="calendar">
      
      <thead>

        <tr>

          <td>Mon</td>
          <td>Tue</td>
          <td>Wed</td>
          <td>Thu</td>
          <td>Fri</td>
          <td>Sat</td>
          <td>Sun</td>

        </tr>

      </thead>

      <tbody>

        <tr>
          <td class="prev-month">29</td>
          <td class="prev-month">30</td>
          <td class="prev-month">31</td>
          <td>1</td>
          <td>2</td>
          <td>3</td>
          <td>4</td>
        </tr>

        <tr>
          <td>5</td>
          <td>6</td>
          <td>7</td>
          <td>8</td>
          <td>9</td>
          <td>10</td>
          <td>11</td>
        </tr>

        <tr>
          <td>12</td>
          <td>13</td>
          <td>14</td>
          <td>15</td>
          <td>16</td>
          <td>17</td>
          <td class="current-day">18</td>
        </tr>

        <tr>
          <td>19</td>
          <td>20</td>
          <td>21</td>
          <td>22</td>
          <td>23</td>
          <td>24</td>
          <td>25</td>
        </tr>

        <tr>
          <td>26</td>
          <td>27</td>
          <td>28</td>
          <td>29</td>
          <td>30</td>
          <td>31</td>
          <td class="next-month">1</td>
        </tr>

      </tbody>

    </table>

    <div class="ring-left"></div>
    <div class="ring-right"></div>

  </div> <!-- end calendar-container -->

</div> <!-- end container -->
<!-- partial -->
  
</body>
</html>`
}, {
  html: ({
    text1,
    text2
  }) => `<!DOCTYPE html>
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
</html>`
}, {
  html: ({
    text1,
    text2
  }) => `<!DOCTYPE html>
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
</html>`
}];
const getTemplate = ({
  template: index = 1,
  text1,
  text2
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    text1: text1,
    text2: text2
  }) || "Template tidak ditemukan";
};
export default getTemplate;