import axios from "axios";
import * as cheerio from "cheerio";
class BloxFruit {
  constructor() {
    this.base_url = "https://fruityblox.com";
    this.base_header = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,ms;q=0.6",
      "Cache-Control": "no-cache",
      Cookie: "_ga_F55Y1PYQ4M=GS1.1.1735536080.1.1.1735537683.0.0.0",
      Pragma: "no-cache",
      Priority: "u=0, i",
      "Sec-CH-UA": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-CH-UA-Mobile": "?0",
      "Sec-CH-UA-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    };
  }
  async getStock() {
    return new Promise(async (resolve, reject) => {
      try {
        const r = await axios.get(`${this.base_url}/stock`, {
          headers: {
            ...this.base_header
          }
        }).then(v => v.data).catch(e => {
          throw new Error("Failed to get blox fruit stock data");
        });
        const $ = cheerio.load(r);
        const c = $('div.col-span-full div[class="grid grid-cols-1 lg:grid-cols-2 gap-4"]').children("div");
        const d = {
          normal: c.eq(0).children("div").map((i, el) => {
            return {
              name: $(el).find("img").attr("alt"),
              image: $(el).find("img").attr("src"),
              price: $(el).find("p").map((i, el) => $(el).text().trim()).get(),
              link: this.base_url + $(el).find("a").attr("href")
            };
          }).get(),
          mirage: c.eq(1).children("div").map((i, el) => {
            return {
              name: $(el).find("img").attr("alt"),
              image: $(el).find("img").attr("src"),
              price: $(el).find("p").map((i, el) => $(el).text().trim()).get(),
              link: this.base_url + $(el).find("a").attr("href")
            };
          }).get()
        };
        return resolve(d);
      } catch (e) {
        return reject(e);
      }
    });
  }
  async getFruitValue() {
    return new Promise(async (resolve, reject) => {
      try {
        const r = await axios.get(`${this.base_url}/blox-fruits-value-list`, {
          headers: {
            ...this.base_header
          }
        }).then(v => v.data).catch(e => {
          throw new Error("Failed to get blox fruit value list data");
        });
        const $ = cheerio.load(r);
        return resolve($("div.col-span-full").children("div").slice(1).map((i, el) => {
          return {
            name: $(el).find("div.items-center.mr-auto div p.font-bold.uppercase").text().trim(),
            type: $(el).find("p.text-xs").text(),
            image: $(el).find("img").attr("src"),
            price: $(el).find("div.items-center > p").map((i, el) => $(el).text()).get(),
            link: this.base_url + $(el).find("a").attr("href")
          };
        }).get());
      } catch (e) {
        return reject(e);
      }
    });
  }
  async getDetails(item) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!item) throw new Error("Enter valid item name!");
        if (!item.includes(this.base_url + "/items/")) item = this.base_url + "/items/" + item.split("/").pop();
        const r = await axios.get(item, {
          headers: {
            ...this.base_header
          }
        }).then(v => v.data).catch(e => {
          throw new Error("Failed to get blox fruit details!");
        });
        const $ = cheerio.load(r);
        const c = $("div.p-4 div.grid div.col-span-full");
        const d = {
          title: $(c).find("h1").text().trim().split(" ")[0],
          description: $(c).find('p[class="text-center sm:text-start"]').text().trim(),
          image: $(c).find("img").attr("src"),
          price: $(c).find("div.items-center > p.text-center").map((i, el) => $(el).text().split(":")[1].trim()).get()
        };
        console.log(d);
        if (!d.title) throw new Error("Item not found!");
        return resolve(d);
      } catch (e) {
        return reject(e);
      }
    });
  }
  async getTrades(item) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!item) throw new Error("Enter valid item name!");
        if (item.includes(`${this.base_url}`)) item = item.split("/").pop();
        const r = await axios.get(this.base_url + "/api/trades?" + new URLSearchParams({
          limit: "10",
          skip: "0",
          item: item
        }), {
          headers: {
            ...this.base_header
          }
        }).then(v => v.data).catch(e => {
          throw new Error("Failed to get latest blox fruit trades");
        });
        return resolve(r.map(v => {
          return {
            id: v._id,
            timestamp: v.date,
            offer: v.has_items,
            want: v.wants_items,
            complete: v.completed,
            server: v.server,
            creator: {
              ...v.creator,
              image: this.base_url + v.creator.image
            },
            seconds: v.time_ago
          };
        }));
      } catch (e) {
        return reject(e);
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    type,
    item
  } = req.method === "GET" ? req.query : req.body;
  const bloxFruit = new BloxFruit();
  try {
    switch (type) {
      case "stock":
        return res.status(200).json(await bloxFruit.getStock());
      case "value-list":
        return res.status(200).json(await bloxFruit.getFruitValue());
      case "details":
        if (!item) {
          return res.status(400).json({
            error: "Item parameter is required for details."
          });
        }
        return res.status(200).json(await bloxFruit.getDetails(item));
      case "trades":
        if (!item) {
          return res.status(400).json({
            error: "Item parameter is required for trades."
          });
        }
        return res.status(200).json(await bloxFruit.getTrades(item));
      default:
        return res.status(400).json({
          error: "Invalid type parameter. Use 'stock', 'value-list', 'details', or 'trades'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}