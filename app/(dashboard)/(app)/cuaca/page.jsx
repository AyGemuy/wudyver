"use client";

import SimpleBar from "simplebar-react";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const formatDate = (dateTimeString) => {
  if (!dateTimeString) return "N/A";
  const date = new Date(dateTimeString);
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getWeatherIcon = (conditionText, iconPath, isDay) => {
  if (iconPath) {
    const newUrl = iconPath.startsWith("//") ? `https:${iconPath}` : iconPath;
    return <img src={newUrl} alt={conditionText || "Weather condition"} className="w-10 h-10 inline-block" />;
  }
  const lowerCondition = (conditionText || "").toLowerCase();
  if (lowerCondition.includes("sun") || lowerCondition.includes("clear")) return <Icon icon={isDay ? "ph:sun-duotone" : "ph:moon-duotone"} className="text-3xl text-yellow-400 dark:text-yellow-300" />;
  if (lowerCondition.includes("cloud")) return <Icon icon="ph:cloud-duotone" className="text-3xl text-sky-500" />;
  if (lowerCondition.includes("rain")) return <Icon icon="ph:cloud-rain-duotone" className="text-3xl text-blue-500" />;
  if (lowerCondition.includes("snow")) return <Icon icon="ph:cloud-snow-duotone" className="text-3xl text-slate-300" />;
  if (lowerCondition.includes("storm") || lowerCondition.includes("thunder")) return <Icon icon="ph:cloud-lightning-duotone" className="text-3xl text-purple-500" />;
  if (lowerCondition.includes("fog") || lowerCondition.includes("mist")) return <Icon icon="ph:cloud-fog-duotone" className="text-3xl text-slate-400" />;
  return <Icon icon="ph:thermometer-cold-duotone" className="text-3xl text-slate-500" />;
};

const InfoCuacaPage = () => {
  const [kota, setKota] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const backendApiUrl = "/api/info/cuaca/v2";

  const callWeatherApi = async (query) => {
    try {
      const response = await fetch(`${backendApiUrl}?kota=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data?.message || data?.error?.message || response.statusText || `HTTP error! Status: ${response.status}`;
        if(!toast.isActive('weather-api-call-error-' + errorMsg.substring(0,20))) {
          toast.error(errorMsg, {toastId: 'weather-api-call-error-' + errorMsg.substring(0,20)});
        }
        return { success: false, message: errorMsg, data: data };
      }
      return { success: true, data: data };
    } catch (err) {
      console.error(`Weather API call error:`, err);
      const errorMsg = "Terjadi kesalahan jaringan atau server saat mengambil data cuaca.";
      if(!toast.isActive('weather-api-fetch-error')) {
        toast.error(errorMsg, { toastId: 'weather-api-fetch-error' });
      }
      return { success: false, message: errorMsg, data: null };
    }
  };

  const processWeatherDataResult = (result, locationNameOverride = null) => {
    if (result.success && result.data && result.data.result) {
      setWeatherData(result.data.result);
      const displayName = locationNameOverride || result.data.result.location.name;
      if (!toast.isActive('weather-success-' + displayName)) {
        toast.success(`Cuaca untuk ${displayName} berhasil ditemukan!`, { toastId: 'weather-success-' + displayName});
      }
      if (result.data.result.location.name && kota !== result.data.result.location.name && locationNameOverride) {
        setKota(result.data.result.location.name);
      }
    } else {
      setWeatherData(null);
      const errorMsg = result?.data?.message || result?.data?.error?.message || "Gagal mendapatkan data cuaca. Format tidak sesuai atau lokasi tidak ditemukan.";
      if(!toast.isActive('weather-data-process-error-' + errorMsg.substring(0,20))) {
         toast.error(errorMsg, {toastId: 'weather-data-process-error-' + errorMsg.substring(0,20)});
     }
    }
  };
  
  const handleCekCuaca = async (e) => {
    if (e) e.preventDefault();
    const trimmedKota = kota.trim();
    if (!trimmedKota) {
      toast.warn("Mohon masukkan nama kota atau gunakan lokasi saat ini.");
      return;
    }
    setIsLoading(true);
    setWeatherData(null);
    const result = await callWeatherApi(trimmedKota);
    processWeatherDataResult(result, trimmedKota);
    setIsLoading(false);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser Anda.");
      return;
    }
    setIsLoading(true);
    setWeatherData(null);
    setKota(""); 
    toast.info("Mendeteksi lokasi Anda...", {toastId: "detect-location-info"});

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        let detectedCityForWeather = `${lat},${lon}`;
        let displayLocationName = "Lokasi Saat Ini";

        try {
          toast.info("Mendapatkan nama kota dari koordinat...", {toastId: "reverse-geo-info"});
          const geoApiUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
          const geoResponse = await fetch(geoApiUrl);
          
          if (!geoResponse.ok) {
            console.warn(`Reverse geocoding gagal: ${geoResponse.status}`);
            toast.warn("Gagal mendapatkan nama kota, mencoba dengan koordinat.", {toastId: "reverse-geo-fail-warn"});
          } else {
            const geoData = await geoResponse.json();
            const cityFromGeo = geoData.city || geoData.locality || geoData.principalSubdivision;
            if (cityFromGeo) {
              if(!toast.isActive('location-detected-success')) {
                toast.success(`Lokasi terdeteksi: ${cityFromGeo}`, {toastId: 'location-detected-success'});
              }
              setKota(cityFromGeo);
              detectedCityForWeather = cityFromGeo;
              displayLocationName = cityFromGeo;
            } else {
              toast.warn("Tidak dapat menentukan nama kota. Menggunakan koordinat.", {toastId: "city-not-determined-warn"});
              setKota(detectedCityForWeather);
            }
          }
        } catch (error) {
          console.error("Error during reverse geocoding:", error);
          if(!toast.isActive('reverse-geo-process-error')) {
            toast.error(`Gagal memproses nama lokasi. Mencoba dengan koordinat.`, {toastId: 'reverse-geo-process-error'});
          }
          setKota(detectedCityForWeather);
        }
        
        const weatherResult = await callWeatherApi(detectedCityForWeather);
        processWeatherDataResult(weatherResult, displayLocationName);
        setIsLoading(false);
      },
      (error) => {
        toast.error(`Gagal mendapatkan lokasi: ${error.message}`);
        setKota("");
        setIsLoading(false);
      },
      { timeout: 20000, enableHighAccuracy: true }
    );
  };
  
  useEffect(() => {
  }, []);


  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:cloud-sun-duotone" className="text-2xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                Informasi Cuaca
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-14">
              Cek kondisi cuaca terkini di berbagai kota atau lokasi Anda.
            </p>
          </div>

          <SimpleBar className="h-full max-h-[calc(100vh-220px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <form onSubmit={handleCekCuaca} className="space-y-5">
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="kota" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:map-pin-duotone" className="mr-2 text-lg" />
                    Nama Kota atau Wilayah
                  </label>
                  <Textinput
                    id="kota"
                    type="text"
                    placeholder="Contoh: Bandung, atau gunakan deteksi lokasi"
                    value={kota}
                    onChange={(e) => setKota(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center"
                        disabled={isLoading || !kota.trim()}
                    >
                        {isLoading && kota.trim() ? (
                             <Icon icon="svg-spinners:ring-resize" className="mr-2 text-lg" />
                        ) : (
                            <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                        )}
                        {isLoading && kota.trim() ? "Mencari..." : "Cek Cuaca"}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleDetectLocation}
                        className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center dark:bg-slate-700 dark:hover:bg-slate-600"
                        disabled={isLoading}
                    >
                         {isLoading && !kota.trim() && !weatherData ? (
                             <Icon icon="svg-spinners:ring-resize" className="mr-2 text-lg" />
                        ) : (
                            <Icon icon="ph:crosshair-duotone" className="mr-2 text-lg" />
                        )}
                        {isLoading && !kota.trim() && !weatherData ? "Mendeteksi..." : "Gunakan Lokasi Saya"}
                    </Button>
                </div>
              </form>

              {isLoading && !weatherData && (
                   <div className="flex justify-center items-center p-6">
                     <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500" />
                     <p className="ml-3 text-slate-600 dark:text-slate-300">Memuat data cuaca...</p>
                   </div>
              )}

              {weatherData && !isLoading && (
                <div className="mt-6 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <h5 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 border-b border-slate-200 dark:border-slate-700/60 pb-3 flex items-center">
                    <Icon icon="ph:thermometer-duotone" className="mr-2 text-xl" />
                    Hasil Informasi Cuaca
                  </h5>
                  <div className="mb-5 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md shadow-sm">
                    <h6 className="text-md font-semibold text-teal-600 dark:text-teal-200 mb-2.5 flex items-center">
                      <Icon icon="ph:map-trifold-duotone" className="mr-2 text-lg" /> Lokasi
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Kota:</strong> {weatherData.location.name}</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Wilayah:</strong> {weatherData.location.region}</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Negara:</strong> {weatherData.location.country}</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Waktu Lokal:</strong> {formatDate(weatherData.location.localtime)}</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Zona Waktu:</strong> {weatherData.location.tz_id}</p>
                    </div>
                  </div>
                  <div className="mb-5 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md shadow-sm">
                    <h6 className="text-md font-semibold text-teal-600 dark:text-teal-200 mb-2.5 flex items-center">
                      <Icon icon="ph:sun-horizon-duotone" className="mr-2 text-lg" /> Kondisi Saat Ini
                    </h6>
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-3">
                        <div className="flex items-center">
                            {getWeatherIcon(weatherData.current.condition.text, weatherData.current.condition.icon, weatherData.current.is_day)}
                            <span className="ml-2 text-xl font-semibold text-slate-800 dark:text-slate-100">{weatherData.current.condition.text}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 md:mt-0">
                            Terakhir diperbarui: {formatDate(weatherData.current.last_updated)}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Suhu:</strong> {weatherData.current.temp_c}°C / {weatherData.current.temp_f}°F</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Terasa Seperti:</strong> {weatherData.current.feelslike_c}°C / {weatherData.current.feelslike_f}°F</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Kelembapan:</strong> {weatherData.current.humidity}%</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Angin:</strong> {weatherData.current.wind_kph} km/j ({weatherData.current.wind_dir})</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Hembusan Angin:</strong> {weatherData.current.gust_kph} km/j</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Tekanan Udara:</strong> {weatherData.current.pressure_mb} mb</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Presipitasi:</strong> {weatherData.current.precip_mm} mm</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Visibilitas:</strong> {weatherData.current.vis_km} km</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Tutupan Awan:</strong> {weatherData.current.cloud}%</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Indeks UV:</strong> {weatherData.current.uv}</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400 block">Siang Hari:</strong> {weatherData.current.is_day ? 'Ya' : 'Tidak'}</p>
                    </div>
                  </div>

                  {weatherData.tileUrl && (
                      <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md shadow-sm">
                        <h6 className="text-md font-semibold text-teal-600 dark:text-teal-200 mb-2.5 flex items-center">
                          <Icon icon="ph:map-pin-line-duotone" className="mr-2 text-lg" /> Peta Area (Tile)
                        </h6>
                        <img src={weatherData.tileUrl} alt="Map tile" className="rounded-md border border-slate-300 dark:border-slate-600 shadow-sm w-full max-w-xs mx-auto" />
                      </div>
                  )}
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default InfoCuacaPage;