"use client";

import SimpleBar from "simplebar-react";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput"; // Pastikan komponen ini bisa menerima className untuk styling
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const formatDate = (dateString, timeString) => {
  if (!dateString) return "N/A";
  const date = new Date(`${dateString}T${timeString || '00:00:00'}`);
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: timeString ? '2-digit' : undefined,
    minute: timeString ? '2-digit' : undefined,
    second: timeString ? '2-digit' : undefined,
  });
};

const renderAddress = (addr1, addr2, addr3) => {
  return [addr1, addr2, addr3].filter(Boolean).join(', ') || 'N/A';
};

const CekResiPage = () => {
  const [resi, setResi] = useState("");
  const [expedisi, setExpedisi] = useState("");
  const [trackingData, setTrackingData] = useState(null);
  const [listEkspedisi, setListEkspedisi] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false); // Mengganti 'loading' agar lebih deskriptif
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const apiUrl = "/api/tools/cek-resi/v5";

  const callApi = async (url, { method = "GET", body = null, actionContext = "" } = {}) => {
    setIsLoading(true); // Menggunakan setIsLoading
    try {
      const options = { method, headers: { "Content-Type": "application/json" } };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.message || response.statusText || `HTTP error! Status: ${response.status}`;
        if (actionContext) toast.error(`${actionContext}: ${errorMsg}`);
        else toast.error(errorMsg);
        return { success: false, message: errorMsg, data: data };
      }
      return { success: true, data: data };
    } catch (err) {
      console.error(`API call error (${actionContext}):`, err);
      const errorMsg = "Terjadi kesalahan jaringan atau server.";
      toast.error(errorMsg);
      return { success: false, message: errorMsg, data: null };
    } finally {
      setIsLoading(false); // Menggunakan setIsLoading
    }
  };

  useEffect(() => {
    const fetchList = async () => {
      setIsLoadingList(true);
      const result = await callApi(`${apiUrl}?action=list`, { actionContext: "Memuat Daftar Ekspedisi" });
      if (result.success && result.data && result.data.list) {
        setListEkspedisi(result.data.list);
      } else {
        if (result.success && !(result.data && result.data.list)) {
          toast.error(result.data?.message || "Format daftar ekspedisi tidak sesuai.");
        }
        setListEkspedisi([]);
      }
      setIsLoadingList(false);
    };
    fetchList();
  }, []);

  const handleCekResi = async (e) => {
    if(e) e.preventDefault();
    if (!resi.trim()) {
      toast.warn("Mohon masukkan nomor resi.");
      return;
    }
    if (!expedisi) {
      toast.warn("Mohon pilih ekspedisi.");
      return;
    }

    setIsChecking(true);
    setTrackingData(null);

    const result = await callApi(
      `${apiUrl}?action=check&resi=${encodeURIComponent(resi)}&expedisi=${encodeURIComponent(expedisi)}`,
      { actionContext: "Mengecek Resi" }
    );

    if (result.success && result.data && result.data.status === true && result.data.data) {
      setTrackingData(result.data.data);
      toast.success("Data resi berhasil ditemukan!");
    } else {
      if (result.success && result.data) {
        toast.error(result.data.message || "Gagal melacak resi. Data tidak ditemukan atau format salah.");
      } else if (!result.success && result.message) {
        // Error dari callApi sudah dihandle oleh toast di sana
      } else {
        toast.error("Gagal melacak resi. Silakan coba lagi.");
      }
      setTrackingData(null);
    }
    setIsChecking(false);
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : 'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
          {/* Header Card */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:package-duotone" className="text-2xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                Cek Resi Pengiriman
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-14">
              Lacak status pengiriman paket Anda dengan mudah dan cepat.
            </p>
          </div>

          {/* Konten Utama */}
          <SimpleBar className="h-full max-h-[calc(100vh-220px)]"> {/* Sesuaikan max-height jika perlu */}
            <div className="p-4 sm:p-6 space-y-6">
              <form onSubmit={handleCekResi} className="space-y-5">
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="resi" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:scroll-duotone" className="mr-2 text-lg" />
                    Nomor Resi
                  </label>
                  <Textinput
                    id="resi"
                    type="text"
                    placeholder="Contoh: JX1234567890"
                    value={resi}
                    onChange={(e) => setResi(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    disabled={isChecking || isLoading}
                  />
                </div>

                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="expedisi" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:truck-duotone" className="mr-2 text-lg" />
                    Ekspedisi
                  </label>
                  <select
                    id="expedisi"
                    value={expedisi}
                    onChange={(e) => setExpedisi(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    disabled={isLoadingList || isChecking || isLoading}
                  >
                    <option value="" disabled>
                      {isLoadingList ? "Memuat daftar..." : listEkspedisi.length === 0 && !isLoadingList ? "Daftar ekspedisi tidak tersedia" : "Pilih Ekspedisi"}
                    </option>
                    {listEkspedisi.map((item) => (
                      <option key={item.expedisi} value={item.expedisi}>
                        {item.name} ({item.expedisi.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center"
                  disabled={isChecking || isLoadingList || isLoading || !resi || !expedisi}
                >
                  {isChecking ? (
                    <>
                      <Icon icon="svg-spinners:ring-resize" className="mr-2 text-lg" /> Mengecek...
                    </>
                  ) : (
                    <>
                      <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" /> Lacak Paket
                    </>
                  )}
                </Button>
              </form>

              {/* Hasil Pelacakan */}
              {trackingData && (
                <div className="mt-6 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <h5 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 border-b border-slate-200 dark:border-slate-700/60 pb-3 flex items-center">
                    <Icon icon="ph:info-duotone" className="mr-2 text-xl" />
                    Hasil Pelacakan
                  </h5>
                  
                  {/* Ringkasan */}
                  <div className="mb-5 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md shadow-sm">
                    <h6 className="text-md font-semibold text-teal-600 dark:text-teal-200 mb-2.5 flex items-center">
                      <Icon icon="ph:clipboard-text-duotone" className="mr-2 text-lg" /> Ringkasan
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Nomor Resi:</strong> {trackingData.summary.waybill_number}</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Ekspedisi:</strong> {trackingData.summary.courier_name} ({trackingData.summary.courier_code?.toUpperCase()})</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Layanan:</strong> {trackingData.summary.service_code || 'N/A'}</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Status:</strong> 
                        <span className={`font-semibold ml-1 ${trackingData.delivered ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {trackingData.summary.status}
                        </span>
                        {trackingData.delivered && <Icon icon="ph:check-circle-duotone" className="inline ml-1 text-green-500" />}
                      </p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Tanggal Kirim:</strong> {formatDate(trackingData.summary.waybill_date)}</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Asal:</strong> {trackingData.summary.origin || 'N/A'}</p>
                      <p className="md:col-span-2"><strong className="font-medium text-slate-500 dark:text-slate-400">Tujuan:</strong> {trackingData.summary.destination || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Detail Paket */}
                  <div className="mb-5 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md shadow-sm">
                    <h6 className="text-md font-semibold text-teal-600 dark:text-teal-200 mb-2.5 flex items-center">
                      <Icon icon="ph:package-duotone" className="mr-2 text-lg" /> Detail Paket
                    </h6>
                    <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400">Tanggal Resi:</strong> {formatDate(trackingData.details.waybill_date, trackingData.details.waybill_time)}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400">Berat:</strong> {trackingData.details.weight || 'N/A'} gram</p>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="font-semibold text-teal-600 dark:text-teal-300 mb-1 flex items-center text-sm"><Icon icon="ph:user-focus-duotone" className="mr-1.5" /> Pengirim:</p>
                            <ul className="list-none pl-1 space-y-0.5 text-xs sm:text-sm">
                                <li><strong className="font-medium text-slate-500 dark:text-slate-400">Nama:</strong> {trackingData.details.shipper_name || 'N/A'}</li>
                                <li><strong className="font-medium text-slate-500 dark:text-slate-400">Kota:</strong> {trackingData.details.shipper_city || 'N/A'}</li>
                                <li><strong className="font-medium text-slate-500 dark:text-slate-400">Alamat:</strong> {renderAddress(trackingData.details.shipper_address1, trackingData.details.shipper_address2, trackingData.details.shipper_address3)}</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold text-teal-600 dark:text-teal-300 mb-1 flex items-center text-sm"><Icon icon="ph:user-focus-duotone" className="mr-1.5" /> Penerima:</p>
                            <ul className="list-none pl-1 space-y-0.5 text-xs sm:text-sm">
                                <li><strong className="font-medium text-slate-500 dark:text-slate-400">Nama:</strong> {trackingData.details.receiver_name || 'N/A'}</li>
                                <li><strong className="font-medium text-slate-500 dark:text-slate-400">Kota:</strong> {trackingData.details.receiver_city || 'N/A'}</li>
                                <li><strong className="font-medium text-slate-500 dark:text-slate-400">Alamat:</strong> {renderAddress(trackingData.details.receiver_address1, trackingData.details.receiver_address2, trackingData.details.receiver_address3)}</li>
                            </ul>
                        </div>
                    </div>
                  </div>
                  
                  {/* Status Pengiriman (jika sudah diterima) */}
                  {trackingData.delivered && trackingData.delivery_status && (
                    <div className="mb-5 p-4 bg-green-100 dark:bg-green-800/30 rounded-md border border-green-300 dark:border-green-700/50 shadow-sm">
                      <h6 className="text-md font-semibold text-green-700 dark:text-green-300 mb-2.5 flex items-center">
                        <Icon icon="ph:check-fat-duotone" className="mr-2 text-lg" /> Paket Telah Diterima
                      </h6>
                      <div className="space-y-1.5 text-xs sm:text-sm text-green-700 dark:text-green-200">
                        <p><strong className="font-medium text-slate-600 dark:text-slate-400">Status:</strong> <span className="font-semibold">{trackingData.delivery_status.status}</span></p>
                        <p><strong className="font-medium text-slate-600 dark:text-slate-400">Diterima oleh:</strong> {trackingData.delivery_status.pod_receiver || 'N/A'}</p>
                        <p><strong className="font-medium text-slate-600 dark:text-slate-400">Tanggal Diterima:</strong> {formatDate(trackingData.delivery_status.pod_date, trackingData.delivery_status.pod_time)}</p>
                      </div>
                    </div>
                  )}

                  {/* Riwayat Perjalanan */}
                  {trackingData.manifest && trackingData.manifest.length > 0 && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md shadow-sm">
                      <h6 className="text-md font-semibold text-teal-600 dark:text-teal-200 mb-3 flex items-center">
                        <Icon icon="ph:path-duotone" className="mr-2 text-lg" /> Riwayat Perjalanan
                      </h6>
                      <ul className="space-y-0">
                        {trackingData.manifest.map((item, index) => (
                          <li key={index} className="relative flex items-start pl-5 pb-4 last:pb-0">
                            <div className={`absolute left-0 top-[5px] w-2.5 h-2.5 rounded-full border-2 border-slate-50 dark:border-slate-800/60 ${index === 0 ? 'bg-green-500' : 'bg-teal-500'}`}></div>
                            {index < trackingData.manifest.length -1 && (
                               <div className={`absolute left-[4px] top-[15px] h-[calc(100%-10px)] w-0.5 ${index === 0 ? 'bg-green-400/70' : 'bg-teal-400/70'}`}></div>
                            )}
                            <div className="ml-3 text-xs sm:text-sm">
                              <p className={`font-medium ${index === 0 ? 'text-green-700 dark:text-green-300' : 'text-teal-700 dark:text-teal-300'}`}>{item.manifest_description}</p>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">{item.city_name || 'N/A'}</p>
                              <p className="text-slate-500 dark:text-slate-500 text-[11px] sm:text-xs">{formatDate(item.manifest_date, item.manifest_time)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
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

export default CekResiPage;