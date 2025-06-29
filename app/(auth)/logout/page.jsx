"use client";

import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { handleLogout as logout } from "@/components/partials/auth/store";
import Card from "@/components/ui/Card";
import { Icon } from "@iconify/react";
import { ToastContainer, toast } from "react-toastify";

const OutPage = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const doLogout = async () => {
      try {
        setLoading(true);
        await dispatch(logout());
        toast.success("Anda telah berhasil keluar.");
      } catch (error) {
        toast.error("Gagal melakukan logout.");
      } finally {
        setLoading(false);
      }
    };

    doLogout();
  }, [dispatch]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-8 sm:py-12 relative overflow-hidden">
      <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          theme="colored"
          toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-teal-500/10 dark:from-teal-700/20 dark:via-cyan-700/10 dark:to-teal-700/20 z-0 opacity-60 dark:opacity-40"></div>

      <div className="relative z-10 w-full max-w-md">
        <Card
          bodyClass="p-6 sm:p-8 md:p-10"
          className="w-full border border-teal-500/30 dark:border-teal-600/50 rounded-xl shadow-2xl bg-white text-slate-800 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-75"
        >
          <div className="flex flex-col items-center text-center">
            {loading ? (
              <>
                <Icon icon="svg-spinners:ring-resize" className="text-4xl sm:text-5xl text-teal-500 mb-4" />
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-700 dark:text-slate-300">
                  Sedang Proses Logout...
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Mohon tunggu sebentar.
                </p>
              </>
            ) : (
              <>
                <Icon icon="ph:check-circle-duotone" className="text-5xl sm:text-6xl text-emerald-500 mb-4" />
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-700 dark:text-slate-300">
                  Anda Telah Keluar
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Sesi Anda telah berhasil diakhiri. Terima kasih telah berkunjung.
                </p>
                 <a
                  href="/login"
                  className="mt-6 inline-flex items-center justify-center text-sm bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium py-2 px-5 rounded-md shadow-sm hover:shadow-lg transition-all duration-150"
                >
                  Kembali ke Halaman Login
                </a>
              </>
            )}
          </div>
        </Card>
      </div>
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500 dark:text-slate-400/80 z-10 px-4">
        Hak Cipta &copy; {currentYear}. Semua Hak Dilindungi Undang-Undang.
      </div>
    </div>
  );
};

export default OutPage;