import axios from "axios";
class TmtScraper {
  constructor() {
    this.cfg = {
      baseUrl: "https://api.tmtreader.com",
      headers: {
        Host: "api.tmtreader.com",
        Accept: "application/json; charset=utf-8,application/x-protobuf",
        "X-Xs-From-Web": "false",
        "Age-Range": "8",
        "Sdk-Version": "2",
        "Passport-Sdk-Version": "50357",
        "X-Vc-Bdturing-Sdk-Version": "2.2.1.i18n",
        "User-Agent": "com.worldance.drama/49819 (Linux; U; Android 9; in; SM-N976N; Build/QP1A.190711.020;tt-ok/3.12.13.17)"
      },
      params: {
        iid: "7549249992780367617",
        device_id: "6944790948585719298",
        ac: "wifi",
        channel: "gp",
        aid: "645713",
        app_name: "Melolo",
        version_code: "49819",
        version_name: "4.9.8",
        device_platform: "android",
        os: "android",
        ssmix: "a",
        device_type: "SM-N976N",
        device_brand: "samsung",
        language: "in",
        os_api: "28",
        os_version: "9",
        openudid: "707e4ef289dcc394",
        manifest_version_code: "49819",
        resolution: "900*1600",
        dpi: "320",
        update_version_code: "49819",
        current_region: "ID",
        carrier_region: "ID",
        app_language: "id",
        sys_language: "in",
        app_region: "ID",
        sys_region: "ID",
        mcc_mnc: "46002",
        carrier_region_v2: "460",
        user_language: "id",
        time_zone: "Asia/Bangkok",
        ui_language: "in",
        cdid: "a854d5a9-b6cd-4de7-9c43-8310f5bf513c"
      },
      endpoints: {
        search: "/i18n_novel/search/page/v1/",
        detail: "/novel/player/video_detail/v1/",
        multiDetail: "/novel/player/multi_video_detail/v1/",
        model: "/novel/player/video_model/v1/",
        multiModel: "/novel/player/multi_video_model/v1/",
        recommend: "/i18n_novel/search/scroll_recommend/v1/"
      },
      stubs: {
        detail: "238B6268DE1F0B757306031C76B5397E",
        model: "B7FB786F2CAA8B9EFB7C67A524B73AFB"
      },
      payloads: {
        detail: {
          detail_page_version: 0,
          from_video_id: "",
          need_all_video_definition: false,
          need_mp4_align: false,
          source: 4,
          use_os_player: false,
          video_id_type: 1
        },
        model: {
          detail_page_version: 0,
          device_level: 3,
          from_video_id: "",
          need_all_video_definition: true,
          need_mp4_align: false,
          source: 4,
          use_os_player: false,
          video_id_type: 0,
          video_platform: 3
        }
      },
      recConfig: {
        headers: {
          "User-Agent": "com.worldance.drama/50018 (Linux; U; Android 9; en; ASUS_Z01QD; Build/PI;tt-ok/3.12.13.17)"
        },
        params: {
          iid: "7555696322994947858",
          device_id: "7555694633755166216",
          version_code: "50018",
          version_name: "5.0.0",
          device_type: "ASUS_Z01QD",
          device_brand: "Asus",
          openudid: "e86253b3c442b20a",
          manifest_version_code: "50018",
          dpi: "300",
          update_version_code: "50018",
          carrier_region: "id",
          mcc_mnc: "51001",
          carrier_region_v2: "510",
          cdid: "69a17f9e-cbed-49b2-9523-4d5397905fdc"
        }
      }
    };
  }
  _ticket() {
    return Date.now().toString();
  }
  parseJSON(input) {
    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        if (typeof parsed === "object" || typeof parsed === "string") {
          return this.parseJSON(parsed);
        }
        return parsed;
      } catch (e) {
        return input;
      }
    }
    if (typeof input === "object" && input !== null) {
      if (Array.isArray(input)) {
        return input.map(item => this.parseJSON(item));
      }
      const result = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          result[key] = this.parseJSON(input[key]);
        }
      }
      return result;
    }
    return input;
  }
  async search({
    query,
    offset = "0",
    limit = "10"
  }) {
    console.log(`[Search] Query: "${query}"...`);
    try {
      const url = `${this.cfg.baseUrl}${this.cfg.endpoints.search}`;
      const {
        data,
        status
      } = await axios.get(url, {
        headers: this.cfg.headers,
        params: {
          ...this.cfg.params,
          search_source_id: "clks###",
          IsFetchDebug: "false",
          offset: offset,
          cancel_search_category_enhance: "false",
          query: query,
          limit: limit,
          search_id: "",
          _rticket: this._ticket()
        }
      });
      console.log(`[Search] Success (Status: ${status})`);
      return {
        status: status,
        ...this.parseJSON(data.data)
      };
    } catch (err) {
      console.error(`[Search] Failed: ${err.message}`);
      return {
        status: err.response?.status || 500,
        data: err.response?.data || {}
      };
    }
  }
  async detail({
    seriesId,
    multi = false
  }) {
    const endpointKey = multi ? "multiDetail" : "detail";
    console.log(`[Detail] Mode: ${multi ? "MULTI" : "SINGLE"} for ID: ${seriesId}`);
    try {
      const url = `${this.cfg.baseUrl}${this.cfg.endpoints[endpointKey]}`;
      const payload = {
        biz_param: this.cfg.payloads.detail,
        series_id: seriesId
      };
      const {
        data,
        status
      } = await axios.post(url, payload, {
        headers: {
          ...this.cfg.headers,
          "X-Ss-Stub": this.cfg.stubs.detail
        },
        params: {
          ...this.cfg.params,
          _rticket: this._ticket()
        }
      });
      console.log(`[Detail] Success (Status: ${status})`);
      return {
        status: status,
        ...this.parseJSON(data.data)
      };
    } catch (err) {
      console.error(`[Detail] Failed: ${err.message}`);
      return {
        status: err.response?.status || 500,
        data: err.response?.data || {}
      };
    }
  }
  async model({
    videoId,
    multi = false
  }) {
    const endpointKey = multi ? "multiModel" : "model";
    console.log(`[Model] Mode: ${multi ? "MULTI" : "SINGLE"} for VID: ${videoId}`);
    try {
      const url = `${this.cfg.baseUrl}${this.cfg.endpoints[endpointKey]}`;
      const payload = {
        biz_param: this.cfg.payloads.model,
        video_id: videoId
      };
      const {
        data,
        status
      } = await axios.post(url, payload, {
        headers: {
          ...this.cfg.headers,
          "X-Ss-Stub": this.cfg.stubs.model
        },
        params: {
          ...this.cfg.params,
          _rticket: this._ticket()
        }
      });
      console.log(`[Model] Success (Status: ${status})`);
      return {
        status: status,
        ...this.parseJSON(data.data)
      };
    } catch (err) {
      console.error(`[Model] Failed: ${err.message}`);
      return {
        status: err.response?.status || 500,
        data: err.response?.data || {}
      };
    }
  }
  async recommend() {
    console.log(`[Recommend] Fetching...`);
    try {
      const url = `${this.cfg.baseUrl}${this.cfg.endpoints.recommend}`;
      const headers = {
        ...this.cfg.headers,
        ...this.cfg.recConfig.headers
      };
      const params = {
        ...this.cfg.params,
        ...this.cfg.recConfig.params,
        from_scene: "0",
        channel: "gp",
        _rticket: this._ticket()
      };
      const {
        data,
        status
      } = await axios.get(url, {
        headers: headers,
        params: params
      });
      console.log(`[Recommend] Success (Status: ${status})`);
      return {
        status: status,
        ...this.parseJSON(data.data)
      };
    } catch (err) {
      console.error(`[Recommend] Failed: ${err.message}`);
      return {
        status: err.response?.status || 500,
        data: err.response?.data || {}
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    if (!action) {
      return res.status(400).json({
        error: "Missing required field: action",
        required: {
          action: ["search", "detail", "model", "recommend"]
        }
      });
    }
    const api = new TmtScraper();
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await api.search(params);
        break;
      case "detail":
        if (!params.seriesId) {
          return res.status(400).json({
            error: `Missing required field: seriesId (required for ${action})`
          });
        }
        result = await api.detail(params);
        break;
      case "model":
        if (!params.videoId) {
          return res.status(400).json({
            error: `Missing required field: videoId (required for ${action})`
          });
        }
        result = await api.model(params);
        break;
      case "recommend":
        result = await api.recommend();
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          allowed: ["search", "detail", "model", "recommend"]
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      code: 500
    });
  }
}