"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InputGroup from "@/components/ui/InputGroup";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const LAHELU_API_BASE = "/api/search/lahelu";

const LaheluPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");

  const observer = useRef();
  const viewContainerRef = useRef(null);

  useEffect(() => {
    if (viewContainerRef.current && searchResults.length > 0 && currentPage === 1) {
      viewContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchResults, currentPage]);

  const callLaheluApi = async (query, page = 1) => {
    setIsLoading(true);
    const toastId = "lahelu-api-call";
    try {
      const response = await fetch(
        `${LAHELU_API_BASE}?query=${encodeURIComponent(query)}&page=${page}`
      );
      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        const errorMessage = data.message || `Gagal mengambil data: ${response.statusText}`;
        if (!toast.isActive(toastId)) {
            toast.error(errorMessage, { toastId });
        }
        return { success: false, message: errorMessage };
      }
    } catch (err) {
      console.error("Lahelu API call error:", err);
      let errorDetail = "Terjadi kesalahan jaringan atau server.";
      if (err instanceof SyntaxError) {
        errorDetail = "Respons dari server bukan JSON yang valid.";
      } else if (err.message) {
        errorDetail = err.message;
      }
      if (!toast.isActive(toastId + "-network")) {
        toast.error(errorDetail, { toastId: toastId + "-network" });
      }
      return { success: false, message: errorDetail };
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchPosts = useCallback(async (query, page = 1, isNewSearch = false) => {
    if (!query.trim() && isNewSearch) {
      toast.warn("Mohon masukkan kata kunci pencarian.");
      return;
    }

    if (isNewSearch) {
      setCurrentQuery(query);
      setSearchResults([]);
      setCurrentPage(1);
      setHasMore(false);
    }
    
    if (isLoading && currentQuery === query && !isNewSearch) {
      return;
    }


    const response = await callLaheluApi(query, page);

    if (response.success && response.data) {
      const { postInfos, nextPage, hasMore: newHasMore } = response.data;

      setSearchResults((prevResults) => 
        isNewSearch ? (postInfos || []) : [...prevResults, ...(postInfos || [])]
      );
      
      if (postInfos && postInfos.length === 0 && isNewSearch) {
        toast.info("Tidak ada postingan yang ditemukan.");
      } else if (postInfos && postInfos.length > 0 && isNewSearch) {
        toast.success(`${postInfos.length} postingan ditemukan!`);
      }
      
      setCurrentPage(nextPage || page + 1);
      setHasMore(newHasMore || false);

    } else if (isNewSearch) {
      setSearchResults([]);
      setHasMore(false);
    }
  }, [isLoading]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.warn("Mohon masukkan kata kunci pencarian.");
      return;
    }
    handleSearchPosts(searchTerm, 1, true);
  };

  const lastPostElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && currentQuery) {
        handleSearchPosts(currentQuery, currentPage, false);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, currentPage, currentQuery, handleSearchPosts]);


  const formatTime = (timestamp) => {
    if (!timestamp) return "Tanggal tidak diketahui";
    try {
      return new Date(timestamp).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return "Format tanggal salah";
    }
  };

  const renderMedia = (post) => {
    if (!post.media && (!post.content || post.content.length === 0)) return <p className="text-xs text-slate-500 dark:text-slate-400">Media tidak tersedia.</p>;

    let mediaUrl = post.media;
    let mediaType = post.mediaType;
    let mediaWidth = post.mediaWidth;
    let mediaHeight = post.mediaHeight;
    let mediaThumbnail = post.mediaThumbnail;

    if (mediaType === 1) {
      return (
        <video
          controls
          width={mediaWidth || "100%"}
          height={mediaHeight || "auto"}
          poster={mediaThumbnail}
          className="rounded-md mt-2 mb-2 border border-slate-300 dark:border-slate-600 bg-black"
          preload="metadata"
        >
          <source src={mediaUrl} type="video/mp4" />
          Browser Anda tidak mendukung tag video.
        </video>
      );
    } else if (mediaType === 0) {
      return (
        <img
          src={mediaUrl}
          alt={post.title || "Media postingan"}
          width={mediaWidth || "100%"}
          height={mediaHeight || "auto"}
          className="rounded-md mt-2 mb-2 border border-slate-300 dark:border-slate-600 object-contain max-h-96"
          onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
        />
      );
    } else if (post.content && post.content.length > 0) {
      const firstContent = post.content[0];
      if (firstContent.type === 0 || firstContent.type === 3) {
         return <img src={firstContent.value} alt={post.title || "Media dari konten"} className="rounded-md mt-2 mb-2 border border-slate-300 dark:border-slate-600 object-contain max-h-96" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}/>;
      } else if (firstContent.type === 1) {
         return <video controls poster={post.content[1]?.value} className="rounded-md mt-2 mb-2 border border-slate-300 dark:border-slate-600 w-full bg-black" preload="metadata"><source src={firstContent.value} type="video/mp4"/>Browser Anda tidak mendukung tag video.</video>;
      }
    }
    return <p className="text-xs text-slate-500 dark:text-slate-400">Tipe media tidak didukung atau media tidak ditemukan.</p>;
  };


  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:newspaper-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Lahelu Post Explorer
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Cari dan jelajahi postingan dari Lahelu!
            </p>
          </div>
          
          <SimpleBar className="flex-grow overflow-y-auto" scrollableNodeProps={{ ref: viewContainerRef }}>
            <div className="p-4 sm:p-6 space-y-6">
              <Card 
                title="Cari Postingan Lahelu" 
                icon="ph:magnifying-glass-duotone" 
                className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60" 
                bodyClass="p-4 sm:p-5"
              >
                <form onSubmit={submitSearch} className="space-y-4">
                  <InputGroup
                    id="searchLahelu"
                    type="text"
                    placeholder="Ketik judul, tag, atau kata kunci..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    prepend={<Icon icon="ph:magnifying-glass-duotone" className="text-slate-400 dark:text-slate-500 text-lg" />}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500"
                    inputClassName="text-sm bg-transparent"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    text={
                      isLoading ? (
                        <span className="flex items-center justify-center">
                          <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" />
                          Mencari...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                          Cari
                        </span>
                      )
                    }
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm"
                    disabled={isLoading || !searchTerm.trim()}
                  />
                </form>
              </Card>

              {isLoading && searchResults.length === 0 && currentQuery && (
                <Card className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60" bodyClass="p-4 sm:p-5 text-center">
                  <div className="py-8 flex flex-col items-center justify-center">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Mencari postingan untuk "{currentQuery}"...</p>
                  </div>
                </Card>
              )}


              {searchResults.length > 0 && (
                <Card 
                  title={`Hasil Pencarian (${searchResults.length} ${currentQuery ? `untuk "${currentQuery}"` : ''})`}
                  icon="ph:list-checks-duotone"
                  className="mt-6 bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60"
                  bodyClass="p-4 sm:p-5"
                >
                  <ul className="space-y-4">
                    {searchResults.map((post, index) => (
                      <li
                        key={post.postId || index}
                        ref={searchResults.length === index + 1 ? lastPostElementRef : null}
                        className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start space-x-3">
                          {post.userAvatar ? (
                            <img
                              src={post.userAvatar}
                              alt={post.userUsername || "Avatar pengguna"}
                              onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-0.jpg"; }}
                              className="w-10 h-10 rounded-full object-cover border-2 border-teal-400 dark:border-teal-500 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-teal-500 dark:text-teal-400 border-2 border-teal-400 dark:border-teal-500 flex-shrink-0">
                              <Icon icon="ph:user-duotone" className="text-xl" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Diposting oleh: <strong className="text-teal-600 dark:text-teal-300">{post.userUsername || "Anonim"}</strong>
                              {post.topicTitle && ` di topik "${post.topicTitle}"`}
                            </p>
                            <h5 className="text-md font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate" title={post.title}>
                              {post.title || "Tanpa Judul"}
                            </h5>
                          </div>
                        </div>
                        
                        <div className="mt-3 pl-0">
                           {renderMedia(post)}
                        </div>

                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {post.hashtags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-xs bg-teal-100 text-teal-700 dark:bg-teal-700/30 dark:text-teal-300 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600/50 text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center">
                          <span className="flex items-center gap-x-2">
                            <span className="flex items-center"><Icon icon="ph:arrow-fat-up-duotone" className="inline mr-0.5" /> {post.totalUpvotes || 0}</span>
                            <span className="flex items-center"><Icon icon="ph:arrow-fat-down-duotone" className="inline mr-0.5" /> {post.totalDownvotes || 0}</span>
                            <span className="flex items-center"><Icon icon="ph:chat-teardrop-dots-duotone" className="inline mr-0.5" /> {post.totalComments || 0}</span>
                          </span>
                          <span>{formatTime(post.createTime)}</span>
                        </div>
                          {post.isSensitive && (
                            <span className="text-xs mt-1 inline-block px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 rounded-full">
                              <Icon icon="ph:warning-octagon-duotone" className="inline mr-1" />
                              Sensitif
                            </span>
                          )}
                      </li>
                    ))}
                  </ul>
                   {isLoading && hasMore && (
                    <div className="flex justify-center items-center mt-4 p-4">
                        <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-2xl text-teal-500" />
                        <span className="text-slate-600 dark:text-slate-300">Memuat lebih banyak...</span>
                    </div>
                   )}
                  {!hasMore && searchResults.length > 0 && (
                     <p className="text-center text-slate-500 dark:text-slate-400 mt-4 py-2">Tidak ada postingan lagi.</p>
                   )}
                </Card>
              )}
            
            {!isLoading && searchResults.length === 0 && currentQuery && (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                    <Icon icon="ph:ghost-duotone" className="text-5xl mb-3 text-teal-400"/>
                    <p>Tidak ada hasil untuk "{currentQuery}".</p>
                    <p>Coba kata kunci lain.</p>
                </div>
            )}
            {!isLoading && searchResults.length === 0 && !currentQuery && (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                    <Icon icon="ph:binoculars-duotone" className="text-5xl mb-3 text-teal-400"/>
                    <p>Silakan masukkan kata kunci untuk memulai pencarian.</p>
                </div>
            )}

            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default LaheluPage;
