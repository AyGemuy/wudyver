const templates = [{
  html: ({
    top,
    bottom,
    url
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <link href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@900&display=swap" rel="stylesheet">
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            font-family: 'Titillium Web', sans-serif; 
        }
        
        body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: black; 
            overflow: hidden; 
        }

        .meme-container { 
            position: absolute;
            inset: 0; /* Memastikan elemen mengisi seluruh layar */
            display: flex; 
            justify-content: center; 
            align-items: center; 
            overflow: hidden; 
        }

        .meme-container img { 
            width: 100vw; 
            height: 100vh; 
            object-fit: cover; /* Crop otomatis agar gambar mengisi layar */
            object-position: center; 
        }

        .meme-text { 
            position: absolute; 
            width: 90%; 
            text-align: center; 
            color: white; 
            font-weight: 900; 
            text-shadow: 2px 2px 4px black; 
            -webkit-text-stroke: 2px black;
            letter-spacing: 1px;
            padding: 10px; 
            line-height: 1.2; 
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .top-text { 
            top: 5%; 
            font-size: min(8vw, 10vh); /* Ukuran responsif */
        }

        .bottom-text { 
            bottom: 5%; 
            font-size: min(8vw, 10vh); /* Ukuran responsif */
        }
    </style>
</head>
<body>
    <div class="meme-container">
        <img src="${url}" alt="Meme">
        <div class="meme-text top-text">${top}</div>
        <div class="meme-text bottom-text">${bottom}</div>
    </div>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  top,
  bottom,
  url
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    top: top,
    bottom: bottom,
    url: url
  }) || "Template tidak ditemukan";
};
export default getTemplate;