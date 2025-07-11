"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InputGroup from "@/components/ui/InputGroup";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const AIGIRL_API_BASE = "/api/ai/aigirl";

const AiGirlChatPage = () => {
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

  const callAiGirlApi = async (url, method = "GET", bodyPayload = null) => {
    const isChatActionCall = url.includes("action=chat");
    const isSearchActionCall = url.includes("action=search");

    if (isChatActionCall) setIsChatting(true);
    else if (isSearchActionCall) setIsSearching(true);

    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };
      if (bodyPayload) {
        options.body = JSON.stringify(bodyPayload);
      }
      const response = await fetch(url, options);
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        if (response.ok) {
          toast.error("Respons dari server tidak dalam format JSON yang diharapkan.");
          return { success: false, message: "Respons dari server tidak dalam format JSON yang diharapkan." };
        }
        const errorText = response.statusText || `Operasi gagal dengan status: ${response.status}`;
        toast.error(errorText);
        return { success: false, message: errorText };
      }

      if (response.ok) {
        if (isChatActionCall) {
          if (responseData && typeof responseData.textContent === 'string') {
            return { success: true, data: responseData, message: "Chat response received." };
          } else {
            toast.error("Format respons chat tidak sesuai (textContent hilang atau bukan string).");
            return { success: false, message: "Format respons chat tidak sesuai (textContent hilang atau bukan string)." };
          }
        } else {
          if (responseData.success) {
            const payload = responseData.body !== undefined ? responseData.body : responseData.data;
            if (payload === undefined || payload === null) {
              return { success: true, data: null, message: responseData.message || "Operasi berhasil tanpa data payload." };
            } else {
              return { success: true, data: payload, message: responseData.message || "Operasi berhasil." };
            }
          } else {
            toast.error(responseData.message || "Operasi gagal menurut server.");
            return { success: false, message: responseData.message || "Operasi gagal menurut server." };
          }
        }
      } else {
        const errorMsg = responseData?.message || `Operasi gagal dengan status: ${response.status} ${response.statusText}`;
        toast.error(errorMsg);
        return { success: false, message: errorMsg };
      }
    } catch (err) {
      console.error("AI Girl API call error:", err);
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

    const apiResponse = await callAiGirlApi(`${AIGIRL_API_BASE}?action=search&query=${encodeURIComponent(searchTerm)}`);
    
    // Clear the search input after initiating the search
    setSearchTerm("");

    if (apiResponse.success) {
      if (Array.isArray(apiResponse.data)) {
        const formattedResults = apiResponse.data.map(char => ({
          id: char.model,
          name: char.title,
          description: char.description ? char.description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() : 'Tidak ada deskripsi.',
          characterImageUrl: char.meta?.image || char.image || "/assets/images/users/user-0.jpg",
          chatSessionCount: char.meta?.chatSessionCount || 0,
          createdBy: char.meta?.createdBy || 'Tidak diketahui',
        }));
        setSearchResults(formattedResults);
        if (formattedResults.length === 0) {
          toast.info("Tidak ada karakter yang ditemukan.");
        } else {
          toast.success(`${formattedResults.length} karakter ditemukan!`);
        }
      } else if (apiResponse.data === null || apiResponse.data === undefined) {
        toast.info(apiResponse.message || "Tidak ada karakter yang ditemukan.");
        setSearchResults([]);
      } else {
        toast.error("Format respons pencarian tidak sesuai (bukan array).");
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectCharacter = (character) => {
    setSelectedCharacter(character);
    setChatMessages([]);
    toast.info(`Anda memilih ${character.name}. Sekarang Anda bisa mulai mengobrol!`);
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
    setUserPrompt(""); // Clear the input immediately after sending

    setChatMessages((prevMessages) => [
      ...prevMessages, {
        id: Date.now(),
        sender: "user",
        text: currentPrompt,
        avatar: "/assets/images/users/user-1.jpg",
      },
    ]);

    const apiResponse = await callAiGirlApi(
      `${AIGIRL_API_BASE}?action=chat&char_id=${selectedCharacter.id}&prompt=${encodeURIComponent(currentPrompt)}`,
      "GET"
    );

    if (apiResponse.success && apiResponse.data && typeof apiResponse.data.textContent === 'string') {
      setChatMessages((prevMessages) => [
        ...prevMessages, {
          id: Date.now() + 1,
          sender: "ai",
          text: apiResponse.data.textContent.replace(/<\/?em>/g, ''),
          avatar: selectedCharacter.characterImageUrl || "/assets/images/users/user-0.jpg",
        },
      ]);
    } else {
       if(!apiResponse.message?.includes("textContent hilang")){
         toast.error(apiResponse.message || "Gagal mendapatkan respons dari AI atau format respons tidak sesuai.");
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
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:robot-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Ai Girl Chat
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-14 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Temukan karakter AI favoritmu dan mulai percakapan seru!
            </p>
          </div>

          <SimpleBar className="h-full max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                  <Icon icon="ph:user-magnifying-glass-duotone" className="mr-2 text-xl" />
                  Cari AI Girl
                </h3>
                <form onSubmit={handleSearchCharacter} className="space-y-4">
                  <InputGroup
                    id="searchCharacter"
                    type="text"
                    placeholder="Ketik nama karakter... (Contoh: Yuri)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    prepend={<Icon icon="ph:magnifying-glass-duotone" className="text-slate-400 dark:text-slate-500 text-lg" />}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500"
                    inputClassName="text-sm bg-transparent"
                    required
                  />
                  <Button
                    type="submit"
                    text={
                      isSearching ? (
                        <span className="flex items-center justify-center">
                          <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                          Mencari Karakter...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                          Cari
                        </span>
                      )
                    }
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm"
                    disabled={isSearching}
                  />
                </form>

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
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 flex items-center">
                    <Icon icon="ph:chat-dots-duotone" className="mr-2 text-xl" />
                    Ngobrol dengan: {selectedCharacter.name}
                  </h3>
                  <SimpleBar className="h-72 pr-1 mb-4">
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
                        {isChatting && chatMessages[chatMessages.length -1]?.sender === 'user' && (
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
                      <p className="text-slate-500 dark:text-slate-400 text-center py-10">
                        {isChatting && selectedCharacter ? `${selectedCharacter.name} sedang menyiapkan respons...` : `Ayo mulai obrolan pertama Anda dengan ${selectedCharacter.name}!`}
                      </p>
                    )}
                  </SimpleBar>

                  <form onSubmit={handleSendMessage} className="space-y-3">
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
                      className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500"
                      inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3 resize-none"
                      disabled={isChatting}
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
                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm disabled:opacity-70"
                      disabled={isChatting || !userPrompt.trim()}
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

export default AiGirlChatPage;