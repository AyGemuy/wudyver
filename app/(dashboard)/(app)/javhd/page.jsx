"use client";

import { useState } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Modal from "@/components/ui/Modal";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const JavhdPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVideoDetail, setSelectedVideoDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.warn("Please enter a search query.");
      return;
    }
    setLoadingSearch(true);
    setHasSearched(true);
    setSearchResults([]);
    try {
      const response = await fetch(
        `/api/nsfw/javhd?action=search&query=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
        if (data.length === 0) {
          toast.info("No videos found for this query.");
        }
      } else {
        toast.error(data.error || "Failed to fetch search results.");
        setSearchResults([]);
      }
    } catch (error) {
      toast.error("Error during search: " + error.message);
      console.error("Error searching JAVHD:", error);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleDetail = async (url) => {
    setLoadingDetail(true);
    setSelectedVideoDetail(null);
    setShowDetailModal(true);
    try {
      const response = await fetch(
        `/api/nsfw/javhd?action=detail&url=${encodeURIComponent(url)}`
      );
      const data = await response.json();
      if (response.ok) {
        setSelectedVideoDetail(data);
      } else {
        toast.error(data.error || "Failed to fetch video details.");
        setSelectedVideoDetail(null);
        setShowDetailModal(false);
      }
    } catch (error) {
      toast.error("Error fetching video details: " + error.message);
      console.error("Error fetching JAVHD detail:", error);
      setSelectedVideoDetail(null);
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${
            o?.type === "success"
              ? "bg-emerald-500 text-white"
              : o?.type === "error"
              ? "bg-red-500 text-white"
              : o?.type === "warn"
              ? "bg-yellow-500 text-white"
              : "bg-sky-500 text-white"
          } dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:film-slate-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                JAVHD Explorer
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Search and explore JAV videos. (Note: Content may be NSFW)
            </p>
          </div>

          <div className="p-4 sm:p-6 pb-0">
            <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow">
              <label className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-xl" />
                Search Videos
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Textinput
                  type="text"
                  placeholder="Enter keywords or actress name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm flex-grow"
                  inputClassName="p-3 placeholder-slate-400 dark:placeholder-slate-500"
                />
                <Button
                  onClick={handleSearch}
                  className="w-full sm:w-auto px-5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                  text={
                    loadingSearch ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" /> Searching...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:magnifying-glass-plus-duotone" className="mr-1.5 text-lg" /> Search
                      </span>
                    )
                  }
                  disabled={loadingSearch}
                />
              </div>
            </div>
          </div>

          <SimpleBar className="flex-grow max-h-[calc(100vh-420px)] lg:max-h-[calc(100vh-390px)] p-4 sm:p-6">
            <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow h-full flex flex-col">
              <label className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                <Icon icon="ph:monitor-play-duotone" className="mr-2 text-xl" />
                Search Results
              </label>
              <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {loadingSearch && (
                    <div className="col-span-full text-center py-10">
                      <Icon
                        icon="svg-spinners:blocks-shuffle-3"
                        className="text-4xl text-teal-500 mx-auto mb-2"
                      />
                      <p className="text-sm text-slate-600 dark:text-teal-300">
                        Searching for videos...
                      </p>
                    </div>
                  )}

                  {!loadingSearch && hasSearched && searchResults.length === 0 && (
                    <div className="col-span-full text-center py-10">
                      <Icon
                        icon="ph:folder-notch-open-duotone"
                        className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3"
                      />
                      <p className="text-base text-slate-500 dark:text-slate-400">
                        No videos found.
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Try a different keyword or check your spelling.
                      </p>
                    </div>
                  )}

                  {!loadingSearch && !hasSearched && (
                    <div className="col-span-full text-center py-10">
                      <Icon
                        icon="ph:video-camera-slash-duotone"
                        className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3"
                      />
                      <p className="text-base text-slate-500 dark:text-slate-400">
                        Start your video search!
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Enter keywords in the search box above.
                      </p>
                    </div>
                  )}

                  {!loadingSearch &&
                    searchResults.length > 0 &&
                    searchResults.map((video, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-slate-700/60 p-3 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-all duration-200"
                        onClick={() => handleDetail(video.url)}
                      >
                        <div className="aspect-video w-full overflow-hidden rounded-md mb-2 relative">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.onerror = null; e.target.src="/assets/images/no-image.png"; }}
                          />
                          {video.hasLabel && (
                            <span className="absolute top-1 left-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded">
                              {video.hasLabel}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1 truncate" title={video.title}>
                          {video.title}
                        </h3>
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-2">
                          <span className="flex items-center">
                            <Icon icon="ph:eye-duotone" className="mr-1" />
                            {video.views}
                          </span>
                          <span className="flex items-center">
                            <Icon icon="ph:heart-duotone" className="mr-1" />
                            {video.likes}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>

      <Modal
        title={
            <div className="flex items-center text-slate-900 dark:text-slate-50">
              <Icon icon="ph:text-aa-duotone" className="mr-2 h-5 w-5 flex-shrink-0 text-teal-500 dark:text-teal-400 sm:h-6 sm:w-6"/>
              <span className="text-sm font-medium sm:text-base">
                Video Details: <span className="font-semibold">{selectedVideoDetail?.title || "Loading..."}</span>
              </span>
            </div>
          }
        activeModal={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedVideoDetail(null);
        }}
        className="max-w-3xl border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        footerContent={
          <div className="flex justify-end space-x-2">
            <Button
              text="Close"
              onClick={() => {
                setShowDetailModal(false);
                setSelectedVideoDetail(null);
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-md py-2 px-4 text-sm"
            />
            {selectedVideoDetail?.videoUrl && (
              <Button
                onClick={() => window.open(selectedVideoDetail.videoUrl, '_blank')}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70"
                text={
                    <span className="flex items-center justify-center">
                        <Icon icon="ph:play-circle-duotone" className="mr-1.5 text-lg" /> Watch Video
                    </span>
                }
              />
            )}
          </div>
        }
      >
        {loadingDetail ? (
          <div className="text-center py-10">
            <Icon
              icon="svg-spinners:blocks-shuffle-3"
              className="text-4xl text-teal-500 mx-auto mb-2"
            />
            <p className="text-sm text-slate-600 dark:text-teal-300">
              Loading video details...
            </p>
          </div>
        ) : selectedVideoDetail ? (
          <div className="space-y-4 p-0.5">
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
              {selectedVideoDetail.thumbnail && (
                <img
                  src={selectedVideoDetail.thumbnail}
                  alt={selectedVideoDetail.title}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.onerror = null; e.target.src="/assets/images/no-image.png"; }}
                />
              )}
              {!selectedVideoDetail.thumbnail && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center">
                     <Icon icon="ph:video-camera-slash" className="text-6xl text-slate-400" />
                   </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-100/70 dark:bg-slate-700/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-600/70 ">
                    <div className="flex items-center mb-2 sm:mb-3">
                        <span className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/30 text-teal-600 dark:text-teal-300 mr-2.5 flex-shrink-0">
                            <Icon icon="ph:house-line-duotone" className="text-lg sm:text-xl" />
                        </span>
                        <h5 className="text-md sm:text-lg font-semibold text-slate-700 dark:text-teal-300">Studio</h5>
                    </div>
                    <p className="bg-white dark:bg-slate-700/80 p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                        {selectedVideoDetail.studio || "N/A"} {selectedVideoDetail.totalVideos && `(${selectedVideoDetail.totalVideos})`}
                    </p>
                </div>
                <div className="bg-slate-100/70 dark:bg-slate-700/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-600/70 ">
                    <div className="flex items-center mb-2 sm:mb-3">
                        <span className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/30 text-teal-600 dark:text-teal-300 mr-2.5 flex-shrink-0">
                            <Icon icon="ph:user-list-duotone" className="text-lg sm:text-xl" />
                        </span>
                        <h5 className="text-md sm:text-lg font-semibold text-slate-700 dark:text-teal-300">Model</h5>
                    </div>
                    <p className="bg-white dark:bg-slate-700/80 p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                        {selectedVideoDetail.model || "N/A"}
                    </p>
                </div>
                <div className="bg-slate-100/70 dark:bg-slate-700/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-600/70 ">
                    <div className="flex items-center mb-2 sm:mb-3">
                        <span className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/30 text-teal-600 dark:text-teal-300 mr-2.5 flex-shrink-0">
                            <Icon icon="ph:thumbs-up-duotone" className="text-lg sm:text-xl" />
                        </span>
                        <h5 className="text-md sm:text-lg font-semibold text-slate-700 dark:text-teal-300">Likes</h5>
                    </div>
                    <p className="bg-white dark:bg-slate-700/80 p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                        {selectedVideoDetail.likePercentage || "N/A"}
                    </p>
                </div>
                <div className="bg-slate-100/70 dark:bg-slate-700/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-600/70 ">
                    <div className="flex items-center mb-2 sm:mb-3">
                        <span className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/30 text-teal-600 dark:text-teal-300 mr-2.5 flex-shrink-0">
                            <Icon icon="ph:thumbs-down-duotone" className="text-lg sm:text-xl" />
                        </span>
                        <h5 className="text-md sm:text-lg font-semibold text-slate-700 dark:text-teal-300">Dislikes</h5>
                    </div>
                    <p className="bg-white dark:bg-slate-700/80 p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                        {selectedVideoDetail.dislikePercentage || "N/A"}
                    </p>
                </div>
                <div className="bg-slate-100/70 dark:bg-slate-700/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-600/70 ">
                    <div className="flex items-center mb-2 sm:mb-3">
                        <span className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/30 text-teal-600 dark:text-teal-300 mr-2.5 flex-shrink-0">
                            <Icon icon="ph:chart-bar-duotone" className="text-lg sm:text-xl" />
                        </span>
                        <h5 className="text-md sm:text-lg font-semibold text-slate-700 dark:text-teal-300">Views</h5>
                    </div>
                    <p className="bg-white dark:bg-slate-700/80 p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                        {selectedVideoDetail.views || "N/A"}
                    </p>
                </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <Icon
              icon="ph:info-duotone"
              className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3"
            />
            <p className="text-base text-slate-500 dark:text-slate-400">
              Select a video to see its details.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
};

export default JavhdPage;