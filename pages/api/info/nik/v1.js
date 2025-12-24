import axios from "axios";
import moment from "moment";
class NikProcessor {
  constructor(creatorName = "NIK_Parser_v1.0") {
    this.creatorName = creatorName;
    this.provinces = {};
    this.cities = {};
    this.kecamatans = {};
    this.villages = {};
    this.loadedProvinces = new Set();
    this.loadedCities = new Set();
    this.loadedKecamatanForVillages = new Set();
  }
  async _loadRegionData(id, type) {
    const baseUrl = "https://www.emsifa.com/api-wilayah-indonesia/api/";
    let url = "";
    let loadedSet;
    let targetMap;
    switch (type) {
      case "province":
        url = `${baseUrl}provinces.json`;
        loadedSet = this.loadedProvinces;
        targetMap = this.provinces;
        break;
      case "regency":
        url = `${baseUrl}regencies/${id}.json`;
        loadedSet = this.loadedCities;
        targetMap = this.cities;
        break;
      case "district":
        url = `${baseUrl}districts/${id}.json`;
        loadedSet = this.loadedCities;
        targetMap = this.kecamatans;
        break;
      case "village":
        url = `${baseUrl}villages/${id}.json`;
        loadedSet = this.loadedKecamatanForVillages;
        targetMap = this.villages;
        break;
      default:
        return;
    }
    if (id && loadedSet.has(id)) {
      return;
    }
    if (!id && type !== "province") {
      return;
    }
    try {
      const {
        data
      } = await axios.get(url);
      data.forEach(item => {
        targetMap[item.id] = item.name;
      });
      loadedSet.add(id || "all_provinces");
    } catch (e) {}
  }
  _getZodiac(day, month) {
    if (month === 3 && day >= 21 || month === 4 && day <= 19) return "aries";
    if (month === 4 && day >= 20 || month === 5 && day <= 20) return "taurus";
    if (month === 5 && day >= 21 || month === 6 && day <= 20) return "gemini";
    if (month === 6 && day >= 21 || month === 7 && day <= 22) return "cancer";
    if (month === 7 && day >= 23 || month === 8 && day <= 22) return "leo";
    if (month === 8 && day >= 23 || month === 9 && day <= 22) return "virgo";
    if (month === 9 && day >= 23 || month === 10 && day <= 22) return "libra";
    if (month === 10 && day >= 23 || month === 11 && day <= 21) return "scorpio";
    if (month === 11 && day >= 22 || month === 12 && day <= 21) return "sagittarius";
    if (month === 12 && day >= 22 || month === 1 && day <= 19) return "capricorn";
    if (month === 1 && day >= 20 || month === 2 && day <= 18) return "aquarius";
    if (month === 2 && day >= 19 || month === 3 && day <= 20) return "pisces";
    return "tidak_diketahui";
  }
  _getJavanese(date) {
    const pasaranDays = ["legi", "pahing", "pon", "wage", "kliwon"];
    const westernDays = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
    const epochDate = moment("2000-01-01");
    const daysDiff = date.diff(epochDate, "days");
    const westernDayIndex = (6 + daysDiff) % 7;
    const pasaranDayIndex = (0 + daysDiff) % 5;
    return `${westernDays[westernDayIndex]} ${pasaranDays[pasaranDayIndex]}`;
  }
  async parseNik({
    nik
  }) {
    if (typeof nik !== "string" || nik.length !== 16 || !/^\d+$/.test(nik)) {
      return {
        status: "error",
        message: "format_nik_tidak_valid"
      };
    }
    const provId = nik.substring(0, 2);
    const cityId = nik.substring(0, 4);
    const kecIdPrefix = nik.substring(0, 6);
    const villageIdFromNik = nik.substring(0, 10);
    await this._loadRegionData(null, "province");
    await this._loadRegionData(provId, "regency");
    await this._loadRegionData(cityId, "district");
    let exactKecamatanId = Object.keys(this.kecamatans).find(id => id.startsWith(kecIdPrefix) && id.length === 7);
    if (exactKecamatanId) {
      await this._loadRegionData(exactKecamatanId, "village");
    }
    try {
      let dobString = nik.substring(6, 12);
      const uniqueCode = nik.substring(12, 16);
      let day = parseInt(dobString.substring(0, 2));
      let month = parseInt(dobString.substring(2, 4));
      let yearSuffix = parseInt(dobString.substring(4, 6));
      let gender = "laki_laki";
      if (day > 31) {
        day -= 40;
        gender = "perempuan";
      }
      const formattedDay = String(day).padStart(2, "0");
      const formattedMonth = String(month).padStart(2, "0");
      let fullYear = yearSuffix;
      const currentYear = new Date().getFullYear();
      const currentYearTwoDigit = currentYear % 100;
      if (fullYear > currentYearTwoDigit + 5) {
        fullYear = 1900 + fullYear;
      } else {
        fullYear = 2e3 + fullYear;
      }
      const birthDate = moment(`${fullYear}-${formattedMonth}-${formattedDay}`, "YYYY-MM-DD", true);
      if (!birthDate.isValid()) {
        return {
          status: "error",
          message: `tanggal_lahir_tidak_valid`
        };
      }
      if (birthDate.isAfter(moment())) {
        return {
          status: "error",
          message: `tanggal_lahir_di_masa_depan`
        };
      }
      const dobFormatted = birthDate.format("YYYY-MM-DD");
      const provinceName = this.provinces[provId] || "tidak_diketahui";
      const cityName = this.cities[cityId] || "tidak_diketahui";
      const kecamatanName = exactKecamatanId ? this.kecamatans[exactKecamatanId] : "tidak_diketahui";
      const villageListOutput = Object.keys(this.villages).length > 0 ? this.villages : {};
      const today = moment();
      const years = today.diff(birthDate, "years");
      const months = today.diff(birthDate.clone().add(years, "years"), "months");
      const days = today.diff(birthDate.clone().add(years, "years").add(months, "months"), "days");
      const usiaDetail = {
        tahun: years,
        bulan: months,
        hari: days,
        lengkap: `${years} tahun ${months} bulan ${days} hari`
      };
      let ulangTahunBerikutnya = moment(birthDate).year(today.year());
      if (ulangTahunBerikutnya.isBefore(today, "day")) {
        ulangTahunBerikutnya.add(1, "year");
      }
      const hariMenujuUlangTahun = ulangTahunBerikutnya.diff(today, "days");
      let hitungMundurUlangTahun = "hari_ini";
      if (hariMenujuUlangTahun > 0) {
        const sisaBulan = Math.floor(hariMenujuUlangTahun / 30.4375);
        const sisaHari = Math.round(hariMenujuUlangTahun % 30.4375);
        if (sisaBulan > 0) {
          hitungMundurUlangTahun = `${sisaBulan} bulan ${sisaHari} hari lagi`;
        } else {
          hitungMundurUlangTahun = `${hariMenujuUlangTahun} hari lagi`;
        }
      }
      const detailTurunan = {
        pasaranJawa: this._getJavanese(birthDate) || "tidak_diketahui",
        usia: usiaDetail,
        ulangTahunBerikutnya: {
          tanggal: ulangTahunBerikutnya.format("YYYY-MM-DD"),
          hariSampai: hariMenujuUlangTahun,
          hitungMundur: hitungMundurUlangTahun
        },
        zodiak: this._getZodiac(birthDate.date(), birthDate.month() + 1)
      };
      const dataLokasi = {
        provinsi: {
          id: provId,
          nama: provinceName
        },
        kota_kabupaten: {
          id: cityId,
          nama: cityName
        },
        kecamatan: {
          id: exactKecamatanId || kecIdPrefix,
          nama: kecamatanName
        },
        daftar_desa_kelurahan: villageListOutput
      };
      const dataOutput = {
        nik: nik,
        jenisKelamin: gender,
        tanggalLahir: dobFormatted,
        kodeUnik: uniqueCode,
        lokasi: dataLokasi,
        detailTurunan: detailTurunan
      };
      return {
        status: "sukses",
        pemroses: this.creatorName,
        data: dataOutput
      };
    } catch (error) {
      return {
        status: "error",
        message: `gagal_parsing: ${error.message}`
      };
    }
  }
  async getNamePhone({
    identifier
  }) {
    return {
      status: "error",
      message: "data_pribadi_tidak_tersedia",
      id_diminta: identifier
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.nik) {
    return res.status(400).json({
      error: "nik are required"
    });
  }
  try {
    const processor = new NikProcessor();
    const response = await processor.parseNik(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}