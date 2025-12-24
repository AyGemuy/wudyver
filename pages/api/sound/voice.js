import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    type
  } = req.method === "GET" ? req.query : req.body;
  if (!type) {
    return res.status(400).json({
      error: 'Paramenter "type" diperlukan'
    });
  }
  const audioFiles = ["anjay", "ara-ara", "ara-ara-cowok", "ara-ara2", "arigatou", "assalamualaikum", "asu", "ayank", "aku-ngakak", "bacot", "bahagia-aku", "baka", "bansos", "beat-box", "beat-box2", "biasalah", "bidadari", "bot", "buka-pintu", "canda-anjing", "cepetan", "cuekin-terus", "daisuki-dayo", "daisuki", "dengan-mu", "gaboleh-gitu", "gak-lucu", "gamau", "gay", "gelay", "gitar", "gomenasai", "hai-bot", "hampa", "hayo", "hp-iphone", "i-like-you", "ih-wibu", "india", "karna-lo-wibu", "kiss", "kontol", "ku-coba", "maju-wibu", "makasih", "mastah", "nande-nande", "nani", "ngadi-ngadi", "nikah", "nuina", "onichan", "owner-sange", "ownerku", "pak-sapardi", "pale", "pantek", "pasi-pasi", "punten", "sayang", "siapa-sih", "sudah-biasa", "summertime", "tanya-bapak-lu", "to-the-bone", "wajib", "waku", "woi", "yamete", "yowaimo", "yoyowaimo"];
  const isNumeric = !isNaN(type);
  let audioUrl;
  if (isNumeric) {
    const index = parseInt(type);
    if (index >= 0 && index < audioFiles.length) {
      audioUrl = `https://raw.githubusercontent.com/AyGemuy/HAORI-API/main/audio/${audioFiles[index]}.mp3`;
    } else {
      return res.status(400).json({
        error: "Angka tidak valid untuk indeks array"
      });
    }
  } else {
    return res.status(400).json({
      error: 'Paramenter "type" harus berupa angka'
    });
  }
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      return res.status(500).json({
        error: "Gagal mengambil file audio"
      });
    }
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mp3");
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Error fetching audio file:", error);
    res.status(500).json({
      error: "Terjadi kesalahan saat mengambil file audio"
    });
  }
}