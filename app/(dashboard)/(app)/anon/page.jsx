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
  skipChat,
  partnerFound,
  noPartner,
  receiveMessage,
  chatSkipped,
  chatEnded,
} from "@/components/partials/app/anon/store";

let socket;

const AnonymousChatPage = () => {
  const dispatch = useDispatch();
  const anonymousChat = useSelector((state) => state.anonymousChat || {});

  const {
    nickname: reduxNickname = "",
    partner: reduxPartner = null,
    messages = [],
    isConnecting = false,
  } = anonymousChat;

  const [message, setMessage] = useState("");
  const [localNicknameInput, setLocalNicknameInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [currentChatPartner, setCurrentChatPartner] = useState(null);
  const [showUserListLoader, setShowUserListLoader] = useState(false); // State untuk loading spinner daftar pengguna
  const messagesEndRef = useRef(null);
  const initialAutoOnlineAttempted = useRef(false); // Untuk memastikan auto-online hanya dicoba sekali

  // 1. Efek untuk otomatis online jika nickname sudah ada di Redux saat page load
  useEffect(() => {
    if (reduxNickname && !isOnline && !initialAutoOnlineAttempted.current) {
      initialAutoOnlineAttempted.current = true;
      setLocalNicknameInput(reduxNickname); // Sinkronkan input (meskipun mungkin tidak terlihat)
      setIsOnline(true); // Set status online
      // Logika koneksi socket akan ditangani oleh useEffect berikutnya yang bergantung pada `isOnline` dan `reduxNickname`
      // Tampilkan loader jika kita akan online dan belum ada user
      if (onlineUsers.length === 0 && !currentChatPartner && !isConnecting) {
        setShowUserListLoader(true);
      }
    }
  }, [reduxNickname, isOnline, onlineUsers.length, currentChatPartner, isConnecting]);


  // 2. Efek untuk inisialisasi socket, event listeners, dan koneksi
  useEffect(() => {
    const protocol = apiConfig.DOMAIN_URL.includes('localhost') ? 'http' : 'https';
    const socketUrl = `${protocol}://${apiConfig.DOMAIN_URL}`;

    socket = io(socketUrl, {
      path: "/api/socket",
      addTrailingSlash: false,
      autoConnect: false, // Kita akan connect secara manual
    });

    socket.on("connect", () => {
      if (isOnline && reduxNickname) {
        socket.emit("goOnline", { nickname: reduxNickname });
      }
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users.filter(user => user.nickname !== reduxNickname));
      setShowUserListLoader(false); // Sembunyikan loader setelah daftar pengguna diterima
    });

    socket.on("chatInvitation", (data) => {
      const confirmed = window.confirm(`${data.from} mengundang Anda untuk chat. Terima?`);
      if (confirmed) {
        socket.emit("acceptChatInvitation", { from: reduxNickname, to: data.from });
        dispatch(partnerFound(data.from));
        setCurrentChatPartner(data.from);
        setShowUserListLoader(false); // Sembunyikan loader jika ada interaksi chat
        toast.success(`Anda menerima undangan dari ${data.from}!`);
      } else {
        socket.emit("rejectChatInvitation", { from: reduxNickname, to: data.from });
        toast.info(`Anda menolak undangan dari ${data.from}.`);
      }
    });

    socket.on("chatInvitationAccepted", (data) => {
      toast.success(`${data.partner} menerima undangan chat!`);
      dispatch(partnerFound(data.partner));
      setCurrentChatPartner(data.partner);
      setShowUserListLoader(false);
    });

    socket.on("chatInvitationRejected", (data) => {
      toast.error(`${data.partner} menolak undangan chat.`);
    });

    socket.on("partnerFound", (data) => {
      toast.success(`Terhubung dengan ${data.partner}!`);
      dispatch(partnerFound(data.partner));
      setCurrentChatPartner(data.partner);
      setShowUserListLoader(false);
    });

    socket.on("noPartner", (data) => {
      toast.warn(data.message);
      dispatch(noPartner());
      setCurrentChatPartner(null);
      // Jangan sembunyikan loader di sini, biarkan logic loader utama yang mengontrol
    });

    socket.on("message", (data) => dispatch(receiveMessage(data)));

    socket.on("chatSkipped", (data) => {
      toast.info(data.message);
      dispatch(chatSkipped());
      setCurrentChatPartner(null);
      // Jika kembali ke state menunggu pengguna, dan tidak ada pengguna, tampilkan loader
      if (isOnline && reduxNickname && onlineUsers.length === 0 && !isConnecting) {
        setShowUserListLoader(true);
      }
    });

    socket.on("partnerDisconnected", () => {
      toast.info("Partner Anda telah terputus.");
      dispatch(chatEnded());
      setCurrentChatPartner(null);
      if (isOnline && reduxNickname && onlineUsers.length === 0 && !isConnecting) {
        setShowUserListLoader(true);
      }
    });

    socket.on("disconnect", () => {
      // Tidak secara otomatis setIsOnline(false) di sini,
      // karena 'disconnect' bisa terjadi karena masalah jaringan sementara.
      // Status 'isOnline' lebih baik dikontrol oleh aksi pengguna (Go Offline)
      // atau jika server secara eksplisit menandakan pengguna offline.
      // dispatch(chatEnded()); // Mungkin tidak perlu, tergantung flow aplikasi
    });

    // Koneksi socket jika `isOnline` dan `reduxNickname` sudah siap
    if (isOnline && reduxNickname) {
      if (!socket.connected) {
        socket.connect();
      }
      // Tampilkan loader jika kita online, punya nickname, belum ada user lain, dan belum ada partner
      // Dan loader belum false karena "onlineUsers" event.
      if (onlineUsers.length === 0 && !currentChatPartner && !isConnecting && !socket.listeners("onlineUsers").length) {
         // Cek apakah listener onlineUsers sudah ada. Jika belum, berarti kita masih menunggu panggilan pertama.
         // Atau gunakan state yang lebih eksplisit jika perlu.
         // Untuk kasus ini, showUserListLoader sudah di-set true oleh useEffect pertama atau handleGoOnline.
      }
    } else {
      // Jika tidak seharusnya online (misalnya, isOnline false)
      if (socket.connected) {
        socket.emit("goOffline");
        socket.disconnect();
      }
    }

    return () => {
      if (socket) {
        socket.emit("goOffline"); // Pastikan emit sebelum disconnect
        socket.disconnect();
        // Bersihkan semua listener untuk menghindari memory leak
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
  }, [isOnline, reduxNickname, dispatch]); // Jalankan ulang jika status online atau nickname berubah

  // 3. Efek untuk scroll ke pesan terakhir
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 4. Efek untuk mengontrol loader utama berdasarkan kondisi
  useEffect(() => {
    if (isOnline && reduxNickname && onlineUsers.length === 0 && !currentChatPartner && !isConnecting) {
      // Jika kondisi untuk menampilkan loader terpenuhi, set true
      // Cek juga apakah kita tidak sedang dalam proses mendapatkan partner dari undangan (meskipun ini harusnya sudah dihandle currentChatPartner)
      setShowUserListLoader(true);
    } else {
      // Jika kondisi tidak terpenuhi (misal, ada user, ada partner, atau tidak online), sembunyikan loader
      setShowUserListLoader(false);
    }
  }, [isOnline, reduxNickname, onlineUsers.length, currentChatPartner, isConnecting]);


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

    // Tampilkan loader jika kita akan online dan belum ada user lain & partner
    if (onlineUsers.length === 0 && !currentChatPartner && !isConnecting) {
      setShowUserListLoader(true);
    }

    // useEffect akan menangani koneksi socket jika isOnline dan reduxNickname diset
    if (socket && !socket.connected) {
        socket.connect(); // Pastikan connect dipanggil jika belum
    } else if (socket && socket.connected) {
        // Jika sudah connected (misalnya dari auto-reconnect), langsung emit goOnline
        socket.emit("goOnline", { nickname: nicknameToSet });
    }
    toast.success(`Anda sekarang online sebagai ${nicknameToSet}!`);
  };

  const handleGoOffline = () => {
    if (socket) socket.emit("goOffline");
    setIsOnline(false);
    // dispatch(setReduxNickname("")); // Opsional: reset nickname di Redux
    setOnlineUsers([]);
    setCurrentChatPartner(null);
    dispatch(chatSkipped()); // Atau chatEnded()
    setShowUserListLoader(false); // Sembunyikan loader saat offline
    toast.info("Anda sekarang offline.");
    if (socket && socket.connected) { // Pastikan disconnect jika masih connected
        socket.disconnect();
    }
  };

  const handleStartRandomChat = () => {
    if (!isOnline) { toast.warn("Anda harus online terlebih dahulu."); return; }
    if (currentChatPartner || reduxPartner) { toast.info("Anda sudah dalam obrolan. Lewati dulu."); return; }
    dispatch(startChat()); // Ini akan set isConnecting = true
    socket.emit("startChat", { nickname: reduxNickname });
    toast.info("Mencari pasangan acak...");
    setShowUserListLoader(false); // Sembunyikan loader pengguna jika mulai mencari partner
  };

  const handleInviteUser = (targetUser) => {
    if (!isOnline) { toast.warn("Anda harus online terlebih dahulu."); return; }
    if (currentChatPartner || reduxPartner) { toast.info("Anda sudah dalam obrolan. Lewati dulu."); return; }
    socket.emit("inviteToChat", { from: reduxNickname, to: targetUser.nickname });
    toast.info(`Mengundang ${targetUser.nickname} untuk chat...`);
    // Tidak perlu set isConnecting di sini, server akan merespon dengan partnerFound atau tidak
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const partnerToMessage = currentChatPartner || reduxPartner;
    if (!partnerToMessage) { toast.warn("Tidak ada partner chat aktif."); return; }
    const messageData = { message: message.trim(), from: "me", timestamp: new Date().toISOString() };
    dispatch(sendReduxMessage(messageData));
    socket.emit("sendMessage", { message: message.trim(), to: partnerToMessage });
    setMessage("");
  };

  const handleSkipChat = () => {
    if (!currentChatPartner && !reduxPartner && !isConnecting) { toast.info("Tidak dalam obrolan atau mencari partner."); return; }
    dispatch(skipChat()); // Ini akan set isConnecting = false, partner = null
    socket.emit("skipChat");
    setCurrentChatPartner(null); // Pastikan state lokal juga update
    // Jika setelah skip, kita kembali ke kondisi menunggu pengguna dan tidak ada pengguna, tampilkan loader.
    // Ini akan dihandle oleh useEffect ke-4.
  };

  const partnerDisplayName = currentChatPartner || reduxPartner;

  // Styling Variables
  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonPrimaryClass = "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center text-sm";
  const buttonDestructiveClass = "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all text-xs sm:text-sm flex items-center justify-center";
  const cardBaseClass = "w-full border border-emerald-500/30 dark:border-emerald-600/40 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-70 dark:bg-opacity-70";
  const cardHeaderBaseClass = "p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/60";
  const cardTitleBaseClass = "text-md sm:text-lg font-semibold text-emerald-700 dark:text-emerald-300";
  const cardIconWrapperBaseClass = "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shrink-0";


  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-black' : 'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Kolom Kiri: Pengaturan & Daftar Pengguna Online */}
          <Card bodyClass="p-0 h-full overflow-hidden" className={`${cardBaseClass} lg:col-span-1`}>
            <div className={cardHeaderBaseClass}>
                <div className="flex items-center space-x-3">
                    <div className={cardIconWrapperBaseClass}><Icon icon="ph:users-three-duotone" className="text-xl sm:text-2xl" /></div>
                    <h4 className={cardTitleBaseClass}>Pengguna Online ({onlineUsers.length})</h4>
                </div>
            </div>
            <SimpleBar className="h-full" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              <div className="p-4 sm:p-5 space-y-4">
                <div className="mb-4">
                  {!isOnline || !reduxNickname ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Icon icon="ph:user-circle-duotone" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg"/>
                        <Textinput id="nickname" type="text" placeholder="Masukkan nama panggilan..." value={localNicknameInput} onChange={handleNicknameInputChange} className={`${inputBaseClass} pl-10`} />
                      </div>
                      <Button text="Go Online" icon="ph:wifi-high-duotone" className={`${buttonPrimaryClass} w-full`} onClick={handleGoOnline} iconClassName="mr-2"/>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                        <Icon icon="ph:check-circle-duotone" className="text-emerald-600 dark:text-emerald-400 mr-2 text-lg" />
                        <span className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">Online sebagai: {reduxNickname}</span>
                      </div>
                      <Button text="Go Offline" icon="ph:wifi-slash-duotone" className={`${buttonDestructiveClass} w-full text-xs py-2`} onClick={handleGoOffline} iconClassName="mr-2"/>
                    </div>
                  )}
                </div>

                {isOnline && reduxNickname && (
                  <Button
                    text={ isConnecting ? "Mencari..." : "Chat Acak"}
                    icon={isConnecting ? "svg-spinners:ring-resize" : "ph:shuffle-duotone"}
                    className={`${buttonPrimaryClass} w-full mb-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600`}
                    onClick={handleStartRandomChat}
                    disabled={isConnecting || !!partnerDisplayName}
                    iconClassName="mr-2"
                  />
                )}

                <div className="space-y-2.5">
                  {/* Bagian untuk menampilkan loader atau daftar pengguna */}
                  {showUserListLoader && isOnline && reduxNickname && onlineUsers.length === 0 && !partnerDisplayName && !isConnecting ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-10 px-3 flex flex-col items-center justify-center min-h-[150px]"> {/* Tambahkan min-h untuk ruang */}
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
                      <p className="text-sm">Online untuk melihat pengguna lain.</p>
                    </div>
                  ) : (
                    onlineUsers.map((user) => (
                      <div key={user.id || user.nickname} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/70 shadow-sm hover:shadow-md transition-shadow duration-150">
                        <div className="flex items-center min-w-0">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mr-2.5 shrink-0">
                            <Icon icon="ph:user-duotone" className="text-md" />
                          </div>
                          <span className="text-slate-700 dark:text-slate-200 text-sm font-medium truncate" title={user.nickname}>{user.nickname}</span>
                        </div>
                        <Button
                          text="Undang"
                          icon="ph:paper-plane-tilt-duotone"
                          className="py-1 px-2.5 text-[11px] bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-500 rounded-md shadow-sm hover:shadow-md transition-all flex items-center justify-center" // Menggunakan kelas inline seperti di kode asli
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

          {/* Kolom Kanan: Area Chat */}
          <Card bodyClass="p-0 h-full flex flex-col" className={`${cardBaseClass} lg:col-span-2`}>
            <div className={cardHeaderBaseClass}>
                <div className="flex items-center space-x-3">
                    <div className={cardIconWrapperBaseClass}><Icon icon="ph:chats-teardrop-duotone" className="text-xl sm:text-2xl" /></div>
                    <h4 className={cardTitleBaseClass}>Obrolan Anonim</h4>
                </div>
                {partnerDisplayName && (
                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-[calc(2.5rem+0.75rem)] sm:ml-[calc(2.5rem+0.75rem)]">
                        Terhubung dengan: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{partnerDisplayName}</span>
                    </p>
                )}
            </div>
            
            {/* Area Pesan */}
            <div className="flex-grow overflow-hidden p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/30">
                <SimpleBar className="h-full max-h-[calc(100vh-380px)]" style={{height: '100%'}}>
                {!partnerDisplayName && !isConnecting ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-6">
                        <Icon icon="ph:chat-circle-dots-duotone" className="text-6xl opacity-50 mb-4" />
                        <p className="text-md sm:text-lg mb-1">Belum ada obrolan aktif.</p>
                        <p className="text-xs sm:text-sm">{isOnline && reduxNickname ? "Pilih pengguna dari daftar atau mulai chat acak." : "Online terlebih dahulu untuk memulai obrolan."}</p>
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
                        <div className={`max-w-[70%] sm:max-w-[60%] px-3 py-2 rounded-xl shadow-sm ${
                            msg.from === "me"
                            ? "bg-emerald-500 text-white rounded-br-none"
                            : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-600"
                        }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-emerald-100 dark:text-emerald-300/80 text-right' : 'text-slate-400 dark:text-slate-500 text-left'}`}>
                                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                    </div>
                )}
                </SimpleBar>
            </div>

            {/* Input Pesan */}
            { (isOnline && reduxNickname) && (
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
                <div className="relative flex-grow">
                    <Icon icon="ph:chat-centered-text-duotone" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg" />
                    <Textinput id="message" type="text" placeholder="Ketik pesan..." value={message} onChange={handleMessageChange} className={`${inputBaseClass} pl-10 pr-12 py-2.5`} disabled={!partnerDisplayName && !isConnecting}/>
                </div>
                <Button text={<Icon icon="ph:paper-plane-tilt-fill" />} className={`${buttonPrimaryClass} px-4 py-2.5`} type="submit" disabled={!partnerDisplayName && !isConnecting} iconClassName="text-lg" />
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