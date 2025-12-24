"use client";


import React, { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";
import Image from "next/image";

const API_BASE_URL = "/api/tools/jarak/v3";

const CekJarakPage = () => {
  const [locationFrom, setLocationFrom] = useState("");
  const [locationTo, setLocationTo] = useState("");
  const [jarakResult, setJarakResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const viewContainerRef = useRef(null);

  useEffect(() => {
    if (viewContainerRef.current && jarakResult) {
      viewContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [jarakResult]);

  const handleCekJarak = async (e) => {
    e.preventDefault();
    if (!locationFrom.trim() || !locationTo.trim()) {
      toast.warn("Mohon masukkan lokasi asal dan tujuan.");
      return;
    }
    setIsLoading(true);
    setJarakResult(null);
    const toastId = "cek-jarak-api";

    try {
      const params = new URLSearchParams({ from: locationFrom, to: locationTo });
      const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
      const data = await response.json();

      if (response.ok && !data.error) {
        setJarakResult(data);
        toast.success("Perhitungan jarak berhasil!", { toastId });
      } else {
        const message = data.error || "Gagal menghitung jarak. Lokasi mungkin tidak ditemukan atau rute tidak tersedia.";
        if (!toast.isActive(toastId)) {
          toast.error(message, { toastId });
        }
      }
    } catch (err) {
      console.error("Cek Jarak API call error:", err);
      const errorMessage = "Terjadi kesalahan jaringan atau server.";
      if (!toast.isActive(toastId + "-network")) {
        toast.error(errorMessage, { toastId: toastId + "-network" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputBaseClass = "w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonPrimaryClass = "w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed";
  const labelBaseClass = "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          {/* Header Card - Matched CekResiPage's Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:map-trifold-duotone" className="text-2xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                Kalkulator Jarak & Rute
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-14">
              Hitung jarak, estimasi waktu, biaya BBM, dan lihat rute perjalanan.
            </p>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto" scrollableNodeProps={{ ref: viewContainerRef }}>
            <div className="p-4 sm:p-6 space-y-6">
              {/* Input Form Card */}
              <Card title="Masukkan Lokasi Perjalanan" icon="ph:map-pin-line-duotone" className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60" bodyClass="p-4 sm:p-5">
                <form onSubmit={handleCekJarak} className="space-y-5">
                  <div>
                    <label htmlFor="locationFrom" className={labelBaseClass}>
                      Dari Lokasi
                    </label>
                    <Textinput
                      id="locationFrom"
                      type="text"
                      placeholder="Contoh: Jakarta Pusat"
                      value={locationFrom}
                      onChange={(e) => setLocationFrom(e.target.value)}
                      className={inputBaseClass}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label htmlFor="locationTo" className={labelBaseClass}>
                      Ke Lokasi
                    </label>
                    <Textinput
                      id="locationTo"
                      type="text"
                      placeholder="Contoh: Bandung Kota"
                      value={locationTo}
                      onChange={(e) => setLocationTo(e.target.value)}
                      className={inputBaseClass}
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className={buttonPrimaryClass}
                    disabled={isLoading || !locationFrom.trim() || !locationTo.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" />
                        Menghitung...
                      </>
                    ) : (
                      <>
                        <Icon icon="ph:path-duotone" className="mr-2 text-lg" />
                        Hitung Jarak & Rute
                      </>
                    )}
                  </Button>
                </form>
              </Card>

              {/* Loading State */}
              {isLoading && !jarakResult && (
                <Card className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60" bodyClass="p-4 sm:p-5 text-center">
                  <div className="py-8 flex flex-col items-center justify-center">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sedang menghitung jarak dan rute...</p>
                  </div>
                </Card>
              )}

              {/* Result Cards - Ensure they stay within SimpleBar's bounds */}
              {jarakResult && !isLoading && (
                <div className="space-y-5">
                  <Card title="Ringkasan Perjalanan" icon="ph:info-duotone" className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60" bodyClass="p-4 sm:p-5">
                    <p className="text-sm text-slate-700 dark:text-slate-200 mb-3">{jarakResult.detail}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div>
                        <h4 className="font-semibold text-teal-600 dark:text-teal-300 mb-1">Asal:</h4>
                        <p className="text-slate-600 dark:text-slate-300">{jarakResult.asal.alamat} ({jarakResult.asal.kode_negara})</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-teal-600 dark:text-teal-300 mb-1">Tujuan:</h4>
                        <p className="text-slate-600 dark:text-slate-300">{jarakResult.tujuan.alamat} ({jarakResult.tujuan.kode_negara})</p>
                      </div>
                    </div>
                    <a
                      href={jarakResult.rute}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center text-xs bg-sky-500 hover:bg-sky-600 text-white font-medium py-1.5 px-3 rounded-md shadow-sm transition-colors"
                    >
                      <Icon icon="ph:map-pin-duotone" className="mr-1.5" /> Lihat Rute di OpenStreetMap
                    </a>
                  </Card>

                  <Card title="Estimasi Biaya BBM" icon="ph:gas-pump-duotone" className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60" bodyClass="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200">
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Total Bensin:</strong> {jarakResult.estimasi_biaya_bbm.total_liter} Liter</p>
                      <p><strong className="font-medium text-slate-500 dark:text-slate-400">Estimasi Biaya:</strong> {jarakResult.estimasi_biaya_bbm.total_biaya}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">*Asumsi konsumsi BBM 12 km/liter & harga BBM Rp 10.000/liter.</p>
                  </Card>

                  {jarakResult.peta_statis && (
                    <Card title="Peta Rute Statis" icon="ph:map-trifold-duotone" className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60" bodyClass="p-3 sm:p-4">
                    <div className="bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden border border-slate-300 dark:border-slate-600">
                      <Image
                        src={jarakResult.peta_statis}
                        alt="Peta Statis Rute Perjalanan"
                        width={800}
                        height={400}
                        className="w-full h-auto object-contain"
                        unoptimized={true}
                      />
                    </div>
                  </Card>
                  )}

                  {jarakResult.arah_penunjuk_jalan && jarakResult.arah_penunjuk_jalan.length > 0 && (
                    <Card title="Petunjuk Arah (Turn-by-Turn)" icon="ph:signpost-duotone" className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60" bodyClass="p-4 sm:p-5">
                      <div className="max-h-96 overflow-y-auto simple-scrollbar pr-2 border border-slate-200 dark:border-slate-700 rounded-md">
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                          {jarakResult.arah_penunjuk_jalan.map((arah) => (
                            <li key={arah.langkah} className="py-2.5 px-1.5 sm:px-2.5">
                              <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 mt-0.5 bg-teal-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{arah.langkah}</span>
                                <div className="flex-grow">
                                  <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{arah.instruksi}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Jarak: {arah.jarak}</p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
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

export default CekJarakPage;