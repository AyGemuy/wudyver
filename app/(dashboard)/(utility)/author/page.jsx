"use client";

import React, { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { ToastContainer, toast } from "react-toastify";

const formatDate = (dateString, timeString) => {
  if (!dateString) return "N/A";
  const date = new Date(timeString ? `${dateString}T${timeString}` : dateString);
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: timeString ? '2-digit' : undefined,
    minute: timeString ? '2-digit' : undefined,
    second: timeString ? '2-digit' : undefined,
  });
};

const AuthorPage = () => {
  const githubUsername = "AyGemuy";
  const [authorData, setAuthorData] = useState(null);
  const [extendedStats, setExtendedStats] = useState({ totalStars: 0, totalForks: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingExtendedStats, setIsFetchingExtendedStats] = useState(false);

  useEffect(() => {
    const fetchAuthorInfo = async () => {
      setIsLoading(true);
      setAuthorData(null);
      setExtendedStats({ totalStars: 0, totalForks: 0 });

      try {
        const response = await fetch(`https://api.github.com/users/${githubUsername}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || `Pengguna GitHub '${githubUsername}' tidak ditemukan atau terjadi kesalahan.`;
          if (response.status === 404) {
            toast.error(`Pengguna GitHub '${githubUsername}' tidak ditemukan.`);
          } else {
            toast.error(`Gagal mengambil data: ${response.status} - ${errorMessage}`);
          }
          throw new Error(errorMessage);
        }
        const data = await response.json();
        setAuthorData(data);
        if (data.public_repos > 0) {
          fetchRepoStats(data.login, data.public_repos);
        }
      } catch (err) {
        if (!navigator.onLine) {
            toast.error("Koneksi internet bermasalah. Silakan periksa koneksi Anda.");
        } else if (!err.message.includes("GitHub") && !err.message.includes(githubUsername)) {
            toast.error(err.message || "Terjadi kesalahan saat memuat data profil utama.");
        }
        console.error("Error fetching GitHub user data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRepoStats = async (username, publicRepoCount) => {
      setIsFetchingExtendedStats(true);
      let currentStars = 0;
      let currentForks = 0;
      const perPage = 100;
      const totalPages = Math.ceil(publicRepoCount / perPage);

      try {
        for (let page = 1; page <= totalPages; page++) {
          const repoResponse = await fetch(`https://api.github.com/users/${username}/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`);
          if (!repoResponse.ok) {
            console.error(`Gagal mengambil data repositori (halaman ${page}): ${repoResponse.statusText}`);
            if (repoResponse.status === 403) {
                toast.warn("Gagal mengambil semua statistik repo karena batasan API. Data mungkin tidak lengkap.");
                break;
            }
            continue;
          }
          const reposData = await repoResponse.json();
          if (reposData.length === 0 && page < totalPages) {
            break;
          }
          reposData.forEach(repo => {
            currentStars += repo.stargazers_count;
            currentForks += repo.forks_count;
          });
        }
        setExtendedStats({ totalStars: currentStars, totalForks: currentForks });
      } catch (err) {
        console.error("Error fetching repository stats:", err);
        toast.error("Sebagian statistik tambahan gagal dimuat.");
      } finally {
        setIsFetchingExtendedStats(false);
      }
    };

    fetchAuthorInfo();
  }, [githubUsername]);

  const StatItem = ({ icon, value, label, href, className = "", isLoadingValue = false }) => (
    <div className={`flex items-center space-x-2.5 text-sm text-slate-600 dark:text-slate-300 ${className}`}>
      <Icon icon={icon} className="flex-shrink-0 text-lg text-slate-500 dark:text-slate-400" />
      <span className="truncate">
        {isLoadingValue ? (
          <Icon icon="svg-spinners:180-ring-with-bg" className="text-sm" />
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-500 dark:hover:text-teal-400 hover:underline"
            title={String(value)}
          >
            {value !== null && typeof value !== 'undefined' ? String(value) : 'N/A'}
            {label && <span className="ml-1">{label}</span>}
          </a>
        ) : (
          <span title={String(value)}>
            {value !== null && typeof value !== 'undefined' ? String(value) : 'N/A'}
            {label && <span className="ml-1">{label}</span>}
          </span>
        )}
      </span>
    </div>
  );

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3500}
        newestOnTop
        theme="colored"
        toastClassName={(o) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${
            o?.type === "success" ? "bg-emerald-500 text-white"
            : o?.type === "error" ? "bg-red-500 text-white"
            : o?.type === "warning" ? "bg-amber-500 text-white"
            : "bg-sky-500 text-white"
          } dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-3 sm:mb-0 sm:mr-4">
                <Icon icon="ph:user-circle-gear-duotone" className="text-2xl" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                  Profil Pengembang
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Informasi pengembang dari GitHub ({githubUsername}).
                </p>
              </div>
            </div>
          </div>

          <SimpleBar className="h-full max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6">
              {isLoading && (
                <div className="flex flex-col justify-center items-center py-10 min-h-[300px]">
                  <Icon icon="svg-spinners:ring-resize" className="text-4xl text-teal-500" />
                  <p className="mt-3 text-slate-600 dark:text-slate-300">Memuat data pengembang...</p>
                </div>
              )}

              {!isLoading && !authorData && (
                <div className="flex flex-col justify-center items-center text-center py-10 min-h-[300px]">
                  <Icon icon="ph:warning-octagon-duotone" className="text-5xl text-red-500 dark:text-red-400 mx-auto mb-3" />
                  <p className="text-red-600 dark:text-red-400 text-lg font-medium">Gagal Memuat Profil</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Tidak dapat mengambil informasi untuk <span className="font-semibold">{githubUsername}</span>.
                  </p>
                </div>
              )}

              {authorData && !isLoading && (
                <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
                  <div className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0 text-center lg:text-left">
                    {authorData.avatar_url ? (
                      <Image
                        src={authorData.avatar_url}
                        alt={`Avatar ${authorData.name || authorData.login}`}
                        width={180}
                        height={180}
                        className="rounded-full mx-auto lg:mx-0 shadow-xl border-4 border-slate-100 dark:border-slate-700 object-cover"
                        priority
                      />
                    ) : (
                      <div className="w-[180px] h-[180px] mx-auto lg:mx-0 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-6xl shadow-xl border-4 border-slate-100 dark:border-slate-700">
                        <Icon icon="ph:user-circle-fill" />
                      </div>
                    )}
                    <h2 className="text-2xl xl:text-3xl font-bold text-teal-600 dark:text-teal-300 mt-4 break-words">
                      {authorData.name || authorData.login}
                    </h2>
                    {authorData.name && authorData.login && (
                      <p className="text-md text-slate-500 dark:text-slate-400 -mt-1">@{authorData.login}</p>
                    )}
                    {authorData.bio && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                        {authorData.bio}
                      </p>
                    )}
                      {authorData.twitter_username && (
                        <a href={`https://twitter.com/${authorData.twitter_username}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center text-xs text-sky-600 dark:text-sky-400 hover:underline">
                            <Icon icon="mdi:twitter" className="mr-1" /> @{authorData.twitter_username}
                        </a>
                    )}
                    <a
                      href={authorData.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 w-full sm:w-auto block sm:inline-flex items-center justify-center text-sm bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-2.5 px-5 rounded-md shadow-md hover:shadow-lg transition duration-300"
                    >
                      <Icon icon="mdi:github" className="mr-2 h-5 w-5" />
                      Kunjungi Profil GitHub
                    </a>
                  </div>

                  <div className="w-full lg:w-2/3 xl:w-3/4 space-y-4 mt-6 lg:mt-0 lg:border-l lg:border-slate-200 lg:dark:border-slate-700/60 lg:pl-8">
                    <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-300 border-b border-slate-200 dark:border-slate-700/60 pb-2 mb-4">
                      Statistik & Informasi GitHub
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <StatItem icon="ph:users-three-duotone" value={authorData.followers !== null ? authorData.followers.toLocaleString('id-ID') : 'N/A'} label="Pengikut" />
                        <StatItem icon="ph:user-list-duotone" value={authorData.following !== null ? authorData.following.toLocaleString('id-ID') : 'N/A'} label="Mengikuti" />
                        <StatItem icon="ph:git-branch-duotone" value={authorData.public_repos !== null ? authorData.public_repos.toLocaleString('id-ID') : 'N/A'} label="Repositori Publik" />
                        <StatItem icon="ph:files-duotone" value={authorData.public_gists !== null ? authorData.public_gists.toLocaleString('id-ID') : 'N/A'} label="Gist Publik" />

                        <StatItem
                          icon="ph:star-four-duotone"
                          value={extendedStats.totalStars.toLocaleString('id-ID')}
                          label="Total Bintang Diterima"
                          isLoadingValue={isFetchingExtendedStats && authorData?.public_repos > 0}
                        />
                        <StatItem
                          icon="ph:git-fork-duotone"
                          value={extendedStats.totalForks.toLocaleString('id-ID')}
                          label="Total Fork Diterima"
                          isLoadingValue={isFetchingExtendedStats && authorData?.public_repos > 0}
                        />

                        {authorData.company && (
                            <StatItem icon="ph:buildings-duotone" value={authorData.company} className="sm:col-span-2"/>
                        )}
                        {authorData.location && (
                          <StatItem icon="ph:map-pin-area-duotone" value={authorData.location} className="sm:col-span-2"/>
                        )}
                        {authorData.blog && (
                          <StatItem icon="ph:globe-hemisphere-west-duotone" value={authorData.blog} href={authorData.blog.startsWith('http') ? authorData.blog : `http://${authorData.blog}`} className="sm:col-span-2"/>
                        )}
                           <StatItem
                               icon="ph:trophy-duotone"
                               value="Lihat di Profil GitHub"
                               label="Achievements"
                               href={authorData.html_url}
                               className="sm:col-span-2"
                           />
                        <StatItem icon="ph:calendar-heart-duotone" value={`Bergabung: ${formatDate(authorData.created_at)}`} className="sm:col-span-2"/>
                        <StatItem icon="ph:clock-clockwise-duotone" value={`Pembaruan Terakhir: ${formatDate(authorData.updated_at)}`} className="sm:col-span-2"/>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default AuthorPage;