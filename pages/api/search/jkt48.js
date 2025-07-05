import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class Jkt48Scraper {
  constructor(baseUrl = "https://jkt48.com") {
    this.baseUrl = randomProxyUrl + baseUrl;
  }
  async fetchPage(url) {
    try {
      const {
        data
      } = await axios.get(url);
      return cheerio.load(data);
    } catch (error) {
      throw new Error(`Error fetching page: ${error.message}`);
    }
  }
  async getLatestNews() {
    const $ = await this.fetchPage(this.baseUrl);
    const goods = [];
    $(".card-goods").each((_, element) => {
      const title = $(element).find(".card-goods__title h3").text().trim();
      const link = $(element).find("a").attr("href");
      let imageSrc = $(element).find("img").attr("src");
      const fullLink = `${this.baseUrl}${link}`;
      if (imageSrc && !imageSrc.startsWith("http")) {
        imageSrc = `${this.baseUrl}${imageSrc}`;
      }
      goods.push({
        title: title,
        link: fullLink,
        image: imageSrc
      });
    });
    return goods;
  }
  async getEvents() {
    const $ = await this.fetchPage(this.baseUrl);
    const schedule = [];
    $(".entry-schedule__calendar .table tbody tr").each((_, element) => {
      const dateText = $(element).find("td h3").html().trim();
      const date = dateText.split("<br>")[0].trim();
      const day = dateText.split("<br>")[1].replace(/[()]/g, "").trim();
      const events = [];
      $(element).find(".contents").each((_, eventElement) => {
        const event = $(eventElement).find("p a").text().trim();
        const link = $(eventElement).find("p a").attr("href");
        events.push({
          event: event,
          link: `${this.baseUrl}${link}`
        });
      });
      schedule.push({
        date: date,
        day: day,
        events: events
      });
    });
    return schedule;
  }
  async getMembers() {
    const $ = await this.fetchPage(`${this.baseUrl}/member/list?lang=id`);
    const members = [];
    $("div.col-4.col-lg-2").each((_, element) => {
      let name = $(element).find(".entry-member__name a").html();
      if (name) {
        name = name.replace(/<br\s*\/?>/g, " ").trim();
      }
      const profileLink = $(element).find(".entry-member a").attr("href");
      const imageSrc = $(element).find(".entry-member img").attr("src");
      members.push({
        name: name,
        profileLink: profileLink ? `${this.baseUrl}${profileLink}` : null,
        imageSrc: imageSrc ? `${this.baseUrl}${imageSrc}` : null
      });
    });
    return members;
  }
  async getNewsList() {
    const $ = await this.fetchPage(`${this.baseUrl}/news/list?lang=id`);
    const newsList = [];
    $(".entry-news__list").each((_, element) => {
      const title = $(element).find(".entry-news__list--item h3 a").text().trim();
      const link = $(element).find(".entry-news__list--item h3 a").attr("href");
      const date = $(element).find(".entry-news__list--item time").text().trim();
      newsList.push({
        title: title,
        link: link ? `${this.baseUrl}${link}` : null,
        date: date
      });
    });
    return newsList;
  }
  async getCalendarEvents() {
    const $ = await this.fetchPage(`${this.baseUrl}/calendar/list/`);
    const calendarEvents = [];
    $(".entry-schedule__calendar table tbody tr").each((_, element) => {
      const dateText = $(element).find("td h3").text().trim();
      const events = [];
      $(element).find(".contents a").each((_, link) => {
        const eventTitle = $(link).text().trim();
        const eventLink = $(link).attr("href");
        events.push({
          title: eventTitle,
          link: eventLink ? `${this.baseUrl}${eventLink}` : null
        });
      });
      calendarEvents.push({
        date: dateText,
        events: events
      });
    });
    return calendarEvents;
  }
  async getMemberDetails(url) {
    const $ = await this.fetchPage(url);
    return {
      name: $(".entry-mypage__item").eq(0).find(".entry-mypage__item--content").text().trim(),
      birthdate: $(".entry-mypage__item").eq(1).find(".entry-mypage__item--content").text().trim(),
      bloodType: $(".entry-mypage__item").eq(2).find(".entry-mypage__item--content").text().trim(),
      horoscope: $(".entry-mypage__item").eq(3).find(".entry-mypage__item--content").text().trim(),
      height: $(".entry-mypage__item").eq(4).find(".entry-mypage__item--content").text().trim(),
      nickname: $(".entry-mypage__item").eq(5).find(".entry-mypage__item--content").text().trim(),
      twitter: $("#twitterprofile").find("a").attr("href"),
      instagram: $(".entry-mypage__history").eq(1).find("a").attr("href"),
      tiktok: $(".entry-mypage__history").eq(2).find("a").attr("href")
    };
  }
}
export default async function handler(req, res) {
  const scraper = new Jkt48Scraper();
  const {
    action,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    switch (action) {
      case "latest-news":
        res.json(await scraper.getLatestNews());
        break;
      case "events":
        res.json(await scraper.getEvents());
        break;
      case "members":
        res.json(await scraper.getMembers());
        break;
      case "news-list":
        res.json(await scraper.getNewsList());
        break;
      case "calendar":
        res.json(await scraper.getCalendarEvents());
        break;
      case "member-detail":
        if (!url) throw new Error("URL parameter is required");
        res.json(await scraper.getMemberDetails(url));
        break;
      default:
        res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}