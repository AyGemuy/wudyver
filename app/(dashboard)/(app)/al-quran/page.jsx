"use client";

import { useEffect, useState, Fragment } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput"; // Import Textinput
import { Icon } from "@iconify/react";
import { toast, ToastContainer } from "react-toastify";
import SimpleBar from "simplebar-react";

const ALQURAN_API_BASE_URL = "/api/islami/alquran/v6";
const ITEMS_PER_PAGE = 15;

const AlQuranPage = () => {
  const [surahList, setSurahList] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [surahAudioDetail, setSurahAudioDetail] = useState(null);
  const [showSurahDetailModal, setShowSurahDetailModal] = useState(false);

  const [loadingSurahList, setLoadingSurahList] = useState(true);
  const [loadingAudioDetail, setLoadingAudioDetail] = useState(false);
  const [error, setError] = useState(null);
  const [audioDetailError, setAudioDetailError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSurahList = async () => {
    setLoadingSurahList(true);
    setError(null);
    setSurahList([]);
    setCurrentPage(1);

    try {
      const res = await fetch(`${ALQURAN_API_BASE_URL}?action=list`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Gagal mengambil daftar surah.' }));
        throw new Error(`API Error (${res.status}): ${errorData.message || 'Gagal mengambil daftar surah.'}`);
      }
      const data = await res.json();
      if (!data || !Array.isArray(data.soar)) {
        throw new Error("Format respons API daftar surah tidak valid.");
      }
      const sortedSurahs = data.soar.sort((a, b) => a.id - b.id);
      setSurahList(sortedSurahs);
    } catch (err) {
      console.error("Gagal mengambil/memproses daftar surah:", err);
      setError(err.message);
      toast.error(`Error memuat daftar surah: ${err.message}`);
    } finally {
      setLoadingSurahList(false);
    }
  };

  useEffect(() => {
    fetchSurahList();
  }, []);

  const handleSurahClick = async (surah) => {
    setSelectedSurah(surah);
    setSurahAudioDetail(null);
    setLoadingAudioDetail(true);
    setAudioDetailError(null);
    setShowSurahDetailModal(true);

    try {
      const res = await fetch(`${ALQURAN_API_BASE_URL}?action=surah&surah=${surah.id}&ayat=1`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Gagal mengambil detail audio surah.' }));
        throw new Error(`API Error (${res.status}): ${errorData.message || 'Gagal mengambil detail audio surah.'}`);
      }
      const data = await res.json();
      if (!data || !data.file) {
          throw new Error("Format respons API detail audio surah tidak valid atau tidak ada file audio.");
      }
      setSurahAudioDetail(data);
    } catch (err) {
      console.error("Gagal memuat detail audio surah:", err);
      const errorMsg = `Error memuat detail ${surah.name}: ${err.message}`;
      setAudioDetailError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoadingAudioDetail(false);
    }
  };

  const filteredSurahs = surahList.filter(surah =>
    surah.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    surah.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(surah.id).includes(searchTerm.toLowerCase()) ||
    `surah ${surah.id}`.includes(searchTerm.toLowerCase())
  );

  const paginatedSurahs = filteredSurahs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredSurahs.length / ITEMS_PER_PAGE);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150 disabled:opacity-50";

  return (
    <div className="w-full px-2 sm:px-4 py-6"> {/* Adjusted padding-y to match CekResiPage */}
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}/>

      <Card
        bodyClass="relative p-0 h-full overflow-hidden" // Adjusted bodyClass to match CekResiPage
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        {/* Header Card - Matched CekResiPage's Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
              <Icon icon="ph:book-open-duotone" className="text-2xl" /> {/* Adjusted icon size */}
            </div>
            <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
              Al-Quran Audio
            </h1>
          </div>
          <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-14">
            Daftar Surah dan pemutar audio.
          </p>
        </div>

        {/* Konten Utama - Replaced direct input with Textinput and wrapped in div */}
        <SimpleBar className="h-full max-h-[calc(100vh-220px)]"> {/* Sesuaikan max-height jika perlu */}
          <div className="p-4 sm:p-6 space-y-6"> {/* Added padding and spacing */}
            <div className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <label htmlFor="search-surah" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                Cari Surah
              </label>
              <Textinput
                id="search-surah"
                type="text"
                placeholder="Cari Surah (nama, nomor, slug)..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>

            {loadingSurahList && !error && (
              <div className="flex flex-col items-center justify-center p-10 min-h-[250px] sm:min-h-[300px] flex-grow">
                <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl sm:text-5xl text-teal-500 mb-4" />
                <p className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300">Memuat Daftar Surah...</p>
              </div>
            )}
            {error && !loadingSurahList && (
              <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[250px] sm:min-h-[300px] bg-red-50 dark:bg-red-900/20 rounded-b-xl flex-grow">
                <Icon icon="ph:warning-octagon-duotone" className="text-4xl sm:text-5xl text-red-500 mb-4" />
                <p className="text-base sm:text-lg font-semibold text-red-700 dark:text-red-300">Gagal Memuat Daftar</p>
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2 text-center max-w-md sm:max-w-xl">{error}</p>
              </div>
            )}

            {!loadingSurahList && !error && (
              <Fragment>
                <div className="p-2 sm:p-3 space-y-0.5"> {/* Retained surah list styling */}
                  {paginatedSurahs.length > 0 ? paginatedSurahs.map((surah) => (
                    <button
                      key={surah.id}
                      onClick={() => handleSurahClick(surah)}
                      title={`${surah.id}. ${surah.name}\nSlug: ${surah.slug}\nHalaman: ${surah.start_page}-${surah.end_page}`}
                      className={`w-full text-left flex items-center px-2 py-1.5 sm:px-2.5 sm:py-2 my-0.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-700/30 transition-colors duration-150 group ${selectedSurah?.id === surah.id && showSurahDetailModal ? "bg-teal-100 dark:bg-teal-600/40 ring-1 ring-teal-400 dark:ring-teal-500" : ""}`}
                    >
                      <Icon
                        icon={"ph:book-bookmark-duotone"}
                        className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 flex-shrink-0 ${
                          selectedSurah?.id === surah.id && showSurahDetailModal ? "text-teal-600 dark:text-teal-300" : "text-slate-400 dark:text-slate-500 group-hover:text-teal-500 dark:group-hover:text-teal-400"
                        }`}
                      />
                      <span className={`truncate text-xs sm:text-sm ${selectedSurah?.id === surah.id && showSurahDetailModal ? "text-teal-700 dark:text-teal-200 font-medium" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"}`}>
                        {surah.id}. {surah.name}
                      </span>
                        <span className="ml-auto text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 pl-2 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                          Hal. {surah.start_page}
                        </span>
                    </button>
                  )) : (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      <Icon icon="ph:radio-button-thin" className="mx-auto text-3xl sm:text-4xl opacity-70 mb-2"/>
                      <p className="text-xs sm:text-sm">{searchTerm ? "Surah tidak ditemukan." : "Tidak ada data surah."}</p>
                    </div>
                  )}
                </div>
              </Fragment>
            )}
          </div>
        </SimpleBar>
        
        {/* Pagination buttons - Moved outside SimpleBar but still within Card's bodyClass context */}
        {!loadingSurahList && !error && totalPages > 1 && (
          <div className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-col items-center gap-2 sm:flex-row sm:justify-between text-xs">
            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} text="Sebelumnya" icon="ph:caret-left-bold" className={`${buttonSecondaryClass} w-full sm:w-auto px-2.5 py-1 text-[11px] sm:text-xs`} />
            <span className="text-slate-600 dark:text-slate-300">Hal {currentPage} dari {totalPages}</span>
            <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} text="Berikutnya" icon="ph:caret-right-bold" iconPosition="right" className={`${buttonSecondaryClass} w-full sm:w-auto px-2.5 py-1 text-[11px] sm:text-xs`} />
          </div>
        )}
      </Card>

      {selectedSurah && (
        <Modal
          title={
            <div className="flex items-center">
              <Icon icon="ph:speaker-high-duotone" className="mr-2 text-teal-500 text-lg sm:text-xl shrink-0"/>
              <span className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 truncate">
                {selectedSurah.id}. {selectedSurah.name}
              </span>
            </div>
          }
          activeModal={showSurahDetailModal}
          onClose={() => setShowSurahDetailModal(false)}
          className="max-w-md md:max-w-lg"
          footerContent={
            <Button
              text="Tutup"
              onClick={() => setShowSurahDetailModal(false)}
              className={`${buttonSecondaryClass} w-full sm:w-auto`}
            />
          }
        >
          <SimpleBar style={{ maxHeight: 'calc(70vh - 60px)'}} className="p-1">
            <div className="p-2 sm:p-3 text-sm">
              {loadingAudioDetail && (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-slate-600 dark:text-slate-400 min-h-[150px]">
                  <Icon icon="svg-spinners:ring-resize" className="text-3xl sm:text-4xl mr-2 sm:mr-3 text-teal-500" />
                  Memuat detail audio...
                </div>
              )}
              {!loadingAudioDetail && audioDetailError && (
                  <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 sm:p-4 rounded-md text-center">
                    <Icon icon="ph:wifi-slash-duotone" className="text-3xl sm:text-4xl mx-auto mb-2"/>
                    <p className="font-semibold text-sm sm:text-base">Gagal Memuat Detail Audio</p>
                    <p className="text-xs sm:text-sm mt-1">{audioDetailError}</p>
                </div>
              )}
              {!loadingAudioDetail && surahAudioDetail && !audioDetailError && (
                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg shadow-sm">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-1">
                        <strong className="font-medium text-slate-800 dark:text-slate-100">Nama Surah:</strong> {surahAudioDetail.name}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-1">
                        <strong className="font-medium text-slate-800 dark:text-slate-100">Qari:</strong> {surahAudioDetail.reciter}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-1">
                        <strong className="font-medium text-slate-800 dark:text-slate-100">Durasi:</strong> {surahAudioDetail.duration}
                    </p>
                    {surahAudioDetail.share_url && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            <strong className="font-medium text-slate-800 dark:text-slate-100">Sumber:</strong>
                            <a href={surahAudioDetail.share_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300 underline ml-1">
                                MP3Quran.net ({surahAudioDetail.read_slug})
                            </a>
                        </p>
                    )}
                  </div>
                  <audio controls className="w-full" src={surahAudioDetail.file} key={surahAudioDetail.file}>
                    Browser Anda tidak mendukung elemen audio.
                  </audio>
                  {surahAudioDetail.share_title && (
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 text-center italic">{surahAudioDetail.share_title}</p>
                  )}
                </div>
              )}
            </div>
          </SimpleBar>
        </Modal>
      )}
    </div>
  );
};

export default AlQuranPage;