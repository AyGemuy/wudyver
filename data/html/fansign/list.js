const templates = [{
  html: text => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
        }

        .meme-container {
            position: relative;
            display: inline-block;
            text-align: center;
        }

        .meme-container img {
            object-fit: cover;
        }

        .meme-text {
            position: absolute;
            top: 6%;
            left: 52%;
            transform: translateX(-50%);
            width: 45%; /* Memberi batas kiri dan kanan */
            color: black;
            font-family: 'Patrick Hand', cursive;
            font-size: 35px;
            font-weight: bold;
            text-align: center;
            word-wrap: break-word;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    <div class="meme-container">
        <img src="https://i.pinimg.com/originals/16/37/17/163717b994654c0bc17f7ae70a14615f.jpg" alt="Meme Image">
        <div class="meme-text">${text}</div>
    </div>

</body>
</html>`
}, {
  html: text => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
        }

        .meme-container {
            position: relative;
            display: inline-block;
            text-align: center;
        }

        .meme-container img {
            object-fit: cover;
        }

        .meme-text {
            position: absolute;
            top: 25%;
            left: 30%;
            transform: translateX(-50%);
            width: 45%; /* Memberi batas kiri dan kanan */
            color: black;
            font-family: 'Patrick Hand', cursive;
            font-size: 100px;
            font-weight: bold;
            text-align: center;
            word-wrap: break-word;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    <div class="meme-container">
        <img src="https://i.pinimg.com/originals/52/99/de/5299de50d2a4b9ece6a631ceb6cfd5b3.jpg" alt="Meme Image">
        <div class="meme-text">${text}</div>
    </div>

</body>
</html>`
}, {
  html: text => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
        }

        .meme-container {
            position: relative;
            display: inline-block;
            text-align: center;
        }

        .meme-container img {
            object-fit: cover;
        }

        .meme-text {
            position: absolute;
            top: 6%;
            left: 45%;
            transform: translateX(-50%);
            width: 50%; /* Memberi batas kiri dan kanan */
            color: black;
            font-family: 'Patrick Hand', cursive;
            font-size: 40px;
            font-weight: bold;
            text-align: center;
            word-wrap: break-word;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    <div class="meme-container">
        <img src="https://i.pinimg.com/originals/4b/fd/05/4bfd05293cd9fa7a9d22f71bb968ca44.jpg" alt="Meme Image">
        <div class="meme-text">${text}</div>
    </div>

</body>
</html>`
}, {
  html: text => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meme Generator</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
        }

        .meme-container {
            position: relative;
            display: inline-block;
            text-align: center;
        }

        .meme-container img {
            object-fit: cover;
        }

        .meme-text {
            position: absolute;
            bottom: 18%;
            left: 62%;
            transform: translateX(-50%);
            width: 45%; /* Memberi batas kiri dan kanan */
            color: black;
            font-family: 'Patrick Hand', cursive;
            font-size: 45px;
            font-weight: bold;
            text-align: center;
            word-wrap: break-word;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    <div class="meme-container">
        <img src="https://i.pinimg.com/originals/d8/56/01/d85601f6d14a4ed5f8542361da6f5594.png" alt="Meme Image">
        <div class="meme-text">${text}</div>
    </div>

</body>
</html>`
}];
const getTemplate = ({
  template: index = "1",
  text
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html(text) || "Template tidak ditemukan";
};
export default getTemplate;