import axios from "axios";
class JarakChecker {
  async getCoordinates(location) {
    const {
      data
    } = await axios.get(`https://geocoding-api.open-meteo.com/v1/search`, {
      params: {
        name: location,
        count: 1,
        format: "json"
      }
    });
    if (!data.results) throw new Error(`Lokasi '${location}' tidak ditemukan`);
    const {
      latitude,
      longitude,
      country,
      country_code,
      admin1,
      admin2,
      admin3
    } = data.results[0];
    return {
      lat: latitude,
      lon: longitude,
      negara: country || "Tidak diketahui",
      kode_negara: country_code?.toUpperCase() || "N/A",
      alamat: [admin3, admin2, admin1, country].filter(Boolean).join(", ")
    };
  }
  async hitungJarak(from, to) {
    try {
      const [fromData, toData] = await Promise.all([this.getCoordinates(from), this.getCoordinates(to)]);
      const fromCoords = [fromData.lon, fromData.lat];
      const toCoords = [toData.lon, toData.lat];
      const {
        data
      } = await axios.get(`https://router.project-osrm.org/route/v1/driving/${fromCoords.join(",")};${toCoords.join(",")}`, {
        params: {
          overview: "full",
          steps: "true"
        }
      });
      if (!data.routes.length) throw new Error("Rute tidak ditemukan");
      const route = data.routes[0];
      const jarakKm = (route.distance / 1e3).toFixed(2);
      const waktuTempuhMenit = Math.round(route.duration / 60);
      const waktuTempuhJam = Math.floor(waktuTempuhMenit / 60);
      const sisaMenit = waktuTempuhMenit % 60;
      const waktuFormatted = `${waktuTempuhJam} jam ${sisaMenit} menit`;
      const konsumsiBBM = 12;
      const hargaBBM = 1e4;
      const totalBensin = (jarakKm / konsumsiBBM).toFixed(2);
      const estimasiBiaya = (totalBensin * hargaBBM).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR"
      });
      const directionLabels = {
        turn: "Belok",
        newname: "Masuki",
        depart: "Mulai perjalanan",
        arrive: "Tiba di tujuan",
        merge: "Gabung ke",
        roundabout: "Masuk bundaran",
        fork: "Ambil jalur",
        on_ramp: "Masuk ke jalan tol",
        off_ramp: "Keluar dari jalan tol",
        end_of_road: "Akhir jalan",
        continue: "Lanjutkan perjalanan"
      };
      const directions = route.legs[0].steps.map((step, index) => {
        const {
          maneuver,
          distance,
          name
        } = step;
        const jalan = name || "Jalan tidak diketahui";
        const instruksiDasar = directionLabels[maneuver.type] || "Lanjutkan";
        const modifikasi = maneuver.modifier ? ` ke arah ${maneuver.modifier}` : "";
        const instruksiLengkap = `${instruksiDasar}${modifikasi} di ${jalan}`;
        return {
          langkah: index + 1,
          instruksi: instruksiLengkap,
          jarak: `${(distance / 1e3).toFixed(2)} km`
        };
      });
      const staticMapUrl = `https://static-maps.yandex.ru/1.x/?ll=${fromCoords[0]},${fromCoords[1]}&z=10&l=map&pt=${fromCoords[0]},${fromCoords[1]},pm2rdm~${toCoords[0]},${toCoords[1]},pm2rdm`;
      return {
        detail: `Perjalanan dari ${fromData.alamat} ke ${toData.alamat} menempuh jarak ${jarakKm} km, dengan estimasi waktu ${waktuFormatted}.`,
        asal: {
          nama: from,
          koordinat: {
            lat: fromData.lat,
            lon: fromData.lon
          },
          alamat: fromData.alamat,
          negara: fromData.negara,
          kode_negara: fromData.kode_negara
        },
        tujuan: {
          nama: to,
          koordinat: {
            lat: toData.lat,
            lon: toData.lon
          },
          alamat: toData.alamat,
          negara: toData.negara,
          kode_negara: toData.kode_negara
        },
        estimasi_biaya_bbm: {
          total_liter: totalBensin,
          total_biaya: estimasiBiaya
        },
        arah_penunjuk_jalan: directions,
        peta_statis: staticMapUrl,
        rute: `https://www.openstreetmap.org/directions?engine=osrm_car&route=${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}`
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    from,
    to
  } = req.method === "GET" ? req.query : req.body;
  if (!from || !to) return res.status(400).json({
    error: "Paramenter 'from' dan 'to' diperlukan"
  });
  try {
    const jarakChecker = new JarakChecker();
    const hasil = await jarakChecker.hitungJarak(from, to);
    return res.status(200).json(hasil);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}