"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InputGroup from "@/components/ui/InputGroup";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const CAI_AI_API_BASE = "/api/ai/cai";

const CaiAiChatPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [userPrompt, setUserPrompt] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const callCaiApi = async (url, method = "GET", body = null) => {
    const isChatActionCall = url.includes("action=chat");
    const isSearchActionCall = url.includes("action=search");

    if (isChatActionCall) setIsChatting(true);
    else if (isSearchActionCall) setIsSearching(true);

    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(url, options);
      const data = await response.json();

      if (response.ok) {
        return { success: true, data: data };
      } else {
        toast.error(data.message || "Operasi gagal dari server.");
        return { success: false, message: data.message || "Operasi gagal dari server." };
      }
    } catch (err) {
      console.error("CAI AI API call error:", err);
      let errorDetail = "Terjadi kesalahan jaringan atau server.";
      if (err instanceof SyntaxError) {
        errorDetail = "Respons dari server bukan JSON yang valid.";
      } else if (err.message) {
        errorDetail = err.message;
      }
      toast.error(errorDetail);
      return { success: false, message: errorDetail };
    } finally {
      if (isChatActionCall) setIsChatting(false);
      else if (isSearchActionCall) setIsSearching(false);
    }
  };

  const handleSearchCharacter = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.warn("Mohon masukkan kata kunci pencarian.");
      return;
    }

    setSearchResults([]);
    setSelectedCharacter(null);
    setChatMessages([]);

    const response = await callCaiApi(`${CAI_AI_API_BASE}?action=search&query=${encodeURIComponent(searchTerm)}`);

    // --- START MODIFICATION ---
    // Clear search input after submission
    setSearchTerm("");
    // --- END MODIFICATION ---

    if (response.success && response.data && Array.isArray(response.data.characters)) {
      const formattedResults = response.data.characters.map(char => ({
        id: char.external_id,
        name: char.participant__name || "Nama Tidak Diketahui",
        description: char.description || "Deskripsi tidak tersedia.",
        characterImageUrl: char.avatar_file_name ? `https://characterai.io/i/400/static/avatars/${char.avatar_file_name}` : "/assets/images/users/user-0.jpg",
        chatSessionCount: char.participant__num_interactions || 0,
        createdBy: char.user__username || "Tidak diketahui",
        greeting: char.greeting || `Halo, saya ${char.participant__name || 'karakter ini'}.`,
      }));
      setSearchResults(formattedResults);
      if (formattedResults.length === 0) {
        toast.info("Tidak ada karakter yang ditemukan.");
      } else {
        toast.success(`${formattedResults.length} karakter ditemukan!`);
      }
    } else {
      setSearchResults([]);
      if (response.success && !(response.data && Array.isArray(response.data.characters))) {
        toast.error("Format data pencarian tidak sesuai dari CAI.");
      }
    }
  };

  const handleSelectCharacter = (character) => {
    setSelectedCharacter(character);
    setChatMessages([]);
    toast.info(`Anda memilih ${character.name}.`);

    setChatMessages([{
      id: Date.now(),
      sender: "ai",
      text: character.greeting,
      avatar: character.characterImageUrl,
    }]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedCharacter) {
      toast.warn("Mohon pilih karakter AI terlebih dahulu.");
      return;
    }
    if (!userPrompt.trim()) {
      toast.warn("Pesan tidak boleh kosong.");
      return;
    }

    const currentPrompt = userPrompt;
    setUserPrompt("");

    setChatMessages((prevMessages) => [
      ...prevMessages, {
        id: Date.now(),
        sender: "user",
        text: currentPrompt,
        avatar: "/assets/images/users/user-1.jpg",
      },
    ]);

    const response = await callCaiApi(
      `${CAI_AI_API_BASE}?action=chat&char_id=${selectedCharacter.id}&prompt=${encodeURIComponent(currentPrompt)}`,
      "GET"
    );

    if (response.success && response.data && response.data.candidates && response.data.candidates.length > 0) {
      setChatMessages((prevMessages) => [
        ...prevMessages, {
          id: Date.now() + 1,
          sender: "ai",
          text: response.data.candidates[0].raw_content,
          avatar: selectedCharacter.characterImageUrl,
        },
      ]);
    } else {
      if (response.success && !(response.data && response.data.candidates && response.data.candidates.length > 0)) {
        toast.error("Format respons chat dari AI tidak sesuai.");
      }
      setChatMessages((prevMessages) => [
        ...prevMessages, {
          id: Date.now() + 1,
          sender: "system",
          text: "Gagal memuat respons AI. Silakan coba lagi.",
          avatar: "/assets/images/alert.png",
        },
      ]);
    }
  };

  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500";
  const buttonPrimaryClass = "w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed";
  const labelBaseClass = "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5 flex items-center";
  const sectionCardClass = "bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-sm";


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
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:robot-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                CAI AI Chat
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Cari dan ngobrol dengan berbagai karakter AI dari Character.AI!
            </p>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
              <div className={sectionCardClass}>
                <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                  <Icon icon="ph:user-magnifying-glass-duotone" className="mr-2 text-xl" />
                  Cari Karakter CAI
                </h3>
                <form onSubmit={handleSearchCharacter} className="space-y-4">
                  <InputGroup
                    id="searchCharacter"
                    type="text"
                    placeholder="Ketik nama atau kata kunci karakter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    prepend={<Icon icon="ph:magnifying-glass-duotone" className="text-slate-400 dark:text-slate-500 text-lg" />}
                    className={inputBaseClass}
                    inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                  <Button
                    type="submit"
                    text={
                      isSearching ? (
                        <span className="flex items-center justify-center">
                          {/* --- START MODIFICATION --- */}
                          <Icon icon="svg-spinners:blocks-shuffle-3" className="animate-spin mr-2 text-lg" />
                          {/* --- END MODIFICATION --- */}
                          Mencari...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                          Cari
                        </span>
                      )
                    }
                    className={buttonPrimaryClass}
                    disabled={isSearching || isChatting}
                  />
                </form>

                {isSearching && searchResults.length === 0 && (
                  <div className="text-center py-6">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-3xl text-teal-500 mb-2 mx-auto" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Mencari karakter...</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-teal-600 dark:text-teal-300 mb-2">Hasil Pencarian:</h4>
                    <SimpleBar className="max-h-60 overflow-y-auto pr-1">
                      <ul className="space-y-2">
                        {searchResults.map((character) => (
                          <li
                            key={character.id}
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out border dark:border-slate-700/80 ${
                              selectedCharacter?.id === character.id
                                ? "bg-teal-500/20 dark:bg-teal-600/30 text-teal-700 dark:text-teal-200 ring-1 ring-teal-500 shadow-md"
                                : "bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-600/70 text-slate-700 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 border-slate-200"
                            }`}
                            onClick={() => handleSelectCharacter(character)}
                          >
                            <img
                              src={character.characterImageUrl}
                              alt={character.name}
                              onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-0.jpg"; }}
                              className="w-10 h-10 rounded-full mr-3 border-2 border-teal-400 dark:border-teal-500 object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <strong className="text-teal-600 dark:text-teal-300 block truncate text-sm">{character.name}</strong>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{character.description}</p>
                              <span className="text-xs text-slate-400 dark:text-slate-500 block truncate">
                                Sesi: {character.chatSessionCount} | Oleh: {character.createdBy}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </SimpleBar>
                  </div>
                )}
              </div>

              {selectedCharacter && (
                <div className={sectionCardClass + " flex flex-col"} style={{ minHeight: 'calc(100vh - 26rem)' }}>
                  <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 flex items-center shrink-0">
                    <Icon icon="ph:chat-dots-duotone" className="mr-2 text-xl" />
                    Ngobrol dengan: {selectedCharacter.name}
                  </h3>
                  <SimpleBar className="flex-grow pr-1 mb-4">
                    {chatMessages.length > 0 ? (
                      <div className="space-y-4">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex items-end ${
                              msg.sender === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {(msg.sender === "ai" || msg.sender === "system") && (
                              <img
                                src={msg.avatar}
                                alt={`${msg.sender} Avatar`}
                                onError={(e) => { e.target.onerror = null; e.target.src = msg.sender === 'ai' ? "/assets/images/users/user-0.jpg" : "/assets/images/alert.png"; }}
                                className={`w-8 h-8 rounded-full mr-2 sm:mr-3 border-2 object-cover self-start flex-shrink-0
                                  ${msg.sender === 'ai' ? 'border-teal-500' : 'border-red-500'}`}
                              />
                            )}
                            <div
                              className={`p-3 rounded-xl shadow-sm max-w-[85%] sm:max-w-[75%] ${
                                msg.sender === "user"
                                  ? "bg-sky-600 text-white rounded-br-none"
                                  : msg.sender === "ai"
                                  ? "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-bl-none"
                                  : "bg-red-200 dark:bg-red-700/50 text-red-700 dark:text-red-200 rounded-bl-none"
                              }`}
                            >
                              <p className="break-words whitespace-pre-wrap text-sm sm:text-base">{msg.text}</p>
                              <small className={`text-xs mt-1.5 block opacity-80 ${
                                msg.sender === 'user' ? 'text-sky-100 text-right' :
                                msg.sender === 'ai' ? 'text-slate-500 dark:text-slate-400 text-left' :
                                'text-red-400 dark:text-red-300 text-left'
                                }`}>
                                {msg.sender === "user" ? "Anda" : msg.sender === "ai" ? selectedCharacter.name : "Sistem"}
                              </small>
                            </div>
                            {msg.sender === "user" && (
                              <img
                                src={msg.avatar}
                                alt="User Avatar"
                                onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-1.jpg"; }}
                                className="w-8 h-8 rounded-full ml-2 sm:ml-3 border-2 border-sky-500 object-cover self-start flex-shrink-0"
                              />
                            )}
                          </div>
                        ))}
                        {isChatting && chatMessages.length > 0 && chatMessages[chatMessages.length - 1]?.sender === 'user' && (
                          <div className="flex items-end justify-start">
                            <img
                              src={selectedCharacter.characterImageUrl}
                              alt="AI Avatar Typing"
                              onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-0.jpg"; }}
                              className="w-8 h-8 rounded-full mr-2 sm:mr-3 border-2 border-teal-500 object-cover self-start flex-shrink-0"
                            />
                            <div className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 p-3 rounded-xl shadow-sm max-w-[85%] sm:max-w-[75%] rounded-bl-none">
                              <Icon icon="svg-spinners:3-dots-scale" className="text-xl" />
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 text-center py-10 text-sm">
                        {isChatting && selectedCharacter ? `${selectedCharacter.name} sedang menyiapkan respons...` : `Mulai obrolan dengan ${selectedCharacter.name}!`}
                      </p>
                    )}
                  </SimpleBar>

                  <form onSubmit={handleSendMessage} className="mt-auto space-y-3 shrink-0">
                    <InputGroup
                      id="userPrompt"
                      type="textarea"
                      placeholder={`Ketik pesan Anda ke ${selectedCharacter.name}... (Shift+Enter untuk baris baru)`}
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      rows="3"
                      prepend={<Icon icon="ph:chat-circle-text-duotone" className="text-slate-400 dark:text-slate-500 text-lg self-start mt-3 ml-1" />}
                      className={inputBaseClass + " focus-within:ring-teal-500 focus-within:border-teal-500"}
                      inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3 resize-none min-h-[60px] max-h-[120px]"
                      disabled={isChatting || isSearching}
                      required
                    />
                    <Button
                      type="submit"
                      text={
                        isChatting ? (
                          <span className="flex items-center justify-center">
                            <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" />
                            Mengirim...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <Icon icon="ph:paper-plane-tilt-duotone" className="mr-1.5 text-lg" />
                            Kirim
                          </span>
                        )
                      }
                      className={buttonPrimaryClass}
                      disabled={isChatting || isSearching || !userPrompt.trim()}
                    />
                  </form>
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default CaiAiChatPage;