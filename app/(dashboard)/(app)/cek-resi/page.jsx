"use client";

import SimpleBar from "simplebar-react";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const CekResiPage = () => {
  const [resi, setResi] = useState("");
  const [expedisi, setExpedisi] = useState("");
  const [trackingData, setTrackingData] = useState(null);
  const [listEkspedisi, setListEkspedisi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const apiUrl = "/api/tools/cek-resi/v5";

  useEffect(() => {
    const fetchListEkspedisi = async () => {
      try {
        const response = await fetch(`${apiUrl}?action=list`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setListEkspedisi(data.list);
      } catch (error) {
        console.error("Error fetching list ekspedisi:", error);
        toast.error("Gagal memuat daftar ekspedisi. Silakan coba lagi nanti.");
      } finally {
        setLoadingList(false);
      }
    };

    fetchListEkspedisi();
  }, []);

  const handleCekResi = async () => {
    if (!resi.trim()) {
      toast.warn("Mohon masukkan nomor resi.");
      return;
    }
    if (!expedisi) {
      toast.warn("Mohon pilih ekspedisi.");
      return;
    }

    setLoading(true);
    setTrackingData(null);

    try {
      const response = await fetch(
        `${apiUrl}?action=check&resi=${resi}&expedisi=${expedisi}`
      );
      const data = await response.json();

      if (data.status) {
        setTrackingData(data.data);
      } else {
        toast.error(data.message || "Gagal melacak resi.");
      }
    } catch (error) {
      console.error("Error checking resi:", error);
      toast.error("Terjadi kesalahan saat memproses permintaan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName="bg-slate-800 text-slate-200 border border-slate-700"
      />
      <div className="w-full px-2 py-6">
        <Card
          bodyClass="relative p-6 h-full overflow-hidden"
          className="w-full border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
        >
          <SimpleBar className="h-full">
            <div className="p-6 border-b border-purple-800 bg-gradient-to-r from-slate-800 to-purple-900 rounded-t-3xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-lg">
                  <Icon icon="material-symbols:local-shipping" className="text-2xl" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                Cek Resi Pengiriman
              </h4>
              <p className="text-sm text-center text-slate-400 mt-2">
                Lacak status pengiriman paket Anda dengan mudah.
              </p>
            </div>

            <div className="p-6">
              <div className="mb-4 bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <label className="block text-sm font-medium text-purple-300 mb-3 flex items-center">
                  <Icon icon="material-symbols:receipt-long" className="mr-2" />
                  Masukkan Nomor Resi
                </label>
                <Textinput
                  id="resi"
                  type="text"
                  placeholder="Contoh: JX3708794672"
                  value={resi}
                  onChange={(e) => setResi(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                />
              </div>

              <div className="mb-6 bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <label className="block text-sm font-medium text-purple-300 mb-3 flex items-center">
                  <Icon icon="material-symbols:local-shipping-outline" className="mr-2" />
                  Pilih Ekspedisi
                </label>
                <select
                  value={expedisi}
                  onChange={(e) => setExpedisi(e.target.value)}
                  className="w-full bg-slate-900 border-slate-700 text-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="" disabled>
                    Pilih Ekspedisi
                  </option>
                  {loadingList ? (
                    <option disabled>Memuat daftar ekspedisi...</option>
                  ) : (
                    listEkspedisi.map((item) => (
                      <option key={item.expedisi} value={item.expedisi}>
                        {item.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-purple-500 text-white font-bold rounded-full shadow-md hover:shadow-lg transition duration-300"
                onClick={handleCekResi}
                disabled={loading || loadingList}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Icon icon="material-symbols:refresh" className="animate-spin mr-2" /> Mengecek...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Icon icon="material-symbols:search" className="mr-2" /> Lacak Paket
                  </span>
                )}
              </Button>

              {trackingData && (
                <div className="mt-6 bg-slate-900 p-6 rounded-2xl border border-slate-700">
                  <h5 className="text-lg font-semibold text-purple-400 mb-3">
                    Hasil Pelacakan
                  </h5>
                  <div className="mb-4">
                    <p className="text-slate-300">
                      <span className="font-semibold text-purple-300">
                        Nomor Resi:
                      </span>{" "}
                      {trackingData.summary.waybill_number}
                    </p>
                    <p className="text-slate-300">
                      <span className="font-semibold text-purple-300">
                        Ekspedisi:
                      </span>{" "}
                      {trackingData.summary.courier_name} ({trackingData.summary.courier_code})
                    </p>
                    <p className="text-slate-300">
                      <span className="font-semibold text-purple-300">
                        Status:
                      </span>{" "}
                      {trackingData.summary.status}
                      {trackingData.delivered && (
                        <span className="text-green-400 ml-1">(Telah Diterima)</span>
                      )}
                    </p>
                  </div>

                  <h6 className="text-md font-semibold text-purple-300 mb-2">
                    Detail Pengiriman
                  </h6>
                  <ul className="list-none space-y-2">
                    <li>
                      <span className="font-semibold text-slate-400">
                        Tanggal/Waktu Kirim:
                      </span>{" "}
                      {trackingData.details.waybill_date} {trackingData.details.waybill_time}
                    </li>
                    <li>
                      <span className="font-semibold text-slate-400">
                        Pengirim:
                      </span>{" "}
                      {trackingData.details.shipper_name} ({trackingData.details.shipper_city})
                    </li>
                    <li>
                      <span className="font-semibold text-slate-400">
                        Penerima:
                      </span>{" "}
                      {trackingData.details.receiver_name} ({trackingData.details.receiver_city})
                    </li>
                    <li>
                      <span className="font-semibold text-slate-400">
                        Tujuan:
                      </span>{" "}
                      {trackingData.details.destination}
                    </li>
                  </ul>

                  {trackingData.manifest && trackingData.manifest.length > 0 && (
                    <>
                      <h6 className="text-md font-semibold text-purple-300 mt-4 mb-2">
                        Riwayat Perjalanan Paket
                      </h6>
                      <ul className="list-decimal pl-5 space-y-2">
                        {trackingData.manifest.map((item, index) => (
                          <li key={index} className="text-slate-300">
                            {item.manifest_description} ({item.city_name}) -{" "}
                            {item.manifest_date} {item.manifest_time}
                          </li>
                        ))}
                      </ul>
                    </>
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