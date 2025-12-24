import fetch from "node-fetch";
import * as cheerio from "cheerio";
const characters = ["Aamon", "Assassin", "Jungler", "Akai", "Tank", "Aldous", "Fighter", "Alice", "Alpha", "Alucard", "Angela", "Support", "Roamer", "Argus", "EXP Laner", "Arlott", "Atlas", "Aulus", "Aurora", "Mage", "Badang", "Balmond", "Bane", "Barats", "Baxia", "Beatrix", "Marksman", "Gold Laner", "Belerick", "Benedetta", "Brody", "Bruno", "Carmilla", "Caecilion", "Mid Laner", "Chou", "Figter", "Cici", "Claude", "Clint", "Cyclops", "Diggie", "Dyrroth", "Edith", "Esmeralda", "Estes", "Eudora", "Fanny", "Faramis", "Floryn", "Franco", "Fredrinn", "Freya", "Gatotkaca", "Gloo", "Gord", "Granger", "Grock", "Guinevere", "Gusion", "Hanabi", "Hanzo", "Harith", "Harley", "Hayabusa", "Helcurt", "Hilda", "Hylos", "Irithel", "Ixia", "Jawhead", "Johnson", "Joy", "Asassin", "Julian", "Kadita", "Kagura", "Kaja", "Karina", "Karrie", "Khaleed", "Khufra", "Kimmy", "Lancelot", "Layla", "Leomord", "Lesley", "Ling", "Lolita", "Lunox", "Luo Yi", "Lylia", "Martis", "Masha", "Mathilda", "Melissa", "Minotaur", "Minsitthar", "Miya", "Moskov", "Nana", "Natalia", "Natan", "Novaria", "Odette", "Paquito", "Pharsa", "Phoveus", "Popol and Kupa", "Rafaela", "Roger", "Ruby", "Saber", "Selena", "Silvanna", "Sun", "Terizla", "Thamuz", "Tigreal", "Uranus", "Vale", "Valentina", "Valir", "Vexana", "Wanwan", "Xavier", "Yin", "Yu Zhong", "Yve", "Zhask", "Zilong"];
export default async function handler(req, res) {
  try {
    const query = characters[Math.floor(Math.random() * characters.length)];
    const url = `https://mobile-legends.fandom.com/wiki/${query}/Audio/id`;
    const data = await (await fetch(url)).text();
    const $ = cheerio.load(data);
    const audioSrc = $("audio").map((i, el) => $(el).attr("src")).get();
    const randomAudio = audioSrc[Math.floor(Math.random() * audioSrc.length)];
    const json = {
      name: query,
      audio: randomAudio
    };
    return res.status(200).json(json);
  } catch {
    res.status(500).json({
      error: "Failed to fetch data"
    });
  }
}