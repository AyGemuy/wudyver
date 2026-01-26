import crypto from "crypto";
import axios from "axios";
import {
  v4 as uuid
} from "uuid";
class Dramabox {
  constructor() {
    console.log("[Init] Starting...");
    this.cfg = {
      base: "https://sapi.dramaboxdb.com",
      pkg: "com.storymatrix.drama",
      ver: "492",
      vn: "4.9.2",
      ua: "okhttp/4.10.0",
      ep: {
        bootstrap: "/drama-box/ap001/bootstrap",
        theater: "/drama-box/he001/theater",
        recommend: "/drama-box/he001/recommendBook",
        search: "/drama-box/search/suggest",
        search_idx: "/drama-box/search/index",
        chapters: "/drama-box/chapterv2/batch/load",
        detail: "/drama-box/chapterv2/detail",
        batch_dl: "/drama-box/chapterv2/batchDownload",
        browse: "/webfic/home/browse",
        book_detail: "/webfic/book/detail/v2"
      }
    };
    this.state = {
      token: null,
      device_id: null,
      android_id: null
    };
    this.key = null;
    this.init_key();
    this.client = this.create_client();
  }
  init_key() {
    try {
      const rsa = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08HrnbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEKbXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28XhPuC8m15u+dectsrJl+ALGcTDX3Lv3FURuwV/dN7WMEkgcseIKVMdJxzUB0PeSqCNftfxmdBV/U4yXFRxPhnSFSXCrkj6uJjickiYq1pQ1aZfrQe1eLD3MB2hKq7crhMcA3kpggQlnmy1wRR4BAttmSU4fPb/yF8D3hAgMBAAECggEBAJdru6p5RLZ3h/GLF2rud8bqv4piF51e/RWQyPFnMAGBrkByiYT7bFI3cnvJMhYpLHRigqjWfUofV3thRDDym54lVLtTRZ91khRMxgwVwdRuk8Fw7JNFenOwCJxbgdlq6iuAMuQclwll7qWUrm8DgMvzH93xf8o6X171cp4Sh0og1Ra7E9GZ37dzBlX2aJBK8VBfctZntuDPx52e71nafqfbjXxZuEtpu92oJd6A9mWbd0BZTk72ZHUmDcKcqjfcEH19SWOphMJFYkxU5FRoIEr3/zisyTO4Mt33ZmwELOrY9PdlyAAyed7ZoH+hlTr7c025QROvb2LmqgRiUT56tMECgYEA+jH5m6iMRK6XjiBhSUnlr3DzRybwlQrtIj5sZprWe2my5uYHG3jbViYIO7GtQvMTnDrBCxNhuM6dPrL0cRnbsp/iBMXe3pyjT/aWveBkn4R+UpBsnbtDn28r1MZpCDtr5UNc0TPj4KFJvjnV/e8oGoyYEroECqcw1LqNOGDiLhkCgYEAwaemNePYrXW+MVX/hatfLQ96tpxwf7yuHdENZ2q5AFw73GJWYvC8VY+TcoKPAmeoCUMltI3TrS6K5Q/GoLd5K2BsoJrSxQNQFd3ehWAtdOuPDvQ5rn/2fsvgvc3rOvJh7uNnwEZCI/45WQg+UFWref4PPc+ArNtp9Xj2y7LndwkCgYARojIQeXmhYZjG6JtSugWZLuHGkwUDzChYcIPdW25gdluokG/RzNvQn4+W/XfTryQjr7RpXm1VxCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAifuVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2fobjwhQvYwYY+DIUHarri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKfoMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ctTEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnrA/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9JNAarxO/qPW6Gi0xWaF7il7Or";
      const pem = `-----BEGIN PRIVATE KEY-----\n${rsa}\n-----END PRIVATE KEY-----`;
      this.key = crypto.createPrivateKey({
        key: pem,
        format: "pem"
      });
      console.log("[Init] Key loaded");
    } catch (e) {
      console.error("[Init] Key fail:", e.message);
      throw e;
    }
  }
  sign(str) {
    try {
      if (!this.key) this.init_key();
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(Buffer.from(str, "utf-8"));
      return sign.sign(this.key).toString("base64");
    } catch (e) {
      console.error("[Sign] Error:", e.message);
      return null;
    }
  }
  mk_aid() {
    return "00000000" + crypto.randomBytes(16).toString("hex") + "00000000";
  }
  get_sig(payload = {}) {
    const ts = Date.now();
    const did = this.state.device_id || "";
    const aid = this.state.android_id || "";
    const tn = this.state.token ? `Bearer ${this.state.token}` : "";
    const str = `timestamp=${ts}${JSON.stringify(payload)}${did}${aid}${tn}`;
    return {
      sig: this.sign(str),
      ts: ts.toString()
    };
  }
  build_hdr(sig = "", ts = "") {
    return {
      "accept-encoding": "gzip",
      "active-time": "48610",
      afid: "1765426707100-3399426610238547736",
      "android-id": this.state.android_id || "",
      apn: "0",
      brand: "vivo",
      build: "Build/PQ3A.190705.09121607",
      cid: "DAUAG1050238",
      connection: "Keep-Alive",
      "content-type": "application/json; charset=UTF-8",
      "country-code": "ID",
      "current-language": "in",
      "device-id": this.state.device_id || "",
      "device-score": "55",
      host: "sapi.dramaboxdb.com",
      ins: String(Date.now()),
      instanceid: "8f1ff8f305a5fe5a1a09cb6f0e6f1864",
      is_emulator: "0",
      is_root: "1",
      is_vpn: "1",
      language: "in",
      lat: "0",
      "local-time": new Date().toISOString(),
      locale: "in_ID",
      mbid: "60000000000",
      mcc: "510",
      mchid: "DAUAG1050238",
      md: "V2309A",
      mf: "VIVO",
      nchid: "DRA1000042",
      ov: "9",
      "over-flow": "new-fly",
      p: "51",
      "package-name": this.cfg.pkg,
      pline: "ANDROID",
      srn: "900x1600",
      "store-source": "store_google",
      "time-zone": "+0800",
      tn: this.state.token ? `Bearer ${this.state.token}` : "",
      tz: "-480",
      "user-agent": this.cfg.ua,
      userid: "359546491",
      version: this.cfg.ver,
      vn: this.cfg.vn,
      sn: sig,
      timestamp: ts
    };
  }
  create_client() {
    const inst = axios.create({
      baseURL: this.cfg.base
    });
    inst.interceptors.request.use(async cfg => {
      if (cfg.url?.includes("/bootstrap")) return cfg;
      if (!this.state.token) {
        console.log("[Req] No token, bootstrapping...");
        await this.bootstrap();
      }
      const payload = cfg.data || {};
      const {
        sig,
        ts
      } = this.get_sig(payload);
      const hdr = this.build_hdr(sig, ts);
      cfg.headers = {
        ...cfg.headers,
        ...hdr
      };
      if (cfg.url && !cfg.url.includes("timestamp=")) {
        cfg.url = cfg.url.includes("?") ? `${cfg.url}&timestamp=${ts}` : `${cfg.url}?timestamp=${ts}`;
      }
      console.log(`[Req] ${cfg.url}`);
      return cfg;
    }, err => Promise.reject(err));
    inst.interceptors.response.use(res => {
      console.log(`[Res] ${res.config.url}`, res.data?.code || "OK");
      return res;
    }, err => {
      console.error(`[Err] ${err.config?.url}:`, err.response?.data?.msg || err.message);
      return Promise.reject(err);
    });
    return inst;
  }
  async bootstrap() {
    console.log("[Boot] Starting...");
    try {
      const did = uuid();
      const aid = this.mk_aid();
      this.state.device_id = did;
      this.state.android_id = aid;
      const {
        sig,
        ts
      } = this.get_sig({});
      const hdr = this.build_hdr(sig, ts);
      const {
        data
      } = await axios.post(`${this.cfg.base}${this.cfg.ep.bootstrap}?timestamp=${ts}`, {}, {
        headers: hdr
      });
      if (data?.data?.user?.token) {
        this.state.token = data.data.user.token;
        console.log("[Boot] OK, token saved");
        return data;
      } else {
        throw new Error("No token in response");
      }
    } catch (e) {
      console.error("[Boot] Fail:", e.message);
      throw e;
    }
  }
  async req(ep, payload = {}) {
    try {
      const {
        data
      } = await this.client.post(ep, payload);
      return data;
    } catch (e) {
      console.error(`[API] ${ep} fail:`, e.message);
      return e?.response?.data || {
        success: false,
        msg: e.message
      };
    }
  }
  async theater({
    page = 1,
    ch_id = 43
  } = {}) {
    console.log(`[Theater] page=${page} ch=${ch_id}`);
    try {
      return await this.req(this.cfg.ep.theater, {
        newChannelStyle: 1,
        isNeedRank: 1,
        pageNo: page,
        index: 1,
        channelId: ch_id
      });
    } catch (e) {
      console.error("[Theater] Error:", e.message);
      throw e;
    }
  }
  async recommend({
    page = 2
  } = {}) {
    console.log(`[Recommend] page=${page}`);
    try {
      return await this.req(this.cfg.ep.recommend, {
        isNeedRank: 1,
        specialColumnId: 0,
        pageNo: page
      });
    } catch (e) {
      console.error("[Recommend] Error:", e.message);
      throw e;
    }
  }
  async search({
    keyword = "ceo"
  } = {}) {
    console.log(`[Search] keyword="${keyword}"`);
    try {
      return await this.req(this.cfg.ep.search, {
        keyword: keyword
      });
    } catch (e) {
      console.error("[Search] Error:", e.message);
      throw e;
    }
  }
  async search_idx() {
    console.log("[SearchIdx] Getting hot videos...");
    try {
      return await this.req(this.cfg.ep.search_idx, {});
    } catch (e) {
      console.error("[SearchIdx] Error:", e.message);
      throw e;
    }
  }
  async chapters({
    book_id,
    index = 1
  } = {}) {
    console.log(`[Chapters] bookId=${book_id} idx=${index}`);
    try {
      return await this.req(this.cfg.ep.chapters, {
        boundaryIndex: 0,
        comingPlaySectionId: -1,
        index: index,
        currencyPlaySource: "discover_new_rec_new",
        needEndRecommend: 0,
        currencyPlaySourceName: "",
        preLoad: false,
        rid: "",
        pullCid: "",
        loadDirection: 0,
        startUpKey: "",
        bookId: book_id
      });
    } catch (e) {
      console.error("[Chapters] Error:", e.message);
      throw e;
    }
  }
  async detail({
    book_id,
    need_rec = false
  } = {}) {
    console.log(`[Detail] bookId=${book_id} rec=${need_rec}`);
    try {
      return await this.req(this.cfg.ep.detail, {
        needRecommend: need_rec,
        from: "book_album",
        bookId: book_id
      });
    } catch (e) {
      console.error("[Detail] Error:", e.message);
      throw e;
    }
  }
  async batch_dl({
    book_id,
    chapter_ids = []
  } = {}) {
    console.log(`[BatchDL] bookId=${book_id} chapters=${chapter_ids.length}`);
    try {
      return await this.req(this.cfg.ep.batch_dl, {
        bookId: book_id,
        chapterIdList: chapter_ids
      });
    } catch (e) {
      console.error("[BatchDL] Error:", e.message);
      throw e;
    }
  }
  async browse({
    type_two = 0,
    page = 1,
    size = 10
  } = {}) {
    console.log(`[Browse] type=${type_two} page=${page}`);
    try {
      return await this.req(this.cfg.ep.browse, {
        typeTwoId: type_two,
        pageNo: page,
        pageSize: size
      });
    } catch (e) {
      console.error("[Browse] Error:", e.message);
      throw e;
    }
  }
  async book_detail_v2({
    book_id,
    lang = "in"
  } = {}) {
    console.log(`[BookDetailV2] bookId=${book_id} lang=${lang}`);
    try {
      const url = `${this.cfg.ep.book_detail}?id=${book_id}&language=${lang}`;
      const {
        data
      } = await this.client.get(url);
      return data;
    } catch (e) {
      console.error("[BookDetailV2] Error:", e.message);
      return e?.response?.data || {
        success: false,
        msg: e.message
      };
    }
  }
  async categories({
    page = 1
  } = {}) {
    console.log(`[Categories] page=${page}`);
    try {
      const res = await this.browse({
        type_two: 0,
        page: page,
        size: 30
      });
      return res?.data?.types || [];
    } catch (e) {
      console.error("[Categories] Error:", e.message);
      throw e;
    }
  }
  async get_token() {
    console.log("[GetToken] Checking token...");
    try {
      if (!this.state.token) await this.bootstrap();
      return {
        token: this.state.token,
        device_id: this.state.device_id,
        android_id: this.state.android_id
      };
    } catch (e) {
      console.error("[GetToken] Error:", e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const availableActions = ["bootstrap", "theater", "recommend", "search", "search_idx", "chapters", "detail", "batch_dl", "browse", "book_detail_v2", "categories", "get_token"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: availableActions
    });
  }
  const api = new Dramabox();
  try {
    let response;
    switch (action) {
      case "bootstrap":
        response = await api.bootstrap();
        break;
      case "theater":
        response = await api.theater(params);
        break;
      case "recommend":
        response = await api.recommend(params);
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            error: "Parameter 'keyword' wajib diisi."
          });
        }
        response = await api.search(params);
        break;
      case "search_idx":
        response = await api.search_idx();
        break;
      case "chapters":
        if (!params.book_id) {
          return res.status(400).json({
            error: "Parameter 'book_id' wajib diisi."
          });
        }
        response = await api.chapters(params);
        break;
      case "detail":
        if (!params.book_id) {
          return res.status(400).json({
            error: "Parameter 'book_id' wajib diisi."
          });
        }
        response = await api.detail(params);
        break;
      case "batch_dl":
        if (!params.book_id || !params.chapter_ids) {
          return res.status(400).json({
            error: "Parameter 'book_id' dan 'chapter_ids' wajib diisi."
          });
        }
        response = await api.batch_dl(params);
        break;
      case "browse":
        response = await api.browse(params);
        break;
      case "book_detail_v2":
        if (!params.book_id) {
          return res.status(400).json({
            error: "Parameter 'book_id' wajib diisi."
          });
        }
        response = await api.book_detail_v2(params);
        break;
      case "categories":
        response = await api.categories(params);
        break;
      case "get_token":
        response = await api.get_token();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: availableActions
        });
    }
    return res.status(200).json(response);
  } catch (err) {
    console.error(`[FATAL] ${action}:`, err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}