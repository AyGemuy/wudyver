import fetch from "node-fetch";
import * as cheerio from "cheerio";

function getChordUrl(input) {
  let huruf = input.charAt(0).toLowerCase(),
    chordtela = "https://www.chordtela.com/chord-gitar-";
  return huruf >= "a" && huruf <= "b" ? chordtela + "a-b" : huruf >= "c" && huruf <= "d" ? chordtela + "c-d" : huruf >= "e" && huruf <= "f" ? chordtela + "e-f" : huruf >= "g" && huruf <= "h" ? chordtela + "g-h" : huruf >= "i" && huruf <= "j" ? chordtela + "i-j" : huruf >= "k" && huruf <= "l" ? chordtela + "k-l" : huruf >= "m" && huruf <= "n" ? chordtela + "m-n" : huruf >= "o" && huruf <= "p" ? chordtela + "o-p" : huruf >= "q" && huruf <= "r" ? chordtela + "q-r" : huruf >= "s" && huruf <= "t" ? chordtela + "s-t" : huruf >= "u" && huruf <= "v" ? chordtela + "u-v" : huruf >= "w" && huruf <= "x" ? chordtela + "w-x" : huruf >= "y" && huruf <= "z" ? chordtela + "y-z" : null;
}
async function fetchChordData(url, input) {
  try {
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);
    const artists = [];
    $("tbody tr td span.name").each((index, element) => {
      const artistName = $(element).text();
      const artistUrl = $(element).parent().attr("href");
      if (artistName.toLowerCase().includes(input.toLowerCase())) {
        artists.push({
          name: artistName,
          url: artistUrl
        });
      }
    });
    return artists;
  } catch (error) {
    console.error("Error fetching chord data:", error);
    return null;
  }
}
async function getList(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const resultList = [];
    $("ul.archive-list li").each((index, element) => {
      const title = $(element).find("a").text();
      const href = $(element).find("a").attr("href");
      resultList.push({
        title: title,
        href: href
      });
    });
    return resultList;
  } catch (error) {
    console.error("Error fetching list:", error);
    return [];
  }
}
async function getChord(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const result = {};
    $("div").each((index, element) => {
      const divId = $(element).attr("id");
      const divText = $(element).text();
      result[divId] = divText;
    });
    return result.main;
  } catch (error) {
    console.error("Error fetching chord:", error);
    return null;
  }
}

function validateURL(url) {
  return /^https:\/\/www\.chordtela\.com\/(?:chord\/[a-zA-Z0-9-]+|20[0-9]{2}\/[0-9]{2}\/[a-zA-Z0-9-]+\.html)$/.test(url);
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
    const {
      action,
      input
    } = req.method === "GET" ? req.query : req.body;
    try {
      if (action === "getChordUrl") {
        const chordUrl = getChordUrl(input);
        return res.status(200).json({
          url: chordUrl
        });
      } else if (action === "fetchChordData") {
        const url = getChordUrl(input);
        const chordData = await fetchChordData(url, input);
        return res.status(200).json(chordData);
      } else if (action === "getList") {
        const url = getChordUrl(input);
        const listData = await getList(url);
        return res.status(200).json(listData);
      } else if (action === "getChord") {
        const url = input;
        const chord = await getChord(url);
        return res.status(200).json(chord);
      } else if (action === "validateURL") {
        const isValid = validateURL(input);
        return res.status(200).json({
          valid: isValid
        });
      } else {
        return res.status(400).json({
          message: "Invalid action"
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: error.message
      });
    }
  } else {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }
}