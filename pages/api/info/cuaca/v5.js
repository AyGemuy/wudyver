import axios from "axios";
class WeatherAPI {
  constructor() {
    this.api = {
      base: "https://weatherapi.intl.xiaomi.com",
      endpoints: {
        geo_city: (latitude, longitude) => `/wtr-v3/location/city/geo?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
        search_city: name => `/wtr-v3/location/city/search?name=${encodeURIComponent(name)}`,
        hot_cities: locale => `/wtr-v3/location/city/hots?locale=${encodeURIComponent(locale)}`,
        translate: (city_data, target_locale) => {
          const {
            latitude,
            longitude,
            name,
            belongings = "",
            extra = "",
            locale = "en_US"
          } = city_data;
          return `/wtr-v3/location/city/translate?isGlobal=true` + `&latitude=${encodeURIComponent(latitude)}` + `&longitude=${encodeURIComponent(longitude)}` + `&name=${encodeURIComponent(name)}` + `&aff=${encodeURIComponent(belongings)}` + `&key=${encodeURIComponent(extra)}` + `&srcLocale=${encodeURIComponent(locale)}` + `&tarLocale=${encodeURIComponent(target_locale)}`;
        },
        bg_weather: (latitude, longitude, is_located, location_key) => `/wtr-v3/weather/apart?latitude=${encodeURIComponent(latitude)}` + `&longitude=${encodeURIComponent(longitude)}` + `&isLocated=${encodeURIComponent(is_located)}` + `&locationKey=${encodeURIComponent(location_key)}`,
        all_weather: (latitude, longitude, is_located, location_key) => `/wtr-v3/weather/all?latitude=${encodeURIComponent(latitude)}` + `&longitude=${encodeURIComponent(longitude)}` + `&isLocated=${encodeURIComponent(is_located)}` + `&locationKey=${encodeURIComponent(location_key)}` + `&days=15`
      }
    };
    this.headers = {
      "user-agent": "Postify/1.0.0",
      accept: "application/json"
    };
    this.app_key = "weather20151024";
    this.sign = "zUFJoAR2ZVrDy1vF3D07";
  }
  _context_params() {
    const rom_version = "unknown";
    const app_version = "unknown";
    const alpha = "false";
    const is_global = "false";
    const device = "browser";
    const mod_device = "";
    const locale = "en_US";
    return `&appKey=${this.app_key}&sign=${this.sign}` + `&romVersion=${encodeURIComponent(rom_version)}` + `&appVersion=${encodeURIComponent(app_version)}` + `&alpha=${encodeURIComponent(alpha)}` + `&isGlobal=${encodeURIComponent(is_global)}` + `&device=${encodeURIComponent(device)}` + `&modDevice=${encodeURIComponent(mod_device)}` + `&locale=${encodeURIComponent(locale)}`;
  }
  async check({
    action_name,
    module_name,
    input_data,
    error_message,
    validation_fn,
    url_builder_fn
  }) {
    const allowed_actions = ["get_geo", "search", "get_hot", "translate_city", "get_bg", "get_all"];
    if (!allowed_actions.includes(action_name)) {
      return {
        success: false,
        code: 400,
        result: {
          module: module_name,
          input: input_data,
          error: `Aksi '${action_name}' tidak dikenal atau tidak diizinkan.`
        }
      };
    }
    if (validation_fn && !validation_fn(input_data)) {
      return {
        success: false,
        code: 400,
        result: {
          module: module_name,
          input: input_data,
          error: error_message
        }
      };
    }
    try {
      const url = url_builder_fn();
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      return {
        success: true,
        code: 200,
        result: {
          module: module_name,
          input: input_data,
          data: data
        }
      };
    } catch (error) {
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          module: module_name,
          input: input_data,
          error: error.response?.data?.message || error.message || error_message
        }
      };
    }
  }
  async get_geo(latitude, longitude) {
    const module_name = "GEO_CITY";
    const input_data = {
      latitude: latitude,
      longitude: longitude
    };
    return this.check({
      action_name: "get_geo",
      module_name: module_name,
      input_data: input_data,
      validation_fn: ({
        latitude,
        longitude
      }) => latitude && longitude,
      error_message: "Latitude dan longitude harus diisi.",
      url_builder_fn: () => `${this.api.base}${this.api.endpoints.geo_city(latitude, longitude)}&appKey=${this.app_key}${this._context_params()}`
    });
  }
  async search(name) {
    const module_name = "SEARCH_CITY";
    const input_data = {
      name: name
    };
    return this.check({
      action_name: "search",
      module_name: module_name,
      input_data: input_data,
      validation_fn: ({
        name
      }) => name && name.trim() !== "",
      error_message: "Nama kota harus diisi.",
      url_builder_fn: () => `${this.api.base}${this.api.endpoints.search_city(name)}&appKey=${this.app_key}${this._context_params()}`
    });
  }
  async get_hot(locale = "en_US") {
    const module_name = "HOT_CITIES";
    const input_data = {
      locale: locale
    };
    return this.check({
      action_name: "get_hot",
      module_name: module_name,
      input_data: input_data,
      validation_fn: ({
        locale
      }) => locale && locale.trim() !== "",
      error_message: "Paramenter locale harus diisi.",
      url_builder_fn: () => `${this.api.base}${this.api.endpoints.hot_cities(locale)}&appKey=${this.app_key}&sign=${this.sign}${this._context_params()}`
    });
  }
  async translate_city(city_data, target_locale) {
    const module_name = "TRANSLATE";
    const input_data = {
      city_data: city_data,
      target_locale: target_locale
    };
    return this.check({
      action_name: "translate_city",
      module_name: module_name,
      input_data: input_data,
      validation_fn: ({
        city_data,
        target_locale
      }) => city_data && city_data.latitude && city_data.longitude && city_data.name && target_locale,
      error_message: "Data kota dan target_locale harus lengkap.",
      url_builder_fn: () => `${this.api.base}${this.api.endpoints.translate(city_data, target_locale)}&appKey=${this.app_key}&sign=${this.sign}${this._context_params()}`
    });
  }
  async get_bg(latitude, longitude, is_located = "true", location_key) {
    const module_name = "BACKGROUND_WEATHER";
    const input_data = {
      latitude: latitude,
      longitude: longitude,
      is_located: is_located,
      location_key: location_key
    };
    return this.check({
      action_name: "get_bg",
      module_name: module_name,
      input_data: input_data,
      validation_fn: ({
        latitude,
        longitude,
        location_key
      }) => latitude && longitude && location_key,
      error_message: "Latitude, longitude, dan location_key wajib diisi.",
      url_builder_fn: () => `${this.api.base}${this.api.endpoints.bg_weather(latitude, longitude, is_located, location_key)}&appKey=${this.app_key}&sign=${this.sign}${this._context_params()}`
    });
  }
  async get_all(latitude, longitude, is_located = "true", location_key) {
    const module_name = "ALL_WEATHER";
    const input_data = {
      latitude: latitude,
      longitude: longitude,
      is_located: is_located,
      location_key: location_key
    };
    return this.check({
      action_name: "get_all",
      module_name: module_name,
      input_data: input_data,
      validation_fn: ({
        latitude,
        longitude,
        location_key
      }) => latitude && longitude && location_key,
      error_message: "Latitude, longitude, dan location_key wajib diisi.",
      url_builder_fn: () => `${this.api.base}${this.api.endpoints.all_weather(latitude, longitude, is_located, location_key)}&appKey=${this.app_key}&sign=${this.sign}${this._context_params()}`
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const weather = new WeatherAPI();
    const response = await weather.check(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}