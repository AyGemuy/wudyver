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
            left: 45%;
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
            display: block;
            width: 100%;
            height: auto;
        }

        .meme-text {
            position: absolute;
            bottom: 5%; /* Posisi teks di bagian bawah */
            left: 50%;
            transform: translateX(-50%);
            width: 90%; /* Menyesuaikan lebar teks */
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
            display: block;
            width: 100%;
            height: auto;
        }

        .meme-text {
            position: absolute;
            top: 32%; /* Posisi teks di bagian bawah */
            left: 72%;
            transform: translateX(-50%);
            width: 28%; /* Menyesuaikan lebar teks */
            color: black;
            font-family: 'Patrick Hand', cursive;
            font-size: 25px;
            font-weight: bold;
            text-align: center;
            word-wrap: break-word;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    <div class="meme-container">
        <img src="https://i.pinimg.com/originals/97/8a/ad/978aad731ecea982769174d6114778ca.jpg" alt="Meme Image">
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
            display: block;
            width: 100%;
            height: auto;
        }

        .meme-text {
            position: absolute;
            bottom: 25%; /* Posisi teks di bagian bawah */
            left: 65%;
            transform: translateX(-50%) rotate(3deg);
            width: 40%; /* Menyesuaikan lebar teks */
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
        <img src="https://i.pinimg.com/originals/b4/51/b2/b451b228a66d109a072017a0a92f4f6b.jpg" alt="Meme Image">
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
            display: block;
            width: 100%;
            height: auto;
        }

        .meme-text {
            position: absolute;
            bottom: 45%; /* Posisi teks di bagian bawah */
            right: 7%;
            transform: translateX(-50%);
            width: 20%; /* Menyesuaikan lebar teks */
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
        <img src="https://i.pinimg.com/originals/89/ab/c6/89abc6e42ffe2c34a50226fff3fa6cbf.jpg" alt="Meme Image">
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
            display: block;
            width: 100%;
            height: auto;
        }

        .meme-text {
            position: absolute;
            bottom: 28%; /* Posisi teks di bagian bawah */
            left: 40%;
            transform: translateX(-50%) rotate(-4deg);
            width: 45%; /* Menyesuaikan lebar teks */
            color: black;
            font-family: 'Patrick Hand', cursive;
            font-size: 25px;
            font-weight: bold;
            text-align: center;
            word-wrap: break-word;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    <div class="meme-container">
        <img src="https://i.pinimg.com/originals/f7/e6/60/f7e660e632c8382ac2d524c504e50dcc.png" alt="Meme Image">
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
            display: block;
            width: 100%;
            height: auto;
        }

        .meme-text {
            position: absolute;
            bottom: 25%; /* Posisi teks di bagian bawah */
            left: 53%;
            transform: translateX(-50%) rotate(-4deg);
            width: 46%; /* Menyesuaikan lebar teks */
            color: black;
            font-family: 'Patrick Hand', cursive;
            font-size: 63px;
            font-weight: bold;
            text-align: center;
            word-wrap: break-word;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    <div class="meme-container">
        <img src="https://i.pinimg.com/originals/f4/b6/99/f4b69979d8f56fcf37f2553dcd877a53.jpg" alt="Meme Image">
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
            display: block;
            width: 100%;
            height: auto;
        }

        .meme-text {
            position: absolute;
            bottom: 23%; /* Posisi teks di bagian bawah */
            left: 45%;
            transform: translateX(-50%) rotate(-9deg);
            width: 55%; /* Menyesuaikan lebar teks */
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
        <img src="https://i.pinimg.com/originals/17/c3/af/17c3afdac42bb0d7a47fd57a94a505c5.jpg" alt="Meme Image">
        <div class="meme-text">${text}</div>
    </div>

</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  text
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html(text) || "Template tidak ditemukan";
};
export default getTemplate;