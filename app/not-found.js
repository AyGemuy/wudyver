"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Card from "@/components/ui/Card";
import { Icon } from "@iconify/react";
import useDarkMode from "@/hooks/useDarkMode";

const PageNotFound = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDark] = useDarkMode();
  const [currentYear] = useState(new Date().getFullYear());

  const handleBackClick = () => {
    setIsLoading(true);
  };

  const imageSrc = isDark
    ? "/assets/images/all-img/404-2.svg"
    : "/assets/images/all-img/404.svg";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-teal-500/10 dark:from-teal-700/20 dark:via-cyan-700/10 dark:to-teal-700/20 z-0 opacity-60 dark:opacity-40"></div>

      <div className="relative z-10 w-full max-w-md">
        <Card
          bodyClass="p-6 sm:p-8 md:p-10"
          className="w-full border border-teal-500/30 dark:border-teal-600/50 rounded-xl shadow-2xl bg-white text-slate-800 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-75"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 sm:mb-6">
              <Image
                src={imageSrc}
                alt="Halaman Tidak Ditemukan"
                width={140}
                height={140}
                className="drop-shadow-lg"
                key={imageSrc}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 mb-3">
              Oops! Halaman Hilang
            </h1>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6 sm:mb-8">
              Sepertinya halaman yang Anda tuju tidak dapat ditemukan.
              Mungkin salah ketik alamat atau halaman sudah tidak ada lagi.
            </p>

            <Link href="/analytics" passHref>
              <a
                onClick={handleBackClick}
                className={`inline-flex items-center justify-center text-sm bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium py-2.5 px-4 sm:px-6 rounded-md shadow-sm hover:shadow-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  isLoading ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                {isLoading ? (
                  <>
                    <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 h-4 w-4" />
                    Mengalihkan...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:arrow-left" className="mr-2 h-5 w-5" />
                    Kembali ke Beranda
                  </>
                )}
              </a>
            </Link>
          </div>
        </Card>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500 dark:text-slate-400/80 z-10 px-4">
        Hak Cipta &copy; {currentYear}. Semua Hak Dilindungi Undang-Undang.
      </div>
    </div>
  );
};

export default PageNotFound;