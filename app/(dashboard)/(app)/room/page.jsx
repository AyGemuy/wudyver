"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Modal from "@/components/ui/Modal";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";
import apiConfig from "@/configs/apiConfig";

const DELETE_PASSWORD = apiConfig.PASSWORD;
const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const RoomChatPage = () => {
  const [currentUser, setCurrentUser] = useState({
    id: "",
    name: "Guest",
    avatar: "",
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileAvatarInput, setProfileAvatarInput] = useState("");

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showEditMessageModal, setShowEditMessageModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const storedUser = localStorage.getItem("chatCurrentUser");
    let userId = "user_" + Math.random().toString(36).substr(2, 9);
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);
      if (!parsedUser.id) {
        parsedUser.id = userId;
        setCurrentUser(parsedUser);
        localStorage.setItem("chatCurrentUser", JSON.stringify(parsedUser));
      }
    } else {
      const defaultUser = {
        id: userId,
        name: "Guest",
        avatar: `https://i.pravatar.cc/40?u=${userId}`,
      };
      setCurrentUser(defaultUser);
      localStorage.setItem("chatCurrentUser", JSON.stringify(defaultUser));
      setShowProfileModal(true);
    }
  }, []);

  useEffect(() => {
    if (showProfileModal) {
      setProfileNameInput(currentUser.name);
      setProfileAvatarInput(currentUser.avatar);
    }
  }, [showProfileModal, currentUser]);

  const handleSetProfile = () => {
    if (!profileNameInput.trim()) {
      toast.warn("Nama tidak boleh kosong.");
      return;
    }
    const newUserProfile = {
      ...currentUser,
      name: profileNameInput.trim(),
      avatar:
        profileAvatarInput.trim() ||
        `https://i.pravatar.cc/40?u=${
          profileNameInput.trim().replace(/\s+/g, "") || currentUser.id
        }`,
    };
    setCurrentUser(newUserProfile);
    localStorage.setItem("chatCurrentUser", JSON.stringify(newUserProfile));
    toast.success("Profil berhasil diperbarui!");
    setShowProfileModal(false);
  };

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const response = await fetch(`/api/rooms`);
      const data = await response.json();
      if (data.success) {
        setRooms(data.data.sort((a, b) => a.roomName.localeCompare(b.roomName)));
      } else {
        setRooms([]);
      }
    } catch (error) {
      toast.error("Gagal mengambil daftar ruangan");
      console.error("Error fetching rooms:", error);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchMessages = async (roomName) => {
    if (!roomName) return;
    setLoadingMessages(true);
    try {
      const response = await fetch(
        `/api/rooms?roomName=${encodeURIComponent(roomName)}`
      );
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      } else {
        toast.error(data.message || "Gagal mengambil pesan");
        setMessages([]);
      }
    } catch (error) {
      toast.error("Gagal mengambil pesan");
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.roomName);
    } else {
      setMessages([]);
    }
  }, [selectedRoom]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.warn("Nama ruangan tidak boleh kosong.");
      return;
    }
    setLoadingRooms(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createGroup", roomName: newRoomName }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || "Ruangan berhasil dibuat!");
        setNewRoomName("");
        setShowCreateRoomModal(false);
        await fetchRooms();
        const newlyCreatedRoom = data.data;
        if (newlyCreatedRoom) {
          const roomToSelect =
            rooms.find((r) => r.roomName === newlyCreatedRoom.roomName) ||
            newlyCreatedRoom;
          setSelectedRoom(roomToSelect);
        }
      } else {
        toast.error(data.message || "Gagal membuat ruangan.");
      }
    } catch (error) {
      toast.error("Gagal membuat ruangan.");
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleDeleteRoom = async (roomName) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus ruangan "${roomName}"?\nAnda akan diminta memasukkan password setelah ini.`
      )
    )
      return;
    const enteredPassword = prompt(
      `Untuk menghapus ruangan "${roomName}", masukkan password:`
    );
    if (enteredPassword === null) {
      toast.info("Penghapusan ruangan dibatalkan.");
      return;
    }
    if (enteredPassword !== DELETE_PASSWORD) {
      toast.error("Password salah. Penghapusan ruangan dibatalkan.");
      return;
    }
    setLoadingRooms(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteGroup", roomName }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || "Ruangan berhasil dihapus!");
        fetchRooms();
        if (selectedRoom && selectedRoom.roomName === roomName) {
          setSelectedRoom(null);
        }
      } else {
        toast.error(data.message || "Gagal menghapus ruangan.");
      }
    } catch (error) {
      toast.error("Gagal menghapus ruangan.");
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !currentUser.name) {
      if (!currentUser.name || currentUser.name === "Guest") {
        toast.warn("Harap atur nama profil Anda terlebih dahulu.");
        setShowProfileModal(true);
        return;
      }
      return;
    }
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMessage",
          roomName: selectedRoom.roomName,
          name: currentUser.name,
          message: newMessage,
          avatar: currentUser.avatar,
          userId: currentUser.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchMessages(selectedRoom.roomName);
        setNewMessage("");
      } else {
        toast.error(data.message || "Gagal mengirim pesan.");
      }
    } catch (error) {
      toast.error("Gagal mengirim pesan.");
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editingMessage.content.trim() || !selectedRoom) {
      toast.warn("Pesan editan tidak boleh kosong.");
      return;
    }
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "editMessage",
          roomName: selectedRoom.roomName,
          messageId: editingMessage.id,
          message: editingMessage.content,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Pesan berhasil diedit!");
        fetchMessages(selectedRoom.roomName);
        setShowEditMessageModal(false);
        setEditingMessage(null);
      } else {
        toast.error(data.message || "Gagal mengedit pesan.");
      }
    } catch (error) {
      toast.error("Gagal mengedit pesan.");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!selectedRoom) return;
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus pesan ini?\nAnda akan diminta memasukkan password setelah ini.`
      )
    )
      return;
    const enteredPassword = prompt(
      `Untuk menghapus pesan ini, masukkan password:`
    );
    if (enteredPassword === null) {
      toast.info("Penghapusan pesan dibatalkan.");
      return;
    }
    if (enteredPassword !== DELETE_PASSWORD) {
      toast.error("Password salah. Penghapusan pesan dibatalkan.");
      return;
    }
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMessage",
          roomName: selectedRoom.roomName,
          messageId: messageId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Pesan berhasil dihapus!");
        fetchMessages(selectedRoom.roomName);
      } else {
        toast.error(data.message || "Gagal menghapus pesan.");
      }
    } catch (error) {
      toast.error("Gagal menghapus pesan.");
    }
  };

  const handleMessageInteraction = async (messageId, interactionType, emoji = null) => {
    if (!selectedRoom || !currentUser.id) return;
    try {
      const payload = {
        action: interactionType,
        roomName: selectedRoom.roomName,
        messageId: messageId,
        userId: currentUser.id,
      };
      if (interactionType === "toggleReaction" && emoji) {
        payload.emoji = emoji;
      }
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        fetchMessages(selectedRoom.roomName);
      } else {
        toast.error(data.message || `Gagal ${interactionType}`);
      }
    } catch (error) {
      toast.error(`Error saat ${interactionType}`);
    }
  };

  const openEditModal = (message) => {
    setEditingMessage({ id: message._id, content: message.message });
    setShowEditMessageModal(true);
  };

  const inputBaseClass =
    "w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder-slate-400 dark:placeholder-slate-500 p-3";
  const labelBaseClass = "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center";
  const sectionCardClass =
    "bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow";
  const sectionTitleClass =
    "text-lg font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center";
  const buttonGradientBase = "text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed";

  const filteredRooms = rooms.filter((room) =>
    room.roomName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:chats-teardrop-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Ruangan Obrolan
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Bergabung atau buat ruangan obrolan Anda sendiri.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              <Button
                onClick={() => setShowProfileModal(true)}
                className={`${buttonGradientBase} bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700`}
                icon="ph:user-circle-gear-duotone"
                text="Set Profil"
                iconPosition="left"
                iconClassName="text-lg mr-1.5"
              />
              <Button
                onClick={() => setShowCreateRoomModal(true)}
                className={`${buttonGradientBase} bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700`}
                icon="ph:plus-circle-duotone"
                text="Buat Grup"
                iconPosition="left"
                iconClassName="text-lg mr-1.5"
              />
            </div>
          </div>

          <SimpleBar className="flex-grow max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-290px)]">
            <div className="p-4 sm:p-6 space-y-6 flex flex-col lg:flex-row gap-6 h-full">
              <div className={`${sectionCardClass} lg:w-1/3 flex flex-col`}>
                <label className={sectionTitleClass}>
                  <Icon icon="ph:users-three-duotone" className="mr-2 text-xl" />
                  Daftar Ruangan
                </label>
                <div className="mb-4">
                  <Textinput
                    type="text"
                    placeholder="Cari ruangan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={inputBaseClass}
                    inputClassName="p-3"
                  />
                </div>
                <SimpleBar className="flex-grow overflow-y-auto -mr-2 pr-2">
                  <div className="space-y-2">
                    {loadingRooms && filteredRooms.length === 0 && (
                      <div className="text-center py-6">
                        <Icon icon="svg-spinners:ring-resize" className="text-3xl text-teal-500 mx-auto mb-2 animate-spin" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Memuat ruangan...</p>
                      </div>
                    )}
                    {!loadingRooms && filteredRooms.length === 0 && (
                      <div className={`text-center py-6`}>
                        <Icon
                          icon="ph:door-duotone"
                          className="mx-auto text-4xl text-slate-400 dark:text-slate-500 mb-2"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Belum ada ruangan.
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Buat ruangan baru untuk memulai.
                        </p>
                      </div>
                    )}
                    {filteredRooms.map((room) => (
                      <div
                        key={room._id}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-150 flex justify-between items-center ${
                          selectedRoom?.roomName === room.roomName
                            ? "bg-teal-500/20 dark:bg-teal-500/30 shadow-md ring-2 ring-teal-500"
                            : "bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-600/70"
                        }`}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <div className="flex items-center">
                          <Icon icon="ph:users-duotone" className="text-base mr-2 text-slate-500 dark:text-slate-400" />
                          <span
                            className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate"
                            title={room.roomName}
                          >
                            {room.roomName}
                          </span>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.roomName);
                          }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 dark:text-red-400 hover:text-red-600 ml-2 shrink-0"
                          icon="ph:trash-duotone"
                          iconClassName="text-xs"
                          title="Hapus Ruangan"
                          disabled={loadingRooms}
                        />
                      </div>
                    ))}
                  </div>
                </SimpleBar>
              </div>

              <div className={`${sectionCardClass} lg:w-2/3 flex flex-col`}>
                <label className={sectionTitleClass}>
                  <Icon icon="ph:chat-circle-dots-duotone" className="mr-2 text-xl" />
                  Area Obrolan {selectedRoom ? `: ${selectedRoom.roomName}` : ""}
                </label>
                {selectedRoom ? (
                  <>
                    <SimpleBar className="flex-grow overflow-y-auto -mr-2 pr-2">
                      <div className="space-y-4">
                        {loadingMessages && messages.length === 0 && (
                          <div className="text-center py-10">
                            <Icon icon="svg-spinners:ring-resize" className="text-4xl text-teal-500 mx-auto mb-2 animate-spin" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">Memuat pesan...</p>
                          </div>
                        )}
                        {!loadingMessages && messages.length === 0 && (
                          <div className={`text-center py-10`}>
                            <Icon
                              icon="ph:envelope-open-duotone"
                              className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3"
                            />
                            <p className="text-base text-slate-500 dark:text-slate-400">
                              Belum ada pesan di ruangan ini.
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              Kirim pesan pertama Anda!
                            </p>
                          </div>
                        )}
                        {messages.map((msg) => (
                          <div
                            key={msg._id}
                            className={`flex items-end ${
                              msg.userId === currentUser.id ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-xl shadow-sm ${
                                msg.userId === currentUser.id
                                  ? "bg-sky-600 text-white rounded-br-none"
                                  : "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-bl-none"
                              }`}
                            >
                              <div className="flex items-center mb-1">
                                {msg.avatar && (
                                  <img
                                    src={msg.avatar}
                                    alt={msg.name}
                                    onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-0.jpg"; }}
                                    className="w-5 h-5 rounded-full mr-2 object-cover"
                                  />
                                )}
                                <span
                                  className={`text-xs font-semibold ${
                                    msg.userId === currentUser.id
                                      ? "text-sky-100"
                                      : "text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {msg.name}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                              <div className="text-[10px] mt-1.5 opacity-80 flex justify-between items-center">
                                <span>
                                  {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  {msg.edited ? "(diedit)" : ""}
                                </span>
                                <div className="flex items-center gap-1.5 ml-2">
                                  {msg.userId === currentUser.id && (
                                    <>
                                      <Icon
                                        icon="ph:pencil-simple-duotone"
                                        onClick={() => openEditModal(msg)}
                                        className="cursor-pointer hover:text-yellow-400"
                                        title="Edit Pesan"
                                      />
                                      <Icon
                                        icon="ph:trash-duotone"
                                        onClick={() => handleDeleteMessage(msg._id)}
                                        className="cursor-pointer hover:text-red-400"
                                        title="Hapus Pesan"
                                      />
                                    </>
                                  )}
                                  <Icon
                                    icon="ph:thumbs-up-duotone"
                                    onClick={() => handleMessageInteraction(msg._id, "toggleLike")}
                                    className={`cursor-pointer ${
                                      msg.likes?.includes(currentUser.id)
                                        ? "text-green-400"
                                        : "hover:text-green-400"
                                    }`}
                                    title="Suka"
                                  />
                                  <span className="text-[9px]">
                                    {msg.likes?.length || 0}
                                  </span>
                                  <Icon
                                    icon="ph:thumbs-down-duotone"
                                    onClick={() => handleMessageInteraction(msg._id, "toggleDislike")}
                                    className={`cursor-pointer ${
                                      msg.dislikes?.includes(currentUser.id)
                                        ? "text-orange-400"
                                        : "hover:text-orange-400"
                                    }`}
                                    title="Tidak Suka"
                                  />
                                  <span className="text-[9px]">
                                    {msg.dislikes?.length || 0}
                                  </span>
                                  <div className="relative group">
                                    <Icon
                                      icon="ph:smiley-duotone"
                                      className="cursor-pointer hover:text-yellow-300"
                                      title="Beri Reaksi"
                                    />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:flex bg-slate-600 dark:bg-slate-800 border border-slate-500 dark:border-slate-700 p-1 rounded-md shadow-lg z-10">
                                      {EMOJI_REACTIONS.map((emoji) => (
                                        <span
                                          key={emoji}
                                          onClick={() =>
                                            handleMessageInteraction(msg._id, "toggleReaction", emoji)
                                          }
                                          className="p-1 cursor-pointer hover:bg-slate-500 dark:hover:bg-slate-700 rounded text-base"
                                        >
                                          {emoji}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {Object.entries(
                                    msg.reactions.reduce((acc, reaction) => {
                                      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                      return acc;
                                    }, {})
                                  ).map(([emoji, count]) => (
                                    <span
                                      key={emoji}
                                      className="text-xs bg-slate-300 dark:bg-slate-600 px-1.5 py-0.5 rounded-full flex items-center"
                                    >
                                      {emoji}{" "}
                                      <span className="ml-1 text-[10px]">{count}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </SimpleBar>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <Textinput
                          type="text"
                          placeholder="Ketik pesan Anda..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className={inputBaseClass + " flex-grow"}
                          inputClassName="p-3"
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            (e.preventDefault(), handleSendMessage())
                          }
                        />
                        <Button
                          onClick={handleSendMessage}
                          className={`${buttonGradientBase} bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700`}
                          icon="ph:paper-plane-tilt-duotone"
                          text="Kirim"
                          iconPosition="left"
                          iconClassName="text-lg mr-1.5"
                          disabled={
                            !newMessage.trim() ||
                            loadingMessages ||
                            !currentUser.name ||
                            currentUser.name === "Guest"
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={`flex-grow flex flex-col items-center justify-center text-center py-10`}>
                    <Icon
                      icon="ph:chat-bubbles-duotone"
                      className="text-6xl text-slate-400 dark:text-slate-500 mb-4"
                    />
                    <p className="text-lg text-slate-500 dark:text-slate-400">
                      Pilih ruangan untuk memulai obrolan.
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                      Atau buat ruangan baru jika belum ada.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>

      <Modal
        title="Buat Ruangan Obrolan Baru"
        activeModal={showCreateRoomModal}
        onClose={() => {
          setShowCreateRoomModal(false);
          setNewRoomName("");
        }}
        className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        footerContent={
          <div className="flex justify-end space-x-2">
            <Button
              text="Batal"
              onClick={() => {
                setShowCreateRoomModal(false);
                setNewRoomName("");
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-md py-2 px-4 text-sm"
            />
            <Button
              onClick={handleCreateRoom}
              text="Simpan Ruangan"
              className={`${buttonGradientBase} bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700`}
              disabled={loadingRooms || !newRoomName.trim()}
              icon="ph:floppy-disk-back-duotone"
              iconPosition="left"
              iconClassName="text-lg mr-1.5"
            />
          </div>
        }
      >
        <div className="space-y-4 text-slate-800 dark:text-slate-100 p-0.5">
          <Textinput
            label="Nama Ruangan *"
            placeholder="Contoh: Diskusi Proyek A"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className={inputBaseClass}
            inputClassName="p-3"
            labelClass={labelBaseClass}
            description="Nama unik untuk ruangan obrolan Anda."
          />
        </div>
      </Modal>

      {editingMessage && (
        <Modal
          title="Edit Pesan"
          activeModal={showEditMessageModal}
          onClose={() => {
            setShowEditMessageModal(false);
            setEditingMessage(null);
          }}
          className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
          footerContent={
            <div className="flex justify-end space-x-2">
              <Button
                text="Batal"
                onClick={() => {
                  setShowEditMessageModal(false);
                  setEditingMessage(null);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-md py-2 px-4 text-sm"
              />
              <Button
                onClick={handleEditMessage}
                text="Simpan Perubahan"
                className={`${buttonGradientBase} bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700`}
                disabled={!editingMessage?.content?.trim()}
                icon="ph:floppy-disk-back-duotone"
                iconPosition="left"
                iconClassName="text-lg mr-1.5"
              />
            </div>
          }
        >
          <div className="space-y-4 text-slate-800 dark:text-slate-100 p-0.5">
            <label className={labelBaseClass}>
              <Icon icon="ph:pencil-line-duotone" className="mr-2 text-xl" />
              Pesan Anda
            </label>
            <textarea
              value={editingMessage.content}
              onChange={(e) =>
                setEditingMessage({ ...editingMessage, content: e.target.value })
              }
              rows={5}
              className={`${inputBaseClass} font-sans text-sm leading-relaxed min-h-[80px]`}
              placeholder="Edit pesan Anda..."
            />
          </div>
        </Modal>
      )}

      <Modal
        title="Atur Profil Anda"
        activeModal={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        footerContent={
          <div className="flex justify-end space-x-2">
            <Button
              text="Batal"
              onClick={() => setShowProfileModal(false)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-md py-2 px-4 text-sm"
            />
            <Button
              onClick={handleSetProfile}
              text="Simpan Profil"
              className={`${buttonGradientBase} bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700`}
              disabled={!profileNameInput.trim()}
              icon="ph:user-circle-check-duotone"
              iconPosition="left"
              iconClassName="text-lg mr-1.5"
            />
          </div>
        }
      >
        <div className="space-y-4 text-slate-800 dark:text-slate-100 p-0.5">
          <Textinput
            label={
              <span className={labelBaseClass}>
                <Icon icon="ph:user-circle-duotone" className="mr-2 text-xl" />
                Nama Anda *
              </span>
            }
            placeholder="Masukkan nama Anda"
            value={profileNameInput}
            onChange={(e) => setProfileNameInput(e.target.value)}
            className={inputBaseClass}
            inputClassName="p-3"
            labelClass={labelBaseClass}
            description="Nama ini akan ditampilkan saat Anda mengirim pesan."
          />
          <Textinput
            label={
              <span className={labelBaseClass}>
                <Icon icon="ph:image-duotone" className="mr-2 text-xl" />
                URL Avatar (Opsional)
              </span>
            }
            placeholder="https://example.com/avatar.png"
            value={profileAvatarInput}
            onChange={(e) => setProfileAvatarInput(e.target.value)}
            className={inputBaseClass}
            inputClassName="p-3"
            description="URL gambar untuk avatar Anda. Jika kosong, avatar default akan digunakan."
          />
        </div>
      </Modal>
    </>
  );
};

export default RoomChatPage;