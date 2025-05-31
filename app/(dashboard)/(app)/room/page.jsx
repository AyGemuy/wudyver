"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InputGroup from "@/components/ui/InputGroup";
import Modal from "@/components/ui/Modal";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const RoomPage = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("az");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false); // Status loading global
  const [loadingRoomsInitial, setLoadingRoomsInitial] = useState(true); // Khusus loading awal daftar grup
  const [loadingMessages, setLoadingMessages] = useState(false); // Khusus loading pesan


  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [userProfile, setUserProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem("chatUserProfile");
      if (savedProfile) {
        try {
          return JSON.parse(savedProfile);
        } catch (e) {
          console.error("Failed to parse user profile from localStorage", e);
        }
      }
    }
    return {
      name: "",
      avatar: "/assets/images/users/user-default.png",
      bio: "",
      userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
  });

  const [newMessageText, setNewMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    fetchRooms();
    if (typeof window !== 'undefined' && (!localStorage.getItem("chatUserProfile") || !JSON.parse(localStorage.getItem("chatUserProfile") || '{}').name) ) {
        setShowProfileModal(true);
    }
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom);
    } else {
      setMessages([]);
    }
  }, [selectedRoom]);

  useEffect(() => {
    let tempRooms = [...rooms];
    if (searchTerm) {
      tempRooms = tempRooms.filter(room =>
        room.roomName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    tempRooms.sort((a, b) => {
      if (sortBy === "az") return a.roomName.localeCompare(b.roomName);
      if (sortBy === "za") return b.roomName.localeCompare(a.roomName);
      if (sortBy === "messages") return (b.messagesCount || 0) - (a.messagesCount || 0);
      return 0;
    });
    setFilteredRooms(tempRooms);
  }, [rooms, searchTerm, sortBy]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("chatUserProfile", JSON.stringify(userProfile));
    }
  }, [userProfile]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if ((replyingTo || editingMessage) && messageInputRef.current) {
      messageInputRef.current.focus();
      if (editingMessage && messageInputRef.current) {
        messageInputRef.current.value = editingMessage.message;
      } else if (messageInputRef.current) {
        messageInputRef.current.value = newMessageText;
      }
    }
  }, [replyingTo, editingMessage]);

  const callApi = async (url, method, body = null, specificLoader = null) => {
    if (specificLoader === 'messages') setLoadingMessages(true);
    else setLoading(true);

    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (body) options.body = JSON.stringify(body);
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || `Operasi gagal: Status ${response.status}`;
        toast.error(errorMessage);
        return { success: false, message: errorMessage, status: response.status };
      }

      if (data.success === false) {
          toast.error(data.message || "Operasi dilaporkan gagal oleh server.");
          return { ...data, status: response.status };
      }

      return { ...data, success: true, status: response.status };
    } catch (err) {
      console.error("API call error:", err);
      toast.error("Terjadi kesalahan jaringan atau server.");
      return { success: false, message: "Kesalahan Jaringan" };
    } finally {
      if (specificLoader === 'messages') setLoadingMessages(false);
      else setLoading(false);
      setLoadingRoomsInitial(false); // Umumnya setelah call API pertama, loading initial selesai
    }
  };

  const fetchRooms = async () => {
    setLoadingRoomsInitial(true); // Set true saat mulai fetch
    const data = await callApi("/api/rooms", "GET");
    setLoadingRoomsInitial(false); // Set false setelah selesai
    if (data.success && Array.isArray(data.data)) {
      setRooms(data.data.map(room => ({
        ...room,
        messagesCount: room.messages ? room.messages.filter(m => !m.isDeleted).length : 0
      })));
    } else {
      setRooms([]);
      if (data.success && !Array.isArray(data.data)){
        console.warn("Fetch rooms: API success but data is not an array", data);
        toast.info("Format data grup tidak sesuai.");
      }
    }
  };

  const transformMessagesReactions = (messagesFromApi) => {
    if (!Array.isArray(messagesFromApi)) return [];
    return messagesFromApi.map(msg => {
      const reactionsMap = {};
      if (msg.reactions && Array.isArray(msg.reactions)) {
        msg.reactions.forEach(reaction => {
          if (!reactionsMap[reaction.emoji]) {
            reactionsMap[reaction.emoji] = [];
          }
          reactionsMap[reaction.emoji].push(reaction.userId);
        });
      }
      return { ...msg, reactions: reactionsMap };
    });
  };

  const fetchMessages = async (roomName) => {
    const response = await callApi(`/api/rooms?roomName=${encodeURIComponent(roomName)}`, "GET", null, 'messages');
    if (response.success && Array.isArray(response.data)) {
      const transformedMessages = transformMessagesReactions(response.data);
      setMessages(transformedMessages);
      setRooms(prevRooms => prevRooms.map(room =>
        room.roomName === roomName ? { ...room, messagesCount: transformedMessages.filter(m => !m.isDeleted).length } : room
      ));
    } else {
      setMessages([]);
      if (response.success && !Array.isArray(response.data)){
        console.warn("Fetch messages: API success but data is not an array", response.data);
      }
    }
  };

  const handleSendMessageInternal = async (action, messageContent, additionalParams = {}) => {
    if (!userProfile.name.trim()) {
      toast.warn("Mohon atur nama Anda di profil terlebih dahulu!");
      setShowProfileModal(true);
      return;
    }
    if (!selectedRoom.trim() && action !== "createGroup") {
      toast.warn("Mohon pilih ruangan terlebih dahulu.");
      return;
    }
    if (action !== "deleteGroup" && action !== "deleteMessage" && action !== "toggleReaction" && !messageContent?.trim() && (action === "sendMessage" || action === "editMessage")) {
      toast.warn("Pesan tidak boleh kosong.");
      return;
    }

    const body = {
      roomName: selectedRoom,
      name: userProfile.name,
      message: messageContent,
      avatar: userProfile.avatar || "/assets/images/users/user-default.png",
      userId: userProfile.userId,
      action: action,
      ...additionalParams,
    };

    if (action === "createGroup") {
      body.roomName = additionalParams.newGroupName;
    } else if (action === "deleteGroup") {
      body.roomName = additionalParams.roomToDelete;
    }

    const data = await callApi("/api/rooms", "POST", body); // Menggunakan loading global untuk aksi POST

    if (data.success) {
      toast.success(data.message || "Aksi berhasil!");
      setNewMessageText("");
      setReplyingTo(null);
      setEditingMessage(null);
      if (messageInputRef.current) messageInputRef.current.value = "";


      if (action === "createGroup") {
        setShowCreateGroupModal(false);
        setNewGroupName("");
        await fetchRooms(); // Re-fetch rooms
        setSelectedRoom(body.roomName);
      } else if (action === "deleteGroup") {
        await fetchRooms(); // Re-fetch rooms
        if (selectedRoom === body.roomName) {
          setSelectedRoom("");
          setMessages([]);
        }
      } else if (action === "sendMessage" || action === "editMessage" || action === "deleteMessage" || action === "toggleReaction") {
        fetchMessages(selectedRoom); // Re-fetch messages for the current room
        if(action !== "toggleReaction") fetchRooms();
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const params = replyingTo ? { replyToMessageId: replyingTo._id } : {};
    handleSendMessageInternal("sendMessage", newMessageText, params);
  };

  const handleEditMessage = (e) => {
    e.preventDefault();
    if (!editingMessage) return;
    if (editingMessage.originalUserId && editingMessage.originalUserId !== userProfile.userId) {
        toast.error("Anda tidak bisa mengedit pesan pengguna lain.");
        return;
    }
    handleSendMessageInternal("editMessage", editingMessage.message, { messageId: editingMessage._id });
  };

  const handleDeleteMessage = async (message) => {
    if (message.userId !== userProfile.userId) {
        toast.error("Anda tidak bisa menghapus pesan pengguna lain.");
        return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus pesan ini?")) return;
    const payload = {
      roomName: selectedRoom,
      messageId: message._id,
      action: "deleteMessage",
      userId: userProfile.userId
    };
    const data = await callApi("/api/rooms", "POST", payload);
    if (data.success) {
      toast.success(data.message || "Pesan berhasil dihapus!");
      fetchMessages(selectedRoom);
      fetchRooms();
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    if (!userProfile.userId || !userProfile.name) {
      toast.warn("Anda perlu mengatur profil untuk memberikan reaksi!");
      setShowProfileModal(true);
      return;
    }
    const payload = {
      roomName: selectedRoom,
      messageId: messageId,
      userId: userProfile.userId,
      emoji: emoji,
      action: "toggleReaction",
    };
    // Tidak menggunakan specificLoader agar loading global tidak terlalu intrusif untuk reaksi
    const data = await callApi("/api/rooms", "POST", payload);
    if (data.success) {
        fetchMessages(selectedRoom);
    }
  };

  const handleReplyClick = (message) => {
    setReplyingTo({ _id: message._id, name: message.name, message: message.message });
    setNewMessageText("");
    setEditingMessage(null);
  };

  const handleEditClick = (message) => {
    if (message.userId !== userProfile.userId) {
        toast.error("Anda tidak dapat mengedit pesan ini.");
        return;
    }
    setEditingMessage({ _id: message._id, message: message.message, originalUserId: message.userId });
    setNewMessageText(message.message);
    setReplyingTo(null);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.warn("Nama grup tidak boleh kosong.");
      return;
    }
    handleSendMessageInternal("createGroup", null, { newGroupName: newGroupName });
  };

  const handleDeleteGroup = async (roomToDelete) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus grup "${roomToDelete}"? Ini akan menghapus semua pesannya!`)) return;
    handleSendMessageInternal("deleteGroup", null, { roomToDelete: roomToDelete });
  };

  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer
          ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'}
          dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 py-4">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center">
                <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mr-2.5 sm:mr-3 shrink-0">
                  <Icon icon="ph:chats-teardrop-duotone" className="text-xl sm:text-2xl" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500 leading-tight">
                    Obrolan Grup
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[180px] sm:max-w-xs">
                    {userProfile.name ? `Masuk sebagai: ${userProfile.name}` : "Profil belum diatur"}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 shrink-0">
                <Button
                  onClick={() => setShowProfileModal(true)}
                  icon="ph:user-circle-gear-duotone"
                  className="border border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white dark:border-teal-500/70 dark:text-teal-400 dark:hover:bg-teal-500 dark:hover:text-white text-xs p-1.5 sm:p-2 rounded-md shadow-sm transition-colors duration-150"
                  title="Atur Profil"
                />
                <Button
                  onClick={() => setShowCreateGroupModal(true)}
                  icon="ph:plus-circle-duotone"
                  className="border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-emerald-500/70 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white text-xs p-1.5 sm:p-2 rounded-md shadow-sm transition-colors duration-150"
                  title="Buat Grup Baru"
                />
              </div>
            </div>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto">
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <h3 className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center">
                  <Icon icon="ph:list-bullets-duotone" className="mr-1.5 text-base sm:text-lg" />
                  Daftar Grup
                </h3>
                <div className="w-full mb-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="ph:magnifying-glass-duotone" className="text-slate-400 dark:text-slate-500 text-sm sm:text-base" />
                    </div>
                    <input
                        id="searchRoom"
                        type="text"
                        placeholder="Cari nama grup..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
                    />
                </div>
                <div className="flex items-center space-x-2 mb-2 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md px-1.5 py-1 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 shadow-sm text-xs"
                  >
                    <option value="az">A-Z</option>
                    <option value="za">Z-A</option>
                    <option value="messages">Pesan Terbanyak</option>
                  </select>
                </div>
                <SimpleBar className="max-h-36 sm:max-h-40 overflow-y-auto -mr-1 pr-1">
                  {loadingRoomsInitial ? (
                    <div className="flex flex-col items-center justify-center p-4 min-h-[80px]">
                      <Icon icon="svg-spinners:blocks-shuffle-3" className="text-3xl text-emerald-500 mb-2" />
                      <p className="text-sm text-slate-600 dark:text-slate-300">Memuat daftar grup...</p>
                    </div>
                  ) : filteredRooms.length > 0 ? (
                    <ul className="space-y-1">
                      {filteredRooms.map((room) => (
                        <li
                          key={room._id}
                          className={`flex items-center justify-between p-1.5 sm:p-2 rounded-md cursor-pointer transition-all duration-150 group ${
                            selectedRoom === room.roomName
                              ? "bg-emerald-100 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-200 ring-1 ring-emerald-500/70 shadow-sm"
                              : "bg-white/60 dark:bg-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-600/80"
                          }`}
                          onClick={() => setSelectedRoom(room.roomName)}
                        >
                          <span className="flex items-center text-xs sm:text-sm font-medium truncate">
                            <Icon icon="ph:users-three-duotone" className="mr-1 sm:mr-1.5 text-sm text-emerald-500 dark:text-emerald-400" />
                            {room.roomName}
                          </span>
                          <div className="flex items-center space-x-1 sm:space-x-1.5">
                            <span className={`text-[10px] sm:text-xs opacity-80 ${selectedRoom === room.roomName ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                              {room.messagesCount !== undefined ? `${room.messagesCount}` : ''} <Icon icon="ph:chat-circle-dots-fill" className="inline -mt-0.5 text-[11px] sm:text-xs"/>
                            </span>
                            {selectedRoom === room.roomName && (
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(room.roomName); }}
                                icon="ph:trash-duotone"
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 dark:bg-red-500/20 dark:hover:bg-red-500/30 p-0.5 sm:p-1 rounded-md text-xs sm:text-sm opacity-70 group-hover:opacity-100 transition-opacity"
                                disabled={loading}
                                title="Hapus Grup"
                              />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 min-h-[80px] text-center">
                        {searchTerm ? (
                        <>
                            <Icon icon="ph:magnifying-glass-minus-duotone" className="text-4xl text-slate-400 dark:text-slate-500 mb-2 opacity-70"/>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Grup Tidak Ditemukan</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tidak ada grup dengan nama "{searchTerm}".</p>
                        </>
                        ) : (
                        <>
                            <Icon icon="ph:package-duotone" className="text-4xl text-slate-400 dark:text-slate-500 mb-2 opacity-70"/> {/* Mengganti ikon agar mirip DbDataPage */}
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Belum Ada Grup</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Buat grup baru atau tunggu seseorang membuatkannya.</p>
                        </>
                        )}
                    </div>
                  )}
                </SimpleBar>
                {selectedRoom && (
                  <div className="mt-2 text-center">
                    <Button
                      onClick={() => setSelectedRoom("")}
                      text="Tutup Grup"
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 text-xs py-1 px-2 rounded-md shadow-sm"
                    />
                  </div>
                )}
              </div>

              {selectedRoom && (
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col flex-grow">
                  <h3 className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center shrink-0">
                    <Icon icon="ph:chat-circle-dots-duotone" className="mr-1 sm:mr-1.5 text-base sm:text-lg" />
                    Pesan di: <span className="ml-1 font-mono text-emerald-600 dark:text-emerald-400 truncate max-w-[120px] xs:max-w-[150px] sm:max-w-xs">{selectedRoom}</span>
                  </h3>
                  <SimpleBar className="flex-grow pr-0.5 mb-2 -mr-1">
                    {loadingMessages && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[150px] flex-grow">
                            <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl sm:text-5xl text-emerald-500 mb-3" />
                            <p className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300">Memuat pesan...</p>
                        </div>
                    ): messages.length > 0 ? (
                      <div className="space-y-2">
                        {messages.map((msg) => (
                          <div key={msg._id}
                                className={`flex flex-col group ${msg.userId === userProfile.userId ? 'items-end' : 'items-start'}`}>
                            <div className={`p-1.5 sm:p-2 rounded-lg shadow-sm max-w-[85%] sm:max-w-[75%] break-words relative ${msg.userId === userProfile.userId ? 'bg-emerald-100 dark:bg-emerald-600/40 rounded-br-none' : 'bg-white dark:bg-slate-700 rounded-bl-none'} ${msg.isDeleted ? 'opacity-60 italic' : ''}`}>
                              {msg.replyTo && messages.find(m => m._id === msg.replyTo && !m.isDeleted) && !msg.isDeleted && (
                                <div className="border-l-2 border-teal-400 dark:border-teal-500 pl-1.5 mb-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 cursor-default bg-slate-50/50 dark:bg-slate-600/30 p-1 rounded-sm"
                                     title={`Membalas "${messages.find(m => m._id === msg.replyTo)?.message}"`}>
                                  Membalas <span className="font-semibold text-teal-600 dark:text-teal-300">@{messages.find(m => m._id === msg.replyTo)?.name || '...'}</span>: "
                                  <span className="italic opacity-80">{messages.find(m => m._id === msg.replyTo)?.message?.substring(0, 20) || 'Pesan asli'}...</span>"
                                </div>
                              )}
                              <div className="flex items-start">
                                {msg.userId !== userProfile.userId && (
                                  <img
                                    src={msg.avatar || "/assets/images/users/user-default.png"}
                                    alt="Avatar"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-default.png"; }}
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-1.5 sm:mr-2 border border-slate-300 dark:border-slate-600 shrink-0 object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  {msg.userId !== userProfile.userId && (
                                    <strong className={`text-[11px] sm:text-xs mb-0.5 block text-teal-600 dark:text-teal-400`}>
                                      {msg.name}
                                    </strong>
                                  )}
                                  {msg.isDeleted ? (
                                    <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">Pesan ini telah dihapus.</p>
                                  ) : (
                                    <p className="text-slate-700 dark:text-slate-100 text-xs sm:text-sm whitespace-pre-wrap">{msg.message}</p>
                                  )}
                                </div>
                                {msg.userId === userProfile.userId && (
                                <img
                                  src={userProfile.avatar || "/assets/images/users/user-default.png"}
                                  alt="My Avatar"
                                  onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-default.png"; }}
                                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full ml-1.5 sm:ml-2 border border-emerald-300 dark:border-emerald-600 shrink-0 object-cover"
                                />
                                )}
                              </div>
                              {!msg.isDeleted && (
                                <div className={`absolute -bottom-2.5 z-[1] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center space-x-0.5 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 shadow-lg rounded-full p-0.5
                                                ${msg.userId === userProfile.userId ? 'right-1' : 'left-1'}`}>
                                  {availableReactions.map(emoji => (
                                      <button key={emoji} onClick={() => handleToggleReaction(msg._id, emoji)}
                                              className={`p-0.5 sm:p-1 hover:scale-125 transition-transform text-xs sm:text-sm rounded-full ${
                                                msg.reactions && msg.reactions[emoji]?.includes(userProfile.userId) ? 'bg-emerald-400/30' : 'hover:bg-slate-100 dark:hover:bg-slate-500'}`}>
                                          {emoji}
                                      </button>
                                  ))}
                                  <span className="text-slate-300 dark:text-slate-500">|</span>
                                  {msg.userId && msg.userId === userProfile.userId && (!editingMessage || editingMessage._id !== msg._id) && (
                                    <>
                                      <Icon icon="ph:pencil-simple-duotone" className="cursor-pointer hover:text-sky-500 dark:hover:text-sky-400 text-xs sm:text-sm p-0.5 sm:p-1" onClick={() => handleEditClick(msg)} title="Edit"/>
                                      <Icon icon="ph:trash-duotone" className="cursor-pointer hover:text-red-500 dark:hover:text-red-400 text-xs sm:text-sm p-0.5 sm:p-1" onClick={() => handleDeleteMessage(msg)} title="Hapus"/>
                                    </>
                                  )}
                                  {(!editingMessage || editingMessage._id !== msg._id) && <Icon icon="ph:arrow-bend-up-left-duotone" className="cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 text-xs sm:text-sm p-0.5 sm:p-1" onClick={() => handleReplyClick(msg)} title="Balas"/> }
                                </div>
                              )}
                            </div>
                            <div className={`text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center ${msg.userId === userProfile.userId ? 'mr-1 self-end' : 'ml-1 self-start'}`}>
                              {msg.reactions && Object.entries(msg.reactions).map(([emoji, userIds]) => userIds.length > 0 ? (
                                <span key={emoji}
                                      className={`flex items-center px-1 py-0 rounded-full cursor-pointer text-[9px] sm:text-[10px] mr-0.5
                                      ${userIds.includes(userProfile.userId) ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'}`}
                                      onClick={() => handleToggleReaction(msg._id, emoji)}>
                                    {emoji} <span className="ml-0.5">{userIds.length}</span>
                                </span>
                              ) : null)}
                              <span className="ml-0.5">{new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                              {msg.edited && <span className="ml-1 opacity-70">(diedit)</span>}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : selectedRoom ? (
                        <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[150px] text-center flex-grow">
                            <Icon icon="ph:chat-bubbles-duotone" className="text-4xl sm:text-5xl text-slate-400 dark:text-slate-500 mb-3 opacity-70"/>
                            <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-slate-300">Belum Ada Pesan</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Jadilah yang pertama mengirim pesan di grup ini!</p>
                        </div>
                    ) : null
                    }
                  </SimpleBar>

                  <div className="mt-auto pt-2 sm:pt-3 border-t border-slate-200 dark:border-slate-700/60 shrink-0">
                      {(replyingTo || editingMessage) && (
                        <div className="bg-teal-50/80 dark:bg-teal-900/50 border border-teal-200 dark:border-teal-700/60 p-1.5 rounded-md mb-1.5 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <div className="truncate grow">
                            <Icon icon={editingMessage ? "ph:pencil-line-fill" : "ph:arrow-bend-up-left-fill"} className="inline mr-1 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold">{editingMessage ? 'Edit Pesan' : `Balas @${replyingTo?.name}`}</span>:
                            <span className="italic opacity-80 ml-1">"{editingMessage ? editingMessage.message.substring(0,25) : replyingTo?.message.substring(0, 25)}..."</span>
                          </div>
                          <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessageText(''); if(messageInputRef.current) messageInputRef.current.value = ""; }} className="text-red-500 hover:text-red-400 p-0.5 rounded-full shrink-0 ml-1">
                            <Icon icon="ph:x-circle-fill" className="text-sm sm:text-base"/>
                          </button>
                        </div>
                      )}
                      <form onSubmit={editingMessage ? handleEditMessage : handleSendMessage} className="flex items-end space-x-1.5 sm:space-x-2">
                        <InputGroup
                          id="messageContent"
                          type="textarea"
                          placeholder={editingMessage ? "Edit pesan..." : "Ketik pesan..."}
                          value={editingMessage ? editingMessage.message : newMessageText}
                          onChange={(e) => editingMessage ? setEditingMessage({ ...editingMessage, message: e.target.value }) : setNewMessageText(e.target.value)}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (editingMessage) handleEditMessage(e);
                                else handleSendMessage(e);
                              }
                          }}
                          rows="1"
                          inputRef={messageInputRef}
                          className="flex-grow bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-lg shadow-sm text-xs sm:text-sm focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500"
                          inputClassName="py-1.5 px-2 sm:px-2.5 min-h-[36px] sm:min-h-[40px] max-h-24 sm:max-h-28 resize-none leading-tight outline-none border-0 focus:ring-0 bg-transparent"
                          required
                        />
                        <Button
                          type="submit"
                          icon={editingMessage ? 'ph:floppy-disk-back-duotone' : 'ph:paper-plane-tilt-fill'}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg shadow-md p-1.5 sm:p-2 h-[36px] sm:h-[40px] text-base sm:text-lg"
                          disabled={loading || (!userProfile.name.trim() && !editingMessage)} // Tombol send/edit disable jika loading global
                          title={editingMessage ? 'Simpan Edit' : 'Kirim'}
                        />
                      </form>
                      {!userProfile.name.trim() && !editingMessage && (
                        <p className="text-[10px] text-center text-yellow-600 dark:text-yellow-400 mt-1">
                          Profil nama belum diatur. <span onClick={() => setShowProfileModal(true)} className="underline cursor-pointer font-semibold">Atur sekarang</span>.
                        </p>
                      )}
                    </div>
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>

      <Modal
        title={
            <div className="flex items-center text-white">
                <Icon icon="ph:user-circle-gear-duotone" className="mr-2 h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6"/>
                <span className="text-base sm:text-lg font-semibold">Atur Profil Anda</span>
            </div>
        }
        activeModal={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        themeClass="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg shadow-xl"
        headerClass="bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 px-4 sm:py-3.5 sm:px-5"
        footerContent={
          <div className="flex justify-end space-x-2">
            <Button
              type="button" text="Batal"
              onClick={() => setShowProfileModal(false)}
              className="border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm py-1.5 px-3 rounded-md"
            />
            <Button
              type="submit" form="profileForm" text="Simpan Profil"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm py-1.5 px-3 rounded-md"
            />
          </div>
        }
      >
        <form id="profileForm" onSubmit={(e) => {
            e.preventDefault();
            if (userProfile.name.trim()) {
                setShowProfileModal(false);
                toast.success("Profil berhasil disimpan!");
            } else {
                toast.error("Nama tidak boleh kosong!");
            }
        }} className="space-y-3 text-slate-800 dark:text-slate-100 p-0.5">
          <InputGroup
            id="profileName" label="Nama Anda" type="text" placeholder="Masukkan nama lengkap Anda"
            value={userProfile.name} onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
            prepend={<Icon icon="ph:user-duotone" />}
            className="bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md text-sm focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500"
            labelClass="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            inputClassName="py-2 px-2.5 outline-none border-0 focus:ring-0 bg-transparent"
            required
          />
          <InputGroup
            id="profileAvatar" label="URL Avatar (Opsional)" type="text" placeholder="https://... atau biarkan default"
            value={userProfile.avatar === "/assets/images/users/user-default.png" ? "" : userProfile.avatar}
            onChange={(e) => setUserProfile({ ...userProfile, avatar: e.target.value || "/assets/images/users/user-default.png" })}
            prepend={<Icon icon="ph:image-duotone" />}
            className="bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md text-sm focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500"
            labelClass="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            inputClassName="py-2 px-2.5 outline-none border-0 focus:ring-0 bg-transparent"
          />
          <div className="text-center">
            <img
                src={userProfile.avatar || "/assets/images/users/user-default.png"}
                alt="Preview Avatar"
                onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-default.png"; }}
                className="w-20 h-20 rounded-full mx-auto border-2 border-emerald-500/70 dark:border-emerald-400/70 object-cover bg-slate-200 dark:bg-slate-600"
            />
          </div>
          <InputGroup
            id="profileBio" label="Bio (Opsional)" type="textarea" placeholder="Ceritakan sedikit tentang diri Anda..."
            value={userProfile.bio} onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })}
            rows="2"
            prepend={<Icon icon="ph:identification-badge-duotone" />}
            className="bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md text-sm focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500"
            labelClass="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            inputClassName="py-2 px-2.5 outline-none border-0 focus:ring-0 bg-transparent"
          />
        </form>
      </Modal>

      <Modal
        title={
            <div className="flex items-center text-white">
                <Icon icon="ph:users-three-duotone" className="mr-2 h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6"/>
                <span className="text-base sm:text-lg font-semibold">Buat Grup Baru</span>
            </div>
        }
        activeModal={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        themeClass="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg shadow-xl"
        headerClass="bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 px-4 sm:py-3.5 sm:px-5"
        footerContent={
            <div className="flex justify-end space-x-2">
            <Button
              type="button" text="Batal" onClick={() => setShowCreateGroupModal(false)}
              className="border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm py-1.5 px-3 rounded-md"
              disabled={loading} // Tombol modal disable jika loading global
            />
            <Button
              type="submit" form="createGroupForm" text={loading ? 'Membuat...' : 'Buat Grup'} // Tombol modal disable jika loading global
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm py-1.5 px-3 rounded-md"
              disabled={loading || !newGroupName.trim()}
            />
          </div>
        }
      >
        <form id="createGroupForm" onSubmit={handleCreateGroup} className="space-y-3 text-slate-800 dark:text-slate-100 p-0.5">
          <InputGroup
            id="newGroupName" label="Nama Grup" type="text" placeholder="Contoh: Tim Diskusi Proyek X"
            value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
            prepend={<Icon icon="ph:users-three-duotone" />}
            className="bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md text-sm focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500"
            labelClass="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            inputClassName="py-2 px-2.5 outline-none border-0 focus:ring-0 bg-transparent"
            required
          />
        </form>
      </Modal>
    </>
  );
};

export default RoomPage;