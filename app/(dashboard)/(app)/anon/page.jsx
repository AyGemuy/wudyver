"use client";

import { useState, useEffect, useRef } from "react";
import SimpleBar from "simplebar-react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import useWidth from "@/hooks/useWidth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import io from "socket.io-client";
import { setNickname, startChat, sendMessage, skipChat } from "@/components/partials/app/anon/store";

let socket;

const AnonymousChatPage = () => {
  const dispatch = useDispatch();
  const anonymousChat = useSelector((state) => state.anonymousChat || {});
  
  // Destructure with default values
  const {
    nickname = "",
    partner = null,
    messages = [],
    isConnecting = false,
    isConnected = false,
  } = anonymousChat;

  const { width, breakpoints } = useWidth();
  const [message, setMessage] = useState("");
  const [localNickname, setLocalNickname] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]); // List of online users
  const [isOnline, setIsOnline] = useState(false); // Current user online status
  const [selectedUser, setSelectedUser] = useState(null); // Currently selected user to chat with
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setLocalNickname(nickname);
  }, [nickname]);

  useEffect(() => {
    socketInitializer();

    return () => {
      if (socket) {
        socket.emit("goOffline");
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const socketInitializer = async () => {
    await fetch("/api/socket");
    socket = io();

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    // Listen for online users updates
    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users.filter(user => user.nickname !== localNickname));
    });

    // Listen for direct chat invitations
    socket.on("chatInvitation", (data) => {
      const confirmed = window.confirm(`${data.from} mengundang Anda untuk chat. Terima?`);
      if (confirmed) {
        socket.emit("acceptChatInvitation", { 
          from: data.from, 
          to: data.to 
        });
      } else {
        socket.emit("rejectChatInvitation", { 
          from: data.from, 
          to: data.to 
        });
      }
    });

    // Listen for chat invitation responses
    socket.on("chatInvitationAccepted", (data) => {
      toast.success(`${data.partner} menerima undangan chat!`);
      dispatch({ type: "anonymousChat/partnerFound", payload: data.partner });
      setSelectedUser(data.partner);
    });

    socket.on("chatInvitationRejected", (data) => {
      toast.error(`${data.partner} menolak undangan chat`);
    });

    // Original socket listeners
    socket.on("partnerFound", (data) => {
      toast.success(`Terhubung dengan ${data.partner}!`);
      dispatch({ type: "anonymousChat/partnerFound", payload: data.partner });
    });

    socket.on("noPartner", (data) => {
      toast.warn(data.message);
      dispatch({ type: "anonymousChat/noPartner" });
    });

    socket.on("message", (data) => {
      dispatch({ type: "anonymousChat/receiveMessage", payload: data });
    });

    socket.on("chatSkipped", (data) => {
      toast.info(data.message);
      dispatch({ type: "anonymousChat/chatSkipped" });
      setSelectedUser(null);
    });

    socket.on("partnerDisconnected", (data) => {
      toast.info("Partner telah keluar dari chat");
      dispatch({ type: "anonymousChat/chatSkipped" });
      setSelectedUser(null);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsOnline(false);
    });
  };

  const handleNicknameChange = (e) => {
    const value = e.target.value;
    setLocalNickname(value);
    dispatch(setNickname(value));
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  // Handler to go online and show in users list
  const handleGoOnline = () => {
    if (!localNickname || !localNickname.trim()) {
      toast.warn("Mohon masukkan nama panggilan");
      return;
    }
    
    dispatch(setNickname(localNickname));
    socket.emit("goOnline", { nickname: localNickname });
    setIsOnline(true);
    toast.success("Anda sekarang online!");
  };

  // Handler to go offline
  const handleGoOffline = () => {
    socket.emit("goOffline");
    setIsOnline(false);
    setOnlineUsers([]);
    setSelectedUser(null);
    dispatch({ type: "anonymousChat/chatSkipped" });
    toast.info("Anda sekarang offline");
  };

  // Handler to start random chat (original functionality)
  const handleStartRandomChat = () => {
    if (!isOnline) {
      toast.warn("Anda harus online terlebih dahulu");
      return;
    }
    
    dispatch(startChat());
    socket.emit("startChat", { nickname: localNickname });
  };

  // Handler to invite specific user to chat
  const handleInviteUser = (targetUser) => {
    if (!isOnline) {
      toast.warn("Anda harus online terlebih dahulu");
      return;
    }

    socket.emit("inviteToChat", {
      from: localNickname,
      to: targetUser.nickname
    });
    toast.info(`Mengundang ${targetUser.nickname} untuk chat...`);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const messageData = {
      message: message,
      from: "me",
    };

    dispatch({ type: "anonymousChat/sendMessage", payload: messageData });
    socket.emit("sendMessage", { message: message, to: selectedUser || partner });
    setMessage("");
  };

  const handleSkipChat = () => {
    dispatch(skipChat());
    socket.emit("skipChat");
    setSelectedUser(null);
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName="bg-slate-800 text-slate-200 border border-slate-700"
      />
      <div className="w-full px-2 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Online Users Panel */}
          <Card
            bodyClass="relative p-4 h-full overflow-hidden"
            className="lg:col-span-1 border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
          >
            <SimpleBar className="h-full max-h-96">
              <div className="p-4 border-b border-purple-800 bg-gradient-to-r from-slate-800 to-purple-900 rounded-t-3xl">
                <div className="flex items-center justify-center mb-2">
                  <Icon icon="mdi:account-group" className="text-purple-400 text-2xl mr-2" />
                  <h4 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                    Users Online ({onlineUsers.length})
                  </h4>
                </div>
              </div>
              
              <div className="p-4">
                {/* Status Controls */}
                <div className="mb-4">
                  {!isOnline ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Icon icon="mdi:account" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                        <Textinput
                          id="nickname"
                          type="text"
                          placeholder="Masukkan nama panggilan"
                          value={localNickname}
                          onChange={handleNicknameChange}
                          className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl text-sm pl-10"
                        />
                      </div>
                      <Button
                        text={
                          <span className="flex items-center justify-center">
                            <Icon icon="mdi:circle" className="text-green-400 mr-2" />
                            Go Online
                          </span>
                        }
                        className="w-full py-2 text-sm rounded-xl bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleGoOnline}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center p-2 bg-green-100 rounded-lg">
                        <Icon icon="mdi:circle" className="text-green-600 mr-2" />
                        <span className="text-green-800 text-sm font-medium">
                          Online sebagai {localNickname}
                        </span>
                      </div>
                      <Button
                        text={
                          <span className="flex items-center justify-center">
                            <Icon icon="mdi:circle-outline" className="text-red-400 mr-2" />
                            Go Offline
                          </span>
                        }
                        className="w-full py-2 text-sm rounded-xl bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleGoOffline}
                      />
                    </div>
                  )}
                </div>

                {/* Random Chat Button */}
                {isOnline && (
                  <Button
                    text={
                      isConnecting ? (
                        <span className="flex items-center justify-center">
                          <Icon icon="mdi:loading" className="animate-spin mr-2" />
                          Mencari...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <Icon icon="mdi:dice-5" className="mr-2" />
                          Random Chat
                        </span>
                      )
                    }
                    className="w-full mb-4 py-2 text-sm rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white"
                    onClick={handleStartRandomChat}
                    disabled={isConnecting}
                  />
                )}

                {/* Online Users List */}
                <div className="space-y-2">
                  {onlineUsers.length === 0 ? (
                    <div className="text-center text-slate-500 py-4">
                      <Icon icon="mdi:account-off" className="mx-auto text-3xl mb-2" />
                      <p className="text-sm">
                        {isOnline ? "Tidak ada user online lainnya" : "Go online untuk melihat users"}
                      </p>
                    </div>
                  ) : (
                    onlineUsers.map((user, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white mr-3">
                            <Icon icon="mdi:account" className="text-sm" />
                          </div>
                          <span className="text-slate-200 text-sm font-medium">
                            {user.nickname}
                          </span>
                        </div>
                        <Button
                          text={<Icon icon="mdi:chat" className="text-lg" />}
                          className="py-1 px-2 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleInviteUser(user)}
                          disabled={isConnected}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SimpleBar>
          </Card>

          {/* Chat Panel */}
          <Card
            bodyClass="relative p-6 h-full overflow-hidden"
            className="lg:col-span-2 border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
          >
            <SimpleBar className="h-full">
              {/* Chat header */}
              <div className="p-6 border-b border-purple-800 bg-gradient-to-r from-slate-800 to-purple-900 rounded-t-3xl">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-lg">
                    <Icon icon="mdi:chat" className="text-2xl" />
                  </div>
                </div>
                <h4 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                  Anonymous Chat
                </h4>
                <p className="text-sm text-center text-slate-400 mt-2">
                  {isConnected 
                    ? (
                        <span className="flex items-center justify-center">
                          <Icon icon="mdi:account-check" className="mr-2" />
                          Chat dengan: {selectedUser || partner}
                        </span>
                      )
                    : "Pilih user untuk chat atau mulai random chat"
                  }
                </p>
              </div>

              {/* Chat content */}
              {!isConnected ? (
                <div className="p-6 flex items-center justify-center h-64">
                  <div className="text-center text-slate-500">
                    <Icon icon="mdi:chat-outline" className="mx-auto text-6xl mb-4" />
                    <p className="text-lg mb-2">Belum ada chat aktif</p>
                    <p className="text-sm">
                      {isOnline 
                        ? "Pilih user dari list atau mulai random chat" 
                        : "Go online terlebih dahulu untuk memulai chat"
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white mr-2">
                        <Icon icon="mdi:account" className="text-sm" />
                      </div>
                      <span className="font-medium text-purple-300">
                        Chat dengan: {selectedUser || partner}
                      </span>
                    </div>
                    <Button
                      text={
                        <span className="flex items-center justify-center">
                          <Icon icon="mdi:skip-next" className="mr-1" />
                          Skip
                        </span>
                      }
                      className="btn-danger py-1 px-3 text-xs rounded-lg bg-red-600 hover:bg-red-700"
                      onClick={handleSkipChat}
                    />
                  </div>

                  {/* Messages area */}
                  <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-4 h-64 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                          <Icon icon="mdi:message-text-outline" className="mx-auto text-3xl mb-2" />
                          <p>Mulai percakapan...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg, index) => (
                          <div
                            key={index}
                            className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2 rounded-xl relative ${
                                msg.from === "me"
                                  ? "bg-purple-600 text-white rounded-br-none"
                                  : "bg-slate-700 text-slate-200 rounded-bl-none"
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <div className={`absolute bottom-0 ${
                                msg.from === "me" ? "-right-2" : "-left-2"
                              }`}>
                                <Icon 
                                  icon={msg.from === "me" ? "mdi:account-circle" : "mdi:account-circle-outline"}
                                  className={`text-xs ${
                                    msg.from === "me" ? "text-purple-300" : "text-slate-400"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message input */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <div className="relative flex-1">
                      <Icon icon="mdi:message-text" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                      <Textinput
                        id="message"
                        type="text"
                        placeholder="Ketik pesan..."
                        value={message}
                        onChange={handleMessageChange}
                        className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl pl-10"
                      />
                    </div>
                    <Button
                      text={<Icon icon="mdi:send" className="text-lg" />}
                      className="btn-primary py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700"
                      type="submit"
                    />
                  </form>
                </div>
              )}
            </SimpleBar>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AnonymousChatPage;