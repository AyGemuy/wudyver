import fetch from "node-fetch";
const availableFiles = ["aesthetic", "ahegao", "akira", "akiyama", "ana", "anjing", "ass", "asuna", "ayuzawa", "bdsm", "blackpink", "blowjob", "boneka", "boruto", "cecan", "cecan2", "cecan3", "cecan4", "cecan5", "chiho", "china", "chitoge", "cogan", "cogan2", "cosplay", "cosplayloli", "cosplaysagiri", "cuckold", "cum", "cyberspace", "deidara", "doraemon", "eba", "elaina", "emilia", "ero", "erza", "femdom", "foot", "gangbang", "gifs", "glasses", "gremory", "hekel", "hentai", "hestia", "hinata", "inori", "Islamic", "isuzu", "itachi", "itori", "jahy", "jeni", "jiso", "justina", "kaga", "kagura", "kakasih", "kaori", "kartun", "katakata", "keneki", "kotori", "kpop", "kucing", "kurumi", "lisa", "loli", "madara", "manga", "masturbation", "megumin", "mikasa", "miku", "minato", "mobil", "montor", "mountain", "naruto", "neko", "neko2", "nekonime", "nezuko", "nsfwloli", "onepiece", "orgy", "panties", "pentol", "pokemon", "ppcouple", "programing", "profilwa", "pubg", "pussy", "rize", "rose", "ryujin", "sagiri", "sakura", "sasuke", "satanic", "shina", "shinka", "shinomiya", "shizuka", "shota", "tatasurya", "tejina", "technology", "tentacles", "thighs", "toukachan", "tsunade", "waifu", "waifu2", "wallhp", "yotsuba", "yuki", "yulibocil", "yumeko", "yuri", "zettai"];
export default async function handler(req, res) {
  const {
    text,
    random
  } = req.method === "GET" ? req.query : req.body;
  if (!text || !availableFiles.includes(text)) {
    return res.status(400).json({
      error: "Paramenter 'text' salah atau tidak tersedia.",
      availableFiles: availableFiles,
      message: "Gunakan salah satu nama file dari daftar yang tersedia."
    });
  }
  try {
    const response = await fetch(`https://raw.githubusercontent.com/AyGemuy/RESTAPI/master/data/${text}.json`);
    if (!response.ok) {
      return res.status(404).json({
        error: `Data untuk '${text}' tidak ditemukan.`
      });
    }
    const data = await response.json();
    if (random === "true") {
      const randomItem = data[Math.floor(Math.random() * data.length)];
      return res.status(200).json(randomItem);
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengambil data."
    });
  }
}