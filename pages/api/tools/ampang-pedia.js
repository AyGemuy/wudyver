import {
  createHash
} from "crypto";
import axios from "axios";
class AmpangPedia {
  constructor(userid, apikey) {
    this.userid = userid;
    this.apikey = apikey;
    this.sign = this.md5(`${userid}${apikey}`);
    this.headers = {
      "user-agent": "FrierenDv NodeJS(18.1x)",
      "Content-Type": "application/x-www-form-urlencoded"
    };
    this.api = {
      profile: "https://ampangpedia.com/api/profile",
      prepaid: "https://ampangpedia.com/api/prepaid",
      social_media: "https://ampangpedia.com/api/social-media"
    };
  }
  md5(content, algo = "md5") {
    return createHash(algo).update(content).digest("hex");
  }
  async post(apiUrl, opts = {}) {
    try {
      const {
        data
      } = await axios.request({
        url: apiUrl,
        method: "POST",
        headers: this.headers,
        data: new URLSearchParams({
          key: this.apikey,
          sign: this.sign,
          ...opts
        })
      });
      return typeof data === "object" ? {
        ...data
      } : data;
    } catch (e) {
      return e?.response || {
        error: "Request failed"
      };
    }
  }
  async profile() {
    return this.post(this.api.profile);
  }
  async prepaid() {
    return {
      order: async (service, id, server) => service && id ? this.post(this.api.prepaid, {
        type: "order",
        service: service,
        data_no: `${id}${server || ""}`
      }) : {
        status: false,
        message: `Missing ${service ? "data_no" : "service code"}`
      },
      status: async (trxid, limit) => this.post(this.api.prepaid, {
        type: "status",
        trxid: trxid || "",
        limit: typeof limit === "number" ? limit : ""
      }),
      services: async (filter_type, filter_value) => this.post(this.api.prepaid, {
        type: "services",
        filter_type: filter_type || "",
        filter_value: filter_value || ""
      })
    };
  }
  async media() {
    return {
      order: async (service, id, server) => service && id ? this.post(this.api.social_media, {
        type: "order",
        service: service,
        data_no: `${id}${server || ""}`
      }) : {
        status: false,
        message: `Missing ${service ? "data_no" : "service code"}`
      },
      status: async (trxid, limit) => this.post(this.api.social_media, {
        type: "status",
        trxid: trxid || "",
        limit: limit || ""
      }),
      services: async (filter_type, filter_value) => this.post(this.api.social_media, {
        type: "services",
        filter_type: filter_type || "",
        filter_value: filter_value || ""
      })
    };
  }
}
export default async function handler(req, res) {
  const instance = new AmpangPedia("4IBPmfPZ", "9WMugYrv57cppyyEAZmb0LVXcWagTjr6YGbFqBZd1WeHDq1tTxKLwc2R2t0l36GA");
  try {
    const {
      type,
      action,
      params
    } = req.method === "POST" ? req.body : req.query;
    if (!type) {
      return res.status(400).json({
        error: "Type parameter is required."
      });
    }
    let result;
    if (type === "profile") {
      result = await instance.profile();
    } else if (type === "prepaid") {
      const prepaid = await instance.prepaid();
      result = prepaid[action] ? await prepaid[action](...params || []) : null;
    } else if (type === "media") {
      const media = await instance.media();
      result = media[action] ? await media[action](...params || []) : null;
    } else {
      return res.status(400).json({
        error: "Invalid type provided."
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}