import axios from "axios";
import * as cheerio from "cheerio";
async function fetchPage(url) {
  try {
    const {
      data
    } = await axios.get(url);
    return data;
  } catch (error) {
    throw new Error("Failed to fetch the page: " + error.message);
  }
}
async function domainLookup(domain) {
  try {
    const url = `https://check-host.net/ip-info?host=${domain}&lang=ru`;
    const pageContent = await fetchPage(url);
    const $ = cheerio.load(pageContent);
    const data = $("div.ipinfo-item.mb-3").find("tr");
    const ipDomain = $(data[0]).text().replace("IP адрес", "").trim();
    const ipRange = $(data[2]).text().replace("IP диапазон", "").trim();
    const providerDomain = $(data[3]).text().replace("Провайдер", "").trim();
    const organizationDomain = $(data[4]).text().replace("Организация", "").trim();
    const countryDomain = $(data[5]).text().replace("Страна", "").trim();
    const regionDomain = $(data[6]).text().replace("Регион", "").trim();
    const cityDomain = $(data[7]).text().replace("Город", "").trim();
    const timezoneDomain = $(data[8]).text().replace("Часовой пояс", "").trim();
    const timeNowDomain = $(data[9]).text().replace("Местное время", "").trim();
    const indexDomain = $(data[10]).text().replace("Индекс", "").trim();
    return {
      ipDomain: ipDomain,
      ipRange: ipRange,
      providerDomain: providerDomain,
      organizationDomain: organizationDomain,
      countryDomain: countryDomain,
      regionDomain: regionDomain,
      cityDomain: cityDomain,
      timezoneDomain: timezoneDomain,
      timeNowDomain: timeNowDomain,
      indexDomain: indexDomain
    };
  } catch (error) {
    throw new Error("Failed to fetch domain lookup: " + error.message);
  }
}
async function whois(domain) {
  try {
    const url = `https://www.whois.com/whois/${domain}`;
    const pageContent = await fetchPage(url);
    const $ = cheerio.load(pageContent);
    const data = $("pre.df-raw").text().trim();
    return data.split("\n").map(line => line.replace(":", ": ")).join("\n");
  } catch (error) {
    throw new Error("Failed to fetch WHOIS data: " + error.message);
  }
}
async function dnsRecords(domain) {
  try {
    const url = `https://bgp.he.net/dns/${domain}`;
    const pageContent = await fetchPage(url);
    const $ = cheerio.load(pageContent);
    const data = $(".tabdata");
    const headDns = data.find(".dnshead");
    const dataDns = data.find(".dnsdata");
    const headTexts = headDns.map((i, el) => $(el).text()).get();
    const dataTexts = dataDns.map((i, el) => $(el).text()).get();
    let result = "";
    for (let i = 0; i < headTexts.length; i++) {
      result += `${headTexts[i]}: ${dataTexts[i]}\n`;
    }
    return result;
  } catch (error) {
    throw new Error("Failed to fetch DNS records: " + error.message);
  }
}
export default async function handler(req, res) {
  const {
    action,
    domain
  } = req.method === "GET" ? req.query : req.body;
  if (!domain) {
    return res.status(400).json({
      error: "Domain is required"
    });
  }
  try {
    let result;
    if (action === "lookup") {
      result = await domainLookup(domain);
    } else if (action === "whois") {
      result = await whois(domain);
    } else if (action === "dns") {
      result = await dnsRecords(domain);
    } else {
      result = {
        error: "Invalid action"
      };
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}