"use client";
import React from "react";
import useDarkMode from "@/hooks/useDarkMode"; // Tetap dipertahankan jika ada penggunaan lain atau untuk konsistensi
import { Icon } from "@iconify/react"; // Import Icon

const Loading = () => {
  // const [isDark] = useDarkMode(); // Variabel isDark tidak digunakan secara langsung oleh elemen baru jika Tailwind dark mode sudah menangani

  return (
    <div className="flex flex-col items-center justify-center app_height">
      {/* Menggunakan Iconify spinner dan teks seperti di OpenApiSpecManagerPage */}
      <Icon
        icon="svg-spinners:blocks-shuffle-3"
        className="mb-4 text-5xl text-emerald-500"
      />
      <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
        Memuat...
      </p>
    </div>
  );
};

export default Loading;