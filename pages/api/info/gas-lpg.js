import axios from "axios";
class GasStation {
  constructor() {
    this.api = {
      base: "https://subsiditepatlpg.mypertamina.id/infolpg3kg/api"
    };
    this.headers = {
      "User-Agent": "Postify/1.0.0",
      origin: "https://subsiditepatlpg.mypertamina.id",
      referer: "https://subsiditepatlpg.mypertamina.id/infolpg3kg"
    };
    this.maps = "https://www.google.com/maps/dir";
  }
  async get(url, params = {}) {
    try {
      const response = await axios.get(url, {
        params: params,
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error.message);
      throw error;
    }
  }
  async search(params) {
    const {
      latitude,
      longitude,
      provinsi,
      kabupaten,
      kecamatan,
      desa
    } = params;
    if (latitude && longitude) {
      return this.searchByCoordinates(latitude, longitude);
    } else if (provinsi && kabupaten && kecamatan && desa) {
      return this.searchByLocation(provinsi, kabupaten, kecamatan, desa);
    } else {
      return {
        success: false,
        message: "Invalid input. Provide either (latitude, longitude) or (provinsi, kabupaten, kecamatan, desa)."
      };
    }
  }
  async searchByCoordinates(latitude, longitude) {
    try {
      const data = await this.get(`${this.api.base}/general/general/v1/merchants/near-location`, {
        latitude: latitude,
        longitude: longitude
      });
      if (!data.success) return {
        success: false,
        message: data.message || "Failed to fetch merchants",
        type: "coordinates",
        merchants: []
      };
      return {
        success: true,
        message: "Merchants found successfully.",
        type: "coordinates",
        merchants: data.data.merchants.map(m => ({
          name: m.merchantName,
          address: m.address,
          latitude: m.location.latitude,
          longitude: m.location.longitude,
          maps: `${this.maps}/${latitude},${longitude}/${m.location.latitude},${m.location.longitude}`
        }))
      };
    } catch (error) {
      return {
        success: false,
        message: "Error fetching merchants",
        error: error.message
      };
    }
  }
  async searchByLocation(provinsi, kabupaten, kecamatan, desa) {
    try {
      const find = (data, name) => data.find(item => item.name.toLowerCase() === name.toLowerCase());
      const provinces = await this.get(`${this.api.base}/authorized/general/v1/region/provinces`);
      const provincex = find(provinces.data, provinsi);
      if (!provincex) return {
        success: false,
        message: `Province "${provinsi}" not found.`
      };
      const cities = await this.get(`${this.api.base}/authorized/general/v1/region/cities`, {
        provinceId: provincex.id
      });
      const cityData = find(cities.data, kabupaten);
      if (!cityData) return {
        success: false,
        message: `City "${kabupaten}" not found in ${provinsi}.`
      };
      const districts = await this.get(`${this.api.base}/authorized/general/v1/region/districts`, {
        cityId: cityData.id
      });
      const districtx = find(districts.data, kecamatan);
      if (!districtx) return {
        success: false,
        message: `District "${kecamatan}" not found in ${kabupaten}.`
      };
      const villages = await this.get(`${this.api.base}/authorized/general/v1/region/villages`, {
        districtId: districtx.id
      });
      const villagex = find(villages.data, desa);
      if (!villagex) return {
        success: false,
        message: `Village "${desa}" not found in ${kecamatan}.`
      };
      const response = await this.get(`${this.api.base}/general/users/v1/merchants`, {
        villageId: villagex.id
      });
      return {
        success: true,
        message: "Merchants found successfully.",
        type: "location",
        merchants: response.data.merchants.map(m => ({
          name: m.merchantName,
          address: m.address,
          latitude: m.location.latitude,
          longitude: m.location.longitude,
          maps: `${this.maps}/?api=1&destination=${m.location.latitude},${m.location.longitude}`
        }))
      };
    } catch (error) {
      return {
        success: false,
        message: "Error searching by location",
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const gasStation = new GasStation();
  try {
    let result;
    switch (action) {
      case "search":
        result = await gasStation.search(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}