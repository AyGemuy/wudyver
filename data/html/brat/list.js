const templates = [{
  html: ({
    text,
    output
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks Handwriting Blur</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@400&display=swap">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Noto Sans Display', sans-serif; 
            background: white; 
            padding: 8vw; 
            overflow: hidden; 
        }
        .text { 
            font-size: 12vw; 
            font-weight: 400; 
            color: rgba(0, 0, 0, 0.85); 
            filter: blur(2.5px); 
            line-height: 1.3; 
            letter-spacing: -6px; /* Mengurangi jarak antar huruf */
            word-spacing: 24px; /* Menambah jarak antar kata */
            word-wrap: break-word; 
            overflow-wrap: break-word; 
        }
    </style>
</head>
<body>
    <div class="text" id="text"></div>

    <script>
        const output = "${output}";
        const text = "${text}";
        const container = document.getElementById("text");
        const words = text.split(" ");
        let index = 0;

        function updateFontSize() {
            let fontSize = 12;
            container.style.fontSize = fontSize + "vw";

            while (container.scrollHeight < window.innerHeight * 0.9 && fontSize < 24) {
                fontSize++;
                container.style.fontSize = fontSize + "vw";
            }
        }

        function showNextWord() {
            if (index < words.length) {
                container.innerHTML += words[index] + " ";
                index++;
                updateFontSize();
                if (output === 'gif') setTimeout(showNextWord, 500);
            }
        }

        if (output === 'gif') {
            showNextWord();
        } else {
            container.innerHTML = text;
            updateFontSize();
        }
    </script>
</body>
</html>`
}, {
  html: ({
    text,
    output
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks Handwriting Blur</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@400&display=swap">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Noto Sans Display', sans-serif; 
            background: white; 
            padding: 10vw; /* Jarak dari semua sisi */
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }
        .text { 
            font-size: 12vw; 
            font-weight: 400; 
            color: rgba(0, 0, 0, 0.85); 
            filter: blur(2.5px); 
            line-height: 1.3; 
            letter-spacing: -6px; /* Mengurangi jarak antar huruf */
            word-spacing: 24px; /* Menambah jarak antar kata */
            word-wrap: break-word; 
            overflow-wrap: break-word; 
            max-width: 80vw; /* Membatasi lebar teks agar tidak terlalu lebar */
            text-align: center;
            margin: auto; /* Memastikan teks tidak menempel ke tepi */
        }
    </style>
</head>
<body>
    <div class="text" id="text"></div>

    <script>
        const output = "${output}";
        const text = "${text}";
        const container = document.getElementById("text");
        const words = text.split(" ");
        let index = 0;

        function updateFontSize() {
            let fontSize = 12;
            container.style.fontSize = fontSize + "vw";

            while (container.scrollHeight < window.innerHeight * 0.8 && fontSize < 24) {
                fontSize++;
                container.style.fontSize = fontSize + "vw";
            }
        }

        function showNextWord() {
            if (index < words.length) {
                container.innerHTML += words[index] + " ";
                index++;
                updateFontSize();
                if (output === 'gif') setTimeout(showNextWord, 500);
            }
        }

        if (output === 'gif') {
            showNextWord();
        } else {
            container.innerHTML = text;
            updateFontSize();
        }
    </script>
</body>
</html>`
}];
const getTemplate = ({
  template: index = "1",
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