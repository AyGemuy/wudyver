const templates = [{
  html: (photo, provinsi, kabupaten, nik, nama, ttl, gender, darah, alamat, rt, desa, kecamatan, agama, status, pekerjaan, kewarganegaraan, berlaku, dibuat, terbuat, sign) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>KTP Tanpa Label</title>
    <style>
        /* Definisikan font Open Sans Bold */
        @font-face {
            font-family: 'Open Sans Bold';
            src: url('https://befonts.com/wp-content/themes/befonts25/custom/fonts/OpenSans-Bold.ttf') format('truetype');
        }

        /* Definisikan font Open Sans Regular */
        @font-face {
            font-family: 'Open Sans Regular';
            src: url('https://befonts.com/wp-content/themes/befonts25/custom/fonts/OpenSans-Regular.ttf') format('truetype');
        }

        /* Definisikan font Bolmand Signature */
        @font-face {
            font-family: 'Bolmand Signature';
            src: url('https://befonts.com/wp-content/uploads/2025/02/bolmandsignature-0vr8r.ttf') format('truetype');
        }

        /* Definisikan font Bygone ST Typewriter */
        @font-face {
            font-family: 'Bygone ST Typewriter';
            src: url('https://befonts.com/wp-content/uploads/2023/01/bygonesttypewriterdemo-4b1dp.otf') format('opentype');
        }

        .ktp-container {
            position: relative;
            width: 720px;
            height: 430px;
            background-image: url('https://i.pinimg.com/originals/b3/68/ef/b368ef2afb6710cea75fa88371b2cd1e.jpg');
            background-size: cover;
            font-family: sans-serif; /* Fallback font */
            color: #000;
            padding: 20px; /* Adjust padding as needed */
            box-sizing: border-box;
        }

        .lokasi {
            position: absolute;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            width: 80%; /* Lebar 80% dari container */
        }

        .provinsi {
            display: block;
            font-family: 'Open Sans Bold', sans-serif;
            font-size: 28px;
            line-height: 1;
        }

        .kabupaten {
            display: block;
            font-family: 'Open Sans Bold', sans-serif;
            font-size: 28px;
            line-height: 1;
        }

        .nik-value {
            position: absolute;
            top: 98px;
            left: 180px;
            font-family: 'Bygone ST Typewriter', monospace;
            font-size: 22px;
        }

        .info-utama {
            position: absolute;
            left: 195px;
            top: 139px; /* Posisi awal grup info */
            font-family: 'Open Sans Regular', sans-serif;
            font-size: 16px;
            line-height: 1.4;
            font-weight: 700;
        }

        .info-kanan {
            position: absolute;
            right: 60px; /* Sesuaikan posisi horizontal */
            font-family: 'Open Sans Regular', sans-serif;
            font-size: 16px;
            line-height: 1.4;
            font-weight: 700;
            text-align: center;
        }

        .blood-container {
            top: 184px; /* Sesuaikan posisi vertikal, di bawah gender */
        right: 234px; /* Sesuaikan posisi vertikal */
        }

        .created-location-container {
            bottom: 60px; /* Sesuaikan posisi vertikal */
            right: 70px;
        }

        .created-date-container {
            bottom: 40px; /* Sesuaikan posisi vertikal */
            right: 67px;
        }

        .blood {
            display: block;
        }

        .created-location {
            display: block;
        }

        .created-date {
            display: block;
        }

        .photo-container {
            position: absolute;
            top: 125px;
            right: 15px;
            width: 178px;
            height: 220px;
            overflow: hidden;
            border: 1px solid #ccc; /* Optional border */
        }

        .photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .signature {
            position: absolute;
            right: 70px;
            bottom: 8px;
            font-family: 'Bolmand Signature', cursive;
            font-size: 30px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="ktp-container">
        <div class="lokasi">
            <div class="provinsi">PROVINSI ${provinsi}</div>
            <div class="kabupaten">KABUPATEN ${kabupaten}</div>
        </div>
        <div class="nik-value">${nik}</div>

        <div class="info-utama">
            <div>${nama}</div>
            <div>${ttl}</div>
            <div>${gender}</div>
            <div>${alamat}</div>
            <div>${rt}</div>
            <div>${desa}</div>
            <div>${kecamatan}</div>
            <div>${agama}</div>
            <div>${status}</div>
            <div>${pekerjaan}</div>
            <div>${kewarganegaraan}</div>
            <div>${berlaku}</div>
        </div>

        <div class="info-kanan blood-container">
            <div class="blood">${darah}</div>
        </div>

        <div class="info-kanan created-location-container">
            <div class="created-location">${dibuat}</div>
        </div>

        <div class="info-kanan created-date-container">
            <div class="created-date">${terbuat}</div>
        </div>

        <div class="photo-container">
            <img src="${photo}" alt="Foto" class="photo">
        </div>

        <div class="signature">${sign}</div>
    </div>
</body>
</html>`
}, {
  html: (photo, provinsi, kabupaten, nik, nama, ttl, gender, darah, alamat, rt, desa, kecamatan, agama, status, pekerjaan, kewarganegaraan, berlaku, dibuat, terbuat, sign) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>KTP Tanpa Label</title>
    <style>
        /* Definisikan font Open Sans Bold */
        @font-face {
            font-family: 'Open Sans Bold';
            src: url('https://befonts.com/wp-content/themes/befonts25/custom/fonts/OpenSans-Bold.ttf') format('truetype');
        }

        /* Definisikan font Open Sans Regular */
        @font-face {
            font-family: 'Open Sans Regular';
            src: url('https://befonts.com/wp-content/themes/befonts25/custom/fonts/OpenSans-Regular.ttf') format('truetype');
        }

        /* Definisikan font Bolmand Signature */
        @font-face {
            font-family: 'Bolmand Signature';
            src: url('https://befonts.com/wp-content/uploads/2025/02/bolmandsignature-0vr8r.ttf') format('truetype');
        }

        /* Definisikan font Bygone ST Typewriter */
        @font-face {
            font-family: 'Bygone ST Typewriter';
            src: url('https://befonts.com/wp-content/uploads/2023/01/bygonesttypewriterdemo-4b1dp.otf') format('opentype');
        }

        .ktp-container {
            position: relative;
            width: 735px;
            height: 463px;
            background-image: url('https://i.pinimg.com/originals/75/d3/80/75d380e895cbb523d9bf990ae7555fdf.jpg');
            background-size: cover;
            font-family: sans-serif; /* Fallback font */
            color: #000;
            padding: 20px; /* Adjust padding as needed */
            box-sizing: border-box;
        }

        .lokasi {
            position: absolute;
            top: 15px;
            left: 50%; /* Posisikan elemen di tengah horizontal */
            transform: translateX(-50%); /* Geser ke kiri setengah dari lebarnya agar benar-benar tengah */
            text-align: center; /* Tengahkan teks di dalam div */
            font-family: 'Open Sans Bold', sans-serif;
            font-size: 28px;
            line-height: 1; /* Atur line-height agar provinsi dan kabupaten berdekatan */
        }

        .provinsi {
            display: block; /* Membuat provinsi berada di baris baru */
        }

        .kabupaten {
            display: block; /* Membuat kabupaten berada di baris baru */
        }

        .nik-value {
            position: absolute;
            top: 83px;
            left: 155px;
            font-family: 'Bygone ST Typewriter', monospace;
            font-size: 22px;
        }

        .info-utama {
            position: absolute;
            left: 225px;
            top: 124px; /* Posisi awal grup info */
            font-family: 'Open Sans Regular', sans-serif;
            font-size: 16px;
            line-height: 1.4;
            font-weight: 700;
        }

        .info-kanan {
            position: absolute;
            right: 84px; /* Sesuaikan posisi horizontal */
            font-family: 'Open Sans Regular', sans-serif;
            font-size: 16px;
            line-height: 1.4;
            font-weight: 700;
            text-align: center;
        }

        .blood-container {
            top: 170px; /* Sesuaikan posisi vertikal, di bawah gender */
        right: 230px; /* Sesuaikan posisi vertikal */
        }

        .created-location-container {
            bottom: 130px; /* Sesuaikan posisi vertikal */
            right: 90px;
        }

        .created-date-container {
            bottom: 110px; /* Sesuaikan posisi vertikal */
            right: 87px;
        }

        .blood {
            display: block;
        }

        .created-location {
            display: block;
        }

        .created-date {
            display: block;
        }

        .photo-container {
            position: absolute;
            top: 94px;
            right: 35px;
            width: 170px;
            height: 210px;
            overflow: hidden;
            border: 1px solid #ccc; /* Optional border */
        }

        .photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .signature {
            position: absolute;
            right: 95px;
            bottom: 70px;
            font-family: 'Bolmand Signature', cursive;
            font-size: 30px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="ktp-container">
        <div class="lokasi">
            <div class="provinsi">PROVINSI ${provinsi}</div>
            <div class="kabupaten">KABUPATEN ${kabupaten}</div>
        </div>
        <div class="nik-value">${nik}</div>

        <div class="info-utama">
            <div>${nama}</div>
            <div>${ttl}</div>
            <div>${gender}</div>
            <div>${alamat}</div>
            <div>${rt}</div>
            <div>${desa}</div>
            <div>${kecamatan}</div>
            <div>${agama}</div>
            <div>${status}</div>
            <div>${pekerjaan}</div>
            <div>${kewarganegaraan}</div>
            <div>${berlaku}</div>
        </div>
        
        <div class="info-kanan blood-container">
            <div class="blood">${darah}</div>
        </div>

        <div class="info-kanan created-location-container">
            <div class="created-location">${dibuat}</div>
        </div>

        <div class="info-kanan created-date-container">
            <div class="created-date">${terbuat}</div>
        </div>

        <div class="photo-container">
            <img src="${photo}" alt="Foto" class="photo">
        </div>

        <div class="signature">${sign}</div>
    </div>
</body>
</html>`
}, {
  html: (photo, provinsi, kabupaten, nik, nama, ttl, gender, darah, alamat, rt, desa, kecamatan, agama, status, pekerjaan, kewarganegaraan, berlaku, dibuat, terbuat, sign) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>KTP Tanpa Label</title>
    <style>
        /* Definisikan font Open Sans Bold */
        @font-face {
            font-family: 'Open Sans Bold';
            src: url('https://befonts.com/wp-content/themes/befonts25/custom/fonts/OpenSans-Bold.ttf') format('truetype');
        }

        /* Definisikan font Open Sans Regular */
        @font-face {
            font-family: 'Open Sans Regular';
            src: url('https://befonts.com/wp-content/themes/befonts25/custom/fonts/OpenSans-Regular.ttf') format('truetype');
        }

        /* Definisikan font Bolmand Signature */
        @font-face {
            font-family: 'Bolmand Signature';
            src: url('https://befonts.com/wp-content/uploads/2025/02/bolmandsignature-0vr8r.ttf') format('truetype');
        }

        /* Definisikan font Bygone ST Typewriter */
        @font-face {
            font-family: 'Bygone ST Typewriter';
            src: url('https://befonts.com/wp-content/uploads/2023/01/bygonesttypewriterdemo-4b1dp.otf') format('opentype');
        }

        .ktp-container {
            position: relative;
            width: 735px;
            height: 477px;
            background-image: url('https://i.pinimg.com/originals/20/81/cf/2081cf22af8e8b58cc483fc847335532.jpg');
            background-size: cover;
            font-family: sans-serif; /* Fallback font */
            color: #000;
            padding: 20px; /* Adjust padding as needed */
            box-sizing: border-box;
        }

        .lokasi {
            position: absolute;
            top: 30px;
            left: 50%; /* Posisikan elemen di tengah horizontal */
            transform: translateX(-50%); /* Geser ke kiri setengah dari lebarnya agar benar-benar tengah */
            text-align: center; /* Tengahkan teks di dalam div */
            font-family: 'Open Sans Bold', sans-serif;
            font-size: 28px;
            line-height: 1; /* Atur line-height agar provinsi dan kabupaten berdekatan */
        }

        .provinsi {
            display: block; /* Membuat provinsi berada di baris baru */
        }

        .kabupaten {
            display: block; /* Membuat kabupaten berada di baris baru */
        }

        .nik-value {
            position: absolute;
            top: 108px;
            left: 200px;
            font-family: 'Bygone ST Typewriter', monospace;
            font-size: 22px;
        }

        .info-utama {
            position: absolute;
            left: 215px;
            top: 148px; /* Posisi awal grup info */
            font-family: 'Open Sans Regular', sans-serif;
            font-size: 16px;
            line-height: 1.3;
            font-weight: 700;
        }

        .info-kanan {
            position: absolute;
            right: 95px; /* Sesuaikan posisi horizontal */
            font-family: 'Open Sans Regular', sans-serif;
            font-size: 16px;
            line-height: 1.4;
            font-weight: 700;
            text-align: center;
        }

        .blood-container {
            top: 189px; /* Sesuaikan posisi vertikal, di bawah gender */
        right: 249px; /* Sesuaikan posisi vertikal */
        }

        .created-location-container {
            bottom: 110px; /* Sesuaikan posisi vertikal */
            right: 95px;
        }

        .created-date-container {
            bottom: 90px; /* Sesuaikan posisi vertikal */
            right: 91px;
        }

        .blood {
            display: block;
        }

        .created-location {
            display: block;
        }

        .created-date {
            display: block;
        }

        .photo-container {
            position: absolute;
            top: 130px;
            right: 45px;
            width: 170px;
            height: 210px;
            overflow: hidden;
            border: 1px solid #ccc; /* Optional border */
        }

        .photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .signature {
            position: absolute;
            right: 95px;
            bottom: 50px;
            font-family: 'Bolmand Signature', cursive;
            font-size: 30px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="ktp-container">
        <div class="lokasi">
            <div class="provinsi">PROVINSI ${provinsi}</div>
            <div class="kabupaten">KABUPATEN ${kabupaten}</div>
        </div>
        <div class="nik-value">${nik}</div>

        <div class="info-utama">
            <div>${nama}</div>
            <div>${ttl}</div>
            <div>${gender}</div>
            <div>${alamat}</div>
            <div>${rt}</div>
            <div>${desa}</div>
            <div>${kecamatan}</div>
            <div>${agama}</div>
            <div>${status}</div>
            <div>${pekerjaan}</div>
            <div>${kewarganegaraan}</div>
            <div>${berlaku}</div>
        </div>
        
        <div class="info-kanan blood-container">
            <div class="blood">${darah}</div>
        </div>

        <div class="info-kanan created-location-container">
            <div class="created-location">${dibuat}</div>
        </div>

        <div class="info-kanan created-date-container">
            <div class="created-date">${terbuat}</div>
        </div>

        <div class="photo-container">
            <img src="${photo}" alt="Foto" class="photo">
        </div>

        <div class="signature">${sign}</div>
    </div>
</body>
</html>`
}, {
  html: (photo, provinsi, kabupaten, nik, nama, ttl, gender, darah, alamat, rt, desa, kecamatan, agama, status, pekerjaan, kewarganegaraan, berlaku, dibuat, terbuat, sign) => `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>KTP Tanpa Label</title>
    <style>
        /* Definisikan font Open Sans Bold */
        @font-face {
            font-family: 'Open Sans Bold';
            src: url('https://befonts.com/wp-content/themes/befonts25/custom/fonts/OpenSans-Bold.ttf') format('truetype');
        }

        /* Definisikan font Open Sans Regular */
        @font-face {
            font-family: 'Open Sans Regular';
            src: url('https://befonts.com/wp-content/themes/befonts25/custom/fonts/OpenSans-Regular.ttf') format('truetype');
        }

        /* Definisikan font Bolmand Signature */
        @font-face {
            font-family: 'Bolmand Signature';
            src: url('https://befonts.com/wp-content/uploads/2025/02/bolmandsignature-0vr8r.ttf') format('truetype');
        }

        /* Definisikan font Bygone ST Typewriter */
        @font-face {
            font-family: 'Bygone ST Typewriter';
            src: url('https://befonts.com/wp-content/uploads/2023/01/bygonesttypewriterdemo-4b1dp.otf') format('opentype');
        }

        .ktp-container {
            position: relative;
            width: 1200px;
            height: 800px;
            background-image: url('https://assets.poskota.co.id/crop/original/medias/2025/Mar/14/nik-ktp.jpg');
            background-size: cover;
            font-family: sans-serif; /* Fallback font */
            color: #000;
            padding: 20px; /* Adjust padding as needed */
            box-sizing: border-box;
        }

        .lokasi {
            position: absolute;
            top: 80px;
            left: 55%; /* Posisikan elemen di tengah horizontal */
            transform: translateX(-50%); /* Geser ke kiri setengah dari lebarnya agar benar-benar tengah */
            text-align: center; /* Tengahkan teks di dalam div */
            font-family: 'Open Sans Bold', sans-serif;
            font-size: 32px;
            filter: blur(1.1px);
            line-height: 1; /* Atur line-height agar provinsi dan kabupaten berdekatan */
        }

        .provinsi {
            display: block; /* Membuat provinsi berada di baris baru */
        }

        .kabupaten {
            display: block; /* Membuat kabupaten berada di baris baru */
        }

        .nik-value {
            position: absolute;
            top: 150px;
            left: 350px;
            font-family: 'Bygone ST Typewriter', monospace;
            font-size: 36px;
            filter: blur(1.1px);
        }

        .info-utama {
            position: absolute;
            left: 352px;
            top: 229px; /* Posisi awal grup info */
            font-family: 'Open Sans Regular', sans-serif;
            font-size: 20px;
            line-height: 1.5;
            font-weight: 600;
            filter: blur(1.1px);
        }

        .info-kanan {
            position: absolute;
            right: 175px; /* Sesuaikan posisi horizontal */
            font-family: 'Open Sans Regular', sans-serif;
            font-size: 20px;
            line-height: 1.4;
            font-weight: 600;
            filter: blur(1.1px);
            text-align: center;
        }

        .blood-container {
            top: 287px; /* Sesuaikan posisi vertikal, di bawah gender */
        right: 357px; /* Sesuaikan posisi vertikal */
        }

        .created-location-container {
            bottom: 250px; /* Sesuaikan posisi vertikal */
            right: 155px;
        }

        .created-date-container {
            bottom: 220px; /* Sesuaikan posisi vertikal */
            right: 151px;
        }

        .blood {
            display: block;
        }

        .created-location {
            display: block;
        }

        .created-date {
            display: block;
        }

        .photo-container {
            position: absolute;
            top: 192px;
            right: 85px;
            width: 250px;
            height: 318px;
            overflow: hidden;
            border: 1px solid #ccc; /* Optional border */
        }

        .photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .signature {
            position: absolute;
            right: 155px;
            bottom: 140px;
            font-family: 'Bolmand Signature', cursive;
            font-size: 70px;
            font-style: italic;
            filter: blur(1.1px);
        }
    </style>
</head>
<body>
    <div class="ktp-container">
        <div class="lokasi">
            <div class="provinsi">PROVINSI ${provinsi}</div>
            <div class="kabupaten">KABUPATEN ${kabupaten}</div>
        </div>
        <div class="nik-value">${nik}</div>

        <div class="info-utama">
            <div>${nama}</div>
            <div>${ttl}</div>
            <div>${gender}</div>
            <div>${alamat}</div>
            <div>${rt}</div>
            <div>${desa}</div>
            <div>${kecamatan}</div>
            <div>${agama}</div>
            <div>${status}</div>
            <div>${pekerjaan}</div>
            <div>${kewarganegaraan}</div>
            <div>${berlaku}</div>
        </div>
        
        <div class="info-kanan blood-container">
            <div class="blood">${darah}</div>
        </div>

        <div class="info-kanan created-location-container">
            <div class="created-location">${dibuat}</div>
        </div>

        <div class="info-kanan created-date-container">
            <div class="created-date">${terbuat}</div>
        </div>

        <div class="photo-container">
            <img src="${photo}" alt="Foto" class="photo">
        </div>

        <div class="signature">${sign}</div>
    </div>
</body>
</html>`
}];
const getTemplate = ({
  template: index = 1,
  photo,
  provinsi,
  kabupaten,
  nik,
  nama,
  ttl,
  gender,
  darah,
  alamat,
  rt,
  desa,
  kecamatan,
  agama,
  status,
  pekerjaan,
  kewarganegaraan,
  berlaku,
  dibuat,
  terbuat,
  sign
}) => {
  const templateIndex = Number(index);
  return templates[templateIndex - 1]?.html(photo, provinsi, kabupaten, nik, nama, ttl, gender, darah, alamat, rt, desa, kecamatan, agama, status, pekerjaan, kewarganegaraan, berlaku, dibuat, terbuat, sign) || "Template tidak ditemukan";
};
export default getTemplate;