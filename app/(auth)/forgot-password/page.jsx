"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import useDarkMode from "@/hooks/useDarkMode";
import { Icon } from "@iconify/react"; // Icon masih digunakan untuk elemen UI lain jika ada
import { ToastContainer } from "react-toastify";
import ForgotForm from "@/components/partials/auth/forgot-pass"; // Mengimpor ForgotForm

const ForgotPassPage = () => {
  const [isDark] = useDarkMode();
  const [currentYear] = useState(new Date().getFullYear());

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-8 sm:py-12 relative overflow-hidden">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${
            o?.type === "success"
              ? "bg-emerald-500 text-white"
              : o?.type === "error"
              ? "bg-red-500 text-white"
              : "bg-teal-500 text-white"
          } dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-teal-500/10 dark:from-teal-700/20 dark:via-cyan-700/10 dark:to-teal-700/20 z-0 opacity-60 dark:opacity-40"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="w-full border border-teal-500/30 dark:border-teal-600/50 rounded-xl shadow-2xl bg-white text-slate-800 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-75 p-6 sm:p-8 md:p-10">
          <div className="flex flex-col items-center">
            <Link href="/" className="mb-6 sm:mb-8 block">
              <img
                src={
                  isDark
                    ? "/assets/images/logo/logo-white.svg"
                    : "/assets/images/logo/logo.svg"
                }
                alt="Logo Perusahaan"
                className="h-10 sm:h-12"
              />
            </Link>

            <div className="text-center mb-5">
              <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 mb-2">
                Lupa Password Anda?
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Masukkan alamat email Anda di bawah ini untuk menerima link pemulihan password.
              </p>
            </div>

            <ForgotForm />
            
            <div className="mt-8 sm:mt-10 text-sm sm:text-base text-center">
              <Link
                href="/login"
                className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline"
              >
                Kembali ke Halaman Masuk
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500 dark:text-slate-400/80 z-10 px-4">
        Hak Cipta &copy; {currentYear}. Semua Hak Dilindungi Undang-Undang.
      </div>
    </div>
  );
};

export default ForgotPassPage;