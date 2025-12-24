"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InputGroup from "@/components/ui/InputGroup";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const CHATGPT_AI_API_BASE = "/api/ai/chatgpt";

const AiChatgptPage = () => {
  const [chatMessages, setChatMessages] = useState([]);
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  const messagesEndRef = useRef(null);

  const defaultAiCharacter = {
    id: "chatgpt-default",
    name: "ChatGPT",
    characterImageUrl: "/assets/images/users/user-2.jpg",
  };

  const userAvatarUrl = "/assets/images/users/user-1.jpg";

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    setChatMessages([
      {
        id: "initial-ai-greeting",
        sender: "ai",
        text: "Halo! Saya AI Assistant Anda. Ada yang bisa saya bantu hari ini?",
        avatar: defaultAiCharacter.characterImageUrl,
      },
    ]);
  }, []);

  const callChatgptApi = async (url, method = "GET", body = null) => {
    setLoading(true);
    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(url, options);
      const data = await response.json();

      if (data.result || response.ok) {
        return { success: true, data: data };
      } else {
        toast.error(data.message || "Operasi gagal dari API.");
        return { success: false, message: data.message || "Operasi gagal dari API." };
      }
    } catch (err) {
      console.error("ChatGPT API call error:", err);
      toast.error("Terjadi kesalahan jaringan atau server.");
      return { success: false, message: "Terjadi kesalahan jaringan atau server." };
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userPrompt.trim()) {
      toast.warn("Pesan tidak boleh kosong.");
      return;
    }

    const currentPrompt = userPrompt;
    setUserPrompt("");

    setChatMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now(),
        sender: "user",
        text: currentPrompt,
        avatar: userAvatarUrl,
      },
    ]);

    setIsChatting(true);
    const data = await callChatgptApi(
      `${CHATGPT_AI_API_BASE}?prompt=${encodeURIComponent(currentPrompt)}`,
      "GET"
    );
    setIsChatting(false);

    if (data.success && data.data && data.data.result) {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: data.data.result,
          avatar: defaultAiCharacter.characterImageUrl,
        },
      ]);
    } else {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now() + 1,
          sender: "system",
          text: data.message || "Maaf, saya tidak dapat memproses permintaan Anda saat ini.",
          avatar: defaultAiCharacter.characterImageUrl,
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
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:robot-duotone" className="text-2xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                AI Assistant (ChatGPT)
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Tanyakan apapun kepada AI Assistant kami!
            </p>
          </div>

          <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/30 flex flex-col h-[calc(100vh-220px)] md:h-[calc(100vh-190px)]">
            <SimpleBar className="flex-grow pr-1 mb-4 overflow-y-auto">
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
                          alt={msg.sender === "ai" ? "AI Avatar" : "System Avatar"}
                          className={`w-8 h-8 rounded-full mr-2 sm:mr-3 border-2 shadow-sm ${
                            msg.sender === "ai" ? "border-emerald-400" : "border-red-400"
                          }`}
                        />
                      )}
                      <div
                        className={`p-2.5 sm:p-3 rounded-lg shadow-md max-w-[75%] sm:max-w-[70%] md:max-w-[65%] ${
                          msg.sender === "user"
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-none"
                            : msg.sender === "ai"
                            ? "bg-white text-slate-800 rounded-bl-none dark:bg-slate-700 dark:text-slate-100"
                            : "bg-red-100 text-red-700 rounded-bl-none dark:bg-red-900/50 dark:text-red-200"
                        }`}
                      >
                        <p className="break-words text-sm">{msg.text}</p>
                        {(msg.sender === "user" || msg.sender === "ai") && (
                           <small className={`text-xs opacity-80 mt-1.5 block ${msg.sender === "user" ? 'text-emerald-100 text-right' : 'text-slate-500 dark:text-slate-400 text-left'}`}>
                            {msg.sender === "user" ? "Anda" : defaultAiCharacter.name}
                          </small>
                        )}
                      </div>
                      {msg.sender === "user" && (
                        <img
                          src={msg.avatar}
                          alt="User Avatar"
                          className="w-8 h-8 rounded-full ml-2 sm:ml-3 border-2 border-teal-500 shadow-sm"
                        />
                      )}
                    </div>
                  ))}
                  {isChatting && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].sender === 'user' && (
                    <div className="flex items-end justify-start">
                      <img
                        src={defaultAiCharacter.characterImageUrl}
                        alt="AI Avatar Typing"
                        className="w-8 h-8 rounded-full mr-2 sm:mr-3 border-2 border-emerald-400"
                      />
                      <div className="bg-white text-slate-800 p-2.5 sm:p-3 rounded-lg shadow-md max-w-[70%] animate-pulse rounded-bl-none dark:bg-slate-700 dark:text-slate-100">
                        <p className="text-sm italic">AI sedang mengetik...</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center italic py-10">
                  Belum ada pesan. Mulai percakapan!
                </p>
              )}
            </SimpleBar>

            <form onSubmit={handleSendMessage} className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700/60">
              <InputGroup
                id="userPrompt"
                type="textarea"
                placeholder={`Ketik pesan Anda ke ${defaultAiCharacter.name}...`}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows="2"
                className="bg-white border-slate-300 text-slate-900 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm p-2.5"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !loading && userPrompt.trim()) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <Button
                type="submit"
                text={
                  loading ? (
                    <span className="flex items-center justify-center">
                      <Icon icon="svg-spinners:ring-resize" className="mr-2 text-base" />
                      Memproses...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Icon icon="ph:paper-plane-tilt-fill" className="mr-1.5 sm:mr-2 text-base" />
                      Kirim
                    </span>
                  )
                }
                className="w-full mt-2 sm:mt-3 text-white bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 rounded-lg py-2.5 sm:py-2.5 font-medium transition-all duration-300 transform hover:scale-[1.01] shadow-md hover:shadow-lg"
                disabled={loading || !userPrompt.trim()}
              />
            </form>
          </div>
        </Card>
      </div>
    </>
  );
};

export default AiChatgptPage;