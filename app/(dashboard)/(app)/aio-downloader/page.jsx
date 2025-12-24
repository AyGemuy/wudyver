"use client";

import SimpleBar from "simplebar-react";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput"; // Asumsi Textinput adalah komponen kustom Anda
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const formatApiDateString = (dateString) => {
  if (!dateString || dateString.length !== 8) return "N/A";
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`); // Tambahkan T00:00:00Z untuk UTC
  if (isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Makassar' // Sesuaikan dengan zona waktu WITA jika perlu
  });
};

const AllInOneDownloaderPage = () => {
  const [mediaUrl, setMediaUrl] = useState("");
  const [downloadData, setDownloadData] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Untuk loading global/aksi spesifik (belum dipakai di sini)
  const [isFetching, setIsFetching] = useState(false); // Untuk proses fetch info media

  const API_ENDPOINT = "/api/download/all/v10"; // Pastikan endpoint ini sesuai

  const copyToClipboard = (text, successMessage = "Link berhasil disalin!") => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success(successMessage);
        })
        .catch(err => {
          console.error("Gagal menyalin link: ", err);
          toast.error("Gagal menyalin link.");
        });
    } else {
      // Fallback untuk browser yang tidak mendukung clipboard API modern (jarang terjadi)
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success(successMessage);
      } catch (err) {
        console.error("Fallback gagal menyalin link: ", err);
        toast.error("Gagal menyalin link (fallback).");
      }
      document.body.removeChild(textArea);
    }
  };

  const callApi = async (url, { method = "GET", body = null, actionContext = "" } = {}) => {
    // Menggunakan isFetching untuk loading khusus tombol "Dapatkan Media"
    if (actionContext === "fetchMedia") setIsFetching(true);
    else setIsLoading(true);


    try {
      const options = { method, headers: { "Content-Type": "application/json" } };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.message || data?.result?.message || response.statusText || `HTTP error! Status: ${response.status}`;
        toast.error(`${actionContext || 'Error'}: ${errorMsg}`);
        return { success: false, message: errorMsg, data: data };
      }
      return { success: true, data: data };
    } catch (err) {
      const errorMsg = "Terjadi kesalahan jaringan atau server.";
      toast.error(errorMsg);
      return { success: false, message: errorMsg, data: null };
    } finally {
      if (actionContext === "fetchMedia") setIsFetching(false);
      else setIsLoading(false);
    }
  };

  const handleFetchMediaInfo = async (e) => {
    if (e) e.preventDefault();
    if (!mediaUrl.trim()) {
      toast.warn("Mohon masukkan URL media.");
      return;
    }
    
    try {
      new URL(mediaUrl);
    } catch (_) {
      toast.warn("URL media tidak valid.");
      return;
    }

    setDownloadData(null); // Reset data sebelumnya

    const result = await callApi(
      `${API_ENDPOINT}?url=${encodeURIComponent(mediaUrl)}`,
      { actionContext: "fetchMedia" } // Memberi konteks untuk loader
    );

    if (result.success && result.data && result.data.result) {
      setDownloadData(result.data.result);
      toast.success("Informasi media berhasil diambil!");
    } else {
      const errorMessage = result.data?.result?.message || result.data?.message || "Gagal mengambil info media. Data tidak ditemukan atau format salah.";
      toast.error(errorMessage);
      setDownloadData(null);
    }
  };
  
  const getFileIcon = (ext) => {
    const lowerExt = ext?.toLowerCase();
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(lowerExt)) {
      return "ph:video-duotone";
    } else if (['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(lowerExt)) {
      return "ph:speaker-simple-high-duotone";
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(lowerExt)) {
      return "ph:image-duotone";
    }
    return "ph:file-duotone";
  };

  const DownloadActionButtons = ({ url, filename, itemLabel = "Media" }) => {
    if (!url) return null;
    return (
      <div className="flex items-center space-x-1 sm:space-x-1.5 mt-2 sm:mt-0 shrink-0">
        <Button
          onClick={() => copyToClipboard(url, `Link untuk ${itemLabel} berhasil disalin!`)}
          className="p-1.5 text-xs border border-slate-400 text-slate-600 hover:bg-slate-200 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-700 rounded-md"
          title="Salin Link Unduhan"
        >
          <Icon icon="ph:copy-duotone" className="text-sm sm:text-base" />
        </Button>
        <Button
          as="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-xs border border-slate-400 text-slate-600 hover:bg-slate-200 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-700 rounded-md"
          title="Buka Link di Tab Baru"
        >
          <Icon icon="ph:arrow-square-out-duotone" className="text-sm sm:text-base" />
        </Button>
        <Button
          as="a"
          href={url}
          download={filename}
          className="p-1.5 text-xs bg-teal-500 hover:bg-teal-600 text-white rounded-md flex items-center"
          title="Unduh File"
        >
          <Icon icon="ph:download-simple-duotone" className="text-sm sm:text-base" />
          <span className="ml-1 hidden xs:inline">Unduh</span>
        </Button>
      </div>
    );
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${
            o?.type === 'success' ? 'bg-emerald-500 text-white' 
          : o?.type === 'error'   ? 'bg-red-500 text-white' 
          : o?.type === 'warning' ? 'bg-yellow-500 text-white' 
          : 'bg-teal-500 text-white' // Default (info) toasts use teal
        } dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:cloud-arrow-down-duotone" className="text-2xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                All In One Downloader
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-14">
              Unduh video dan media dari berbagai platform dengan mudah.
            </p>
          </div>

          <SimpleBar className="h-full max-h-[calc(100vh-250px)] sm:max-h-[calc(100vh-220px)]"> {/* Adjusted max-height */}
            <div className="p-4 sm:p-6 space-y-6">
              <form onSubmit={handleFetchMediaInfo} className="space-y-5">
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="mediaUrl" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:link-simple-horizontal-duotone" className="mr-2 text-lg" />
                    URL Media
                  </label>
                  <Textinput // Menggunakan Textinput component Anda
                    id="mediaUrl"
                    type="url"
                    placeholder="Masukkan URL dari TikTok, YouTube, Instagram, dll."
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    inputClassName="py-2 px-2.5" // Pastikan padding konsisten jika Textinput adalah wrapper
                    disabled={isFetching}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center"
                  disabled={isFetching || !mediaUrl.trim()}
                >
                  {isFetching ? (
                    <>
                      <Icon icon="svg-spinners:ring-resize" className="mr-2 text-lg" /> Mengambil Info...
                    </>
                  ) : (
                    <>
                      <Icon icon="ph:magnifying-glass-plus-duotone" className="mr-2 text-lg" /> Dapatkan Media
                    </>
                  )}
                </Button>
              </form>

              {isFetching && !downloadData && (
                <div className="flex flex-col items-center justify-center p-10 min-h-[200px] sm:min-h-[300px]">
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-5xl text-teal-500 mb-4" />
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Mengambil Info Media...</p>
                </div>
              )}

              {!isFetching && downloadData && (
                <div className="mt-6 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <h5 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 border-b border-slate-200 dark:border-slate-700/60 pb-3 flex items-center">
                    <Icon icon="ph:file-text-duotone" className="mr-2 text-xl" />
                    Detail Media
                  </h5>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-start">
                        <Icon icon="ph:text-aa-duotone" className="mr-2 mt-1 text-xl text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <span>{downloadData.title || "Judul tidak tersedia"}</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pl-7">
                        <div className="flex items-center" title="Pengunggah">
                            <Icon icon="ph:user-circle-duotone" className="mr-1.5 text-sm text-teal-600 dark:text-teal-400" />
                            <strong className="font-medium text-slate-500 dark:text-slate-300">Uploader:</strong>&nbsp;{downloadData.uploader || "N/A"}
                        </div>
                        <div className="flex items-center" title="Durasi">
                            <Icon icon="ph:timer-duotone" className="mr-1.5 text-sm text-teal-600 dark:text-teal-400" />
                            <strong className="font-medium text-slate-500 dark:text-slate-300">Durasi:</strong>&nbsp;{downloadData.duration_string || downloadData.duration || "N/A"}
                        </div>
                        <div className="flex items-center" title="Tanggal Unggah">
                            <Icon icon="ph:calendar-dots-duotone" className="mr-1.5 text-sm text-teal-600 dark:text-teal-400" />
                            <strong className="font-medium text-slate-500 dark:text-slate-300">Diunggah:</strong>&nbsp;{formatApiDateString(downloadData.upload_date)}
                        </div>
                        <div className="flex items-center" title="Suka">
                            <Icon icon="ph:heart-straight-duotone" className="mr-1.5 text-sm text-teal-600 dark:text-teal-400" />
                            <strong className="font-medium text-slate-500 dark:text-slate-300">Likes:</strong>&nbsp;{downloadData.like_count ? Number(downloadData.like_count).toLocaleString('id-ID') : "N/A"}
                        </div>
                         {downloadData.webpage_url && (
                             <div className="flex items-center sm:col-span-2" title="Halaman Asli">
                                 <Icon icon="ph:globe-hemisphere-west-duotone" className="mr-1.5 text-sm text-teal-600 dark:text-teal-400" />
                                 <strong className="font-medium text-slate-500 dark:text-slate-300">Sumber:</strong>&nbsp;
                                 <a href={downloadData.webpage_url} target="_blank" rel="noopener noreferrer" className="hover:text-teal-500 underline truncate">
                                     {downloadData.webpage_url}
                                 </a>
                             </div>
                         )}
                    </div>
                  </div>

                  {downloadData.best?.url && (
                    <div className="mb-6">
                      <h6 className="text-md font-semibold text-teal-600 dark:text-teal-300 mb-2 flex items-center">
                        <Icon icon="ph:sparkle-duotone" className="mr-2 text-lg" /> Kualitas Terbaik ({downloadData.best.ext?.toUpperCase() || 'N/A'})
                      </h6>
                      <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex-grow">
                          <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-200 mb-0.5">
                              <Icon icon={getFileIcon(downloadData.best.ext)} className="mr-2 text-teal-600 dark:text-teal-400 text-lg" />
                              {downloadData.best.format_note || downloadData.best.quality || "Kualitas Terbaik"} 
                              {downloadData.best.width && downloadData.best.height && ` (${downloadData.best.width}x${downloadData.best.height})`}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                              Ukuran: {downloadData.best.filesize_approx_str || downloadData.best.size || "N/A"}
                          </p>
                        </div>
                        <DownloadActionButtons 
                            url={downloadData.best.url}
                            filename={`${downloadData.title || 'media'}_best.${downloadData.best.ext || 'file'}`}
                            itemLabel={`Kualitas Terbaik (${downloadData.best.ext?.toUpperCase()})`}
                        />
                      </div>
                    </div>
                  )}
                  
                  {downloadData.formats && downloadData.formats.length > 0 && (
                    <div>
                      <h6 className="text-md font-semibold text-teal-600 dark:text-teal-300 mb-3 flex items-center">
                        <Icon icon="ph:list-bullets-duotone" className="mr-2 text-lg" /> Opsi Unduhan Lainnya:
                      </h6>
                      <div className="space-y-2">
                        {downloadData.formats.map((format, index) => (
                          format.url && // Hanya tampilkan jika ada URL
                          <div key={format.format_id || index} className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-slate-200 dark:border-slate-700/60">
                            <div className="flex-grow">
                                <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-200 mb-0.5">
                                    <Icon icon={getFileIcon(format.ext)} className="mr-2 text-teal-600 dark:text-teal-400 text-lg" />
                                    {format.format_note || format.resolution || format.quality || `Format ${index + 1}`} {format.ext && `(${format.ext.toUpperCase()})`}
                                    {format.format_id?.toLowerCase().includes('watermark') && 
                                        <Icon icon="ph:drop-half-bottom-duotone" className="ml-1.5 text-amber-500" title="Dengan Watermark"/>
                                    }
                                     {format.vcodec === 'none' && format.acodec !== 'none' && <Icon icon="ph:speaker-none-duotone" title="Audio Saja" className="ml-1.5 text-sky-500" />}
                                     {format.acodec === 'none' && format.vcodec !== 'none' && <Icon icon="ph:video-camera-slash-duotone" title="Video Tanpa Audio" className="ml-1.5 text-orange-500" />}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                                    Ukuran: {format.filesize_approx_str || format.filesize ? (format.filesize_approx_str || (format.filesize / (1024*1024)).toFixed(2) + ' MB') : "N/A"}
                                    {format.fps && <span className="ml-2">FPS: {format.fps}</span>}
                                    {format.abr && <span className="ml-2">ABR: {format.abr}k</span>}
                                </p>
                            </div>
                            <DownloadActionButtons 
                                url={format.url}
                                filename={`${downloadData.title || 'media'}_${format.format_id || format.resolution || index}.${format.ext || 'file'}`}
                                itemLabel={`${format.format_note || format.resolution || `Format ${index+1}`} (${format.ext?.toUpperCase()})`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!(downloadData.best?.url || (downloadData.formats && downloadData.formats.filter(f => f.url).length > 0)) && (
                      <p className="text-sm text-center text-amber-600 dark:text-amber-400 mt-4">
                          <Icon icon="ph:warning-circle-duotone" className="inline mr-1" />
                          Tidak ada link unduhan yang valid ditemukan untuk media ini.
                      </p>
                  )}
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default AllInOneDownloaderPage;