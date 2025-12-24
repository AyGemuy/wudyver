import apiConfig from "@/configs/apiConfig";
const templates = [{
  html: ({
    text,
    date,
    color
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buku Tulis Digital</title>
    <link href="https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap" rel="stylesheet">
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
            margin: 0;
            padding: 10px;
        }
        .notebook {
            position: relative;
            width: 100%;
            max-width: 794px;
            height: auto;
            aspect-ratio: 794 / 1123;
            background: url('https://i.pinimg.com/originals/d8/27/65/d82765c86b9769144ea27e800880f6d8.jpg') no-repeat center/cover;
            box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
        }
        .date {
            position: absolute;
            top: 108px; /* Ubah posisi tanggal */
            right: 80px;
            font-size: 23px;
            font-family: 'Indie Flower', cursive;
            color: ${color};
        }
        .text {
            position: absolute;
            top: 150px; /* Ubah posisi teks ke bawah */
            left: 80px; /* Ubah posisi teks ke kanan */
            right: 10%; /* Agar teks tidak keluar batas */
            font-size: 21px;
            font-family: 'Indie Flower', cursive;
            color: ${color};
            line-height: 1.5;
            word-wrap: break-word;
            white-space: normal;
            text-align: left;
        }
    </style>
</head>
<body>

<div class="notebook">
    <div class="date">${date}</div> <!-- Edit tanggal manual -->
    <div class="text">${text}</div>
</div>

</body>
</html>`
}, {
  html: ({
    text,
    date,
    color
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks di Atas Kertas</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            background-color: #f5f5f5;
        }

        .container {
            position: relative;
        }

        .paper {
            display: block;
            height: auto;
        }

        .text {
            position: absolute;
            top: 130px; /* Posisi awal teks */
            left: 15%;
            width: 90%;
            font-family: 'Indie Flower', cursive;
            font-size: 24px;
            line-height: 1.5;
            white-space: pre-line; /* Memastikan newline tetap diikuti */
            word-wrap: break-word;
            overflow-wrap: break-word;
            text-align: left; /* Rata kiri */
            color: ${color};
        }

        .date {
            position: absolute;
            top: 5%;
            right: 20%;
            font-size: 22px;
            font-family: 'Indie Flower', cursive;
            color: ${color};
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="https://${apiConfig.DOMAIN_URL}/images/kertas/sebelumkiri.jpg" alt="Kertas" class="paper">
        <div class="date">${date}</div>
        <div class="text">${text}</div>
    </div>
</body>
</html>`
}, {
  html: ({
    text,
    date,
    color
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks di Atas Kertas</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            background-color: #f5f5f5;
        }

        .container {
            position: relative;
        }

        .paper {
            display: block;
            height: auto;
        }

        .text {
            position: absolute;
            top: 105px; /* Posisi awal teks */
            left: 15%;
            width: 90%;
            font-family: 'Indie Flower', cursive;
            font-size: 24px;
            line-height: 1.6;
            white-space: pre-line; /* Memastikan newline tetap diikuti */
            word-wrap: break-word;
            overflow-wrap: break-word;
            text-align: left; /* Rata kiri */
            color: ${color};
        }

        .date {
            position: absolute;
            top: 3%;
            right: 18%;
            font-size: 22px;
            font-family: 'Indie Flower', cursive;
            color: ${color};
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="https://${apiConfig.DOMAIN_URL}/images/kertas/sebelumkanan.jpg" alt="Kertas" class="paper">
        <div class="date">${date}</div>
        <div class="text">${text}</div>
    </div>
</body>
</html>`
}, {
  html: ({
    text,
    date,
    color
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks di Atas Kertas</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            background-color: #f5f5f5;
        }

        .container {
            position: relative;
        }

        .paper {
            display: block;
            height: auto;
        }

        .text {
            position: absolute;
            top: 165px; /* Posisi awal teks */
            left: 15%;
            width: 80%;
            font-family: 'Indie Flower', cursive;
            font-size: 26px;
            line-height: 1.5;
            white-space: pre-line; /* Memastikan newline tetap diikuti */
            word-wrap: break-word;
            overflow-wrap: break-word;
            text-align: left; /* Rata kiri */
            color: ${color};
        }

        .date {
            position: absolute;
            top: 5%;
            right: 25%;
            font-size: 24px;
            font-family: 'Indie Flower', cursive;
            color: ${color};
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="https://${apiConfig.DOMAIN_URL}/images/kertas/foliokiri.jpg" alt="Kertas" class="paper">
        <div class="date">${date}</div>
        <div class="text">${text}</div>
    </div>
</body>
</html>`
}, {
  html: ({
    text,
    date,
    color
  }) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teks di Atas Kertas</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            background-color: #f5f5f5;
        }

        .container {
            position: relative;
        }

        .paper {
            display: block;
            height: auto;
        }

        .text {
            position: absolute;
            top: 170px; /* Posisi awal teks */
            left: 15%;
            width: 90%;
            font-family: 'Indie Flower', cursive;
            font-size: 24px;
            line-height: 1.6;
            white-space: pre-line; /* Memastikan newline tetap diikuti */
            word-wrap: break-word;
            overflow-wrap: break-word;
            text-align: left; /* Rata kiri */
            color: ${color};
        }

        .date {
            position: absolute;
            top: 5%;
            right: 25%;
            font-size: 24px;
            font-family: 'Indie Flower', cursive;
            color: ${color};
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="https://${apiConfig.DOMAIN_URL}/images/kertas/foliokanan.jpg" alt="Kertas" class="paper">
        <div class="date">${date}</div>
        <div class="text">${text}</div>
    </div>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  text,
  date,
  color
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html({
    text: text,
    date: date,
    color: color
  }) || "Template tidak ditemukan";
};
export default getTemplate;