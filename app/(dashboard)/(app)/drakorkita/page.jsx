"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InputGroup from "@/components/ui/InputGroup"; // Pastikan komponen ini ada dan berfungsi
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";
import 'react-toastify/dist/ReactToastify.css';

const DRAKORKITA_API_BASE = "/api/film/drakorkita";

const DrakorKitaPage = () => {
  const [currentView, setCurrentView] = useState('search'); // 'search', 'detail', 'download'
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovieUrl, setSelectedMovieUrl] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);

  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  const [selectableDownloadSources, setSelectableDownloadSources] = useState([]);
  const [selectedDownloadSource, setSelectedDownloadSource] = useState(null);
  const [downloadLinks, setDownloadLinks] = useState([]);
  const [isLoadingDownloadLinks, setIsLoadingDownloadLinks] = useState(false);

  const viewContainerRef = useRef(null); // Untuk scroll ke atas view

  useEffect(() => {
    if (viewContainerRef.current) {
      viewContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentView, movieDetails, searchResults]);


  const callDrakorKitaApi = async (params, actionContext = "") => {
    const queryParams = new URLSearchParams(params).toString();
    try {
      const response = await fetch(`${DRAKORKITA_API_BASE}?${queryParams}`);
      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, data: data.data };
      } else {
        const message = data.error || data.message || `${actionContext || 'Operasi'} gagal atau data tidak ditemukan.`;
        if (!toast.isActive('api-error-' + actionContext.replace(/\s/g, ''))) {
            toast.error(message, {toastId: 'api-error-' + actionContext.replace(/\s/g, '')});
        }
        return { success: false, message };
      }
    } catch (err) {
      console.error(`DrakorKita API call error (${actionContext}):`, err);
      const errorMessage = "Terjadi kesalahan jaringan atau server.";
        if (!toast.isActive('network-error-' + actionContext.replace(/\s/g, ''))) {
            toast.error(errorMessage, {toastId: 'network-error-' + actionContext.replace(/\s/g, '')});
        }
      return { success: false, message: errorMessage };
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      toast.warn("Mohon masukkan kata kunci pencarian.");
      return;
    }
    setIsLoadingSearch(true);
    setSearchResults([]);
    setMovieDetails(null);
    setSelectedMovieUrl(null);
    setSelectableDownloadSources([]);
    setSelectedDownloadSource(null);
    setDownloadLinks([]);
    setCurrentView('search');

    const response = await callDrakorKitaApi({ action: "search", query: searchTerm }, "Pencarian");
    if (response.success) {
      if (!response.data || response.data.length === 0) {
        toast.info("Tidak ada hasil yang ditemukan untuk \"" + searchTerm + "\".");
        setSearchResults([]);
      } else {
        setSearchResults(response.data);
        toast.success(`${response.data.length} drama/film ditemukan!`);
      }
    } else {
      setSearchResults([]);
    }
    setIsLoadingSearch(false);
  };

  const fetchMovieDetailsAndPrepareDownloads = async (url) => {
    if (!url) return;
    setIsLoadingDetail(true);
    setMovieDetails(null);
    setSelectableDownloadSources([]);
    setSelectedDownloadSource(null);
    setDownloadLinks([]);
    setSelectedMovieUrl(url);
    setCurrentView('detail'); 

    const detailResponse = await callDrakorKitaApi({ action: "detail", url: url }, "Memuat Detail");
    if (detailResponse.success && detailResponse.data) {
      const fetchedData = detailResponse.data;
      setMovieDetails({
        ...fetchedData,
        image: fetchedData.info?.imageUrl || fetchedData.image, 
      });

      if (fetchedData.links && fetchedData.links.length > 0) {
        setSelectableDownloadSources(fetchedData.links);
      }
    } else {
      setMovieDetails(null);
      setSelectedMovieUrl(null);
      setCurrentView('search'); 
    }
    setIsLoadingDetail(false);
  };

  const handleSelectDownloadSource = async (source) => {
    if (!source || !source.movie_id || !source.tag) {
      toast.warn("Sumber unduhan tidak valid.");
      return;
    }
    setSelectedDownloadSource(source);
    setIsLoadingDownloadLinks(true);
    setDownloadLinks([]);

    const sourceLabel = source.name || source.title || source.tag || 'Pilihan';
    
    const downloadResponse = await callDrakorKitaApi({ 
      action: "download", 
      movie_id: source.movie_id, 
      tag: source.tag 
    }, `Memuat Unduhan ${sourceLabel}`);
    
    if (downloadResponse.success && downloadResponse.data) {
      const { dl, file } = downloadResponse.data;
      const linksArray = [];

      if (dl?.video) linksArray.push({ name: `Video Utama (${sourceLabel})`, link: dl.video });
      if (dl?.subtitle) linksArray.push({ name: `Subtitle (${sourceLabel})`, link: dl.subtitle });
      
      if (file?.linksb) linksArray.push({ name: `StreamSB (${sourceLabel})`, link: file.linksb });
      if (file?.linkp2p) linksArray.push({ name: `P2P (${sourceLabel})`, link: file.linkp2p });
      if (file?.linkfilemoon) linksArray.push({ name: `Filemoon (${sourceLabel})`, link: file.linkfilemoon });

      setDownloadLinks(linksArray);
      if (linksArray.length === 0) {
        toast.info(`Tidak ada tautan unduhan aktif ditemukan untuk ${sourceLabel}.`);
      }
    } else {
      setDownloadLinks([]);
    }
    setIsLoadingDownloadLinks(false);
  };

  const resetToSearch = (clearSearchTerm = true) => {
    setCurrentView('search');
    setSelectedMovieUrl(null);
    setMovieDetails(null);
    setSelectableDownloadSources([]);
    setSelectedDownloadSource(null);
    setDownloadLinks([]);
    if (clearSearchTerm) {
        setSearchTerm("");
        setSearchResults([]);
    }
  };

  const renderDownloadLinkButtons = (links) => {
    if (!links || links.length === 0) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2.5 sm:p-3 bg-teal-600 hover:bg-teal-700 rounded-md text-xs sm:text-sm text-center transition-colors text-white shadow-sm"
          >
            <Icon icon="ph:download-simple-duotone" className="inline mr-1.5 text-sm" />{link.name}
          </a>
        ))}
      </div>
    );
  };

  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonPrimaryClass = "w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed";
  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 text-xs py-1.5 px-2.5 sm:px-3 rounded-md shadow-sm transition-colors";
  const labelBaseClass = "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5 sm:mb-2 flex items-center";
  const sectionCardClass = "bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-4">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
          style={{ height: 'calc(100vh - 4rem)' }} // Adjust 4rem based on your navbar/header height
        >
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0 shrink-0">
                <Icon icon="ph:popcorn-duotone" className="text-xl sm:text-2xl" />
              </div>
              <div className="ml-0 sm:ml-3 text-center sm:text-left">
                <h1 className="text-base sm:text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                  DrakorKita Explorer
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cari, lihat detail, dan temukan tautan unduhan drama favorit Anda.
                </p>
              </div>
            </div>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto" scrollableNodeProps={{ ref: viewContainerRef }}>
            <div className="p-3 sm:p-4"> 
            
              {currentView === 'search' && (
                <div className="space-y-4">
                  <form onSubmit={handleSearch} className={`${sectionCardClass} space-y-3 sm:space-y-4`}>
                    <div>
                      <label htmlFor="searchFilm" className={labelBaseClass}>
                        <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-base sm:text-lg" />
                        Judul Drama/Film
                      </label>
                      <InputGroup // Menggunakan InputGroup jika itu komponen kustom Anda
                        id="searchFilm"
                        type="text"
                        placeholder="Contoh: Vincenzo, Squid Game..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={inputBaseClass} 
                        disabled={isLoadingSearch}
                      />
                    </div>
                    <Button
                      type="submit"
                      text={
                        isLoadingSearch ? (
                          <><Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-base" /> Mencari...</>
                        ) : (
                          <><Icon icon="ph:movie-camera-duotone" className="mr-2 text-base" /> Cari Drama/Film</>
                        )
                      }
                      className={buttonPrimaryClass}
                      disabled={isLoadingSearch || !searchTerm.trim()}
                    />
                  </form>

                  {isLoadingSearch && searchResults.length === 0 && (
                      <div className="text-center py-8 flex flex-col items-center justify-center">
                        <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Sedang mencari...</p>
                      </div>
                  )}

                  {!isLoadingSearch && searchResults.length > 0 && (
                    <div className="mt-5">
                      <h3 className="text-md sm:text-lg font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                        <Icon icon="ph:list-bullets-duotone" className="mr-2 text-lg" /> Hasil Pencarian ({searchResults.length}):
                      </h3>
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {searchResults.map((movie, index) => (
                          <Card
                            key={movie.link || index}
                            bodyClass="p-2.5 sm:p-3 flex flex-col justify-between h-full"
                            className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 hover:shadow-md hover:shadow-teal-500/20 hover:border-teal-500/70 transition-all duration-200 cursor-pointer"
                            onClick={() => movie.link && fetchMovieDetailsAndPrepareDownloads(movie.link)}
                          >
                            <img
                              src={movie.image || "/assets/images/placeholder-movie.png"} // Sediakan placeholder
                              alt={movie.title}
                              className="w-full h-auto object-cover rounded-md mb-2 aspect-[2/3] bg-slate-200 dark:bg-slate-700"
                              onError={(e) => {e.currentTarget.onerror = null; e.currentTarget.src = "/assets/images/placeholder-movie.png"}}
                            />
                            <div>
                              <h5 className="text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-200 truncate mb-0.5" title={movie.title}>{movie.title}</h5>
                              {movie.year && <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Tahun: {movie.year.replace(' tahun yang lalu', '').trim()}</p>}
                              {movie.rating && <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Rating: {movie.rating}</p>}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isLoadingSearch && searchResults.length === 0 && searchTerm && (
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">Tidak ada hasil ditemukan untuk "{searchTerm}".</p>
                  )}
                </div>
              )}

              {currentView === 'detail' && (
                <>
                  {isLoadingDetail && !movieDetails && (
                    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-10">
                      <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-4" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Memuat detail drama/film...</p>
                    </div>
                  )}
                  {movieDetails && !isLoadingDetail && (
                    <div className={`${sectionCardClass} mt-0 sm:mt-0`}>
                      <div className="flex flex-wrap justify-between items-center mb-3 sm:mb-4 gap-2">
                        <Button
                          onClick={() => resetToSearch(false)} // false agar tidak clear search term & results
                          text={<><Icon icon="ph:arrow-left-duotone" className="mr-1.5 text-sm" /> Kembali ke Hasil</>}
                          className={buttonSecondaryClass}
                        />
                        {selectableDownloadSources.length > 0 && (
                                <Button
                                  onClick={() => setCurrentView('download')}
                                  text={<><Icon icon="ph:download-simple-duotone" className="mr-1.5 text-sm" /> Opsi Unduhan ({selectableDownloadSources.length})</>}
                                  className={`${buttonPrimaryClass} w-auto text-xs py-1.5 px-2.5 sm:px-3`}
                                />
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
                        <div className="md:col-span-4 lg:col-span-3">
                          <img
                            src={movieDetails.image || "/assets/images/placeholder-movie.png"}
                            alt={movieDetails.title}
                            className="w-full h-auto object-cover rounded-lg shadow-md border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-700"
                            onError={(e) => {e.currentTarget.onerror = null; e.currentTarget.src = "/assets/images/placeholder-movie.png"}}
                          />
                        </div>
                        <div className="md:col-span-8 lg:col-span-9">
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-teal-600 dark:text-teal-200 mb-2 sm:mb-3">{movieDetails.title}</h3>
                          <div className="space-y-1 text-xs sm:text-sm mb-3 sm:mb-4 text-slate-700 dark:text-slate-300">
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Negara:</strong> {movieDetails.info?.country || 'N/A'}</p>
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Rilis:</strong> {movieDetails.releaseDate || movieDetails.info?.releaseDate || 'N/A'}</p>
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Durasi:</strong> {movieDetails.info?.videoLength || 'N/A'}</p>
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Sutradara:</strong> {movieDetails.director || movieDetails.info?.director || 'N/A'}</p>
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Bintang:</strong> {Array.isArray(movieDetails.stars) ? movieDetails.stars.map(star => star.split(' as ')[0].trim()).join(", ") : (Array.isArray(movieDetails.info?.stars) ? movieDetails.info.stars.map(star => star.split(' as ')[0].trim()).join(", ") : 'N/A')}</p>
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Genre:</strong> {Array.isArray(movieDetails.genres) ? movieDetails.genres.join(", ") : (Array.isArray(movieDetails.info?.genres) ? movieDetails.info.genres.join(", ") : 'N/A')}</p>
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Rating:</strong> {movieDetails.rating || movieDetails.info?.score || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-4">
                        <h4 className="text-base sm:text-lg font-semibold text-teal-700 dark:text-teal-300 mb-1.5 sm:mb-2">Sinopsis:</h4>
                        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">{movieDetails.synopsis || movieDetails.info?.synopsis || 'Sinopsis tidak tersedia.'}</p>
                      </div>
                      
                      {movieDetails.video?.file && ( 
                        <div className="mt-3 sm:mt-4">
                          <h4 className="text-base sm:text-lg font-semibold text-teal-700 dark:text-teal-300 mb-1.5 sm:mb-2">Tonton Online:</h4>
                          <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                            <iframe
                              src={movieDetails.video.file.match(/https?:\/\/[^\s"<>]+/)?.[0]} 
                              title={`Player - ${movieDetails.title}`}
                              frameBorder="0"
                              allow="autoplay; encrypted-media; fullscreen"
                              allowFullScreen
                              className="w-full h-full"
                            ></iframe>
                          </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-center">
                              Jika video tidak muncul, coba buka tautan <a href={movieDetails.video.file.match(/https?:\/\/[^\s"<>]+/)?.[0]} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">disini</a>.
                            </p>
                        </div>
                      )}
                    </div>
                  )}
                  {!isLoadingDetail && !movieDetails && selectedMovieUrl && (
                    <div className="text-center py-10">
                        <Icon icon="ph:warning-circle-duotone" className="text-4xl text-red-500 mb-3 mx-auto" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Gagal memuat detail. Silakan coba lagi.</p>
                        <Button onClick={() => resetToSearch(false)} text="Kembali ke Hasil" className={`${buttonSecondaryClass} mt-4 mx-auto`} />
                    </div>
                  )}
                </>
              )}

              {currentView === 'download' && movieDetails && (
                  <div className={`${sectionCardClass} mt-0 sm:mt-0`}>
                    <div className="flex flex-wrap justify-between items-center mb-3 sm:mb-4 gap-2">
                      <Button
                          onClick={() => setCurrentView('detail')}
                          text={<><Icon icon="ph:arrow-left-duotone" className="mr-1.5 text-sm" /> Kembali ke Detail</>}
                          className={buttonSecondaryClass}
                      />
                       <Button
                          onClick={() => resetToSearch(true)}
                          text={<><Icon icon="ph:magnifying-glass-duotone" className="mr-1.5 text-sm" /> Pencarian Baru</>}
                          className={buttonSecondaryClass}
                      />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-teal-600 dark:text-teal-200 mb-1">Opsi Unduhan untuk:</h3>
                    <p className="text-md sm:text-lg text-slate-700 dark:text-slate-300 mb-3 sm:mb-4 font-medium">{movieDetails.title}</p>

                    {isLoadingDetail && selectableDownloadSources.length === 0 && ( // Saat detail masih loading untuk section ini
                        <div className="text-center py-5">
                            <Icon icon="svg-spinners:ring-resize" className="animate-spin text-3xl text-teal-500 mx-auto" />
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Memeriksa sumber unduhan...</p>
                        </div>
                    )}

                    {!isLoadingDetail && selectableDownloadSources.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada sumber unduhan yang teridentifikasi untuk film ini.</p>
                    )}

                    {selectableDownloadSources.length > 0 && (
                        <div className="mb-3 sm:mb-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-1.5 sm:mb-2">Pilih sumber/episode untuk melihat tautan unduhan:</p>
                          <div className="flex flex-wrap gap-2">
                              {selectableDownloadSources.map((source, index) => (
                              <Button
                                  key={source.movie_id + '-' + source.tag || index}
                                  text={source.name || source.title || source.tag || `Sumber ${index + 1}`}
                                  onClick={() => handleSelectDownloadSource(source)}
                                  className={`${selectedDownloadSource?.tag === source.tag && selectedDownloadSource?.movie_id === source.movie_id ? 'bg-teal-500 text-white ring-2 ring-teal-300 dark:ring-teal-400' : buttonSecondaryClass} text-xs py-1.5 px-2.5 rounded-md shadow-sm transition-all`}
                                  disabled={isLoadingDownloadLinks}
                              />
                              ))}
                          </div>
                        </div>
                    )}

                    {isLoadingDownloadLinks && (
                        <div className="text-center py-5">
                        <Icon icon="svg-spinners:ring-resize" className="animate-spin text-3xl text-teal-500 mx-auto" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Memuat tautan unduhan...</p>
                        </div>
                    )}

                    {!isLoadingDownloadLinks && downloadLinks.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm sm:text-base font-semibold text-teal-700 dark:text-teal-300 mb-2">Tautan Tersedia:</h4>
                          {renderDownloadLinkButtons(downloadLinks)}
                        </div>
                    )}
                    
                    {!isLoadingDownloadLinks && selectedDownloadSource && downloadLinks.length === 0 && (
                         <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Tidak ada tautan unduhan ditemukan untuk sumber yang dipilih.</p>
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

export default DrakorKitaPage;