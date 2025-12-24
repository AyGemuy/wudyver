import axios from "axios";
const ACCUWEATHER_API_KEY = "d7e795ae6a0d44aaa8abb1a0a7ac19e4";
const LOCATION_URL = "https://api.accuweather.com/locations/v1/cities/search.json";
const FORECAST_URL = "https://api.accuweather.com/forecasts/v1/daily/10day";
const fahrenheitToCelsius = f => ((f - 32) * 5 / 9).toFixed(1);
export default async function handler(req, res) {
  const {
    q
  } = req.method === "GET" ? req.query : req.body;
  if (!q) {
    return res.status(400).json({
      error: 'Paramenter "q" diperlukan.'
    });
  }
  try {
    const locationResponse = await axios.get(`${LOCATION_URL}`, {
      params: {
        q: q,
        apikey: ACCUWEATHER_API_KEY,
        language: "id-id"
      }
    });
    const locationData = locationResponse.data;
    const location = locationData[0];
    if (!location) return res.status(404).json({
      error: "Lokasi tidak ditemukan."
    });
    const forecastResponse = await axios.get(`${FORECAST_URL}/${location.Key}`, {
      params: {
        apikey: ACCUWEATHER_API_KEY,
        details: true,
        language: "id-id"
      }
    });
    const forecastData = forecastResponse.data;
    const today = forecastData.DailyForecasts[0] || {};
    const iconUrl = `http://vortex.accuweather.com/adc2010/images/slate/icons/${today.Day?.Icon}.svg`;
    const forecastList = forecastData.DailyForecasts.slice(0, 5).map(day => {
      const date = new Date(day.Date).toLocaleDateString("id-ID");
      const maxTemp = fahrenheitToCelsius(day.Temperature.Maximum.Value);
      const minTemp = fahrenheitToCelsius(day.Temperature.Minimum.Value);
      return `${date}: ${maxTemp}°C, ${day.Day.IconPhrase}`;
    }).join("\n") || "Tidak tersedia";
    const airQuality = today.AirAndPollen ? today.AirAndPollen.map(pollution => `${pollution.Name}: ${pollution.Category}`).join(", ") : "Tidak tersedia";
    const response = {
      location: {
        name: location.LocalizedName,
        country: location.Country.LocalizedName
      },
      forecast: {
        today: {
          temperature: {
            max: fahrenheitToCelsius(today.Temperature?.Maximum?.Value) + "°C",
            min: fahrenheitToCelsius(today.Temperature?.Minimum?.Value) + "°C"
          },
          realFeel: {
            max: fahrenheitToCelsius(today.RealFeelTemperature?.Maximum?.Value) + "°C",
            min: fahrenheitToCelsius(today.RealFeelTemperature?.Minimum?.Value) + "°C"
          },
          iconPhrase: today.Day?.IconPhrase || "Tidak tersedia",
          iconUrl: iconUrl
        },
        forecastList: forecastList,
        airQuality: airQuality
      },
      forecastData: forecastData
    };
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}