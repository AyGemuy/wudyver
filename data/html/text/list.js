const templates = [{
  html: ({
    text
  }) => `<!DOCTYPE html>
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
              ${text}
              <span>${text}</span>
              <span>${text}</span>
          </div>
      </div>
    </body>
    </html>`
}, {
  html: ({
    text
  }) => `<!DOCTYPE html>
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
  <h1 class="text" contenteditable>${text}</h1>
</div>
  
</body>
</html>`
}, {
  html: ({
    text
  }) => `<!DOCTYPE html>
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
        <div class="oreo">${text}</div>
    </div>
    <script type="module" src="https://unpkg.com/@deckdeckgo/highlight-code@latest/dist/deckdeckgo-highlight-code/deckdeckgo-highlight-code.esm.js"></script>
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
  <title>PornHub logo</title>
  <style>
  html {
  height: 100%;
}

body {
  background: #000000;
  color: #ffffff;
  margin: 0;
  min-height: 100%;
  height: 100%;
  position: relative;
}

.hub {
  display: block;
  font-family: sans-serif;
  font-weight: bold;
  font-size: 9vw;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hub span:nth-child(2) {
  background: #FF9900;
  color: #000000;
  border-radius: 1vw;
  padding: 0 1vw 1vw 1vw;
  display: inline-block;
}
</style>
</head>
<body>
<!-- partial:index.partial.html -->
<div class="hub">
  <span contenteditable="true">${text1}</span>
  <span contenteditable="true">${text2}</span>
</div>
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
</html>`
}, {
  html: ({
    text
  }) => `<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>Fancy text shadow</title>
  <link href="https://fonts.googleapis.com/css?family=Anton" rel="stylesheet"><style>body {
  margin: 0;
}

.container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shadows {
  position: relative;
  text-transform: uppercase;
  text-shadow: -15px 5px 20px #ced0d3;
  color: white;
  letter-spacing: -0.05em;
  font-family: "Anton", Arial, sans-serif;
  -webkit-user-select: none;
     -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
  text-transform: uppercase;
  font-size: 150px;
  transition: all 0.25s ease-out;
}

.shadows:hover {
  text-shadow: -16px 6px 15px #ced0d3;
}</style>

</head>
<body>
<!-- partial:index.partial.html -->
<div class="container">
  <div class="shadows"><span>${text}</span></div>
</div>
<!-- partial -->
  <script src='https://cdnjs.cloudflare.com/ajax/libs/lettering.js/0.7.0/jquery.lettering.min.js'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js'></script>
</body>
</html>`
}, {
  html: ({
    text
  }) => `<!DOCTYPE html>
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
<div contenteditable="true">${text}</div>
<!-- partial -->

</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  text,
  text1,
  text2
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    text: text,
    text1: text1,
    text2: text2
  }) || "Template tidak ditemukan";
};
export default getTemplate;