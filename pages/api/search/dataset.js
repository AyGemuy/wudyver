import axios from "axios";
import * as cheerio from "cheerio";
class DataGoScraper {
  constructor() {
    this.baseUrl = "https://data.go.id";
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=0, i",
        "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
  }
  _normKey(key = "") {
    return key.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
  }
  _parseSearch(html) {
    const $ = cheerio.load(html);
    const datasets = $("div.space-y-3.lg\\:pr-4 > a.block.cursor-pointer").map((i, el) => {
      const $el = $(el);
      const title = $el.find("h3.font-semibold").eq(0).text().trim() || "Judul Tidak Tersedia";
      const relUrl = $el.attr("href") || "";
      const desc = $el.find("div.text-sm.text-muted-foreground").eq(0).text().trim() || "Deskripsi Tidak Tersedia";
      const org = $el.find("div.mt-4 span.text-sm.text-blue-400").eq(0).text().trim() || "Organisasi Tidak Diketahui";
      const dType = $el.find("div.mt-4 div.inline-flex.items-center.rounded-md.border").eq(0).text().trim() || "Tipe Data Tidak Diketahui";
      const accStat = $el.find("div.mb-1 div.flex.shrink-0 div.inline-flex.items-center.rounded-md.border").eq(0).text().trim() || "Status Akses Tidak Diketahui";
      const fmts = $el.find("div.mt-4 > div:first-child > div.inline-flex").map((idx, elFmt) => $(elFmt).text().trim()).get();
      if (title !== "Judul Tidak Tersedia" && relUrl) {
        return {
          title: title,
          desc: desc,
          org: org,
          dType: dType,
          accStat: accStat,
          fmts: fmts.length > 0 ? fmts : ["Format Tidak Diketahui"],
          url: this.baseUrl + relUrl
        };
      }
      return null;
    }).get().filter(item => item !== null);
    return datasets;
  }
  _parseNextFDataValue(rawValue) {
    rawValue = rawValue.trim();
    if (rawValue.startsWith("{") && rawValue.endsWith("}") || rawValue.startsWith("[") && rawValue.endsWith("]")) {
      try {
        return JSON.parse(rawValue);
      } catch (e) {}
    }
    if (rawValue.startsWith("I[") && rawValue.endsWith("]")) {
      const innerContent = rawValue.substring(2, rawValue.length - 1);
      try {
        const parsedInner = JSON.parse(innerContent);
        return {
          type: "I_structure",
          value: parsedInner
        };
      } catch (e) {
        return {
          type: "I_structure_malformed",
          original: rawValue
        };
      }
    }
    const prefixMatch = rawValue.match(/^([A-Za-z0-9_:#@$.-]+),([\s\S]*)$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const textAfterPrefix = prefixMatch[2].trim();
      if (textAfterPrefix.startsWith("{") && textAfterPrefix.endsWith("}") || textAfterPrefix.startsWith("[") && textAfterPrefix.endsWith("]")) {
        try {
          const parsedJsonAfterPrefix = JSON.parse(textAfterPrefix);
          return {
            type: "PrefixedJSON",
            prefix: prefix,
            value: parsedJsonAfterPrefix
          };
        } catch (e) {}
      }
      return {
        type: "PrefixedText",
        prefix: prefix,
        text: textAfterPrefix
      };
    }
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      try {
        return JSON.parse(rawValue);
      } catch (e) {}
    }
    return rawValue;
  }
  _parseNextFDataString(dataString) {
    const parsedEntries = {};
    const lines = dataString.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const lineMatch = trimmedLine.match(/^([^:]+):([\s\S]*)$/);
      if (lineMatch) {
        const key = lineMatch[1].trim();
        const rawValue = lineMatch[2].trim();
        parsedEntries[key] = this._parseNextFDataValue(rawValue);
      } else {
        if (!parsedEntries._malformed_lines) parsedEntries._malformed_lines = [];
        parsedEntries._malformed_lines.push(trimmedLine);
      }
    }
    return parsedEntries;
  }
  _dereferenceScriptDataValue(currentValue, allEntriesInBlock, visitedReferences) {
    if (typeof currentValue === "string") {
      if (currentValue.startsWith("$L") || currentValue.startsWith("$@")) {
        const isLRef = currentValue.startsWith("$L");
        const refKey = currentValue.substring(2);
        if (allEntriesInBlock.hasOwnProperty(refKey)) {
          if (visitedReferences.has(currentValue)) return {
            _circularRef: currentValue
          };
          visitedReferences.add(currentValue);
          const result = this._dereferenceScriptDataValue(allEntriesInBlock[refKey], allEntriesInBlock, visitedReferences);
          visitedReferences.delete(currentValue);
          return result;
        }
        return currentValue;
      } else if (currentValue === "$undefined") {
        return undefined;
      }
      return currentValue;
    }
    if (typeof currentValue !== "object" || currentValue === null) {
      return currentValue;
    }
    if (visitedReferences.has(currentValue)) {
      return {
        _circularRefObject: true
      };
    }
    visitedReferences.add(currentValue);
    let result;
    if (Array.isArray(currentValue)) {
      if (currentValue.length >= 2 && currentValue[0] === "$") {
        const typeRaw = currentValue[1];
        const keyOrId = currentValue.length > 2 ? currentValue[2] : null;
        let propsRaw = currentValue.length > 3 && typeof currentValue[3] === "object" && currentValue[3] !== null ? currentValue[3] : {};
        let childrenStartIndex = 4;
        if (currentValue.length === 3) {
          propsRaw = {};
          childrenStartIndex = -1;
        } else if (currentValue.length > 3 && (typeof currentValue[3] !== "object" || currentValue[3] === null)) {
          propsRaw = {};
          childrenStartIndex = 3;
        }
        const resolvedType = this._dereferenceScriptDataValue(typeRaw, allEntriesInBlock, visitedReferences);
        const resolvedProps = this._dereferenceScriptDataValue(propsRaw, allEntriesInBlock, visitedReferences);
        const component = {
          _tag: typeof resolvedType === "string" ? resolvedType.replace(/^\$/, "") : "complex_type",
          _key: keyOrId
        };
        if (resolvedProps && typeof resolvedProps === "object" && !Array.isArray(resolvedProps)) {
          for (const propKey in resolvedProps) {
            if (propKey !== "children") {
              component[propKey] = resolvedProps[propKey];
            }
          }
        } else if (resolvedProps) {
          component._propsValue = resolvedProps;
        }
        let processedChildren = [];
        if (resolvedProps && resolvedProps.hasOwnProperty("children")) {
          const childrenFromProps = Array.isArray(resolvedProps.children) ? resolvedProps.children : [resolvedProps.children];
          processedChildren = childrenFromProps.map(child => this._dereferenceScriptDataValue(child, allEntriesInBlock, visitedReferences));
        }
        if (childrenStartIndex !== -1 && childrenStartIndex < currentValue.length) {
          const additionalChildren = currentValue.slice(childrenStartIndex).map(child => this._dereferenceScriptDataValue(child, allEntriesInBlock, visitedReferences));
          processedChildren.push(...additionalChildren);
        }
        if (processedChildren.length > 0) {
          if (processedChildren.every(c => typeof c === "string")) {
            component.children = processedChildren.join("");
          } else if (processedChildren.length === 1) {
            component.children = processedChildren[0];
          } else {
            component.children = processedChildren;
          }
        }
        const simpleTags = ["p", "span", "div", "a", "li", "h1", "h2", "h3", "h4", "h5", "h6", "label", "button", "title", "meta", "link", "rect", "path"];
        if (typeof component._tag === "string" && simpleTags.includes(component._tag.toLowerCase()) && typeof component.children === "string" && Object.keys(component).filter(k => !k.startsWith("_") && k !== "children" && k !== "key" && k !== "className" && k !== "href" && k !== "rel" && k !== "content" && k !== "name" && k !== "property").length === 0) {
          result = component.children;
        } else {
          result = component;
        }
      } else {
        result = currentValue.map(item => this._dereferenceScriptDataValue(item, allEntriesInBlock, visitedReferences));
      }
    } else {
      if (currentValue.hasOwnProperty("type")) {
        switch (currentValue.type) {
          case "I_structure":
          case "PrefixedJSON":
            result = this._dereferenceScriptDataValue(currentValue.value, allEntriesInBlock, visitedReferences);
            break;
          case "PrefixedText":
            result = currentValue.text;
            break;
          case "I_structure_malformed":
            result = {
              _error: "Malformed I_structure",
              original: currentValue.original
            };
            break;
          default: {
            const newObj = {};
            for (const key in currentValue) {
              if (Object.prototype.hasOwnProperty.call(currentValue, key)) {
                newObj[key] = this._dereferenceScriptDataValue(currentValue[key], allEntriesInBlock, visitedReferences);
              }
            }
            result = newObj;
          }
        }
      } else {
        const newObj = {};
        for (const key in currentValue) {
          if (Object.prototype.hasOwnProperty.call(currentValue, key)) {
            newObj[key] = this._dereferenceScriptDataValue(currentValue[key], allEntriesInBlock, visitedReferences);
          }
        }
        result = newObj;
      }
    }
    visitedReferences.delete(currentValue);
    return result;
  }
  _dereferenceParsedScriptBlock(scriptBlockData) {
    const dereferencedBlock = {};
    const visitedGlobal = new Set();
    for (const key in scriptBlockData) {
      if (Object.prototype.hasOwnProperty.call(scriptBlockData, key)) {
        dereferencedBlock[key] = this._dereferenceScriptDataValue(scriptBlockData[key], scriptBlockData, visitedGlobal);
      }
    }
    return dereferencedBlock;
  }
  _parseDetail(html) {
    const $ = cheerio.load(html);
    const d = {
      mTags: [],
      crumbs: [],
      orgName: "N/A",
      orgImg: null,
      orgDesc: "N/A",
      dsInfo: {
        pubDate: "N/A",
        modDate: "N/A",
        dsId: "N/A",
        metaDl: []
      },
      simDs: [],
      msgs: [],
      mTitle: "N/A",
      avail: "N/A",
      mDesc: "N/A",
      res: [],
      tags: [],
      meta: {},
      htmlTbls: [],
      actStream: [],
      addTxt: [],
      parsedScriptData: []
    };
    $("meta").each((i, el) => {
      d.mTags.push({
        ...el.attribs
      });
    });
    d.crumbs = $('nav[aria-label="breadcrumb"] ol li').map((i, el) => {
      const $li = $(el);
      const link = $li.find("a").first();
      const text = (link.length ? link.text().trim() : $li.text().trim()) || "N/A";
      let href = link.length ? link.attr("href") : null;
      if (href && href.startsWith("/")) href = this.baseUrl + href;
      return {
        text: text,
        href: href
      };
    }).get();
    const twoColGrid = $('div.container.py-6 > div.grid[class*="lg:grid-cols"]');
    const lSidebar = twoColGrid.find("> div.space-y-6").first();
    let mainArea = twoColGrid.find("> div.space-y-6").eq(1);
    const orgCard = lSidebar.find('div.rounded-xl.border:has(div.font-semibold:contains("Organization"))').first();
    if (orgCard.length) {
      d.orgName = orgCard.find("h3.text-lg.font-semibold").first().text().trim() || d.orgName;
      d.orgImg = orgCard.find("img").first().attr("src") || d.orgImg;
      d.orgDesc = orgCard.find("p.text-sm").first().text().trim() || d.orgDesc;
    }
    const dsInfoCard = lSidebar.find('div.rounded-xl.border:has(div.font-semibold:contains("Informasi Dataset"))').first();
    if (dsInfoCard.length) {
      dsInfoCard.find("div.p-4 > div.space-y-4 > div").each((i, el) => {
        const $div = $(el);
        const label = $div.find("label.text-gray-600").first().text().trim();
        const value = $div.find("p.font-medium").first().text().trim();
        const btns = $div.find("button");
        if (label === "Dataset Dipublikasi") d.dsInfo.pubDate = value || "N/A";
        if (label === "Dataset Dimodifikasi") d.dsInfo.modDate = value || "N/A";
        if (label === "Dataset ID") d.dsInfo.dsId = value || "N/A";
        if (label === "Metadata" && btns.length) d.dsInfo.metaDl = btns.map((j, btn) => $(btn).text().trim()).get();
      });
    }
    const simDsCard = lSidebar.find('div.rounded-xl.border:has(div.font-semibold:contains("Dataset Serupa"))').first();
    if (simDsCard.length) {
      d.simDs = simDsCard.find("div.p-6 > a").map((i, el) => {
        const $a = $(el);
        let href = $a.attr("href") || "";
        if (href && href.startsWith("/")) href = this.baseUrl + href;
        return {
          title: $a.text().trim() || "Judul Tidak Tersedia",
          href: href || null
        };
      }).get();
    }
    const actTabPanel = mainArea.find('div[role="tabpanel"][data-state="active"]').first();
    let ctx = actTabPanel.length ? actTabPanel : mainArea;
    d.msgs = ctx.find("div.border-blue-200 p").map((i, el) => $(el).text().trim()).get();
    const dsContentBlock = ctx.find("div.rounded-xl.border:has(h1.font-bold)").first();
    if (dsContentBlock.length) {
      const mainInfoCont = dsContentBlock.find("> div.p-6").first();
      if (mainInfoCont.length) {
        d.mTitle = mainInfoCont.find("h1.font-bold").first().text().trim() || d.mTitle;
        d.avail = mainInfoCont.find("h1.font-bold + div.inline-flex").first().text().trim() || d.avail;
        d.mDesc = mainInfoCont.find("p.text-gray-600").first().text().trim() || d.mDesc;
        d.res = mainInfoCont.find("div.rounded-xl.border:has(h3.font-medium)").map((i, resEl) => {
          const $resEl = $(resEl);
          const resource = {
            fName: $resEl.find("h3.font-medium").first().text().trim() || "Nama File Tidak Tersedia",
            desc: $resEl.find("p.text-sm.text-gray-600").first().text().trim() || "N/A",
            dlLink: "N/A"
          };
          let procLink = false;
          let elHtml = null;
          const anchorBtn = $resEl.find('a[role="button"][href], a.button[href], a[href]:has(span:contains("Download"))').first();
          const btnEl = $resEl.find('button:has(span:contains("Download"))').first();
          if (anchorBtn.length) {
            elHtml = $.html(anchorBtn);
            const href = anchorBtn.attr("href");
            if (href && href.trim() !== "" && href.trim() !== "#") {
              if (href.startsWith("/")) resource.dlLink = this.baseUrl + href;
              else if (href.startsWith("http")) resource.dlLink = href;
              else resource.dlLink = href;
              procLink = true;
            }
          }
          if (!procLink && btnEl.length) {
            elHtml = $.html(btnEl);
            const dataUrl = btnEl.attr("data-url") || btnEl.attr("data-href");
            if (dataUrl) {
              if (dataUrl.startsWith("/")) resource.dlLink = this.baseUrl + dataUrl;
              else if (dataUrl.startsWith("http")) resource.dlLink = dataUrl;
              else resource.dlLink = dataUrl;
              procLink = true;
            }
          }
          if (!procLink && elHtml) resource.dlLink = elHtml;
          else if (!procLink && !elHtml) resource.dlLink = "Download element not found";
          return resource;
        }).get();
        d.tags = mainInfoCont.find("div.mt-4.flex.flex-wrap > div.inline-flex.cursor-pointer").map((i, el) => $(el).text().trim()).get();
        const h2Meta = mainInfoCont.find('h2:contains("Metadata")').first();
        if (h2Meta.length) {
          const metaTblCont = h2Meta.next("div.rounded-lg.border");
          if (metaTblCont.length) {
            metaTblCont.find("div.divide-y > div.grid.grid-cols-2").each((index, rowEl) => {
              const $row = $(rowEl);
              const keyEl = $row.children().eq(0);
              const key = keyEl.text().trim();
              const valEl = $row.children().eq(1);
              let value;
              if (valEl.length) {
                if (valEl.is("a")) {
                  const hrefAttr = valEl.attr("href");
                  value = typeof hrefAttr === "string" && hrefAttr.trim() !== "" && hrefAttr.trim() !== "#" ? hrefAttr.startsWith("/") ? this.baseUrl + hrefAttr : hrefAttr : valEl.text().trim() || "N/A (Tautan tanpa teks/href valid)";
                } else value = valEl.text().trim() || "N/A";
              } else value = "N/A (Elemen nilai tidak ditemukan)";
              if (key) d.meta[this._normKey(key)] = value;
            });
          }
        }
        d.htmlTbls = mainInfoCont.find("table").map((i, tblEl) => {
          const $tblEl = $(tblEl);
          const tblData = {
            id: $tblEl.attr("id") || null,
            class: $tblEl.attr("class") || null,
            rows: $tblEl.find("tr").map((j, rowEl) => $(rowEl).find("th, td").map((k, cellEl) => $(cellEl).text().trim()).get()).get()
          };
          return tblData.rows.length > 0 ? tblData : null;
        }).get().filter(table => table !== null);
        let allTxt = [];
        mainInfoCont.children().each((i, childEl) => {
          const $child = $(childEl);
          if (!$child.is("h1, h2, div:has(h1), div:has(h2)") && !$child.is("p.text-gray-600") && !$child.is("div.rounded-xl.border:has(h3.font-medium)") && !$child.is("div.mt-4.flex.flex-wrap") && !$child.is('div:has(h2:contains("Metadata"))') && !$child.is("table") && !$child.find("button, a, svg, img").length) {
            const text = $child.text().trim();
            if (text.length > 50 && !d.mDesc.includes(text) && !Object.values(d.meta).some(metaVal => typeof metaVal === "string" && metaVal.includes(text))) {
              allTxt.push(text);
            }
          }
        });
        d.addTxt = allTxt.filter((text, index, self) => text && self.indexOf(text) === index);
      }
    }
    const actCont = ctx.find("div.relative:has(> div.absolute.left-4.top-0.h-full)");
    if (actCont.length) {
      d.actStream = actCont.find("div.relative.flex.items-start").map((i, el) => {
        const $item = $(el);
        const usrAvt = $item.find('img[alt="Profile Picture"]').attr("src") || null;
        const actTxtEl = $item.find("p.text-sm.font-medium").first();
        const usrName = actTxtEl.find("span.font-semibold").text().trim();
        const dsAff = actTxtEl.find("span.text-blue-500.underline").text().trim();
        let actVerb = actTxtEl.clone().children().remove().end().text().trim();
        const ts = $item.find("p.text-xs.text-gray-500").first().text().trim() || "N/A";
        return {
          usrAvt: usrAvt,
          usrName: usrName || "Pengguna Anonim",
          act: actVerb || "melakukan aksi pada dataset",
          dsAff: dsAff,
          ts: ts
        };
      }).get();
    }
    const rawScriptContents = [];
    $("script").each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent) {
        const trimmedContent = scriptContent.trim();
        const match = trimmedContent.match(/^self\.__next_f\.push\(\s*\[\s*1\s*,\s*"(.*)"\s*\]\s*\)$/s);
        if (match && typeof match[1] === "string") {
          let rawStringContent = match[1];
          let processedString;
          try {
            processedString = JSON.parse(`"${rawStringContent}"`);
          } catch (e) {
            processedString = rawStringContent.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\r\\n/g, "\r\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          }
          rawScriptContents.push(processedString);
        }
      }
    });
    for (const contentString of rawScriptContents) {
      const initialParsedBlock = this._parseNextFDataString(contentString);
      const dereferencedBlock = this._dereferenceParsedScriptBlock(initialParsedBlock);
      d.parsedScriptData.push(dereferencedBlock);
    }
    return d;
  }
  async search({
    query,
    limit = 5
  }) {
    if (!query) throw new Error("Query parameter is required.");
    const searchPath = `/dataset?q=${encodeURIComponent(query)}`;
    const fullSearchUrl = this.baseUrl + searchPath;
    let searchRes;
    try {
      searchRes = await this.axiosInstance.get(searchPath);
    } catch (error) {
      const errMsg = error.message || "Unknown error";
      console.error(`Error fetching search results for ${query}: ${errMsg}`);
      if (error.response) console.error(`Status: ${error.response.status}, Headers: ${JSON.stringify(error.response.headers || {})}`);
      throw new Error(`Failed to fetch search results: ${errMsg}`);
    }
    const searchItems = this._parseSearch(searchRes.data || "");
    const limResults = searchItems.slice(0, limit);
    const detailedResults = [];
    console.log(`Found ${searchItems.length} items, processing up to ${Math.min(limit, limResults.length)} of them.`);
    for (const item of limResults) {
      try {
        console.log(`Fetching details for: ${item.title} from ${item.url}`);
        const detailUrlObj = new URL(item.url);
        const detailPath = detailUrlObj.pathname + detailUrlObj.search;
        const detailRes = await this.axiosInstance.get(detailPath, {
          headers: {
            Referer: fullSearchUrl,
            accept: this.axiosInstance.defaults.headers.accept,
            "accept-language": this.axiosInstance.defaults.headers["accept-language"],
            "user-agent": this.axiosInstance.defaults.headers["user-agent"]
          }
        });
        const pageDetail = this._parseDetail(detailRes.data || "");
        detailedResults.push({
          ...item,
          detail: pageDetail
        });
        console.log(`Successfully parsed details for: ${item.title}`);
      } catch (error) {
        const errMsg = error.message || "Unknown error";
        console.error(`Error fetching or parsing detail page ${item.url}: ${errMsg}`);
        if (error.response) console.error(`Status: ${error.response.status}`);
        detailedResults.push({
          ...item,
          detail: null,
          error: `Failed to fetch or parse detail page: ${errMsg}`
        });
      }
    }
    return detailedResults;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const scraper = new DataGoScraper();
    const response = await scraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}