"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const DRAKORKITA_API_BASE = "/api/film/drakorkita";

const DrakorKitaPage = () => {
  const [currentView, setCurrentView] = useState('search');
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
  const [isProcessingAction, setIsProcessingAction] = useState(null);

  const viewContainerRef = useRef(null);

  useEffect(() => {
    if (viewContainerRef.current) {
      viewContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentView, movieDetails, searchResults, selectedDownloadSource]);

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

  const processAndSetMovieDetails = (fetchedData) => {
    setMovieDetails({
      title: fetchedData.title || fetchedData.info?.headline || "Judul Tidak Diketahui",
      image: fetchedData.info?.imageUrl,
      synopsis: fetchedData.synopsis || fetchedData.info?.synopsis,
      genres: fetchedData.genres || fetchedData.info?.genres,
      rating: fetchedData.rating || fetchedData.info?.score,
      views: fetchedData.views || fetchedData.info?.views,
      releaseDate: fetchedData.releaseDate || fetchedData.info?.releaseDate,
      director: fetchedData.director || fetchedData.info?.director,
      stars: fetchedData.stars || fetchedData.info?.stars,
      country: fetchedData.info?.country,
      videoLength: fetchedData.info?.videoLength,
      type: fetchedData.info?.type,
      status: fetchedData.info?.status,
      postedOn: fetchedData.info?.postedOn,
      originalTitle: fetchedData.info?.originalTitle,
      links: fetchedData.links,
      videoPlayerUrl: fetchedData.info?.video?.file || fetchedData.video?.file,
    });

    if (fetchedData.links && fetchedData.links.length > 0) {
      const sources = fetchedData.links.map((link, index) => ({
          ...link,
          name: link.name || link.title || link.tag || `Episode/Sumber ${index + 1}`
      }));
      setSelectableDownloadSources(sources);
    } else {
      setSelectableDownloadSources([]);
    }
  };
  
  const fetchMovieDetailsAndGoToDetail = async (url, itemIdentifier) => {
    if (!url) return;
    setIsProcessingAction(itemIdentifier);
    setIsLoadingDetail(true);
    setMovieDetails(null);
    setSelectableDownloadSources([]);
    setSelectedDownloadSource(null);
    setDownloadLinks([]);
    setSelectedMovieUrl(url);
    setCurrentView('detail');

    const detailResponse = await callDrakorKitaApi({ action: "detail", url: url }, "Memuat Detail");
    if (detailResponse.success && detailResponse.data) {
      processAndSetMovieDetails(detailResponse.data);
    } else {
      setMovieDetails(null);
      setSelectedMovieUrl(null);
    }
    setIsLoadingDetail(false);
    setIsProcessingAction(null);
  };

  const fetchDetailsAndGoToDownloadOptions = async (url, itemIdentifier) => {
    if (!url) return;
    setIsProcessingAction(itemIdentifier);
    setIsLoadingDetail(true); 
    setMovieDetails(null); 
    setSelectableDownloadSources([]);
    setSelectedDownloadSource(null);
    setDownloadLinks([]);
    setSelectedMovieUrl(url);

    const detailResponse = await callDrakorKitaApi({ action: "detail", url: url }, "Memuat Opsi Unduhan");
    if (detailResponse.success && detailResponse.data) {
      processAndSetMovieDetails(detailResponse.data); 
      if (detailResponse.data.links && detailResponse.data.links.length > 0) {
        setCurrentView('download');
      } else {
        toast.info("Tidak ada opsi unduhan tersedia, menampilkan detail saja.");
        setCurrentView('detail'); 
      }
    } else {
      setSelectedMovieUrl(null); 
      toast.error("Gagal memuat detail untuk opsi unduhan.");
    }
    setIsLoadingDetail(false);
    setIsProcessingAction(null);
  };


  const handleSelectDownloadSource = async (source) => {
    if (!source || !source.movie_id || !source.tag) {
      toast.warn("Sumber unduhan tidak valid.");
      return;
    }
    setSelectedDownloadSource(source);
    setIsLoadingDownloadLinks(true);
    setDownloadLinks([]);
    const sourceLabel = source.name || 'Pilihan';
    
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

  const resetToSearch = (clearSearchTermAndResults = true) => {
    setCurrentView('search');
    setSelectedMovieUrl(null);
    setMovieDetails(null);
    setSelectableDownloadSources([]);
    setSelectedDownloadSource(null);
    setDownloadLinks([]);
    if (clearSearchTermAndResults) {
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
  const innerCardClassName = "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 shadow-md rounded-lg";
  const buttonSmallActionClass = "flex-1 text-xs py-1.5 px-2 rounded-md shadow-sm transition-colors flex items-center justify-center disabled:opacity-60";


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
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 min-h-[calc(100vh-100px)] max-h-[calc(100vh-50px)] sm:max-h-[calc(100vh-70px)]"
        >
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
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
            <div className="p-3 sm:p-4 space-y-4 sm:space-y-5"> 
            
              {currentView === 'search' && (
                <Card title="Pencarian Drama/Film" className={innerCardClassName} bodyClass="p-4 sm:p-5">
                  <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
                    <div>
                      <label htmlFor="searchFilm" className={labelBaseClass}>
                        <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-base sm:text-lg" />
                        Judul Drama/Film
                      </label>
                      <input 
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
                </Card>
              )}

              {currentView === 'search' && isLoadingSearch && searchResults.length === 0 && (
                <Card className={innerCardClassName} bodyClass="p-4 sm:p-5 text-center">
                  <div className="py-8 flex flex-col items-center justify-center">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sedang mencari...</p>
                  </div>
                </Card>
              )}

              {currentView === 'search' && !isLoadingSearch && searchResults.length > 0 && (
                <Card title={`Hasil Pencarian (${searchResults.length})`} titleClass="text-md sm:text-lg !mb-3" icon="ph:list-bullets-duotone" className={innerCardClassName} bodyClass="p-4 sm:p-5">
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {searchResults.map((movie, index) => (
                      <Card
                        key={movie.link || index}
                        bodyClass="p-2.5 sm:p-3 flex flex-col justify-between h-full"
                        className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 hover:shadow-lg hover:shadow-teal-500/20 hover:border-teal-500/70 transition-all duration-200"
                      >
                        <div onClick={() => movie.link && fetchMovieDetailsAndGoToDetail(movie.link, movie.link + '-detail')} className="cursor-pointer">
                          <img
                            src={movie.image || "/assets/images/placeholder-movie.png"}
                            alt={movie.title}
                            className="w-full h-auto object-cover rounded-md mb-2 aspect-[2/3] bg-slate-200 dark:bg-slate-700"
                            onError={(e) => {e.currentTarget.onerror = null; e.currentTarget.src = "/assets/images/placeholder-movie.png"}}
                          />
                          <div>
                            <h5 className="text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-200 truncate mb-0.5" title={movie.title}>{movie.title}</h5>
                            {movie.year && <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Tahun: {movie.year.replace(' tahun yang lalu', '').trim()}</p>}
                            {movie.rating && <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Rating: {movie.rating}</p>}
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700/50 flex gap-2">
                            <Button
                                onClick={() => movie.link && fetchMovieDetailsAndGoToDetail(movie.link, movie.link + '-detail')}
                                className={`${buttonSmallActionClass} bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-700`}
                                disabled={isProcessingAction === (movie.link + '-detail') || isProcessingAction === (movie.link + '-download')}
                            >
                                {isProcessingAction === (movie.link + '-detail') ? <Icon icon="svg-spinners:180-ring-with-bg" className="text-sm" /> : <Icon icon="ph:info-duotone" className="mr-1"/>} Detail
                            </Button>
                            <Button
                                onClick={() => movie.link && fetchDetailsAndGoToDownloadOptions(movie.link, movie.link + '-download')}
                                className={`${buttonSmallActionClass} bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700`}
                                disabled={isProcessingAction === (movie.link + '-download') || isProcessingAction === (movie.link + '-detail')}
                            >
                               {isProcessingAction === (movie.link + '-download') ? <Icon icon="svg-spinners:180-ring-with-bg" className="text-sm" /> : <Icon icon="ph:download-simple-duotone" className="mr-1"/>} Unduh
                            </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
              
              {currentView === 'search' && !isLoadingSearch && searchResults.length === 0 && searchTerm && (
                   <Card className={innerCardClassName} bodyClass="p-4 sm:p-5 text-center">
                     <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada hasil ditemukan untuk "{searchTerm}".</p>
                   </Card>
               )}

              {currentView === 'detail' && isLoadingDetail && !movieDetails && (
                <Card className={innerCardClassName} bodyClass="p-4 sm:p-5 text-center">
                  <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-10">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Memuat detail drama/film...</p>
                  </div>
                </Card>
              )}

              {currentView === 'detail' && movieDetails && !isLoadingDetail && (
                <Card title="Detail Drama/Film" icon="ph:film-strip-duotone" className={innerCardClassName} bodyClass="p-4 sm:p-5">
                  <div className="flex flex-wrap justify-between items-center mb-3 sm:mb-4 gap-2">
                    <Button
                      onClick={() => resetToSearch(false)} 
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
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Judul Asli:</strong> {movieDetails.originalTitle || '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Negara:</strong> {movieDetails.country || '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Rilis:</strong> {movieDetails.releaseDate || '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Durasi:</strong> {movieDetails.videoLength || '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Tipe:</strong> {movieDetails.type || '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Status:</strong> {movieDetails.status || '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Sutradara:</strong> {movieDetails.director || '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Bintang:</strong> {Array.isArray(movieDetails.stars) ? movieDetails.stars.map(star => star.split(' as ')[0].trim()).join(", ") : '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Genre:</strong> {Array.isArray(movieDetails.genres) ? movieDetails.genres.join(", ") : '-'}</p>
                        <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Rating:</strong> {movieDetails.rating || '-'}</p>
                           <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Dilihat:</strong> {movieDetails.views || '-'}</p>
                           <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Diposting:</strong> {movieDetails.postedOn || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4">
                    <h4 className="text-base sm:text-lg font-semibold text-teal-700 dark:text-teal-300 mb-1.5 sm:mb-2">Sinopsis:</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">{movieDetails.synopsis || 'Sinopsis tidak tersedia.'}</p>
                  </div>
                  
                  {movieDetails.videoPlayerUrl && ( 
                    <div className="mt-3 sm:mt-4">
                      <h4 className="text-base sm:text-lg font-semibold text-teal-700 dark:text-teal-300 mb-1.5 sm:mb-2">Tonton Online:</h4>
                      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                        <iframe
                          src={movieDetails.videoPlayerUrl.match(/https?:\/\/[^\s"<>]+/)?.[0]} 
                          title={`Player - ${movieDetails.title}`}
                          frameBorder="0"
                          allow="autoplay; encrypted-media; fullscreen"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      </div>
                       <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-center">
                         Jika video tidak muncul, coba buka tautan <a href={movieDetails.videoPlayerUrl.match(/https?:\/\/[^\s"<>]+/)?.[0]} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">disini</a>.
                       </p>
                    </div>
                  )}
                </Card>
              )}
              {currentView === 'detail' && !isLoadingDetail && !movieDetails && selectedMovieUrl && (
                <Card title="Error" icon="ph:warning-circle-duotone" className={innerCardClassName} bodyClass="p-4 sm:p-5 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gagal memuat detail. Silakan coba lagi.</p>
                    <Button onClick={() => resetToSearch(false)} text="Kembali ke Hasil" className={`${buttonSecondaryClass} mt-4 mx-auto`} />
                </Card>
              )}

              {currentView === 'download' && movieDetails && (
                <Card title={`Opsi Unduhan: ${movieDetails.title}`} titleClass="truncate" icon="ph:list-dashes-duotone" className={innerCardClassName} bodyClass="p-4 sm:p-5">
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
                    
                    {isLoadingDetail && selectableDownloadSources.length === 0 && (
                              <div className="text-center py-5">
                                <Icon icon="svg-spinners:ring-resize" className="animate-spin text-3xl text-teal-500 mx-auto" />
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Memeriksa sumber unduhan...</p>
                              </div>
                    )}

                    {!isLoadingDetail && selectableDownloadSources.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada sumber unduhan (episode/batch) yang teridentifikasi untuk film ini.</p>
                    )}

                    {selectableDownloadSources.length > 0 && (
                        <div className="mb-3 sm:mb-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-1.5 sm:mb-2">Pilih sumber/episode untuk melihat tautan unduhan:</p>
                          <div className="flex flex-wrap gap-2">
                              {selectableDownloadSources.map((source, index) => (
                              <Button
                                  key={source.movie_id + '-' + source.tag || index}
                                  text={source.name}
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
                          <h4 className="text-sm sm:text-base font-semibold text-teal-700 dark:text-teal-300 mb-2">Tautan Tersedia untuk "{selectedDownloadSource?.name || ''}":</h4>
                          {renderDownloadLinkButtons(downloadLinks)}
                        </div>
                    )}
                    
                    {!isLoadingDownloadLinks && selectedDownloadSource && downloadLinks.length === 0 && (
                           <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Tidak ada tautan unduhan ditemukan untuk sumber "{selectedDownloadSource?.name || ''}".</p>
                    )}
                </Card>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default DrakorKitaPage;