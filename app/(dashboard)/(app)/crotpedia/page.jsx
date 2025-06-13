"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const CROTPEDIA_API_BASE = "/api/nsfw/crotpedia";

const CrotpediaPage = () => {
  const [currentView, setCurrentView] = useState('search');
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSeriesUrl, setSelectedSeriesUrl] = useState(null);
  const [seriesDetails, setSeriesDetails] = useState(null);
  const [selectedChapterUrl, setSelectedChapterUrl] = useState(null);
  const [chapterContent, setChapterContent] = useState(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingSeriesDetail, setIsLoadingSeriesDetail] = useState(false);
  const [isLoadingChapterContent, setIsLoadingChapterContent] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(null);

  const viewContainerRef = useRef(null);

  useEffect(() => {
    if (viewContainerRef.current) {
      viewContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentView, seriesDetails, searchResults, chapterContent]);

  const callCrotpediaApi = async (params, actionContext = "") => {
    const queryParams = new URLSearchParams(params).toString();
    const toastId = `api-error-${actionContext.replace(/\s/g, '') || 'general'}`;
    try {
      const response = await fetch(`${CROTPEDIA_API_BASE}?${queryParams}`);
      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, data: data };
      } else {
        const message = data.error || data.message || `${actionContext || 'Operasi'} gagal atau data tidak ditemukan.`;
        if (!toast.isActive(toastId)) {
            toast.error(message, {toastId});
        }
        return { success: false, message, data: data };
      }
    } catch (err) {
      console.error(`Crotpedia API call error (${actionContext}):`, err);
      const errorMessage = "Terjadi kesalahan jaringan atau server.";
      const networkToastId = `network-error-${actionContext.replace(/\s/g, '') || 'general'}`;
        if (!toast.isActive(networkToastId)) {
            toast.error(errorMessage, {toastId: networkToastId});
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
    setSeriesDetails(null);
    setSelectedSeriesUrl(null);
    setChapterContent(null);
    setSelectedChapterUrl(null);
    setCurrentView('search');

    const response = await callCrotpediaApi({ action: "search", query: searchTerm }, "Pencarian Crotpedia");
    if (response.success && response.data?.results) {
      if (response.data.results.length === 0) {
        toast.info(`Tidak ada hasil yang ditemukan untuk "${searchTerm}".`);
        setSearchResults([]);
      } else {
        setSearchResults(response.data.results);
        toast.success(`${response.data.results.length} item ditemukan!`);
      }
    } else {
      setSearchResults([]);
    }
    setIsLoadingSearch(false);
  };

  const fetchSeriesDetails = async (seriesUrl, itemIdentifier) => {
    if (!seriesUrl) return;
    setIsProcessingAction(itemIdentifier);
    setIsLoadingSeriesDetail(true);
    setSeriesDetails(null);
    setChapterContent(null);
    setSelectedChapterUrl(null);
    setSelectedSeriesUrl(seriesUrl);
    setCurrentView('seriesDetail'); 

    const response = await callCrotpediaApi({ action: "detail", url: seriesUrl }, "Memuat Detail Seri");
    if (response.success && response.data) {
      setSeriesDetails(response.data);
    } else {
      setSeriesDetails(null);
    }
    setIsLoadingSeriesDetail(false);
    setIsProcessingAction(null);
  };

  const fetchChapterContent = async (chapterUrl, seriesDataForNav = null, itemIdentifier) => {
    if (!chapterUrl) return;
    setIsProcessingAction(itemIdentifier);
    setIsLoadingChapterContent(true);
    setChapterContent(null);
    setSelectedChapterUrl(chapterUrl);
    setCurrentView('chapterView');

    const response = await callCrotpediaApi({ action: "download", url: chapterUrl }, "Memuat Konten Chapter");
    if (response.success && response.data) {
      let finalNavData = response.data.navigation;
      if (!finalNavData && seriesDataForNav) {
        finalNavData = {
          seriesTitle: seriesDataForNav.title,
          seriesUrl: seriesDataForNav.url,
          currentChapterName: response.data.pageTitle,
        };
      }
      setChapterContent({...response.data, navigation: finalNavData});
    } else {
      setChapterContent({ error: response.message || "Gagal memuat konten chapter." });
    }
    setIsLoadingChapterContent(false);
    setIsProcessingAction(null);
  };

  const resetToSearch = (clearSearchTermAndResults = true) => {
    setCurrentView('search');
    setSelectedSeriesUrl(null);
    setSeriesDetails(null);
    setSelectedChapterUrl(null);
    setChapterContent(null);
    if (clearSearchTermAndResults) {
        setSearchTerm("");
        setSearchResults([]);
    }
  };

  const renderSeriesInfoDetails = (details) => {
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
        return <p className="text-xs text-slate-500 dark:text-slate-400">Tidak ada detail tambahan.</p>;
    }
    const displayFields = {
        rilis: "Rilis",
        studio: "Studio",
        pengarang: "Pengarang",
        artis: "Artis",
        penerbit: "Penerbit",
        posted_on: "Diposting Pada",
        updated_on: "Diperbarui Pada",
    };

    return Object.entries(details).map(([key, valueObj]) => {
        const label = displayFields[key.toLowerCase().replace(/\s+/g, '_')] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        let valueText = '';
        let valueLink = null;

        if (typeof valueObj === 'object' && valueObj !== null && valueObj.text) {
            valueText = valueObj.text;
            valueLink = valueObj.link;
        } else if (typeof valueObj === 'string') {
            valueText = valueObj;
        } else {
            return null;
        }
        
        if (!valueText || valueText.toLowerCase() === 'n/a' || valueText.trim() === '') return null;

        return (
            <p key={key}>
                <strong className="font-medium text-slate-500 dark:text-slate-400 w-24 sm:w-28 inline-block">{label}:</strong> 
                {valueLink ? (
                    <a href={valueLink} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">{valueText}</a>
                ) : (
                    valueText
                )}
            </p>
        );
    }).filter(Boolean);
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
                <Icon icon="ph:books-duotone" className="text-xl sm:text-2xl" />
              </div>
              <div className="ml-0 sm:ml-3 text-center sm:text-left">
                <h1 className="text-base sm:text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                  Crotpedia Explorer
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Temukan dan baca koleksi dari Crotpedia.
                </p>
              </div>
            </div>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto" scrollableNodeProps={{ ref: viewContainerRef }}>
            <div className="p-3 sm:p-4 space-y-4 sm:space-y-5"> 
            
              {currentView === 'search' && (
                <Card title="Pencarian Konten" className={innerCardClassName} bodyClass="p-4 sm:p-5">
                  <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
                    <div>
                      <label htmlFor="searchCrotpedia" className={labelBaseClass}>
                        <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-base sm:text-lg" />
                        Kata Kunci
                      </label>
                      <input 
                        id="searchCrotpedia"
                        type="text"
                        placeholder="Masukkan judul, tag, atau kata kunci lain..."
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
                          <><Icon icon="ph:text-aa-duotone" className="mr-2 text-base" /> Cari Konten</>
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
                    {searchResults.map((item, index) => (
                      <Card 
                        key={item.seriesUrl || index}
                        bodyClass="p-2.5 sm:p-3 flex flex-col justify-between h-full"
                        className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 hover:shadow-lg hover:shadow-teal-500/20 hover:border-teal-500/70 transition-all duration-200"
                      >
                        <div onClick={() => item.seriesUrl && fetchSeriesDetails(item.seriesUrl, item.seriesUrl)} className="cursor-pointer">
                          <img
                            src={item.thumbnailUrl || "/assets/images/placeholder-general.png"}
                            alt={item.title}
                            className="w-full h-auto object-cover rounded-md mb-2 aspect-[3/4] bg-slate-200 dark:bg-slate-700"
                            onError={(e) => {e.currentTarget.onerror = null; e.currentTarget.src = "/assets/images/placeholder-general.png"}}
                          />
                          <div>
                            <h5 className="text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-200 truncate mb-0.5" title={item.title}>{item.title}</h5>
                            {item.studio && <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Studio: {item.studio}</p>}
                            {item.score && <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Skor: {item.score} ★</p>}
                            {item.latestChapterInfo && <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">{item.latestChapterInfo}</p>}
                             {item.genres && item.genres.length > 0 && <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-1">{item.genres.join(', ')}</p>}
                          </div>
                        </div>
                           <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700/50">
                                <Button
                                    onClick={() => item.seriesUrl && fetchSeriesDetails(item.seriesUrl, item.seriesUrl)}
                                    className={`${buttonSmallActionClass} w-full bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-700`}
                                    disabled={isProcessingAction === item.seriesUrl}
                                >
                                    {isProcessingAction === item.seriesUrl && isLoadingSeriesDetail ? <Icon icon="svg-spinners:180-ring-with-bg" className="text-sm" /> : <Icon icon="ph:book-open-text-duotone" className="mr-1"/>} 
                                    Lihat Detail
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

              {currentView === 'seriesDetail' && isLoadingSeriesDetail && !seriesDetails && (
                <Card className={innerCardClassName} bodyClass="p-4 sm:p-5 text-center">
                  <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-10">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Memuat detail seri...</p>
                  </div>
                </Card>
              )}

              {currentView === 'seriesDetail' && seriesDetails && !isLoadingSeriesDetail && (
                <Card title="Detail Seri" icon="ph:book-open-text-duotone" className={innerCardClassName} bodyClass="p-4 sm:p-5">
                  <div className="flex justify-start mb-3 sm:mb-4">
                    <Button
                      onClick={() => resetToSearch(false)} 
                      text={<><Icon icon="ph:arrow-left-duotone" className="mr-1.5 text-sm" /> Kembali ke Pencarian</>}
                      className={buttonSecondaryClass}
                    />
                  </div>

                  {seriesDetails.success === false ? (
                    <div className="text-center py-5 text-red-500">
                        <Icon icon="ph:warning-circle-duotone" className="text-4xl mb-2 mx-auto" />
                        <p className="font-medium">Gagal Memuat Detail Seri</p>
                        <p className="text-sm">{seriesDetails.error || "Terjadi kesalahan."}</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 mb-4">
                        <div className="md:col-span-4 lg:col-span-3">
                          <img
                            src={seriesDetails.coverImageUrl || "/assets/images/placeholder-general.png"}
                            alt={seriesDetails.title}
                            className="w-full h-auto object-cover rounded-lg shadow-md border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-700"
                            onError={(e) => {e.currentTarget.onerror = null; e.currentTarget.src = "/assets/images/placeholder-general.png"}}
                          />
                        </div>
                        <div className="md:col-span-8 lg:col-span-9">
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-teal-600 dark:text-teal-200 mb-1">{seriesDetails.title}</h3>
                          {seriesDetails.originalTitle && <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 sm:mb-3 italic">{seriesDetails.originalTitle}</p>}
                          <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Tipe:</strong> {seriesDetails.type || '-'}</p>
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Status:</strong> {seriesDetails.status || '-'}</p>
                            <p><strong className="font-medium text-slate-500 dark:text-slate-400 w-20 sm:w-24 inline-block">Skor:</strong> {seriesDetails.score ? `${seriesDetails.score} ★` : '-'}</p>
                            {renderSeriesInfoDetails(seriesDetails.details)}
                          </div>
                        </div>
                      </div>

                      {seriesDetails.chapters && seriesDetails.chapters.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-base sm:text-lg font-semibold text-teal-700 dark:text-teal-300 mb-2 sm:mb-3">Daftar Chapter:</h4>
                          <div className="max-h-80 overflow-y-auto simple-scrollbar pr-2 border rounded-md border-slate-200 dark:border-slate-700">
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                              {seriesDetails.chapters.map((chapter, index) => (
                                <li key={chapter.url || index} 
                                    className="p-0 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                  <Button
                                    onClick={() => chapter.url && fetchChapterContent(chapter.url, seriesDetails, chapter.url)}
                                    className="w-full text-left !bg-transparent !shadow-none !p-2.5 sm:!p-3 !font-normal flex justify-between items-center disabled:!bg-transparent"
                                    disabled={isProcessingAction === chapter.url}
                                  >
                                    <span className={`text-sm ${isProcessingAction === chapter.url && isLoadingChapterContent ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300'} truncate`} title={chapter.title}>
                                      {isProcessingAction === chapter.url && isLoadingChapterContent ? <Icon icon="svg-spinners:180-ring-with-bg" className="inline mr-2 text-sm" /> : <Icon icon="ph:book-bookmark-duotone" className="inline mr-2 text-sm"/>}
                                      {chapter.title}
                                    </span>
                                    {chapter.date && <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 shrink-0">{chapter.date}</span>}
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              )}
              
              {currentView === 'chapterView' && isLoadingChapterContent && !chapterContent && (
                <Card className={innerCardClassName} bodyClass="p-4 sm:p-5 text-center">
                  <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center py-10">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Memuat konten chapter...</p>
                  </div>
                </Card>
              )}

              {currentView === 'chapterView' && chapterContent && !isLoadingChapterContent && (
                <Card 
                    title={chapterContent.navigation?.currentChapterName || chapterContent.pageTitle || "Konten Chapter"} 
                    icon="ph:image-square-duotone" 
                    className={innerCardClassName} 
                    bodyClass="p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center mb-3 sm:mb-4 gap-2">
                    <Button
                      onClick={() => {
                        setSelectedChapterUrl(null);
                        setChapterContent(null); 
                        setCurrentView('seriesDetail');
                      }}
                      text={<><Icon icon="ph:arrow-left-duotone" className="mr-1.5 text-sm" /> Kembali ke Detail Seri</>}
                      className={buttonSecondaryClass}
                    />
                     <div className="flex gap-2">
                        {chapterContent.navigation?.previousChapterUrl && (
                            <Button
                                onClick={() => fetchChapterContent(chapterContent.navigation.previousChapterUrl, seriesDetails, chapterContent.navigation.previousChapterUrl)}
                                text={<><Icon icon="ph:caret-left-bold" className="text-sm"/> Sebelumnya</>}
                                className={`${buttonSecondaryClass} text-xs`}
                                disabled={isLoadingChapterContent}
                            />
                        )}
                        {chapterContent.navigation?.nextChapterUrl && (
                            <Button
                                onClick={() => fetchChapterContent(chapterContent.navigation.nextChapterUrl, seriesDetails, chapterContent.navigation.nextChapterUrl)}
                                text={<>Berikutnya <Icon icon="ph:caret-right-bold" className="text-sm"/></>}
                                iconPosition="right"
                                className={`${buttonSecondaryClass} text-xs`}
                                disabled={isLoadingChapterContent}
                            />
                        )}
                    </div>
                  </div>

                  {chapterContent.success === false ? (
                        <div className="text-center py-5 text-red-500">
                         <Icon icon="ph:warning-circle-duotone" className="text-4xl mb-2 mx-auto" />
                         <p className="font-medium">Gagal Memuat Konten Chapter</p>
                         <p className="text-sm">{chapterContent.error || "Terjadi kesalahan."}</p>
                     </div>
                   ) : chapterContent.images && chapterContent.images.length > 0 ? (
                    <div className="space-y-2 bg-black/80 p-1 rounded-md">
                      {chapterContent.images.map((imageUrl, index) => (
                        <img 
                          key={index} 
                          src={imageUrl} 
                          alt={`Halaman ${index + 1}`} 
                          className="w-full h-auto block" 
                          loading="lazy"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-5">Tidak ada gambar ditemukan untuk chapter ini.</p>
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

export default CrotpediaPage;