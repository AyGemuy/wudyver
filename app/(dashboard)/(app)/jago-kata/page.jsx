"use client";

import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Modal from "@/components/ui/Modal"; // Although not used in this specific page, good to have if needed for future features
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";
// import apiConfig from "@/configs/apiConfig"; // Not directly used here, but for consistency if you had an API_BASE_URL there

const JagoKataPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Reusing styles from RoomChatPage for consistency
  const inputBaseClass =
    "w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder-slate-400 dark:placeholder-slate-500 p-3"; // Consolidated and matched styles
  const labelBaseClass =
    "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center"; // Matched label style
  const sectionCardClass =
    "bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow"; // Matched section card style
  const sectionTitleClass =
    "text-lg font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center"; // Matched section title style
  const buttonGradientBase =
    "text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"; // Matched button style

  const fetchQuotes = async () => {
    if (!searchQuery.trim()) {
      toast.warn("Harap masukkan kata kunci pencarian.");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    setQuotes([]); // Clear previous quotes
    try {
      // Correctly forming the URL for your API endpoint
      const response = await fetch(
        `/api/fun/jagokata?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await response.json();
      if (response.ok && data.quotes) {
        setQuotes(data.quotes);
        if (data.quotes.length === 0) {
          toast.info("Tidak ditemukan kutipan untuk kata kunci ini.");
        }
      } else {
        toast.error(data.error || "Gagal mengambil kutipan.");
        setQuotes([]);
      }
    } catch (error) {
      toast.error("Error fetching quotes: " + error.message);
      console.error("Error fetching quotes:", error);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchQuotes();
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
              : o?.type === "warning"
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
          {/* Header - Consistent with RoomChatPage */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md mb-2 sm:mb-0">
                {" "}
                {/* Changed gradient */}
                <Icon icon="ph:quotes-duotone" className="text-2xl sm:text-3xl" />{" "}
                {/* Specific icon for quotes */}
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-center sm:text-left">
                {" "}
                {/* Changed gradient */}
                Jago Kata
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Cari dan temukan kutipan bijak dari berbagai tokoh.
            </p>
          </div>

          {/* Search Input Section */}
          <div className="p-4 sm:p-6 pb-0">
            <div className={`${sectionCardClass}`}>
              <label className={sectionTitleClass}>
                <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-xl" />
                Cari Kutipan
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Textinput
                  type="text"
                  placeholder="Masukkan kata kunci atau nama tokoh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={inputBaseClass + " flex-grow"}
                  inputClassName="p-3"
                />
                <Button
                  onClick={fetchQuotes}
                  className={`${buttonGradientBase} bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 w-full sm:w-auto px-5`}
                  icon="ph:magnifying-glass-plus-duotone"
                  text="Cari"
                  iconPosition="left"
                  iconClassName="text-lg mr-1.5"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Quotes Display Section */}
          <SimpleBar className="flex-grow max-h-[calc(100vh-420px)] lg:max-h-[calc(100vh-390px)] p-4 sm:p-6">
            <div className={`${sectionCardClass} h-full flex flex-col`}>
              <label className={sectionTitleClass}>
                <Icon icon="ph:scroll-duotone" className="mr-2 text-xl" />
                Hasil Pencarian
              </label>
              <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                <div className="space-y-4">
                  {loading && (
                    <div className="text-center py-10">
                      <Icon
                        icon="svg-spinners:ring-resize"
                        className="text-4xl text-teal-500 mx-auto mb-2 animate-spin"
                      />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Mencari kutipan...
                      </p>
                    </div>
                  )}

                  {!loading && hasSearched && quotes.length === 0 && (
                    <div className="text-center py-10">
                      <Icon
                        icon="ph:file-magnifying-glass-duotone"
                        className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3"
                      />
                      <p className="text-base text-slate-500 dark:text-slate-400">
                        Tidak ada kutipan yang ditemukan.
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Coba kata kunci lain atau periksa ejaan.
                      </p>
                    </div>
                  )}

                  {!loading && !hasSearched && (
                    <div className="text-center py-10">
                      <Icon
                        icon="ph:star-four-points-duotone"
                        className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3"
                      />
                      <p className="text-base text-slate-500 dark:text-slate-400">
                        Ayo, mulai cari kutipan bijakmu!
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Masukkan kata kunci di kolom pencarian di atas.
                      </p>
                    </div>
                  )}

                  {!loading &&
                    quotes.length > 0 &&
                    quotes.map((quote, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-slate-700/60 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700"
                      >
                        <p className="text-base italic text-slate-800 dark:text-slate-100 mb-2">
                          "{quote.quote}"
                        </p>
                        <p className="text-right text-sm font-medium text-slate-600 dark:text-slate-300">
                          - {quote.author}
                        </p>
                        {quote.description && (
                          <p className="text-right text-xs text-slate-500 dark:text-slate-400">
                            {quote.description} {quote.lifespan && `(${quote.lifespan})`}
                          </p>
                        )}
                        {quote.category && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Kategori: <span className="font-semibold">{quote.category}</span>
                          </div>
                        )}
                        {quote.tags && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Tags:{" "}
                            <span className="font-semibold">
                              {quote.tags.replace(/-/g, " ")}
                            </span>{" "}
                            {/* Format tags if they are hyphenated */}
                          </div>
                        )}
                        {quote.votes && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Votes: <span className="font-semibold">{quote.votes}</span>
                          </div>
                        )}
                        {quote.link && (
                          <div className="mt-2 text-right">
                            <a
                              href={quote.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline dark:text-blue-400"
                            >
                              Lihat di JagoKata
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default JagoKataPage;