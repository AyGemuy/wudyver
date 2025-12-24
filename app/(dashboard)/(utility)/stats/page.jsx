"use client";

import { useState, useEffect, useCallback } from "react";
import useDarkMode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icon } from '@iconify/react';
import MemoryUsageChart from "@/components/partials/chart/appex-chart/MemoryUsageChart";
import StatCard from "@/components/ui/StatCard";

const LiveStatsPage = () => {
  const [isDark] = useDarkMode();
  const [systemStats, setSystemStats] = useState(null);
  const [visitorStats, setVisitorStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [systemRes, visitorRes, userRes] = await Promise.all([
        fetch("/api/general/system-stats"),
        fetch("/api/visitor/stats"),
        fetch("/api/user/stats"),
      ]);

      if (!systemRes.ok) throw new Error(`System Stats: ${systemRes.statusText} (status ${systemRes.status})`);
      if (!visitorRes.ok) throw new Error(`Visitor Stats: ${visitorRes.statusText} (status ${visitorRes.status})`);
      if (!userRes.ok) throw new Error(`User Stats: ${userRes.statusText} (status ${userRes.status})`);
      
      const systemData = await systemRes.json();
      const visitorData = await visitorRes.json();
      const userData = await userRes.json();

      setSystemStats(systemData);
      setVisitorStats(visitorData);
      setUserStats(userData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching stats:", err);
    } finally {
      if (loading) setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5000);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  const StyledSectionCard = ({ children, title, icon, titleClass = "text-lg sm:text-xl", iconClass="text-2xl sm:text-3xl", cardClassName = "" }) => (
    <Card
      bodyClass="relative p-0 h-full overflow-hidden"
      className={`w-full border border-emerald-500/30 dark:border-emerald-600/40 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-70 dark:bg-opacity-70 ${cardClassName}`}
    >
      {title && (
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shrink-0`}>
                <Icon icon={icon} className={iconClass} />
              </div>
            )}
            <h4 className={`${titleClass} font-semibold text-emerald-700 dark:text-emerald-300`}>
              {title}
            </h4>
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </Card>
  );

  if (loading && !systemStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
        <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/20 to-sky-500/20 blur-2xl animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-24 w-24 border-4 border-t-emerald-500 border-r-sky-400 border-b-emerald-300 border-l-sky-200">
                <div className="absolute inset-2 rounded-full bg-slate-100 dark:bg-slate-900"></div>
            </div>
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-emerald-500 via-sky-500 to-teal-500 bg-clip-text text-transparent animate-pulse">
                Memuat Statistik Langsung
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                Mohon tunggu sebentar, kami sedang mengambil data terkini untuk Anda...
            </p>
            <div className="flex justify-center space-x-2 pt-3">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-3 h-3 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <Icon icon="ph:warning-octagon-duotone" className="text-6xl sm:text-7xl text-red-500 mb-6" />
        <h3 className="text-xl sm:text-2xl font-semibold text-red-700 dark:text-red-300 mb-2">
          Oops! Terjadi Kesalahan
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 max-w-lg mb-6">
          Kami tidak dapat memuat statistik saat ini. Silakan coba lagi nanti. <br/> Detail: {error}
        </p>
        <Button
          onClick={() => { setLoading(true); fetchData(); }}
          text="Coba Lagi"
          icon="ph:arrow-clockwise-duotone"
          className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg"
        />
      </div>
    );
  }

  const generalStats = systemStats?.Statistik;

  return (
    <div className={`w-full min-h-screen px-2 md:px-4 lg:px-6 py-6 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <div className="mb-6 md:mb-8">
        <div className="flex items-center mb-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg mr-3 shrink-0">
                <Icon icon="ph:chart-line-up-duotone" className="text-2xl sm:text-3xl" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500">
            Dasbor Statistik Langsung
            </h2>
        </div>
        <p className={`text-sm sm:text-base ml-14 sm:ml-[60px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        Tinjauan waktu-nyata metrik sistem dan penggunaan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="md:col-span-2 xl:col-span-2">
          <StyledSectionCard title="Informasi Sistem" icon="ph:server-duotone">
            {generalStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4 sm:gap-x-6">
                <StatCard title="Platform" value={generalStats.Platform || 'N/A'} icon="mdi:linux" isLoading={!generalStats} iconClass="bg-sky-100 text-sky-600 dark:bg-sky-700 dark:text-sky-300" />
                <StatCard title="Arsitektur" value={generalStats.Architecture || 'N/A'} icon="mdi:chip" isLoading={!generalStats} iconClass="bg-purple-100 text-purple-600 dark:bg-purple-700 dark:text-purple-300" />
                <StatCard title="Versi Node" value={generalStats.NodeVersion || 'N/A'} icon="logos:nodejs-icon" isLoading={!generalStats} iconClass="bg-green-100 text-green-600 dark:bg-green-700 dark:text-green-300" />
                <StatCard title="Waktu Aktif" value={generalStats.Uptime || 'N/A'} icon="mdi:timer-sand" isLoading={!generalStats} iconClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-700 dark:text-yellow-300" />
                <StatCard title="Total Rute API" value={systemStats?.TotalRoute?.toLocaleString() || 'N/A'} icon="ph:tree-structure-duotone" isLoading={!systemStats} iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-700 dark:text-indigo-300" />
              </div>
            ) : (
                <div className="text-center py-8">
                    <Icon icon="eos-icons:loading" className="text-3xl text-slate-500 dark:text-slate-400 animate-spin"/>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Memuat info sistem...</p>
                </div>
            )}
          </StyledSectionCard>
        </div>

        <StyledSectionCard title="Penggunaan Memori" icon="ph:memory-duotone">
          {generalStats?.Memory ? (
            <MemoryUsageChart
              used={generalStats.Memory.used}
              total={generalStats.Memory.total}
            />
          ) : (
            <div className="flex justify-center items-center h-[200px] sm:h-[240px]">
               <Icon icon="eos-icons:loading" className="text-3xl text-slate-500 dark:text-slate-400 animate-spin"/>
               <p className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Memuat data memori...</p>
            </div>
          )}
        </StyledSectionCard>

        <StyledSectionCard title="Statistik Lalu Lintas" icon="ph:users-three-duotone">
          {visitorStats ? (
            <div className="space-y-4">
              <StatCard
                title="Total Pengunjung Unik"
                value={visitorStats.visitorCount?.toLocaleString() || 'N/A'}
                icon="ph:users-duotone"
                iconClass="bg-sky-100 text-sky-600 dark:bg-sky-700 dark:text-sky-300"
                isLoading={!visitorStats}
              />
              <StatCard
                title="Total Permintaan"
                value={visitorStats.requestCount?.toLocaleString() || 'N/A'}
                icon="ph:globe-hemisphere-west-duotone"
                iconClass="bg-teal-100 text-teal-600 dark:bg-teal-700 dark:text-teal-300"
                isLoading={!visitorStats}
              />
            </div>
          ): (
              <div className="text-center py-8">
                <Icon icon="eos-icons:loading" className="text-3xl text-slate-500 dark:text-slate-400 animate-spin"/>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Memuat data trafik...</p>
              </div>
          )}
        </StyledSectionCard>

        <StyledSectionCard title="Statistik Pengguna" icon="ph:user-list-duotone">
           {userStats ? (
            <StatCard
                title="Pengguna Terdaftar"
                value={userStats.userCount?.toLocaleString() || 'N/A'}
                icon="ph:user-circle-plus-duotone"
                iconClass="bg-purple-100 text-purple-600 dark:bg-purple-700 dark:text-purple-300"
                valueClass="text-2xl sm:text-3xl"
                isLoading={!userStats}
            />
           ) : (
              <div className="text-center py-8">
                <Icon icon="eos-icons:loading" className="text-3xl text-slate-500 dark:text-slate-400 animate-spin"/>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Memuat data pengguna...</p>
              </div>
           )}
        </StyledSectionCard>
      </div>
    </div>
  );
};

export default LiveStatsPage;
