import axios from "axios";
class Yummy {
  constructor() {
    this.cfg = {
      base_url: "https://www.yummy.co.id",
      default_headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.yummy.co.id/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      endpoints: {
        search_recipe: "/api/search/open-search/recipe",
        search_user: "/api/search/open-search/user",
        daily_inspo: "/api/recipe/daily-inspirations",
        pinned_ing: "/api/ingredient/pinned",
        latest: "/api/recipe/latest",
        trending: "/api/trending",
        popular: "/api/recipe/popular",
        premium: "/api/recipe/recipe-premium",
        official: "/api/account/official",
        comments: slug => `/api/recipe/${slug}/comments`,
        detail: slug => `/api/recipe/detail/${slug}`,
        related_cat: "/api/recipe/related-category/",
        related_ing: "/api/recipe/related-ingredient",
        related_rec: "/api/recipe/related-recipe"
      }
    };
    this.inst = axios.create({
      baseURL: this.cfg.base_url,
      headers: this.cfg.default_headers
    });
  }
  async home({
    ...rest
  } = {}) {
    try {
      console.log("[home] fetching home data...");
      const [daily, trending, pinned] = await Promise.all([this.inst.get(this.cfg.endpoints.daily_inspo), this.inst.get(this.cfg.endpoints.trending), this.inst.get(this.cfg.endpoints.pinned_ing)]);
      return {
        status: true,
        message: "success",
        data: {
          daily_inspirations: daily.data,
          trending: trending.data,
          pinned_ingredients: pinned.data
        }
      };
    } catch (e) {
      return {
        status: false,
        message: e?.message || "failed to fetch home data"
      };
    }
  }
  async search({
    ...rest
  } = {}) {
    try {
      const {
        query,
        q,
        keyword,
        type = "recipe",
        page = "1",
        limit = "5"
      } = rest;
      const search_keyword = query || q || keyword;
      if (!search_keyword) {
        return {
          status: false,
          message: "parameter 'query', 'q', or 'keyword' is required"
        };
      }
      const endpoint = type === "user" ? this.cfg.endpoints.search_user : this.cfg.endpoints.search_recipe;
      const req_params = {
        keyword: search_keyword,
        page: page.toString(),
        limit: limit.toString()
      };
      if (type === "recipe") req_params.type = "home";
      const {
        data
      } = await this.inst.get(endpoint, {
        params: req_params
      });
      return {
        status: true,
        message: "success",
        ...data
      };
    } catch (e) {
      return {
        status: false,
        message: e?.message || "failed to search"
      };
    }
  }
  async list({
    ...rest
  } = {}) {
    try {
      const {
        type,
        page = "1",
        limit = "6"
      } = rest;
      if (!type) {
        return {
          status: false,
          message: "parameter 'type' is required (latest, popular, premium, official)"
        };
      }
      let endpoint;
      const ep = this.cfg.endpoints;
      switch (type) {
        case "latest":
          endpoint = ep.latest;
          break;
        case "popular":
          endpoint = ep.popular;
          break;
        case "premium":
          endpoint = ep.premium;
          break;
        case "official":
          endpoint = ep.official;
          break;
        default:
          return {
            status: false,
              message: "invalid type provided"
          };
      }
      const {
        data
      } = await this.inst.get(endpoint, {
        params: {
          page: page.toString(),
          limit: limit.toString()
        }
      });
      return {
        status: true,
        message: "success",
        ...data
      };
    } catch (e) {
      return {
        status: false,
        message: e?.message || "failed to fetch list"
      };
    }
  }
  async detail({
    ...rest
  } = {}) {
    try {
      const {
        slug,
        id
      } = rest;
      const identifier = slug || id;
      if (!identifier) {
        return {
          status: false,
          message: "parameter 'slug' or 'id' is required"
        };
      }
      const {
        data
      } = await this.inst.get(this.cfg.endpoints.detail(identifier));
      return {
        status: true,
        message: "success",
        ...data
      };
    } catch (e) {
      return {
        status: false,
        message: e?.message || "failed to fetch detail"
      };
    }
  }
  async comments({
    ...rest
  } = {}) {
    try {
      const {
        slug,
        id,
        page = "1",
        limit = "5"
      } = rest;
      const identifier = slug || id;
      if (!identifier) {
        return {
          status: false,
          message: "parameter 'slug' or 'id' is required"
        };
      }
      const {
        data
      } = await this.inst.get(this.cfg.endpoints.comments(identifier), {
        params: {
          page: page.toString(),
          limit: limit.toString()
        }
      });
      return {
        status: true,
        message: "success",
        ...data
      };
    } catch (e) {
      return {
        status: false,
        message: e?.message || "failed to fetch comments"
      };
    }
  }
  async related({
    ...rest
  } = {}) {
    try {
      const {
        slug,
        id,
        type = "recipe",
        tags,
        ingredients
      } = rest;
      const identifier = slug || id;
      if (!identifier) {
        return {
          status: false,
          message: "parameter 'slug' or 'id' is required"
        };
      }
      let endpoint, req_params = {
        recipeSlug: identifier
      };
      if (type === "category") {
        endpoint = this.cfg.endpoints.related_cat;
        req_params.tags = tags;
      } else if (type === "ingredient") {
        endpoint = this.cfg.endpoints.related_ing;
        req_params.ingredients = ingredients;
      } else {
        endpoint = this.cfg.endpoints.related_rec;
        req_params = {
          keyword: identifier
        };
      }
      const {
        data
      } = await this.inst.get(endpoint, {
        params: req_params
      });
      return {
        status: true,
        message: "success",
        ...data
      };
    } catch (e) {
      return {
        status: false,
        message: e?.message || "failed to fetch related data"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      status: false,
      message: "parameter 'action' is required",
      available_actions: ["home", "search", "list", "detail", "comments", "related"]
    });
  }
  const api = new Yummy();
  try {
    let result;
    switch (action) {
      case "home":
        result = await api.home(params);
        break;
      case "search":
        result = await api.search(params);
        break;
      case "list":
        result = await api.list(params);
        break;
      case "detail":
        result = await api.detail(params);
        break;
      case "comments":
        result = await api.comments(params);
        break;
      case "related":
        result = await api.related(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          message: `action '${action}' is not valid`
        });
    }
    const http_code = result.status ? 200 : 400;
    return res.status(http_code).json(result);
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: e?.message || "internal server error"
    });
  }
}