"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SimpleBar from "simplebar-react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import io from "socket.io-client";
import apiConfig from "@/configs/apiConfig";

import {
  setNickname as setReduxNickname,
  startChat,
  sendMessage as sendReduxMessage,
  chatSkipped, // Corrected import from 'skipChat' to 'chatSkipped'
  partnerFound,
  noPartner,
  receiveMessage,
  chatEnded,
} from "@/components/partials/app/anon/store";

let socket; // Declared outside to persist across renders but managed in useEffect

const AnonymousChatPage = () => {
  const dispatch = useDispatch();
  const anonymousChat = useSelector((state) => state.anonymousChat || {});

  const {
    nickname: reduxNickname = "",
    partner: reduxPartner = null, // Rely primarily on reduxPartner
    messages = [],
    isConnecting = false, // True when searching for a partner
  } = anonymousChat;

  const [message, setMessage] = useState("");
  const [localNicknameInput, setLocalNicknameInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [showUserListLoader, setShowUserListLoader] = useState(false);
  const messagesEndRef = useRef(null);
  const initialAutoOnlineAttempted = useRef(false);

  // 1. Auto-online if nickname exists in Redux on page load
  useEffect(() => {
    if (reduxNickname && !isOnline && !initialAutoOnlineAttempted.current) {
      initialAutoOnlineAttempted.current = true;
      setLocalNicknameInput(reduxNickname);
      setIsOnline(true);
      // Show loader if we are going online and no other users or partner are found yet
      if (onlineUsers.length === 0 && !reduxPartner && !isConnecting) {
        setShowUserListLoader(true);
      }
    }
  }, [reduxNickname, isOnline, onlineUsers.length, reduxPartner, isConnecting]);

  // 2. Socket initialization and event listeners
  useEffect(() => {
    const protocol = apiConfig.DOMAIN_URL.includes("localhost") ? "http" : "https";
    const socketUrl = `${protocol}://${apiConfig.DOMAIN_URL}`;

    // Initialize socket only if it hasn't been initialized or needs to be re-initialized
    if (!socket) {
      socket = io(socketUrl, {
        path: "/api/socket",
        addTrailingSlash: false,
        autoConnect: false, // We'll connect manually
      });
    }

    // Connect/disconnect based on isOnline and reduxNickname
    if (isOnline && reduxNickname && !socket.connected) {
      socket.connect();
      socket.emit("goOnline", { nickname: reduxNickname });
    } else if (!isOnline && socket.connected) {
      socket.emit("goOffline");
      socket.disconnect();
    }

    // Event listeners
    socket.on("connect", () => {
      // Re-emit goOnline in case of a reconnect
      if (isOnline && reduxNickname) {
        socket.emit("goOnline", { nickname: reduxNickname });
      }
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users.filter((user) => user.nickname !== reduxNickname));
      // Hide loader if users are received and no chat is active
      if (!reduxPartner && !isConnecting) {
        setShowUserListLoader(false);
      }
    });

    socket.on("chatInvitation", (data) => {
      const confirmed = window.confirm(`${data.from} mengundang Anda untuk chat. Terima?`);
      if (confirmed) {
        socket.emit("acceptChatInvitation", { from: reduxNickname, to: data.from });
        dispatch(partnerFound(data.from));
        toast.success(`Anda menerima undangan dari ${data.from}!`);
      } else {
        socket.emit("rejectChatInvitation", { from: reduxNickname, to: data.from });
        toast.info(`Anda menolak undangan dari ${data.from}.`);
      }
    });

    socket.on("chatInvitationAccepted", (data) => {
      toast.success(`${data.partner} menerima undangan chat!`);
      dispatch(partnerFound(data.partner));
    });

    socket.on("chatInvitationRejected", (data) => {
      toast.error(`${data.partner} menolak undangan chat.`);
    });

    socket.on("partnerFound", (data) => {
      toast.success(`Terhubung dengan ${data.partner}!`);
      dispatch(partnerFound(data.partner));
      setShowUserListLoader(false); // Hide loader when partner is found
    });

    socket.on("noPartner", (data) => {
      toast.warn(data.message);
      dispatch(noPartner());
      // Re-evaluate loader state as we are back to waiting for a partner
      // The main loader useEffect handles this.
    });

    socket.on("message", (data) => dispatch(receiveMessage(data)));

    socket.on("chatSkipped", (data) => {
      toast.info(data.message);
      dispatch(chatSkipped());
      // Re-evaluate loader state as we are back to waiting for a partner
      // The main loader useEffect handles this.
    });

    socket.on("partnerDisconnected", () => {
      toast.info("Partner Anda telah terputus.");
      dispatch(chatEnded());
      // Re-evaluate loader state as we are back to waiting for a partner
      // The main loader useEffect handles this.
    });

    socket.on("disconnect", () => {
      // Handle disconnect. isOnline is controlled by user action.
    });

    // Cleanup function
    return () => {
      if (socket) {
        // Only emit goOffline if we were actively online and not just disconnected
        if (isOnline && reduxNickname && socket.connected) {
          socket.emit("goOffline");
        }
        socket.disconnect(); // Disconnect but keep the socket instance for potential reconnect
        // Clean up all listeners to prevent memory leaks
        socket.off("connect");
        socket.off("onlineUsers");
        socket.off("chatInvitation");
        socket.off("chatInvitationAccepted");
        socket.off("chatInvitationRejected");
        socket.off("partnerFound");
        socket.off("noPartner");
        socket.off("message");
        socket.off("chatSkipped");
        socket.off("partnerDisconnected");
        socket.off("disconnect");
      }
    };
  }, [isOnline, reduxNickname, dispatch]); // Re-run if online status or nickname changes

  // 3. Effect for scrolling to the last message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 4. Effect to control the main user list loader based on online status and available users/partner
  useEffect(() => {
    // Show loader if online, have a nickname, no current partner, not connecting, and no online users yet
    if (isOnline && reduxNickname && !reduxPartner && !isConnecting && onlineUsers.length === 0) {
      setShowUserListLoader(true);
    } else {
      setShowUserListLoader(false);
    }
  }, [isOnline, reduxNickname, reduxPartner, isConnecting, onlineUsers.length]);

  const handleNicknameInputChange = (e) => setLocalNicknameInput(e.target.value);
  const handleMessageChange = (e) => setMessage(e.target.value);

  const handleGoOnline = () => {
    const nicknameToSet = localNicknameInput.trim();
    if (!nicknameToSet) {
      toast.warn("Mohon masukkan nama panggilan.");
      return;
    }
    dispatch(setReduxNickname(nicknameToSet));
    setIsOnline(true);

    // This will trigger the useEffect for socket connection
    toast.success(`Anda sekarang online sebagai ${nicknameToSet}!`);
  };

  const handleGoOffline = () => {
    if (socket) socket.emit("goOffline"); // Inform server before setting offline
    setIsOnline(false);
    // dispatch(setReduxNickname("")); // Optional: reset nickname in Redux if going truly offline
    setOnlineUsers([]);
    dispatch(chatSkipped()); // Or chatEnded() to clear partner and messages
    setShowUserListLoader(false);
    toast.info("Anda sekarang offline.");
  };

  const handleStartRandomChat = () => {
    if (!isOnline) {
      toast.warn("Anda harus online terlebih dahulu.");
      return;
    }
    if (reduxPartner) {
      toast.info("Anda sudah dalam obrolan. Lewati dulu.");
      return;
    }
    dispatch(startChat()); // This sets isConnecting = true
    socket.emit("startChat", { nickname: reduxNickname });
    toast.info("Mencari pasangan acak...");
    setShowUserListLoader(false); // Hide user list loader when searching for a partner
  };

  const handleInviteUser = (targetUser) => {
    if (!isOnline) {
      toast.warn("Anda harus online terlebih dahulu.");
      return;
    }
    if (reduxPartner) {
      toast.info("Anda sudah dalam obrolan. Lewati dulu.");
      return;
    }
    socket.emit("inviteToChat", { from: reduxNickname, to: targetUser.nickname });
    toast.info(`Mengundang ${targetUser.nickname} untuk chat...`);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!reduxPartner) {
      toast.warn("Tidak ada partner chat aktif.");
      return;
    }
    const messageData = { message: message.trim(), from: "me", timestamp: new Date().toISOString() };
    dispatch(sendReduxMessage(messageData));
    socket.emit("sendMessage", { message: message.trim(), to: reduxPartner });
    setMessage("");
  };

  const handleSkipChat = () => {
    if (!reduxPartner && !isConnecting) {
      toast.info("Tidak dalam obrolan atau mencari partner.");
      return;
    }
    // FIX: Changed from dispatch(skipChat()) to dispatch(chatSkipped())
    dispatch(chatSkipped()); // This will set isConnecting = false, partner = null
    socket.emit("skipChat");
    // Loader logic will be re-evaluated by the main loader useEffect
  };

  const partnerDisplayName = reduxPartner; // Always use reduxPartner as the primary source

  // Styling Variables
  const inputBaseClass =
    "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonPrimaryClass =
    "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center text-sm";
  const buttonDestructiveClass =
    "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all text-xs sm:text-sm flex items-center justify-center";
  const cardBaseClass =
    "w-full border border-emerald-500/30 dark:border-emerald-600/40 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-70 dark:bg-opacity-70";
  const cardHeaderBaseClass = "p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/60";
  const cardTitleBaseClass = "text-md sm:text-lg font-semibold text-emerald-700 dark:text-emerald-300";
  const cardIconWrapperBaseClass =
    "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shrink-0";

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
              ? "bg-yellow-500 text-black"
              : "bg-sky-500 text-white"
          } dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column: Settings & Online Users List */}
          <Card bodyClass="p-0 h-full overflow-hidden" className={`${cardBaseClass} lg:col-span-1`}>
            <div className={cardHeaderBaseClass}>
              <div className="flex items-center space-x-3">
                <div className={cardIconWrapperBaseClass}>
                  <Icon icon="ph:users-three-duotone" className="text-xl sm:text-2xl" />
                </div>
                <h4 className={cardTitleBaseClass}>Pengguna Online ({onlineUsers.length})</h4>
              </div>
            </div>
            <SimpleBar className="h-full" style={{ maxHeight: "calc(100vh - 220px)" }}>
              <div className="p-4 sm:p-5 space-y-4">
                <div className="mb-4">
                  {!isOnline || !reduxNickname ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Icon
                          icon="ph:user-circle-duotone"
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg"
                        />
                        <Textinput
                          id="nickname"
                          type="text"
                          placeholder="Masukkan nama panggilan..."
                          value={localNicknameInput}
                          onChange={handleNicknameInputChange}
                          className={`${inputBaseClass} pl-10`}
                        />
                      </div>
                      <Button
                        text="Go Online"
                        icon="ph:wifi-high-duotone"
                        className={`${buttonPrimaryClass} w-full`}
                        onClick={handleGoOnline}
                        iconClassName="mr-2"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                        <Icon icon="ph:check-circle-duotone" className="text-emerald-600 dark:text-emerald-400 mr-2 text-lg" />
                        <span className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                          Online sebagai: {reduxNickname}
                        </span>
                      </div>
                      <Button
                        text="Go Offline"
                        icon="ph:wifi-slash-duotone"
                        className={`${buttonDestructiveClass} w-full text-xs py-2`}
                        onClick={handleGoOffline}
                        iconClassName="mr-2"
                      />
                    </div>
                  )}
                </div>

                {isOnline && reduxNickname && (
                  <Button
                    text={isConnecting ? "Mencari..." : "Chat Acak"}
                    icon={isConnecting ? "svg-spinners:ring-resize" : "ph:shuffle-duotone"}
                    className={`${buttonPrimaryClass} w-full mb-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600`}
                    onClick={handleStartRandomChat}
                    disabled={isConnecting || !!partnerDisplayName}
                    iconClassName="mr-2"
                  />
                )}

                <div className="space-y-2.5">
                  {/* Section to display loader or user list */}
                  {showUserListLoader && isOnline && reduxNickname && onlineUsers.length === 0 && !partnerDisplayName && !isConnecting ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-10 px-3 flex flex-col items-center justify-center min-h-[150px]">
                      <Icon icon="svg-spinners:blocks-shuffle-3" className="text-5xl text-emerald-500 mb-4" />
                      <p className="text-sm font-medium">Mencari pengguna online lain...</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Harap tunggu sebentar.</p>
                    </div>
                  ) : onlineUsers.length === 0 && isOnline && reduxNickname && !partnerDisplayName && !isConnecting ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-6 px-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 min-h-[150px] flex flex-col justify-center items-center">
                      <Icon icon="ph:users-three-duotone" className="mx-auto text-4xl mb-2 opacity-50" />
                      <p className="text-sm">Tidak ada pengguna online lain saat ini.</p>
                    </div>
                  ) : !isOnline && onlineUsers.length === 0 ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-6 px-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 min-h-[150px] flex flex-col justify-center items-center">
                      <Icon icon="ph:wifi-slash-duotone" className="mx-auto text-4xl mb-2 opacity-50" />
                      <p className="text-sm">Online terlebih dahulu untuk melihat pengguna lain.</p>
                    </div>
                  ) : (
                    onlineUsers.map((user) => (
                      <div
                        key={user.id || user.nickname}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/70 shadow-sm hover:shadow-md transition-shadow duration-150"
                      >
                        <div className="flex items-center min-w-0">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mr-2.5 shrink-0">
                            <Icon icon="ph:user-duotone" className="text-md" />
                          </div>
                          <span className="text-slate-700 dark:text-slate-200 text-sm font-medium truncate" title={user.nickname}>
                            {user.nickname}
                          </span>
                        </div>
                        <Button
                          text="Undang"
                          icon="ph:paper-plane-tilt-duotone"
                          className="py-1 px-2.5 text-[11px] bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-500 rounded-md shadow-sm hover:shadow-md transition-all flex items-center justify-center"
                          onClick={() => handleInviteUser(user)}
                          disabled={isConnecting || !!partnerDisplayName || !isOnline}
                          iconClassName="mr-1 text-xs"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SimpleBar>
          </Card>

          {/* Right Column: Chat Area */}
          <Card bodyClass="p-0 h-full flex flex-col" className={`${cardBaseClass} lg:col-span-2`}>
            <div className={cardHeaderBaseClass}>
              <div className="flex items-center space-x-3">
                <div className={cardIconWrapperBaseClass}>
                  <Icon icon="ph:chats-teardrop-duotone" className="text-xl sm:text-2xl" />
                </div>
                <h4 className={cardTitleBaseClass}>Obrolan Anonim</h4>
              </div>
              {partnerDisplayName && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-[calc(2.5rem+0.75rem)] sm:ml-[calc(2.5rem+0.75rem)]">
                  Terhubung dengan: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{partnerDisplayName}</span>
                </p>
              )}
            </div>

            {/* Message Area */}
            <div className="flex-grow overflow-hidden p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/30">
              <SimpleBar className="h-full max-h-[calc(100vh-380px)]" style={{ height: "100%" }}>
                {!partnerDisplayName && !isConnecting ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-6">
                    <Icon icon="ph:chat-circle-dots-duotone" className="text-6xl opacity-50 mb-4" />
                    <p className="text-md sm:text-lg mb-1">Belum ada obrolan aktif.</p>
                    <p className="text-xs sm:text-sm">
                      {isOnline && reduxNickname ? "Pilih pengguna dari daftar atau mulai chat acak." : "Online terlebih dahulu untuk memulai obrolan."}
                    </p>
                  </div>
                ) : messages.length === 0 && partnerDisplayName ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-6">
                    <Icon icon="ph:paper-plane-tilt-duotone" className="text-6xl opacity-50 mb-4" />
                    <p className="text-md sm:text-lg mb-1">Mulai percakapan dengan {partnerDisplayName}!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] sm:max-w-[60%] px-3 py-2 rounded-xl shadow-sm ${
                            msg.from === "me"
                              ? "bg-emerald-500 text-white rounded-br-none"
                              : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.from === "me" ? "text-emerald-100 dark:text-emerald-300/80 text-right" : "text-slate-400 dark:text-slate-500 text-left"
                            }`}
                          >
                            {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </SimpleBar>
            </div>

            {/* Message Input */}
            {isOnline && reduxNickname && (
              <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
                  <div className="relative flex-grow">
                    <Icon
                      icon="ph:chat-centered-text-duotone"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg"
                    />
                    <Textinput
                      id="message"
                      type="text"
                      placeholder="Ketik pesan..."
                      value={message}
                      onChange={handleMessageChange}
                      className={`${inputBaseClass} pl-10 pr-12 py-2.5`}
                      disabled={!partnerDisplayName && !isConnecting}
                    />
                  </div>
                  <Button
                    text={<Icon icon="ph:paper-plane-tilt-fill" />}
                    className={`${buttonPrimaryClass} px-4 py-2.5`}
                    type="submit"
                    disabled={!partnerDisplayName && !isConnecting}
                    iconClassName="text-lg"
                  />
                  {(partnerDisplayName || isConnecting) && (
                    <Button
                      onClick={handleSkipChat}
                      icon="ph:arrow-bend-double-up-right-duotone"
                      className={`${buttonDestructiveClass} px-3 py-2.5 text-xs`}
                      tooltip="Lewati Obrolan"
                      disabled={isConnecting && !partnerDisplayName}
                    />
                  )}
                </form>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default AnonymousChatPage;