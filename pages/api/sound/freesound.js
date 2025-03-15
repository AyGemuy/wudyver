import axios from "axios";
import * as cheerio from "cheerio";
class FreeSound {
  constructor() {
    this.baseUrl = "https://freesound.org";
  }
  async search(keys) {
    try {
      const response = await axios.get(`${this.baseUrl}/search/?q=${keys}`);
      const $ = cheerio.load(response.data);
      const sounds = [];
      $(".bw-player").each((index, element) => {
        sounds.push({
          soundId: $(element).data("sound-id"),
          title: $(element).data("title"),
          mp3: $(element).data("mp3"),
          ogg: $(element).data("ogg"),
          duration: $(element).data("duration"),
          samplerate: $(element).data("samplerate"),
          numComments: $(element).data("num-comments"),
          numDownloads: $(element).data("num-downloads"),
          favorite: $(element).data("favorite"),
          creator: $(element).closest(".row").find("a").last().text().trim(),
          link: `${this.baseUrl}${$(element).closest(".row").find("h5 a.bw-link--black").attr("href")}`
        });
      });
      return sounds;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async detail(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const sound = {
        soundId: $(".bw-player").data("sound-id"),
        title: $(".bw-player").data("title"),
        mp3: $(".bw-player").data("mp3"),
        ogg: $(".bw-player").data("ogg"),
        duration: $(".bw-player").data("duration"),
        samplerate: $(".bw-player").data("samplerate"),
        numDownloads: $(".bw-player").data("num-downloads"),
        numComments: $(".bw-player").data("num-comments"),
        favorite: $(".bw-player").data("favorite"),
        creator: $(".middle.bw-sound-page__user a").text().trim(),
        creatorAvatar: `${this.baseUrl}${$(".middle.bw-sound-page__user .avatar img").attr("src")}`,
        description: $("#soundDescriptionSection p").first().text().trim(),
        location: $(".middle.v-spacing-top-3 a").text().trim(),
        type: $(".col-2.text-center").eq(0).find("p").last().text().trim(),
        durationFormatted: $(".col-2.text-center").eq(1).find("p").last().text().trim(),
        fileSize: $(".col-2.text-center").eq(2).find("p").last().text().trim(),
        sampleRate: $(".col-2.text-center").eq(3).find("p").last().text().trim(),
        bitDepth: $(".col-2.text-center").eq(4).find("p").last().text().trim(),
        channels: $(".col-2.text-center").eq(5).find("p").last().text().trim(),
        tags: []
      };
      $(".display-inline-block a").each((i, element) => {
        sound.tags.push($(element).text().trim());
      });
      return sound;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const freeSound = new FreeSound();
  const {
    query,
    body,
    method
  } = req;
  if (method === "GET") {
    if (query.search) {
      const sounds = await freeSound.search(query.search);
      return res.status(200).json(sounds);
    } else if (query.url) {
      const soundDetail = await freeSound.detail(query.url);
      return res.status(200).json(soundDetail);
    } else {
      return res.status(400).json({
        error: "Missing search query or URL"
      });
    }
  } else if (method === "POST") {
    if (body.search) {
      const sounds = await freeSound.search(body.search);
      return res.status(200).json(sounds);
    } else if (body.url) {
      const soundDetail = await freeSound.detail(body.url);
      return res.status(200).json(soundDetail);
    } else {
      return res.status(400).json({
        error: "Missing search query or URL"
      });
    }
  } else {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}