const templates = [{
  html: (text, output) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks Justify di Background Putih</title>
    <link rel='stylesheet' href='https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@400&display=swap'>
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f0f0; }
        #container {
            position: relative;
            width: 600px;
            height: 600px;
            background-color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #textOverlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
            color: #000000;
            font-weight: 500;
            font-family: 'Noto Sans Display', arial_narrowregular, 'Arial Narrow', Arial, sans-serif;
            font-size: 280px;
            text-align: justify;
            filter: blur(1.2px);
            width: 90%;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="textOverlay"></div>
    </div>
    <script>
        const teks = document.getElementById('textOverlay');
        const wadah = document.getElementById('container');
        const kalimat = '${text}';
        const kataKata = kalimat.split(' ');
        let indeks = 0;
        const keluaran = '${output}';

        function aturUkuranFont() {
            const lebarTersedia = wadah.offsetWidth * 0.9;
            const elemenUkur = document.createElement('span');
            elemenUkur.style.visibility = 'hidden';
            elemenUkur.style.position = 'absolute';
            elemenUkur.style.whiteSpace = 'nowrap';
            elemenUkur.style.fontFamily = window.getComputedStyle(teks).fontFamily;
            elemenUkur.style.fontWeight = window.getComputedStyle(teks).fontWeight;
            document.body.appendChild(elemenUkur);

            let ukuranFontSaatIni = parseInt(window.getComputedStyle(teks).fontSize);

            if (keluaran === 'gif') {
                elemenUkur.textContent = teks.textContent + (indeks < kataKata.length ? " " + kataKata[indeks] : "");
            } else {
                elemenUkur.textContent = kataKata.join(" ");
            }

            while (elemenUkur.offsetWidth > lebarTersedia && ukuranFontSaatIni > 10) {
                ukuranFontSaatIni--;
                teks.style.fontSize = ukuranFontSaatIni + 'px';
                elemenUkur.style.fontSize = ukuranFontSaatIni + 'px';
            }

            document.body.removeChild(elemenUkur);
        }

        function tampilKataBerikutnya() {
            if (indeks < kataKata.length) {
                teks.textContent += (indeks === 0 ? "" : " ") + kataKata[indeks];
                indeks++;
                aturUkuranFont();
                if (keluaran === 'gif' && indeks < kataKata.length) setTimeout(tampilKataBerikutnya, 800);
            }
        }

        function tampilSemuaTeks() {
            teks.textContent = kataKata.join(" ");
            aturUkuranFont();
        }

        if (keluaran === 'gif') {
            tampilKataBerikutnya();
        } else {
            tampilSemuaTeks();
        }
    </script>
</body>
</html>`
}, {
  html: (text, output) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks Justify di Background Putih</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f0f0; }
        #container {
            position: relative;
            width: 600px;
            height: 600px;
            background-color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #textOverlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
            color: #000000;
            font-weight: 500;
            font-family: 'Poppins', sans-serif;
            font-size: 280px;
            text-align: justify;
            filter: blur(1.2px);
            width: 90%;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="textOverlay"></div>
    </div>
    <script>
        const teks = document.getElementById('textOverlay');
        const wadah = document.getElementById('container');
        const kalimat = '${text}';
        const kataKata = kalimat.split(' ');
        let indeks = 0;
        const keluaran = '${output}';

        function aturUkuranFont() {
            const lebarTersedia = wadah.offsetWidth * 0.9;
            const elemenUkur = document.createElement('span');
            elemenUkur.style.visibility = 'hidden';
            elemenUkur.style.position = 'absolute';
            elemenUkur.style.whiteSpace = 'nowrap';
            elemenUkur.style.fontFamily = window.getComputedStyle(teks).fontFamily;
            elemenUkur.style.fontWeight = window.getComputedStyle(teks).fontWeight;
            document.body.appendChild(elemenUkur);

            let ukuranFontSaatIni = parseInt(window.getComputedStyle(teks).fontSize);

            if (keluaran === 'gif') {
                elemenUkur.textContent = teks.textContent + (indeks < kataKata.length ? " " + kataKata[indeks] : "");
            } else {
                elemenUkur.textContent = kataKata.join(" ");
            }

            while (elemenUkur.offsetWidth > lebarTersedia && ukuranFontSaatIni > 10) {
                ukuranFontSaatIni--;
                teks.style.fontSize = ukuranFontSaatIni + 'px';
                elemenUkur.style.fontSize = ukuranFontSaatIni + 'px';
            }

            document.body.removeChild(elemenUkur);
        }

        function tampilKataBerikutnya() {
            if (indeks < kataKata.length) {
                teks.textContent += (indeks === 0 ? "" : " ") + kataKata[indeks];
                indeks++;
                aturUkuranFont();
                if (keluaran === 'gif' && indeks < kataKata.length) setTimeout(tampilKataBerikutnya, 800);
            }
        }

        function tampilSemuaTeks() {
            teks.textContent = kataKata.join(" ");
            aturUkuranFont();
        }

        if (keluaran === 'gif') {
            tampilKataBerikutnya();
        } else {
            tampilSemuaTeks();
        }
    </script>
</body>
</html>`
}, {
  html: (text, output) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks Justify di Background Putih</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f0f0; }
        #container {
            position: relative;
            width: 600px;
            height: 600px;
            background-color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #textOverlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
            color: #000000;
            font-weight: 500;
            font-family: 'Roboto', sans-serif;
            font-size: 280px;
            text-align: justify;
            filter: blur(1.2px);
            width: 90%;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="textOverlay"></div>
    </div>
    <script>
        const teks = document.getElementById('textOverlay');
        const wadah = document.getElementById('container');
        const kalimat = '${text}';
        const kataKata = kalimat.split(' ');
        let indeks = 0;
        const keluaran = '${output}';

        function aturUkuranFont() {
            const lebarTersedia = wadah.offsetWidth * 0.9;
            const elemenUkur = document.createElement('span');
            elemenUkur.style.visibility = 'hidden';
            elemenUkur.style.position = 'absolute';
            elemenUkur.style.whiteSpace = 'nowrap';
            elemenUkur.style.fontFamily = window.getComputedStyle(teks).fontFamily;
            elemenUkur.style.fontWeight = window.getComputedStyle(teks).fontWeight;
            document.body.appendChild(elemenUkur);

            let ukuranFontSaatIni = parseInt(window.getComputedStyle(teks).fontSize);

            if (keluaran === 'gif') {
                elemenUkur.textContent = teks.textContent + (indeks < kataKata.length ? " " + kataKata[indeks] : "");
            } else {
                elemenUkur.textContent = kataKata.join(" ");
            }

            while (elemenUkur.offsetWidth > lebarTersedia && ukuranFontSaatIni > 10) {
                ukuranFontSaatIni--;
                teks.style.fontSize = ukuranFontSaatIni + 'px';
                elemenUkur.style.fontSize = ukuranFontSaatIni + 'px';
            }

            document.body.removeChild(elemenUkur);
        }

        function tampilKataBerikutnya() {
            if (indeks < kataKata.length) {
                teks.textContent += (indeks === 0 ? "" : " ") + kataKata[indeks];
                indeks++;
                aturUkuranFont();
                if (keluaran === 'gif' && indeks < kataKata.length) setTimeout(tampilKataBerikutnya, 800);
            }
        }

        function tampilSemuaTeks() {
            teks.textContent = kataKata.join(" ");
            aturUkuranFont();
        }

        if (keluaran === 'gif') {
            tampilKataBerikutnya();
        } else {
            tampilSemuaTeks();
        }
    </script>
</body>
</html>`
}, {
  html: (text, output) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks Justify di Background Putih</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f0f0; }
        #container {
            position: relative;
            width: 600px;
            height: 600px;
            background-color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #textOverlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
            color: #000000;
            font-weight: 500;
            font-family: 'Montserrat', sans-serif;
            font-size: 280px;
            text-align: justify;
            filter: blur(1.2px);
            width: 90%;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="textOverlay"></div>
    </div>
    <script>
        const teks = document.getElementById('textOverlay');
        const wadah = document.getElementById('container');
        const kalimat = '${text}';
        const kataKata = kalimat.split(' ');
        let indeks = 0;
        const keluaran = '${output}';

        function aturUkuranFont() {
            const lebarTersedia = wadah.offsetWidth * 0.9;
            const elemenUkur = document.createElement('span');
            elemenUkur.style.visibility = 'hidden';
            elemenUkur.style.position = 'absolute';
            elemenUkur.style.whiteSpace = 'nowrap';
            elemenUkur.style.fontFamily = window.getComputedStyle(teks).fontFamily;
            elemenUkur.style.fontWeight = window.getComputedStyle(teks).fontWeight;
            document.body.appendChild(elemenUkur);

            let ukuranFontSaatIni = parseInt(window.getComputedStyle(teks).fontSize);

            if (keluaran === 'gif') {
                elemenUkur.textContent = teks.textContent + (indeks < kataKata.length ? " " + kataKata[indeks] : "");
            } else {
                elemenUkur.textContent = kataKata.join(" ");
            }

            while (elemenUkur.offsetWidth > lebarTersedia && ukuranFontSaatIni > 10) {
                ukuranFontSaatIni--;
                teks.style.fontSize = ukuranFontSaatIni + 'px';
                elemenUkur.style.fontSize = ukuranFontSaatIni + 'px';
            }

            document.body.removeChild(elemenUkur);
        }

        function tampilKataBerikutnya() {
            if (indeks < kataKata.length) {
                teks.textContent += (indeks === 0 ? "" : " ") + kataKata[indeks];
                indeks++;
                aturUkuranFont();
                if (keluaran === 'gif' && indeks < kataKata.length) setTimeout(tampilKataBerikutnya, 800);
            }
        }

        function tampilSemuaTeks() {
            teks.textContent = kataKata.join(" ");
            aturUkuranFont();
        }

        if (keluaran === 'gif') {
            tampilKataBerikutnya();
        } else {
            tampilSemuaTeks();
        }
    </script>
</body>
</html>`
}, {
  html: (text, output) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks Justify di Background Putih</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f0f0; }
        #container {
            position: relative;
            width: 600px;
            height: 600px;
            background-color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #textOverlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
            color: #000000;
            font-weight: 500;
            font-family: 'Playfair Display', serif;
            font-size: 280px;
            text-align: justify;
            filter: blur(1.2px);
            width: 90%;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="textOverlay"></div>
    </div>
    <script>
        const teks = document.getElementById('textOverlay');
        const wadah = document.getElementById('container');
        const kalimat = '${text}';
        const kataKata = kalimat.split(' ');
        let indeks = 0;
        const keluaran = '${output}';

        function aturUkuranFont() {
            const lebarTersedia = wadah.offsetWidth * 0.9;
            const elemenUkur = document.createElement('span');
            elemenUkur.style.visibility = 'hidden';
            elemenUkur.style.position = 'absolute';
            elemenUkur.style.whiteSpace = 'nowrap';
            elemenUkur.style.fontFamily = window.getComputedStyle(teks).fontFamily;
            elemenUkur.style.fontWeight = window.getComputedStyle(teks).fontWeight;
            document.body.appendChild(elemenUkur);

            let ukuranFontSaatIni = parseInt(window.getComputedStyle(teks).fontSize);

            if (keluaran === 'gif') {
                elemenUkur.textContent = teks.textContent + (indeks < kataKata.length ? " " + kataKata[indeks] : "");
            } else {
                elemenUkur.textContent = kataKata.join(" ");
            }

            while (elemenUkur.offsetWidth > lebarTersedia && ukuranFontSaatIni > 10) {
                ukuranFontSaatIni--;
                teks.style.fontSize = ukuranFontSaatIni + 'px';
                elemenUkur.style.fontSize = ukuranFontSaatIni + 'px';
            }

            document.body.removeChild(elemenUkur);
        }

        function tampilKataBerikutnya() {
            if (indeks < kataKata.length) {
                teks.textContent += (indeks === 0 ? "" : " ") + kataKata[indeks];
                indeks++;
                aturUkuranFont();
                if (keluaran === 'gif' && indeks < kataKata.length) setTimeout(tampilKataBerikutnya, 800);
            }
        }

        function tampilSemuaTeks() {
            teks.textContent = kataKata.join(" ");
            aturUkuranFont();
        }

        if (keluaran === 'gif') {
            tampilKataBerikutnya();
        } else {
            tampilSemuaTeks();
        }
    </script>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  text,
  output
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html(text, output) || "Template tidak ditemukan";
};
export default getTemplate;