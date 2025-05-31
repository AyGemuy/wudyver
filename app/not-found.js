"use client";
import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Icon } from "@iconify/react";

const PageNotFound = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleBackClick = () => {
    setIsLoading(true);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-teal-500/10 dark:from-teal-700/20 dark:via-cyan-700/10 dark:to-teal-700/20 z-0 opacity-60 dark:opacity-40"></div>
      
      <Card
        bodyClass="relative p-0 h-full"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl text-center shadow-2xl border border-teal-500/30 dark:border-teal-600/50 bg-white text-slate-800 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-75"
      >
        <div className="p-6 sm:p-10">
          <div className="mb-8 flex justify-center">
            <Icon
              icon="ph:ghost-duotone"
              className="text-8xl text-teal-500 drop-shadow-lg dark:text-teal-400 sm:text-9xl"
            />
          </div>

          <h2 className="mb-4 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 sm:text-4xl">
            Oops! Halaman Tidak Ditemukan
          </h2>

          <p className="mb-8 text-base text-slate-600 dark:text-slate-300">
            Maaf, halaman yang Anda cari sepertinya tidak ada. Mungkin telah
            dihapus, diganti namanya, atau sementara tidak tersedia.
          </p>

          <Link href="/analytics" className="block">
            <Button
              icon={isLoading ? "svg-spinners:ring-resize" : "heroicons:arrow-left-solid"}
              text={isLoading ? "Kembali..." : "Kembali ke Beranda"}
              className={`w-full rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 py-3 text-base font-semibold text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition duration-300 ${
                isLoading ? "cursor-not-allowed opacity-70" : ""
              }`}
              isLoading={isLoading}
              disabled={isLoading}
              onClick={handleBackClick}
            />
          </Link>

          <div className="mt-8 flex justify-center">
            <Badge
              variant="outline"
              className="border-teal-500/70 text-sm text-teal-600 dark:border-teal-600/70 dark:text-teal-400"
            >
              Kode Error: 404
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PageNotFound;