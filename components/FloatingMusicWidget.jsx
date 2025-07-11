'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import YouTube from 'react-youtube';

const FloatingMusicWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [volume, setVolume] = useState(70);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSnapping, setIsSnapping] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  const widgetRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    const setInitialPosition = () => {
      const widgetSize = 60; // Assuming the widget is 56px wide + 2px border on each side = 60px
      const margin = 20; // Margin from the edge
      const offsetY = 50; // New offset from the top

      // Position to the right: windowWidth - widgetSize - margin
      const initialX = window.innerWidth - widgetSize - margin;
      // Position slightly down from the top: margin + offsetY
      const initialY = margin + offsetY; 
      
      setPosition({ x: initialX, y: initialY });
    };

    setInitialPosition();
    window.addEventListener('resize', setInitialPosition);
    return () => window.removeEventListener('resize', setInitialPosition);
  }, []);

  const showToast = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const getSnapPosition = (x, y) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const widgetSize = 60;
    const margin = 20;

    const distanceToLeft = x;
    const distanceToRight = windowWidth - x - widgetSize;
    const distanceToTop = y;
    const distanceToBottom = windowHeight - y - widgetSize;

    const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);

    if (minDistance === distanceToLeft) {
      return { x: margin, y: Math.max(margin, Math.min(y, windowHeight - widgetSize - margin)) };
    } else if (minDistance === distanceToRight) {
      return { x: windowWidth - widgetSize - margin, y: Math.max(margin, Math.min(y, windowHeight - widgetSize - margin)) };
    } else if (minDistance === distanceToTop) {
      return { x: Math.max(margin, Math.min(x, windowWidth - widgetSize - margin)), y: margin };
    } else {
      return { x: Math.max(margin, Math.min(x, windowWidth - widgetSize - margin)), y: windowHeight - widgetSize - margin };
    }
  };

  const handleMouseDown = (e) => {
    if (isOpen) return;

    setIsDragging(true);
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - 60)),
      y: Math.max(0, Math.min(newY, window.innerHeight - 60))
    });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);
    setIsSnapping(true);

    const snapPos = getSnapPosition(position.x, position.y);
    setPosition(snapPos);

    setTimeout(() => setIsSnapping(false), 300);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, position]);

  useEffect(() => {
    if (playerRef.current && currentSong) {
      const player = playerRef.current.getInternalPlayer();

      if (isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }

      player.setVolume(volume);

      const interval = setInterval(async () => {
        if (isPlaying && player.getCurrentTime) {
          const cTime = await player.getCurrentTime();
          setCurrentTime(cTime);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isPlaying, currentSong, volume]);


  const searchYouTube = async () => {
    if (!searchQuery.trim()) {
      showToast("Mohon masukkan kata kunci pencarian!", 'warn');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://wudysoft.xyz/api/search/youtube/v4?action=search&query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.code.error === "00000" && data.data.items) {
        setSearchResults(data.data.items);
        showToast(`Ditemukan ${data.data.items.length} video!`, 'success');
      } else {
        showToast("Tidak ada hasil pencarian ditemukan", 'warn');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast("Terjadi kesalahan saat mencari video", 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item) => {
    setCurrentSong({
      id: item.id,
      title: item.title,
      url: item.url,
      thumbnail: item.thumbnail,
      duration: item.duration,
      creator: item.creator,
      viewCount: item.viewCount
    });
    setCurrentTime(0);
    setIsPlaying(true);
    showToast(`Video "${item.title}" berhasil dipilih!`, 'success');
  };

  const getYouTubeVideoId = (url) => {
    const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v=|&v=))([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[1].length === 11) ? match[1] : null;
  };

  const handleYouTubeSubmit = () => {
    if (!youtubeUrl.trim()) {
      showToast("Mohon masukkan URL YouTube!", 'warn');
      return;
    }

    const videoId = getYouTubeVideoId(youtubeUrl);
    if (videoId) {
      setCurrentSong({
        id: videoId,
        title: "YouTube Video",
        url: youtubeUrl,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        duration: "0:00",
        creator: "Unknown",
        viewCount: "N/A"
      });
      setCurrentTime(0);
      setIsPlaying(true);
      showToast("Video YouTube berhasil dimuat!", 'success');
    } else {
      showToast("URL YouTube tidak valid!", 'error');
    }
  };

  const togglePlayPause = () => {
    if (!currentSong) {
      showToast("Mohon pilih video terlebih dahulu!", 'warn');
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    if (!currentSong || !playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    playerRef.current.getInternalPlayer().seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const formatViewCount = (viewCount) => {
    if (viewCount === "N/A") return viewCount;
    return viewCount;
  };

  const opts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      volume: volume / 100
    },
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    setIsPlaying(true);
    event.target.setVolume(volume);
  };

  const onPlayerStateChange = (event) => {
    if (event.data === 0) {
      setIsPlaying(false);
      setCurrentTime(0);
    } else if (event.data === 1) {
      setIsPlaying(true);
    } else if (event.data === 2) {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.getInternalPlayer().setVolume(volume);
    }
  }, [volume]);


  return (
    <>
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white text-sm max-w-sm animate-in slide-in-from-top-2 duration-300 ${
          toastType === 'success' ? 'bg-emerald-500' :
          toastType === 'error' ? 'bg-red-500' :
          toastType === 'warn' ? 'bg-yellow-500' :
          'bg-sky-500'
        }`}>
          {toastMessage}
        </div>
      )}

      <div style={{ display: 'none' }}>
        {currentSong && (
          <YouTube
            videoId={currentSong.id}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
          />
        )}
      </div>
      
      <div
        ref={widgetRef}
        className={`fixed z-50 transition-all duration-300 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isSnapping ? 'transition-all duration-300 ease-out' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        {!isOpen ? (
          <div
            className="relative group"
            onClick={() => setIsOpen(true)}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 opacity-30 animate-ping"></div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 opacity-20 animate-pulse"></div>
            
            <div className="relative w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-300 cursor-pointer border-2 border-white/20 backdrop-blur-sm">
              <Icon icon="mdi:music" className="text-2xl text-white" />
              {isPlaying && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-md"></div>
              )}
            </div>
            
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-2 h-2 bg-teal-400 rounded-full opacity-60 animate-bounce" style={{top: '-10px', left: '10px', animationDelay: '0s'}}></div>
              <div className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-bounce" style={{top: '15px', right: '-8px', animationDelay: '0.5s'}}></div>
              <div className="absolute w-1.5 h-1.5 bg-teal-300 rounded-full opacity-60 animate-bounce" style={{bottom: '-5px', left: '-5px', animationDelay: '1s'}}></div>
            </div>
          </div>
        ) : (
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-teal-500/30 dark:border-teal-600/50 w-full sm:w-96 max-w-xs sm:max-w-none animate-in slide-in-from-bottom-5 duration-300">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center shadow-md">
                    <Icon icon="mdi:music" className="text-lg text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Music Player</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">YouTube Music</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <Icon icon="mdi:close" className="text-xl text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                      activeTab === 'search'
                        ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon icon="mdi:magnify" className="w-4 h-4" />
                    <span>Cari</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('url')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                      activeTab === 'url'
                        ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon icon="mdi:youtube" className="w-4 h-4" />
                    <span>URL</span>
                  </button>
                </div>

                {activeTab === 'search' && (
                  <div className="space-y-4">
                    <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center space-x-2 mb-3">
                        <Icon icon="mdi:magnify" className="text-xl text-teal-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cari Video YouTube</span>
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari lagu atau artis..."
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                          onKeyPress={(e) => e.key === 'Enter' && searchYouTube()}
                        />
                        <button
                          onClick={searchYouTube}
                          disabled={isSearching}
                          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg flex items-center disabled:opacity-50"
                        >
                          <Icon icon="mdi:magnify" className="w-4 h-4 mr-1" />
                          {isSearching ? 'Cari...' : 'Cari'}
                        </button>
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {searchResults.map((item, index) => (
                          <div
                            key={index}
                            onClick={() => selectSearchResult(item)}
                            className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/50 hover:bg-slate-50 dark:hover:bg-slate-600/50 cursor-pointer transition-colors"
                          >
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-16 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {item.title}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {item.creator}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500 mt-1">
                                <span>{item.duration}</span>
                                <span>•</span>
                                <span>{formatViewCount(item.viewCount)} views</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'url' && (
                  <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center space-x-2 mb-3">
                      <Icon icon="mdi:youtube" className="text-xl text-red-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">YouTube URL</span>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="Paste YouTube URL here..."
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                      />
                      <button
                        onClick={handleYouTubeSubmit}
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg flex items-center"
                      >
                        <Icon icon="mdi:download" className="w-4 h-4 mr-1" />
                        Load
                      </button>
                    </div>
                  </div>
                )}

                {currentSong && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-800/20 dark:to-cyan-800/20 p-4 rounded-lg border border-teal-200 dark:border-teal-700/50">
                    <div className="flex items-center space-x-3">
                      <img
                        src={currentSong.thumbnail}
                        alt={currentSong.title}
                        className="w-12 h-12 rounded-lg object-cover shadow-md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {currentSong.title}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {currentSong.creator} • {formatTime(duration)}
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center space-x-4 py-2">
                  <button className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <Icon icon="mdi:skip-backward" className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  
                  <button
                    onClick={togglePlayPause}
                    className="p-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {isPlaying ? (
                      <Icon icon="mdi:pause" className="w-6 h-6" />
                    ) : (
                      <Icon icon="mdi:play" className="w-6 h-6 ml-0.5" />
                    )}
                  </button>
                  
                  <button className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <Icon icon="mdi:skip-forward" className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center">
                      <Icon icon="mdi:clock-outline" className="w-3 h-3 mr-1" />
                      {formatTime(currentTime)}
                    </span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div
                    className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 cursor-pointer"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-300 relative"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    >
                      <div className="absolute right-0 top-0 w-2 h-2 bg-white rounded-full shadow-md transform -translate-y-0"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <Icon icon="mdi:volume-high" className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgb(20, 184, 166) 0%, rgb(8, 145, 178) ${volume}%, rgb(226, 232, 240) ${volume}%, rgb(226, 232, 240) 100%)`
                        }}
                      />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400 w-10 text-right font-medium">{volume}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                    <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Icon icon="mdi:information-outline" className="w-3 h-3" />
                    <span>Drag to move</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FloatingMusicWidget;