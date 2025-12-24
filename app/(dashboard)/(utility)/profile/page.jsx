"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Card from "@/components/ui/Card";
import BasicArea from "@/components/partials/chart/appex-chart/BasicArea";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";

const ProfilePage = () => {
  // State untuk informasi klien, diinisialisasi dengan nilai default
  const [info, setInfo] = useState({
    ip: "...",
    location: "...",
    phone: "...",
    time: "...",
    day: "...",
    device: "...",
    battery: "...",
    network: "...",
    browser: "...",
    language: "...",
    geolocation: "...",
    os: "...",
    screen: "...",
    storage: "...",
    memory: "...",
    connectionType: "...",
  });
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // State untuk statistik sistem, diinisialisasi dengan nilai default
  const [systemStats, setSystemStats] = useState(null); // Keep null to differentiate initial load
  const [loadingSystemStats, setLoadingSystemStats] = useState(true);
  const [systemStatsError, setSystemStatsError] = useState(null);

  // State untuk dynamicProfileStats, diinisialisasi sebagai state agar tidak di-recreate
  const [dynamicProfileStats, setDynamicProfileStats] = useState([
    {
      title: "Memory Used",
      value: "...",
      icon: "ph:cpu-duotone",
      subtitle: "...",
      status: "loading", // Tambahkan status untuk indikator
    },
    {
      title: "Total Routes",
      value: "...",
      icon: "ph:git-branch-duotone",
      subtitle: "...",
      status: "loading",
    },
    {
      title: "System Uptime",
      value: "...",
      icon: "ph:clock-duotone",
      subtitle: "...",
      status: "loading",
    },
  ]);

  useEffect(() => {
    const fetchIPInfo = async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error(`Failed to fetch IP info: ${res.status}`);
        const data = await res.json();
        const now = new Date();
        const options = { weekday: "long" };

        let batteryStatus = "N/A";
        if (typeof navigator !== "undefined" && navigator.getBattery) {
          try {
            const battery = await navigator.getBattery();
            batteryStatus = `${Math.round(battery.level * 100)}%${
              battery.charging ? " (Charging)" : ""
            }`;
          } catch (e) {
            console.warn("Battery API error:", e);
            batteryStatus = "Unavailable";
          }
        }

        const networkStatus =
          typeof navigator !== "undefined" && navigator.onLine
            ? "Online"
            : "Offline";
        const connectionType =
          (typeof navigator !== "undefined" &&
            navigator.connection?.effectiveType) ||
          "Unknown";

        const userAgent =
          typeof navigator !== "undefined" ? navigator.userAgent : "N/A";
        let browserName = "Unknown";
        if (userAgent.includes("Firefox")) browserName = "Firefox";
        else if (userAgent.includes("SamsungBrowser"))
          browserName = "Samsung Browser";
        else if (userAgent.includes("Opera") || userAgent.includes("OPR"))
          browserName = "Opera";
        else if (userAgent.includes("Edge") || userAgent.includes("Edg"))
          browserName = "Edge";
        else if (userAgent.includes("Chrome")) browserName = "Chrome";
        else if (userAgent.includes("Safari")) browserName = "Safari";

        const language =
          typeof navigator !== "undefined"
            ? navigator.language || navigator.userLanguage
            : "N/A";
        const os = typeof navigator !== "undefined" ? navigator.platform : "N/A";
        const screen =
          typeof window !== "undefined"
            ? `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x ratio)`
            : "N/A";

        let availableStorage = "N/A";
        if (
          typeof navigator !== "undefined" &&
          navigator.storage &&
          navigator.storage.estimate
        ) {
          try {
            const storage = await navigator.storage.estimate();
            availableStorage = storage?.quota
              ? `${(storage.quota / 1e9).toFixed(2)} GB (Total Quota)`
              : "N/A";
          } catch (e) {
            console.warn("Storage API error:", e);
            availableStorage = "Unavailable";
          }
        }

        const memory =
          typeof navigator !== "undefined" && navigator.deviceMemory
            ? `${navigator.deviceMemory} GB (approx)`
            : "N/A";

        let finalGeolocation = "Permission denied or unavailable";
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
              })
            );
            const { latitude, longitude } = position.coords;
            finalGeolocation = `${latitude.toFixed(3)}, ${longitude.toFixed(
              3
            )}`;
          } catch (geoError) {
            console.warn("Geolocation error:", geoError.message);
          }
        }

        setInfo({
          ip: data.ip || "N/A",
          location:
            data.city && data.country_name
              ? `${data.city}, ${data.region}, ${data.country_name}`
              : "N/A",
          phone: data.country_calling_code
            ? `${data.country_calling_code} (Area)`
            : "N/A",
          time: now.toLocaleTimeString(),
          day: now.toLocaleDateString(
            language !== "N/A" ? language : undefined,
            { ...options, month: "long", day: "numeric" }
          ),
          device: userAgent,
          battery: batteryStatus,
          network: networkStatus,
          browser: browserName,
          language,
          geolocation: finalGeolocation,
          os,
          screen,
          storage: availableStorage,
          memory,
          connectionType,
        });
      } catch (e) {
        console.error("Failed to get client info:", e);
        setDataError(e.message || "Could not load client details.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchIPInfo();
    const intervalId = setInterval(fetchIPInfo, 30000); // Perbarui setiap 30 detik
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchSystemData = async () => {
      setLoadingSystemStats(true);
      setSystemStatsError(null);
      try {
        const response = await axios.get(
          `https://${apiConfig.DOMAIN_URL}/api/general/system-stats`
        );
        const data = response.data;

        if (
          !data ||
          !data.Statistik ||
          !data.Statistik.Memory ||
          typeof data.TotalRoute === "undefined"
        ) {
          throw new Error("Invalid system stats data format received from API");
        }
        setSystemStats(data); // Simpan data mentah
        setDynamicProfileStats([ // Perbarui state dynamicProfileStats
          {
            title: "Memory Used",
            value: data.Statistik.Memory.used,
            icon: "ph:cpu-duotone",
            subtitle: `Total: ${data.Statistik.Memory.total}`,
            status: "success",
          },
          {
            title: "Total Routes",
            value: String(data.TotalRoute),
            icon: "ph:git-branch-duotone",
            subtitle: `Platform: ${data.Statistik.Platform}`,
            status: "success",
          },
          {
            title: "System Uptime",
            value: data.Statistik.Uptime,
            icon: "ph:clock-duotone",
            subtitle: `Node: ${data.Statistik.NodeVersion}`,
            status: "success",
          },
        ]);
      } catch (e) {
        console.error("Failed to get system stats:", e);
        const errorMessage = e.response?.data?.message || e.message || "Could not load system statistics.";
        setSystemStatsError(errorMessage);
        setDynamicProfileStats([ // Perbarui state dynamicProfileStats dengan error
          {
            title: "Memory Used",
            value: "Error",
            icon: "ph:warning-octagon-duotone",
            subtitle: errorMessage.substring(0, 30) + (errorMessage.length > 30 ? "..." : ""),
            status: "error",
          },
          {
            title: "Total Routes",
            value: "Error",
            icon: "ph:warning-octagon-duotone",
            subtitle: errorMessage.substring(0, 30) + (errorMessage.length > 30 ? "..." : ""),
            status: "error",
          },
          {
            title: "System Uptime",
            value: "Error",
            icon: "ph:warning-octagon-duotone",
            subtitle: errorMessage.substring(0, 30) + (errorMessage.length > 30 ? "..." : ""),
            status: "error",
          },
        ]);
      } finally {
        setLoadingSystemStats(false);
      }
    };

    fetchSystemData();
    const intervalId = setInterval(fetchSystemData, 3000); // Perbarui setiap 3 detik
    return () => clearInterval(intervalId);
  }, []);

  const infoItems = [
    {
      icon: "ph:envelope-duotone",
      label: "EMAIL",
      value: "abdmalikalqadri2001@gmail.com",
      href: "mailto:abdmalikalqadri2001@gmail.com",
    },
    { icon: "ph:phone-duotone", label: "PHONE (Area)", value: info.phone },
    {
      icon: "ph:map-pin-duotone",
      label: "LOCATION (IP Based)",
      value: info.location,
    },
    {
      icon: "ph:globe-duotone",
      label: "WEBSITE",
      value: apiConfig.DOMAIN_URL?.replace(/^https?:\/\//, ""),
      href: apiConfig.DOMAIN_URL,
      target: "_blank",
    },
    {
      icon: "ph:battery-charging-vertical-duotone",
      label: "BATTERY",
      value: info.battery,
    },
    {
      icon: "ph:wifi-high-duotone",
      label: "NETWORK",
      value: `${info.network || ""} ${info.connectionType ? `(${info.connectionType})` : ""}`.trim(),
    },
    { icon: "ph:desktop-duotone", label: "OPERATING SYSTEM", value: info.os },
    {
      icon: "ph:browser-duotone",
      label: "BROWSER",
      value: `${info.browser || ""} ${info.language ? `(${info.language})` : ""}`.trim(),
    },
    {
      icon: "ph:device-mobile-camera-duotone",
      label: "SCREEN",
      value: info.screen,
    },
    {
      icon: "ph:database-duotone",
      label: "STORAGE (Browser)",
      value: info.storage,
    },
    {
      icon: "ph:memory-duotone",
      label: "MEMORY (Browser)",
      value: info.memory,
    },
    {
      icon: "ph:navigation-arrow-duotone",
      label: "GEOLOCATION",
      value: info.geolocation,
    },
    { icon: "ph:identification-badge-duotone", label: "IP ADDRESS", value: info.ip },
    {
      icon: "ph:clock-duotone",
      label: "CURRENT TIME",
      value: `${info.time || ""}${info.day ? `, ${info.day}` : ""}`.trim(),
    },
  ];

  return (
    <div className="w-full px-2 sm:px-4 py-6 space-y-6">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
      />
      <Card className="w-full border border-emerald-500/30 dark:border-emerald-600/50 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/60 dark:text-slate-100 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-70">
        <div className="p-5 md:p-6">
          <div className="md:flex md:items-center md:space-x-6 rtl:space-x-reverse">
            <div className="flex-none self-start">
              <div className="relative mx-auto md:mx-0 h-32 w-32 md:h-36 md:w-36 rounded-full ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-emerald-500/70 shadow-md">
                <img
                  src="/assets/images/users/user-1.jpg"
                  alt="User Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
                <Link
                  href="#"
                  className="absolute bottom-1 right-1 h-9 w-9 bg-slate-100 hover:bg-slate-200 text-emerald-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-emerald-400 rounded-full shadow-sm flex items-center justify-center transition-colors"
                  title="Edit Profile Image"
                >
                  <Icon icon="ph:pencil-simple-duotone" className="text-lg" />
                </Link>
              </div>
            </div>
            <div className="flex-1 mt-4 md:mt-0 text-center md:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500 mb-1">
                Malik Al Qadri
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Futuristic Systems Engineer | Quantum AI Developer
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 max-w-xl mx-auto md:mx-0">
                Dedicated to pioneering next-generation interfaces and
                unraveling the complexities of decentralized consciousness.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-center md:text-left">
              {dynamicProfileStats.map((stat) => (
                <div
                  key={stat.title}
                  className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg flex items-center md:flex-col lg:flex-row lg:items-center space-x-3 lg:space-x-4"
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br ${
                      stat.status === "error"
                        ? "from-red-500/20 to-red-600/20 text-red-600 dark:text-red-400"
                        : "from-teal-500/20 to-emerald-600/20 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <Icon icon={stat.icon} className="text-xl" />
                  </div>
                  <div className="flex-grow">
                    <p
                      className="text-xl font-semibold text-slate-700 dark:text-slate-200 truncate"
                      title={stat.value}
                    >
                      {stat.value} {/* Langsung tampilkan nilai dari state dynamicProfileStats */}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {stat.title}
                    </p>
                    {stat.subtitle && (
                      <p
                        className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate"
                        title={stat.subtitle}
                      >
                        {stat.subtitle} {/* Langsung tampilkan subtitle */}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 col-span-12">
          <Card className="w-full border border-emerald-500/30 dark:border-emerald-600/50 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/60 dark:text-slate-100 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-70">
            <div className="p-1 sm:p-2 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2.5">
                <Icon
                  icon="ph:identification-card-duotone"
                  className="text-xl text-emerald-500"
                />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  User & System Information
                </h3>
              </div>
            </div>
            <div className="p-4 md:p-5">
              {/* Selalu render UL, dan biarkan item-itemnya menampilkan status loading/error/data */}
              <ul className="space-y-4">
                {infoItems.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start space-x-3 rtl:space-x-reverse"
                  >
                    <div className="flex-none text-xl text-emerald-600 dark:text-emerald-400 pt-0.5">
                      <Icon icon={item.icon || "ph:question-duotone"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 tracking-wider">
                        {item.label}
                      </div>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-sm text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors break-words"
                          target={item.target || "_self"}
                          rel={item.target === "_blank" ? "noopener noreferrer" : ""}
                        >
                          {loadingData ? "..." : dataError ? "Error" : item.value || "N/A"}
                        </a>
                      ) : (
                        <div className="text-sm text-slate-700 dark:text-slate-200 break-words">
                          {loadingData ? "..." : dataError ? "Error" : item.value || "N/A"}
                        </div>
                      )}
                      {loadingData && (item.label === "IP ADDRESS" || item.label === "LOCATION (IP Based)") && (
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <Icon icon="svg-spinners:ring-resize" className="mr-1" /> Loading...
                        </div>
                      )}
                      {dataError && (item.label === "IP ADDRESS" || item.label === "LOCATION (IP Based)") && (
                        <div className="flex items-center text-xs text-red-500 dark:text-red-400 mt-1">
                          <Icon icon="ph:warning-octagon-duotone" className="mr-1" /> {dataError.substring(0, 20)}...
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 col-span-12">
          <Card className="w-full border border-emerald-500/30 dark:border-emerald-600/50 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/60 dark:text-slate-100 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-70">
            <div className="p-1 sm:p-2 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2.5">
                <Icon
                  icon="ph:chart-line-up-duotone"
                  className="text-xl text-emerald-500"
                />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  Activity Overview
                </h3>
              </div>
            </div>
            <div className="p-4 md:p-5">
              <BasicArea />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
