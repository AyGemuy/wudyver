import * as cheerio from "cheerio";
import axios from "axios";
class smstome {
  async Country() {
    try {
      const {
        data
      } = await axios.get("https://smstome.com");
      const $ = cheerio.load(data);
      return $(".column.fields ul li").map((_, listItem) => ({
        title: $("a", listItem).text().trim(),
        countryCode: $("a", listItem).attr("href").split("/").pop(),
        countryFlag: "https://smstome.com" + $("img", listItem).attr("src"),
        link: "https://smstome.com" + $("a", listItem).attr("href")
      })).get().filter(entry => Object.values(entry).every(value => void 0 !== value && "" !== value));
    } catch (error) {
      console.error("Error fetching country page:", error);
      return [];
    }
  }
  async getNumber(country) {
    try {
      const {
        data
      } = await axios.get(`https://smstome.com/country/${country.toLowerCase()}`);
      const $ = cheerio.load(data);
      return $(".numview").map((_, numview) => ({
        phoneNumber: $("a", numview).text().trim(),
        location: $("div.row:nth-child(1) > div > small", numview).text().trim(),
        addedDate: $("div.row:nth-child(2) > small", numview).text().trim(),
        link: $("a", numview).attr("href")
      })).get().filter(entry => Object.values(entry).every(value => void 0 !== value && "" !== value));
    } catch (error) {
      console.error("Error fetching number page:", error);
      return [];
    }
  }
  async getMessage(url, page) {
    try {
      const {
        data
      } = await axios.get(page ? `${url}?page=${page}` : url);
      const $ = cheerio.load(data);
      return $("table.messagesTable tbody tr").map((_, message) => ({
        from: $("td:nth-child(1)", message).text().trim().replace("\x3c!--sse--\x3e", "").replace("\x3c!--/sse--\x3e", ""),
        received: $("td:nth-child(2)", message).text().trim().replace("\x3c!--sse--\x3e", "").replace("\x3c!--/sse--\x3e", ""),
        content: $("td:nth-child(3)", message).text().trim().replace("\x3c!--sse--\x3e", "").replace("\x3c!--/sse--\x3e", "")
      })).get().filter(entry => Object.values(entry).every(value => void 0 !== value && "" !== value));
    } catch (error) {
      console.error("Error fetching message page:", error);
      return [];
    }
  }
}
class sms24 {
  async Country() {
    try {
      const {
        data
      } = await axios.get("https://sms24.me/en/countries");
      const $ = cheerio.load(data);
      return $(".callout").map((_, callout) => ({
        title: $("span.placeholder.h5", callout).text().trim(),
        link: "https://sms24.me/en/countries/" + $("span.fi", callout).attr("data-flag"),
        countryFlag: $("span.fi", callout).attr("data-flag")
      })).get();
    } catch (error) {
      console.error("Error fetching country page:", error);
      return [];
    }
  }
  async getNumber(country) {
    try {
      const {
        data
      } = await axios.get(`https://sms24.me/en/countries/${country.toLowerCase()}`);
      const $ = cheerio.load(data);
      return $(".callout").map((_, callout) => ({
        phoneNumber: $(".fw-bold.text-primary", callout).text().trim(),
        country: $("h5", callout).text().trim()
      })).get();
    } catch (error) {
      console.error("Error fetching number page:", error);
      return [];
    }
  }
  async getMessage(number) {
    try {
      const {
        data
      } = await axios.get(`https://sms24.me/en/numbers/${parseInt(number)}`);
      const $ = cheerio.load(data);
      return $(".shadow-sm.bg-light.rounded.border-start.border-info.border-5").map((_, message) => ({
        from: $("a", message).text().trim().replace("From:", "").trim(),
        content: $("span", message).text().trim()
      })).get();
    } catch (error) {
      console.error("Error fetching message page:", error);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const smstomeInstance = new smstome();
  const sms24Instance = new sms24();
  switch (method) {
    case "GET":
      const {
        service,
        action,
        country,
        number,
        page
      } = req.method === "GET" ? req.query : req.body;
      if (service === "smstome") {
        if (action === "country") {
          const data = await smstomeInstance.Country();
          return res.status(200).json(data);
        }
        if (action === "number" && country) {
          const data = await smstomeInstance.getNumber(country);
          return res.status(200).json(data);
        }
        if (action === "message" && number) {
          const data = await smstomeInstance.getMessage(number, page);
          return res.status(200).json(data);
        }
      }
      if (service === "sms24") {
        if (action === "country") {
          const data = await sms24Instance.Country();
          return res.status(200).json(data);
        }
        if (action === "number" && country) {
          const data = await sms24Instance.getNumber(country);
          return res.status(200).json(data);
        }
        if (action === "message" && number) {
          const data = await sms24Instance.getMessage(number);
          return res.status(200).json(data);
        }
      }
      return res.status(400).json({
        error: "Invalid service or action"
      });
    default:
      res.status(405).json({
        error: `Method ${method} Not Allowed`
      });
  }
}