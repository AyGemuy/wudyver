"use client";
import React from "react";
import useDarkMode from "@/hooks/useDarkMode";
import { Icon } from "@iconify/react";

const Loading = () => {
  const [isDark] = useDarkMode();

  return (
    <div className="flex flex-col items-center justify-center app_height">
      <img
        src={isDark ? "/assets/images/logo/logo-white.svg" : "/assets/images/logo/logo.svg"}
        alt="Logo"
        className="mb-8"
      />
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