import fetch from "node-fetch";

// Convert lat/lon to OpenStreetMap tile URL
const latLonToTile = (lat, lon, zoom) => {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
};

// Fetch the weather information
const weather = async (text) => {
  try {
    const weatherParams = new URLSearchParams({
      key: "897dba35c1d94f4cbea134758220207",
      q: text,
    });
    const weatherUrl = `https://api.weatherapi.com/v1/current.json?${weatherParams.toString()}`;
    const response = await fetch(weatherUrl);
    
    // Ensure successful response
    if (!response.ok) throw new Error('Failed to fetch weather data');
    
    const res = await response.json();
    
    // Handle API error responses
    if (res.error) throw new Error(res.error.message);

    // Destructure weather data from the API response
    const {
      location: { name, region, country, lat, lon, tz_id, localtime } = {},
      current: {
        last_updated,
        temp_c,
        temp_f,
        is_day,
        wind_mph,
        wind_kph,
        wind_dir,
        pressure_mb,
        pressure_in,
        precip_mm,
        precip_in,
        humidity,
        cloud,
        feelslike_c,
        feelslike_f,
        vis_km,
        vis_miles,
        uv,
        gust_mph,
        gust_kph,
        condition,
      } = {},
    } = res;

    // Get the weather icon URL
    const iconUrl = condition?.icon
      ? /^https?:/.test(condition.icon)
        ? condition.icon
        : `https:${condition.icon}`
      : null;

    // Get the OpenStreetMap tile URL
    const tileUrl = latLonToTile(lat, lon, 12);

    // Return the weather data to be sent in the API response
    return {
      location: { name, region, country, tz_id, localtime },
      current: {
        last_updated,
        temp_c,
        temp_f,
        is_day,
        wind_mph,
        wind_kph,
        wind_dir,
        pressure_mb,
        pressure_in,
        precip_mm,
        precip_in,
        humidity,
        cloud,
        feelslike_c,
        feelslike_f,
        vis_km,
        vis_miles,
        uv,
        gust_mph,
        gust_kph,
        condition: { text: condition?.text, iconUrl },
      },
      tileUrl,
    };
  } catch (e) {
    throw new Error(`Error fetching weather data: ${e.message}`);
  }
};

// API handler function
export default async function handler(req, res) {
  const { kota } = req.query;

  if (!kota) {
    return res.status(400).json({ message: "No kota provided" });
  }

  try {
    const result = await weather(kota);
    return res.status(200).json({ result });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
