const templates = [{
  html: ({
    text,
    output
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
    <style>
        body, html {
            margin: 10px;
            padding: 10px;
            width: 100vw;
            height: 100vh;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }

        .teks {
            font-family: 'Anton', sans-serif;
            font-weight: bold;
            text-align: center;
            -webkit-text-stroke: 1px black;
            letter-spacing: 2px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 90vw;
            max-height: 90vh;
            font-size: 10vw; /* Default ukuran awal */
        }
    </style>
    <title>Teks Dinamis</title>
</head>
<body>
    <div class="teks" id="teks">
        ${text}
    </div>

    <script>
        var type = "${output}"; // Ubah ke "png" untuk teks statis, "gif" untuk animasi

        function adjustFontSize() {
            var container = document.getElementById("teks");
            var fontSize = 10; // Ukuran awal
            container.style.fontSize = fontSize + "vw";

            var maxWidth = window.innerWidth * 0.9;
            var maxHeight = window.innerHeight * 0.9;

            while (container.scrollWidth < maxWidth && container.scrollHeight < maxHeight) {
                fontSize += 1;
                container.style.fontSize = fontSize + "vw";
                if (container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) {
                    fontSize -= 1;
                    container.style.fontSize = fontSize + "vw";
                    break;
                }
            }

            while ((container.scrollWidth > maxWidth || container.scrollHeight > maxHeight) && fontSize > 1) {
                fontSize -= 1;
                container.style.fontSize = fontSize + "vw";
            }
        }

        function getRandomColor() {
            var r = Math.floor(Math.random() * 255);
            var g = Math.floor(Math.random() * 255);
            var b = Math.floor(Math.random() * 255);
            return "rgb(" + r + "," + g + "," + b + ")";
        }

        function animateTextColor() {
            var teks = document.getElementById("teks");

            if (type === "gif") {
                setInterval(function () {
                    teks.style.color = getRandomColor();
                }, 100); // Warna berubah setiap 500ms
            } else {
                teks.style.color = "#FFFFFF"; // Warna default (putih) jika type = "png"
            }
        }

        window.onload = function () {
            adjustFontSize();
            animateTextColor();
        };

        window.onresize = adjustFontSize;
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
  return templates[templateIndex - 1]?.html({
    text: text,
    output: output
  }) || "Template tidak ditemukan";
};
export default getTemplate;