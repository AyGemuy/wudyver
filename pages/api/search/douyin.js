import axios from "axios";
class DouyinSearch {
  constructor() {
    this.baseURL = "https://so.douyin.com/";
    this.defaultParams = {
      search_entrance: "aweme",
      enter_method: "normal_search",
      innerWidth: "431",
      innerHeight: "814",
      reloadNavStart: String(Date.now()),
      keyword: ""
    };
    this.cookies = {};
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        referer: "https://so.douyin.com/",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.api.interceptors.response.use(res => {
      const setCookies = res.headers["set-cookie"];
      if (setCookies) {
        setCookies.forEach(c => {
          const [name, value] = c.split(";")[0].split("=");
          if (name && value) this.cookies[name] = value;
        });
      }
      return res;
    });
    this.api.interceptors.request.use(config => {
      if (Object.keys(this.cookies).length) {
        config.headers["Cookie"] = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      }
      return config;
    });
  }
  async init() {
    try {
      await this.api.get("/");
      return true;
    } catch {
      return false;
    }
  }
  getBizData(html) {
    const regex = /let data = ({.*?});/gs;
    const matches = [...html.matchAll(regex)];
    return matches.map(m => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    }).filter(d => d?.business_data);
  }
  parseBizData(list) {
    return list?.length > 0 ? list.map(item => item.business_data) : [];
  }
  mapArr(arr, cb) {
    const res = [];
    if (this.isArr(arr)) {
      for (let i = 0; i < arr.length; i++) {
        res.push(cb(arr[i], i, arr));
      }
    }
    return res;
  }
  parseResult(obj, opts = {}) {
    const defaultOpts = {
      ignoreKeys: [],
      normWhitespace: true,
      rmEmptyArr: true,
      rmEmptyObj: true,
      zeroEmpty: false,
      falseEmpty: false,
      customEmpty: null
    };
    const o = {
      ...defaultOpts,
      ...opts
    };
    const deeplyParseJSON = val => {
      if (this.isStr(val)) {
        let parsed = val;
        while (true) {
          const trimmed = this.trimStr(parsed);
          if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const next = JSON.parse(parsed);
              if (this.isStr(next)) {
                parsed = next;
              } else {
                return deeplyParseJSON(next);
              }
            } catch (e) {
              return parsed;
            }
          } else {
            return parsed;
          }
        }
      } else if (this.isArr(val)) {
        return this.mapArr(val, deeplyParseJSON);
      } else if (typeof val === "object" && val !== null) {
        const parsedObj = {};
        const self = this;
        this.each(val, (v, k) => parsedObj[k] = deeplyParseJSON(v));
        return parsedObj;
      }
      return val;
    };
    const isEmpty = v => {
      if (this.isNull(v)) return true;
      if (this.isStr(v) && this.trimStr(v) === "") return true;
      if (o.zeroEmpty && this.isNum(v) && v === 0) return true;
      if (o.falseEmpty && this.isBool(v) && v === false) return true;
      if (this.isArr(v) && v.length === 0 && o.rmEmptyArr) return true;
      if (typeof v === "object" && v !== null && Object.keys(v).length === 0 && o.rmEmptyObj && !this.isArr(v) && typeof v !== "function" && !(v instanceof Date)) return true;
      if (typeof o.customEmpty === "function") return o.customEmpty(v);
      return false;
    };
    if (isEmpty(obj)) return undefined;
    if (this.isArr(obj)) {
      const cleanedArr = this.mapArr(obj, item => this.parseResult(item, o)).filter(val => val !== undefined);
      return cleanedArr.length > 0 || !o.rmEmptyArr ? cleanedArr : undefined;
    }
    if (typeof obj === "object" && obj !== null) {
      const cleanedObj = {};
      const self = this;
      this.each(obj, (v, k) => {
        if (o.ignoreKeys.includes(k)) {
          cleanedObj[k] = v;
          return;
        }
        let cleanedVal = this.parseResult(v, o);
        cleanedVal = deeplyParseJSON(cleanedVal);
        if (cleanedVal !== undefined) {
          cleanedObj[k] = cleanedVal;
        }
      });
      return Object.keys(cleanedObj).length > 0 || !o.rmEmptyObj ? cleanedObj : undefined;
    }
    if (this.isStr(obj) && o.normWhitespace) {
      return this.trimStr(obj).replace(/\s+/g, " ");
    }
    return obj;
  }
  filterData(arr) {
    return arr.flatMap((innerArray, outerIndex) => {
      return innerArray.filter(item => item?.data?.aweme_info).map((item, innerIndex) => ({
        index: outerIndex,
        data: item.data
      }));
    });
  }
  each(obj, cb) {
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          cb(obj[key], key, obj);
        }
      }
    }
  }
  isNull(v) {
    return v === null || v === undefined;
  }
  isStr(v) {
    return typeof v === "string";
  }
  trimStr(str) {
    return this.isStr(str) ? str.trim() : str;
  }
  isNum(v) {
    return typeof v === "number" && isFinite(v);
  }
  isBool(v) {
    return typeof v === "boolean";
  }
  isArr(v) {
    return Array.isArray(v);
  }
  isEmptyVal(v) {
    if (this.isNull(v)) return true;
    if (this.isStr(v) && this.trimStr(v) === "") return true;
    if (this.isArr(v) && v.length === 0) return true;
    if (typeof v === "object" && v !== null && Object.keys(v).length === 0) return true;
    return false;
  }
  async search({
    query,
    maxRetries = 5,
    retryDelay = 3e3
  }) {
    try {
      const isInitialized = await this.init();
      if (!isInitialized) {
        console.error("Failed to initialize Douyin search.");
        return null;
      }
      const params = {
        ...this.defaultParams,
        keyword: query,
        reloadNavStart: String(Date.now())
      };
      let retries = 0;
      while (retries < maxRetries) {
        const res = await this.api.get("s", {
          params: params
        });
        const rawData = this.getBizData(res.data);
        if (rawData.length > 0) {
          const parsedData = this.parseBizData(rawData);
          if (parsedData.length > 0) {
            const cleanedData = this.mapArr(parsedData, item => this.parseResult(item)).filter(val => val !== undefined);
            const filteredResult = this.filterData(cleanedData);
            return filteredResult.length > 0 ? filteredResult : null;
          }
          return null;
        }
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      console.error("Max retries reached. Search failed.");
      return null;
    } catch (error) {
      console.error("An error occurred during the search:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const douyin = new DouyinSearch();
    const result = await douyin.search(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}