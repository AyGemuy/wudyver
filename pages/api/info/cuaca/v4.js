import axios from "axios";
import CryptoJS from "crypto-js";
class WeatherFetcher {
  constructor() {
    this.eK1 = "U2FsdGVkX1+p9rpuXLFpvZ38oYgNYcOWp7jPyv//ABw=";
    this.eK2 = "U2FsdGVkX1+CQzjswYNymYH/fuGRQF5wttP0PVxhBLXfepyhHKbz/v4PaBwan5pt";
    this.s = "U2FsdGVkX1+abcd12345==";
    this.h = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; 220333QAG Build/RKQ1.211001.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/137.0.7151.89 Mobile Safari/537.36",
      Referer: "file:///android_asset/index.html"
    };
    this.k1 = this.dec(this.eK1);
    this.k2 = this.dec(this.eK2);
  }
  dec(e) {
    return CryptoJS.AES.decrypt(e, this.s).toString(CryptoJS.enc.Utf8);
  }
  async tzdb(lat, lon) {
    const url = "https://api.timezonedb.com/v2.1/get-time-zone";
    try {
      const res = await axios.get(url, {
        params: {
          key: this.k1,
          format: "json",
          by: "position",
          lat: lat,
          lng: lon
        },
        headers: this.h
      });
      return res.data;
    } catch (error) {
      console.error("Error fetching TimeZoneDB data:", error.message);
      return {
        error: error.message
      };
    }
  }
  async omf(lat, lon) {
    const url = "https://api.open-meteo.com/v1/forecast";
    try {
      const res = await axios.get(url, {
        params: {
          latitude: lat,
          longitude: lon,
          current: "temperature_2m,is_day,apparent_temperature,pressure_msl,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
          hourly: "wind_speed_10m,wind_direction_10m,relative_humidity_2m,pressure_msl,cloud_cover,temperature_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,visibility,uv_index",
          daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,uv_index_max,precipitation_sum,daylight_duration,precipitation_probability_max,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max",
          timezone: "Asia/Jakarta",
          forecast_days: 14,
          forecast_hours: 24,
          models: "best_match"
        },
        headers: this.h
      });
      return res.data;
    } catch (error) {
      console.error("Error fetching Open-Meteo forecast data:", error.message);
      return {
        error: error.message
      };
    }
  }
  async waf(lat, lon) {
    const url = "https://api.weatherapi.com/v1/forecast.json";
    try {
      const res = await axios.get(url, {
        params: {
          key: this.k2,
          q: `${lat},${lon}`
        },
        headers: this.h
      });
      return res.data;
    } catch (error) {
      console.error("Error fetching WeatherAPI forecast data:", error.message);
      return {
        error: error.message
      };
    }
  }
  async waa(lat, lon) {
    const url = "https://api.weatherapi.com/v1/astronomy.json";
    try {
      const res = await axios.get(url, {
        params: {
          key: this.k2,
          q: `${lat},${lon}`
        },
        headers: this.h
      });
      return res.data;
    } catch (error) {
      console.error("Error fetching WeatherAPI astronomy data:", error.message);
      return {
        error: error.message
      };
    }
  }
  async waal(lat, lon) {
    const url = "https://api.weatherapi.com/v1/alerts.json";
    try {
      const res = await axios.get(url, {
        params: {
          key: this.k2,
          q: `${lat},${lon}`
        },
        headers: this.h
      });
      return res.data;
    } catch (error) {
      console.error("Error fetching WeatherAPI alerts data:", error.message);
      return {
        error: error.message
      };
    }
  }
  async weather({
    lat,
    lon
  }) {
    if (!lat || !lon) {
      console.error("Latitude and Longitude are required.");
      return {
        error: "Latitude and Longitude are required."
      };
    }
    const [tdb, omf, waf, waa, waal] = await Promise.all([this.tzdb(lat, lon), this.omf(lat, lon), this.waf(lat, lon), this.waa(lat, lon), this.waal(lat, lon)]);
    return {
      lat: lat,
      lon: lon,
      timeZoneDB: tdb,
      openMeteoForecast: omf,
      weatherAPIForecast: waf,
      weatherAPIAstronomy: waa,
      weatherAPIAlerts: waal
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.lat) {
    return res.status(400).json({
      error: "lat (latitude) are required"
    });
  }
  if (!params.lon) {
    return res.status(400).json({
      error: "lon (longitude) are required"
    });
  }
  try {
    const wf = new WeatherFetcher();
    const response = await wf.weather(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}