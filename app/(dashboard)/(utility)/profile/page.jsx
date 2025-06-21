"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Card from "@/components/ui/Card";
import BasicArea from "@/components/partials/chart/appex-chart/BasicArea";
import { toast, ToastContainer } from "react-toastify";

const ProfilePage = () => {
  const [info, setInfo] = useState({
    ip: "Loading...",
    location: "Loading...",
    phone: "Loading...",
    time: "Loading...",
    day: "Loading...",
    device: "Loading...",
    battery: "Loading...",
    network: "Loading...",
    browser: "Loading...",
    language: "Loading...",
    geolocation: "Loading...",
    os: "Loading...",
    screen: "Loading...",
    storage: "Loading...",
    memory: "Loading...",
    connectionType: "Loading...",
  });
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [systemStats, setSystemStats] = useState(null);
  const [loadingSystemStats, setLoadingSystemStats] = useState(true);
  const [systemStatsError, setSystemStatsError] = useState(null);

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
        if (typeof navigator !== 'undefined' && navigator.getBattery) {
          const battery = await navigator.getBattery();
          batteryStatus = `${Math.round(battery.level * 100)}%${battery.charging ? " (Charging)" : ""}`;
        }

        const networkStatus = typeof navigator !== 'undefined' && navigator.onLine ? "Online" : "Offline";
        const connectionType = typeof navigator !== 'undefined' && navigator.connection?.effectiveType || "Unknown";
        
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : "N/A";
        let browserName = "Unknown";
        if (userAgent.includes("Firefox")) browserName = "Firefox";
        else if (userAgent.includes("SamsungBrowser")) browserName = "Samsung Browser";
        else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browserName = "Opera";
        else if (userAgent.includes("Edge") || userAgent.includes("Edg")) browserName = "Edge";
        else if (userAgent.includes("Chrome")) browserName = "Chrome";
        else if (userAgent.includes("Safari")) browserName = "Safari";

        const language = typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage) : "N/A";
        const os = typeof navigator !== 'undefined' ? navigator.platform : "N/A";
        const screen = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x ratio)` : "N/A";
        
        let availableStorage = "N/A";
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
            const storage = await navigator.storage.estimate();
            availableStorage = storage?.quota ? `${(storage.quota / 1e9).toFixed(2)} GB (Total Quota)` : "N/A";
        }
        
        const memory = typeof navigator !== 'undefined' && navigator.deviceMemory ? `${navigator.deviceMemory} GB (approx)` : "N/A";

        let finalGeolocation = "Permission denied or unavailable";
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => 
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            );
            const { latitude, longitude } = position.coords;
            finalGeolocation = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
          } catch (geoError) {
            console.warn("Geolocation error:", geoError.message);
          }
        }

        setInfo({
          ip: data.ip || "N/A",
          location: data.city && data.country_name ? `${data.city}, ${data.region}, ${data.country_name}` : "N/A",
          phone: data.country_calling_code ? `${data.country_calling_code} (Area)` : "N/A",
          time: now.toLocaleTimeString(),
          day: now.toLocaleDateString(language !== "N/A" ? language : undefined, { ...options, month: 'long', day: 'numeric' }),
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
    const intervalId = setInterval(fetchIPInfo, 30000); 
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchSystemData = async () => {
      setLoadingSystemStats(true);
      setSystemStatsError(null);
      try {
        await new Promise(resolve => setTimeout(resolve, 1200)); 
        const mockData = {
          "Statistik": {
            "Memory": { "total": "32.75 MB", "free": "27.42 MB", "used": "5.33 MB" },
            "Uptime": "0d 0h 13m 17s",
            "Platform": "linux", "Architecture": "x64", "NodeVersion": "v22.15.0"
          },
          "TotalRoute": 1275
        };
        const data = mockData; 

        if (!data || !data.Statistik || !data.Statistik.Memory || typeof data.TotalRoute === 'undefined') {
          throw new Error("Invalid system stats data format received from API");
        }
        setSystemStats(data);

      } catch (e) {
        console.error("Failed to get system stats:", e);
        setSystemStatsError(e.message || "Could not load system statistics.");
      } finally {
        setLoadingSystemStats(false);
      }
    };

    fetchSystemData();
  }, []);


  let dynamicProfileStats = [
    { title: "Memory Used", value: "Loading...", icon: "ph:cpu-duotone", subtitle: "Fetching data..." },
    { title: "Total Routes", value: "Loading...", icon: "ph:git-branch-duotone", subtitle: "Fetching data..." },
    { title: "System Uptime", value: "Loading...", icon: "ph:clock-duotone", subtitle: "Fetching data..." },
  ];

  if (loadingSystemStats) {
  } else if (systemStatsError) {
    dynamicProfileStats = [
      { title: "Memory Used", value: "Error", icon: "ph:warning-octagon-duotone", subtitle: systemStatsError.substring(0, 30) + "..." },
      { title: "Total Routes", value: "Error", icon: "ph:warning-octagon-duotone", subtitle: systemStatsError.substring(0, 30) + "..." },
      { title: "System Uptime", value: "Error", icon: "ph:warning-octagon-duotone", subtitle: systemStatsError.substring(0, 30) + "..." },
    ];
  } else if (systemStats) {
    dynamicProfileStats = [
      {
        title: "Memory Used",
        value: systemStats.Statistik.Memory.used,
        icon: "ph:cpu-duotone",
        subtitle: `Total: ${systemStats.Statistik.Memory.total}`
      },
      {
        title: "Total Routes",
        value: String(systemStats.TotalRoute), 
        icon: "ph:git-branch-duotone",
        subtitle: `Platform: ${systemStats.Statistik.Platform}`
      },
      {
        title: "System Uptime",
        value: systemStats.Statistik.Uptime,
        icon: "ph:clock-duotone",
        subtitle: `Node: ${systemStats.Statistik.NodeVersion}`
      },
    ];
  }

  const infoItems = [
    { icon: "ph:envelope-duotone", label: "EMAIL", value: "abdmalikalqadri2001@gmail.com", href: "mailto:abdmalikalqadri2001@gmail.com" },
    { icon: "ph:phone-duotone", label: "PHONE (Area)", value: info.phone },
    { icon: "ph:map-pin-duotone", label: "LOCATION (IP Based)", value: info.location },
    { icon: "ph:globe-duotone", label: "WEBSITE", value: process.env.NEXT_PUBLIC_DOMAIN_URL?.replace(/^https?:\/\//, ""), href: process.env.NEXT_PUBLIC_DOMAIN_URL, target: "_blank" },
    { icon: "ph:battery-charging-vertical-duotone", label: "BATTERY", value: info.battery },
    { icon: "ph:wifi-high-duotone", label: "NETWORK", value: `${info.network} (${info.connectionType})` },
    { icon: "ph:desktop-duotone", label: "OPERATING SYSTEM", value: info.os },
    { icon: "ph:browser-duotone", label: "BROWSER", value: `${info.browser} (${info.language})`},
    { icon: "ph:device-mobile-camera-duotone", label: "SCREEN", value: info.screen },
    { icon: "ph:database-duotone", label: "STORAGE (Browser)", value: info.storage },
    { icon: "ph:memory-duotone", label: "MEMORY (Browser)", value: info.memory },
    { icon: "ph:navigation-arrow-duotone", label: "GEOLOCATION", value: info.geolocation },
    { icon: "ph:identification-badge-duotone", label: "IP ADDRESS", value: info.ip },
    { icon: "ph:clock-duotone", label: "CURRENT TIME", value: `${info.time}, ${info.day}` },
  ];


  return (
    <div className="w-full px-2 sm:px-4 py-6 space-y-6">
        <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored" />
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
                  <Icon icon="ph:pencil-simple-duotone" className="text-lg"/>
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
                Dedicated to pioneering next-generation interfaces and unraveling the complexities of decentralized consciousness.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-center md:text-left">
              {dynamicProfileStats.map((stat) => (
                <div key={stat.title} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg flex items-center md:flex-col lg:flex-row lg:items-center space-x-3 lg:space-x-4">
                  <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br ${stat.value === "Error" ? "from-red-500/20 to-red-600/20 text-red-600 dark:text-red-400" : "from-teal-500/20 to-emerald-600/20 text-emerald-600 dark:text-emerald-400"}`}>
                     <Icon icon={stat.icon} className="text-xl" />
                  </div>
                  <div className="flex-grow"> 
                    <p className="text-xl font-semibold text-slate-700 dark:text-slate-200 truncate" title={stat.value}>{stat.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.title}</p>
                    {stat.subtitle && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate" title={stat.subtitle}>{stat.subtitle}</p>
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
                    <Icon icon="ph:identification-card-duotone" className="text-xl text-emerald-500" />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                        User & System Information
                    </h3>
                </div>
            </div>
            <div className="p-4 md:p-5">
              {loadingData && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-emerald-500 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading details...</p>
                  </div>
              )}
              {dataError && !loadingData && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-md text-center">
                    <Icon icon="ph:warning-octagon-duotone" className="text-3xl text-red-500 mb-2 mx-auto" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-300">Could not load details</p>
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{dataError}</p>
                </div>
              )}
              {!loadingData && !dataError && (
                <ul className="space-y-4">
                  {infoItems.map((item) => (
                    <li key={item.label} className="flex items-start space-x-3 rtl:space-x-reverse">
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
                            {item.value || "N/A"}
                          </a>
                        ) : (
                          <div className="text-sm text-slate-700 dark:text-slate-200 break-words"> 
                            {item.value || "N/A"}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 col-span-12">
          <Card className="w-full border border-emerald-500/30 dark:border-emerald-600/50 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/60 dark:text-slate-100 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-70">
             <div className="p-1 sm:p-2 border-b border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2.5">
                    <Icon icon="ph:chart-line-up-duotone" className="text-xl text-emerald-500" />
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
