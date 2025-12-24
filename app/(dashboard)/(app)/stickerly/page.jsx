"use client";

import React, { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";
import Image from "next/image";

const API_BASE_URL = "/api/sticker/stickerly/v1";

const StickerlyStickerPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const viewContainerRef = useRef(null);
  const initialLoadRef = useRef(true);

  const callApi = async (query) => {
    setIsLoading(true);
    setHasSearched(true);
    const toastId = `stickerly-api-${query}`;

    try {
      const params = new URLSearchParams({ query: query });
      const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.result && data.result.stickers) {
        setSearchResults(data.result.stickers);
        if (data.result.stickers.length === 0 && hasSearched && !initialLoadRef.current) {
          toast.info(`Tidak ada stiker ditemukan untuk "${query}".`, { toastId });
        } else if (data.result.stickers.length > 0 && !initialLoadRef.current) {
          toast.success(`Menampilkan hasil untuk "${query}".`, { toastId });
        }
        return data;
      } else {
        const message = data.error || "Gagal mengambil data stiker.";
        if (!toast.isActive(toastId)) {
          toast.error(message, { toastId });
        }
        setSearchResults([]);
        return null;
      }
    } catch (err) {
      console.error("Stickerly Sticker API call error:", err);
      const errorMessage = "Terjadi kesalahan jaringan atau server.";
      if (!toast.isActive(toastId + "-network")) {
        toast.error(errorMessage, { toastId: toastId + "-network" });
      }
      setSearchResults([]);
      return null;
    } finally {
      setIsLoading(false);
      if (initialLoadRef.current) initialLoadRef.current = false;
    }
  };

  useEffect(() => {
    // Initial load, perhaps fetch some trending stickers or leave empty
    // For now, let's keep it empty and wait for user search
  }, []);

  useEffect(() => {
    if (viewContainerRef.current && viewContainerRef.current.el) {
      viewContainerRef.current.el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchResults]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.warn("Mohon masukkan kata kunci pencarian stiker.");
      return;
    }
    initialLoadRef.current = false;
    callApi(searchTerm);
  };

  const commonCardClass = "w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80";
  const commonHeaderClass = "p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60";
  const commonIconContainerClass = "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0";
  const commonTitleClass = "ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500";
  const commonDescriptionClass = "text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-14";
  const innerCardWrapperClass = "bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60";
  const labelBaseClass = "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center";
  const inputBaseClass = "w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonPrimaryClass = "w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
          className={commonCardClass}
        >
          {/* Header Card */}
          <div className={commonHeaderClass}>
            <div className="flex flex-col sm:flex-row items-center">
              <div className={commonIconContainerClass}>
                <Icon icon="ph:sticker-duotone" className="text-2xl" />
              </div>
              <h1 className={commonTitleClass}>
                Pencarian Stiker Stickerly
              </h1>
            </div>
            <p className={commonDescriptionClass}>
              Temukan stiker untuk berbagai platform dari Stickerly.
            </p>
          </div>

          <SimpleBar className="h-full max-h-[calc(100vh-220px)]" scrollableNodeProps={{ ref: viewContainerRef }}>
            <div className="p-4 sm:p-6 space-y-6">
              {/* Search Input Card */}
              <div className={innerCardWrapperClass}>
                <form onSubmit={handleSearchSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="searchStickerly" className={labelBaseClass}>
                      <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                      Kata Kunci Stiker
                    </label>
                    <Textinput
                      id="searchStickerly"
                      type="text"
                      placeholder="Contoh: cute, dog, meme..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={inputBaseClass}
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    text={
                      isLoading && !initialLoadRef.current ? (
                        <>
                          <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" />
                          Mencari...
                        </>
                      ) : (
                        <>
                          <Icon icon="ph:smiley-sticker-duotone" className="mr-2 text-lg" />
                          Cari Stiker
                        </>
                      )
                    }
                    className={buttonPrimaryClass}
                    disabled={isLoading}
                  />
                </form>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className={innerCardWrapperClass}>
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Memuat hasil pencarian...</p>
                  </div>
                </div>
              )}

              {/* No Results State */}
              {!isLoading && hasSearched && searchResults.length === 0 && (
                <div className={innerCardWrapperClass}>
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    <Icon icon="ph:smiley-sad-duotone" className="text-4xl sm:text-5xl text-amber-500 mb-3 mx-auto" />
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                      Tidak ada paket stiker ditemukan untuk kata kunci <span className="font-semibold text-slate-600 dark:text-slate-300">"{searchTerm}"</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {!isLoading && searchResults.length > 0 && (
                <div className={innerCardWrapperClass}>
                  <h5 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 border-b border-slate-200 dark:border-slate-700/60 pb-3 flex items-center">
                    <Icon icon="ph:list-checks-duotone" className="mr-2 text-xl" />
                    Hasil Pencarian Stiker ({searchResults.length})
                  </h5>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {searchResults.map((sticker) => (
                      <Card
                        key={sticker.sid}
                        bodyClass="p-3 flex flex-col h-full"
                        className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 hover:shadow-lg hover:border-teal-500/70 dark:hover:border-teal-400/70 transition-all duration-200 rounded-lg"
                      >
                        <h3 className="text-sm sm:text-base font-semibold text-teal-600 dark:text-teal-300 mb-2 truncate" title={sticker.packName}>
                          {sticker.packName || "Nama Paket Tidak Diketahui"}
                        </h3>

                        {sticker.resourceUrl && (
                          <div className="aspect-square bg-slate-100/70 dark:bg-slate-700/30 p-1 mb-3 rounded flex items-center justify-center overflow-hidden">
                            <Image
                              src={sticker.resourceUrl}
                              alt={`Sticker from ${sticker.packName}`}
                              width={100}
                              height={100}
                              className="object-contain w-full h-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent && !parent.querySelector('.placeholder-icon')) {
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'placeholder-icon flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 text-xl';
                                  placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M2.97 2.97A13.908 13.908 0 0 0 2 8c0 5.185 2.815 9.625 6.93 11.994l-1.414 1.414L9 22.828l5-5l-1.414-1.414l-2.072 2.071A9.954 9.954 0 0 1 4 8a9.935 9.935 0 0 1 3.515-7.485L2.97 2.97ZM12 4a8 8 0 0 0-8 8H2A10 10 0 0 1 12 2h0Zm8.586 15.414l-2.07-2.07A9.953 9.953 0 0 1 12 20a9.934 9.934 0 0 1-7.485-3.515l-4.546 4.546L1.414 19.586l4.546-4.546A13.909 13.909 0 0 0 12 22c2.645 0 5.07-.743 7.071-2.01l1.414 1.414L22.07 19.99l-1.484-1.407Z M17.07 2.01A13.908 13.908 0 0 0 16 2c-5.185 0-9.625 2.815-11.994 6.93l1.414 1.414L4 10.828l5 5l1.414-1.414l2.072-2.071A9.954 9.954 0 0 1 20 16a9.935 9.935 0 0 1-3.515 7.485l4.546 4.546l1.414-1.414l-4.546-4.546A13.909 13.909 0 0 0 12 4c-2.645 0-5.07.743-7.071 2.01L3.515 4.6A9.934 9.934 0 0 1 12 6a9.953 9.953 0 0 1 7.07 2.93l2.07-2.07L22.586 8.28A13.908 13.908 0 0 0 17.07 2.01Z"/></svg>`;
                                  parent.appendChild(placeholder);
                                }
                              }}
                            />
                          </div>
                        )}

                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 mt-auto">
                          <p><Icon icon="ph:package-duotone" className="inline mr-1 text-slate-400 dark:text-slate-500" /> Pack ID: {sticker.packId || 'N/A'}</p>
                          <p><Icon icon="ph:eye-duotone" className="inline mr-1 text-slate-400 dark:text-slate-500" /> Dilihat: {sticker.viewCount?.toLocaleString('id-ID') || 'N/A'}</p>
                          <p><Icon icon="ph:user-circle-duotone" className="inline mr-1 text-slate-400 dark:text-slate-500" /> Kreator: {sticker.user?.userName || 'N/A'}</p>
                          <p><Icon icon="ph:palette-duotone" className="inline mr-1 text-slate-400 dark:text-slate-500" /> Animasi: {sticker.animated ? 'Ya' : 'Tidak'}</p>
                          <p><Icon icon="ph:lock-simple-duotone" className="inline mr-1 text-slate-400 dark:text-slate-500" /> Private: {sticker.stickerPack?.private ? 'Ya' : 'Tidak'}</p>
                          <p><Icon icon="ph:currency-circle-dollar-duotone" className="inline mr-1 text-slate-400 dark:text-slate-500" /> Berbayar: {sticker.stickerPack?.isPaid ? 'Ya' : 'Tidak'}</p>
                        </div>
                        {sticker.stickerPack?.trayResourceUrl && (
                            <a
                                href={sticker.stickerPack.trayResourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 w-full bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white text-xs font-medium py-2 px-3 rounded-md shadow-sm flex items-center justify-center transition-colors"
                            >
                                <Icon icon="ph:download-simple-duotone" className="mr-1.5 text-base" /> Unduh Tray Icon
                            </a>
                        )}
                        {sticker.resourceUrl && (
                            <a
                                href={sticker.resourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 w-full bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white text-xs font-medium py-2 px-3 rounded-md shadow-sm flex items-center justify-center transition-colors"
                            >
                                <Icon icon="ph:image-square-duotone" className="mr-1.5 text-base" /> Lihat Stiker Asli
                            </a>
                        )}
                      </Card>
                    ))}
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

export default StickerlyStickerPage;