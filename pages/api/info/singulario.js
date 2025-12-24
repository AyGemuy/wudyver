import axios from "axios";
class Singulario {
  constructor() {
    this.base = "https://w.singularioapps.com";
    this.api = {
      locations: "/loc",
      weather: "/v5"
    };
    this.headers = {
      "user-agent": "Postify/1.0.0",
      origin: "https://w.singularioapps.com",
      referer: "https://w.singularioapps.com/"
    };
  }
  async search(location) {
    if (!location) {
      console.error("Masukin inputnya bree! Kota kek, negara kek.. jangan input kosong begitu 🗿");
      return [];
    }
    try {
      const response = await axios.get(`${this.base}${this.api.locations}`, {
        params: {
          q: location
        },
        headers: this.headers
      });
      if (response.data && response.data.length > 0) {
        return response.data.map(item => ({
          name: item.Name,
          country: item.Country,
          countryCode: item["Country Code"],
          state: item.State,
          latitude: item.Latitude,
          longitude: item.Longitude
        }));
      } else {
        console.error(`Data "${location}" kagak ada bree, cari yang lain ajaa.`);
        return [];
      }
    } catch (error) {
      console.error(`❌ "${location}": ${error.message}`);
      return [];
    }
  }
  async weather(latitude, longitude, fromMap = false, premium = false) {
    try {
      const response = await axios.get(`${this.base}${this.api.weather}`, {
        params: {
          pr: premium ? "1" : "0",
          from: fromMap ? "map" : "main",
          k: this.mapKeys(latitude, longitude)
        },
        headers: this.headers
      });
      const data = response.data;
      if (data.error) {
        console.error(data.error);
        return null;
      }
      return {
        temperature: `${data.temp_C}°C`,
        feelsLike: `${data.feels_like}°C`,
        humidity: `${data.humidity}%`,
        seaLevelPressure: `${data.pressure_sea_level} hPa`,
        actualPressure: `${data.pressure_actual} hPa`
      };
    } catch (error) {
      console.error(error.message);
      return null;
    }
  }
  mapKeys(latitude, longitude) {
    const zoom = latitude > 50 ? 12 : 13;
    const latRad = this.toRadians(latitude);
    const tileX = Math.floor((longitude + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
    const tiles = [];
    for (let i = zoom; i > 0; i--) {
      const mask = 1 << i - 1;
      let key = 1;
      if ((tileX & mask) === 0) {
        key -= 1;
      }
      if ((tileY & mask) !== 0) {
        key += 1;
      }
      tiles.push(key.toString());
    }
    return tiles.join("");
  }
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      location,
      latitude,
      longitude,
      fromMap,
      premium
    } = req.method === "GET" ? req.query : req.body;
    if (!action) {
      return res.status(400).json({
        error: 'Paramenter "action" wajib diisi. Gunakan "search" atau "weather".'
      });
    }
    const singulario = new Singulario();
    switch (action) {
      case "search":
        if (!location) {
          return res.status(400).json({
            error: 'Paramenter "location" wajib diisi untuk pencarian lokasi.'
          });
        }
        const searchResults = await singulario.search(location);
        if (searchResults.length === 0) {
          return res.status(404).json({
            error: `Lokasi "${location}" tidak ditemukan.`
          });
        }
        return res.status(200).json({
          results: searchResults
        });
      case "weather":
        if (!latitude || !longitude) {
          return res.status(400).json({
            error: 'Paramenter "latitude" dan "longitude" wajib diisi untuk mendapatkan cuaca.'
          });
        }
        const weatherData = await singulario.weather(parseFloat(latitude), parseFloat(longitude), fromMap === "true", premium === "true");
        if (!weatherData) {
          return res.status(404).json({
            error: "Data cuaca tidak ditemukan."
          });
        }
        return res.status(200).json({
          weather: weatherData
        });
      default:
        return res.status(400).json({
          error: 'Paramenter "action" tidak valid. Gunakan "search" atau "weather".'
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Terjadi kesalahan pada server."
    });
  }
}