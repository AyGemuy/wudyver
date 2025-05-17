"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Card from "@/components/ui/Card";
import BasicArea from "@/components/partials/chart/appex-chart/BasicArea";

const profile = () => {
  const [info, setInfo] = useState({
    ip: "",
    location: "",
    phone: "",
    time: "",
    day: "",
    device: "",
    battery: "",
    network: "",
    browser: "",
    language: "",
    geolocation: "",
    os: "",
    screen: "",
    storage: "",
    memory: "",
    connectionType: "",
  });

  useEffect(() => {
    const fetchIPInfo = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        const now = new Date();
        const options = { weekday: "long" };

        // Fetch battery status
        const battery = await navigator.getBattery();
        const batteryStatus = `${Math.round(battery.level * 100)}%`;

        // Fetch network information (e.g., online/offline, connection type)
        const networkStatus = navigator.onLine ? "Online" : "Offline";
        const connectionType = navigator.connection
          ? navigator.connection.effectiveType
          : "Unknown";

        // Get browser details
        const browser = navigator.userAgent;
        const language = navigator.language || navigator.userLanguage;

        // Get system information
        const os = navigator.platform;
        const screen = `${window.screen.width}x${window.screen.height}`;
        
        // Get available storage (using the Storage API if supported)
        const storage = await navigator.storage?.estimate();
        const availableStorage = storage?.quota ? `${(storage.quota / 1e9).toFixed(2)} GB` : "Unknown";
        
        // Get memory usage (if supported)
        const memory = navigator.deviceMemory || "Unknown";

        // Geolocation (if permitted)
        let geolocation = "Unavailable";
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              geolocation = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
              setInfo((prevInfo) => ({ ...prevInfo, geolocation }));
            },
            (error) => {
              console.error("Geolocation error:", error);
            }
          );
        }

        setInfo({
          ip: data.ip,
          location: `${data.city}, ${data.region}, ${data.country_name}`,
          phone: data.country_calling_code + "*********",
          time: now.toLocaleTimeString(),
          day: now.toLocaleDateString("en-US", options),
          device: `${os} - ${browser}`,
          battery: batteryStatus,
          network: networkStatus,
          browser: `${browser.split(" ")[0]} ${browser.split(" ")[1]}`,
          language,
          geolocation,
          os,
          screen,
          storage: availableStorage,
          memory,
          connectionType,
        });
      } catch (e) {
        console.error("Failed to get IP info:", e);
      }
    };

    fetchIPInfo(); // Initial fetch

    // Set interval to fetch new data every 30 seconds
    const intervalId = setInterval(fetchIPInfo, 30000);

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      <div className="space-y-5 profile-page">
        <div className="profiel-wrap px-[35px] pb-10 md:pt-[84px] pt-10 rounded-lg bg-white dark:bg-slate-800 lg:flex lg:space-y-0 space-y-6 justify-between items-end relative z-[1]">
          <div className="bg-slate-900 dark:bg-slate-700 absolute left-0 top-0 md:h-1/2 h-[150px] w-full z-[-1] rounded-t-lg"></div>
          <div className="profile-box flex-none md:text-start text-center">
            <div className="md:flex items-end md:space-x-6 rtl:space-x-reverse">
              <div className="flex-none">
                <div className="md:h-[186px] md:w-[186px] h-[140px] w-[140px] md:ml-0 md:mr-0 ml-auto mr-auto md:mb-0 mb-4 rounded-full ring-4 ring-slate-100 relative">
                  <img
                    src="/assets/images/users/user-1.jpg"
                    alt=""
                    className="w-full h-full object-cover rounded-full"
                  />
                  <Link
                    href="#"
                    className="absolute right-2 h-8 w-8 bg-slate-50 text-slate-600 rounded-full shadow-sm flex flex-col items-center justify-center md:top-[140px] top-[100px]"
                  >
                    <Icon icon="heroicons:pencil-square" />
                  </Link>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-medium text-slate-900 dark:text-slate-200 mb-[3px]">
                  Malik
                </div>
                <div className="text-sm font-light text-slate-600 dark:text-slate-400">
                  Futuristic Systems Engineer
                </div>
              </div>
            </div>
          </div>

          <div className="profile-info-500 md:flex md:text-start text-center flex-1 max-w-[516px] md:space-y-0 space-y-4">
            <div className="flex-1">
              <div className="text-base text-slate-900 dark:text-slate-300 font-medium mb-1">
                100 GB
              </div>
              <div className="text-sm text-slate-600 font-light dark:text-slate-300">
                Memory Allocation
              </div>
            </div>

            <div className="flex-1">
              <div className="text-base text-slate-900 dark:text-slate-300 font-medium mb-1">
                88
              </div>
              <div className="text-sm text-slate-600 font-light dark:text-slate-300">
                AI Deployments
              </div>
            </div>

            <div className="flex-1">
              <div className="text-base text-slate-900 dark:text-slate-300 font-medium mb-1">
                42
              </div>
              <div className="text-sm text-slate-600 font-light dark:text-slate-300">
                Neural Sync Events
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="lg:col-span-4 col-span-12">
            <Card title="Info">
              <ul className="list space-y-8">
                {/* Email */}
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:envelope" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      EMAIL
                    </div>
                    <a
                      href="mailto:abdmalikalqadri2001@gmail.com"
                      className="text-base text-slate-600 dark:text-slate-50"
                    >
                      abdmalikalqadri2001@gmail.com
                    </a>
                  </div>
                </li>

                {/* Phone */}
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:phone-arrow-up-right" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      PHONE
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-50">
                      {info.phone}
                    </div>
                  </div>
                </li>

                {/* Location */}
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:map" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      LOCATION
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-50">
                      {info.location}
                    </div>
                  </div>
                </li>

                {/* Website */}
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:globe-alt" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      WEBSITE
                    </div>
                    <a
                      href={process.env.DOMAIN_URL}
                      className="text-base text-slate-600 dark:text-slate-50"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {process.env.DOMAIN_URL?.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                </li>

                {/* Battery and Network Status */}
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:battery-full" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      BATTERY
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-50">
                      {info.battery}
                    </div>
                  </div>
                </li>

                {/* Device Information */}
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:device-phone" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      DEVICE
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-50">
                      {info.device}
                    </div>
                  </div>
                </li>

                {/* Network */}
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:device-phone" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      NETWORK
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-50">
                      {info.network}
                    </div>
                  </div>
                </li>

                {/* OS */}
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:device-phone" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      OS
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-50">
                      {info.os}
                    </div>
                  </div>
                </li>
              </ul>
            </Card>
          </div>

          <div className="lg:col-span-8 col-span-12">
            <Card title="Basic Area Chart">
              <BasicArea />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default profile;
