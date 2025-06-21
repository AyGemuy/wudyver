"use client";

import SimpleBar from "simplebar-react";
import { useState, useCallback, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Fileinput from "@/components/ui/Fileinput"; // Keeping Fileinput for avatar upload
import Textinput from "@/components/ui/Textinput"; // Added Textinput for profile and youtube URL
import Modal from "@/components/ui/Modal"; // Added Modal for consistent popup style
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import apiConfig from "@/configs/apiConfig";

const ChatGroupPage = () => {
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hostLoading, setHostLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMessageInput, setCurrentMessageInput] = useState("");
  const [currentReplyToMessage, setCurrentReplyToMessage] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editMessageContent, setEditMessageContent] = useState({});
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [profileUsernameInput, setProfileUsernameInput] = useState("");
  const [profileAvatarUrlInput, setProfileAvatarUrlInput] = useState(""); // Renamed for consistency

  const messagesEndRef = useRef(null);

  const API_BASE_URL = 'https://api.jsonbin.io/v3/b';
  const JSONBIN_HEADERS = {
    'Content-Type': 'application/json',
    'X-Master-Key': apiConfig.jsonbin.masterKey,
    'X-Bin-Meta': false,
  };

  const { groupBinId, usersBinId, messagesBinId } = apiConfig.jsonbin;

  const DEFAULT_GUEST_PROFILE = {
    id: '',
    username: 'Guest',
    avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // Default generic avatar
    status: 'online',
    lastActive: new Date().toISOString(),
  };

  // --- Theme-related Classes (copied/adapted from RoomChatPage) ---
  const inputBaseClass =
    "w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder-slate-400 dark:placeholder-slate-500 p-3";
  const labelBaseClass = "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center";
  const sectionCardClass =
    "bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow";
  const sectionTitleClass =
    "text-lg font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center";
  const buttonGradientBase = "text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed";

  // --- Helper function to update a bin ---
  const updateBin = useCallback(async (binId, data) => {
    try {
      await axios.put(`${API_BASE_URL}/${binId}`, data, { headers: JSONBIN_HEADERS });
    } catch (error) {
      console.error(`Error updating data in bin ${binId}:`, error);
      throw error; // Re-throw to be caught by the caller
    }
  }, [JSONBIN_HEADERS, API_BASE_URL]);

  // --- Initialize default group data if bin is empty or invalid ---
  const initializeGroupData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${groupBinId}`, { headers: JSONBIN_HEADERS });
      let fetchedGroups = Array.isArray(response.data.record) ? response.data.record : [];

      if (fetchedGroups.length === 0) {
        // Default groups if bin is empty
        const defaultGroups = [
          { id: uuidv4(), name: "General Chat", members: [], currentYouTubeVideo: null },
          { id: uuidv4(), name: "Team Discussion", members: [], currentYouTubeVideo: null },
        ];
        await updateBin(groupBinId, defaultGroups);
        toast.info("Grup default berhasil diinisialisasi.");
        return defaultGroups;
      }
      return fetchedGroups;
    } catch (err) {
      console.error("Gagal memuat atau menginisialisasi grup. Mencoba menginisialisasi ulang.", err);
      // If fetching fails or data is corrupt, force initialize default groups
      const defaultGroups = [
        { id: uuidv4(), name: "General Chat", members: [], currentYouTubeVideo: null },
        { id: uuidv4(), name: "Team Discussion", members: [], currentYouTubeVideo: null },
      ];
      try {
        await updateBin(groupBinId, defaultGroups);
        toast.info("Grup berhasil diperbaiki dan diinisialisasi ulang.");
        return defaultGroups;
      } catch (retryErr) {
        console.error("Gagal menginisialisasi grup setelah upaya kedua:", retryErr);
        toast.error("Sangat gagal menginisialisasi grup. Periksa konfigurasi JSONBin.io Anda.");
        return []; // Return empty array if all fails
      }
    }
  }, [groupBinId, JSONBIN_HEADERS, updateBin]);


  // --- Initialize messages data if bin is empty or invalid ---
  const initializeMessageData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${messagesBinId}`, { headers: JSONBIN_HEADERS });
      let fetchedMessages = Array.isArray(response.data.record) ? response.data.record : [];

      if (fetchedMessages.length === 0) {
        await updateBin(messagesBinId, []); // Ensure it's an empty array
        return [];
      }
      return fetchedMessages;
    } catch (err) {
      console.error("Gagal memuat atau menginisialisasi pesan. Mencoba menginisialisasi ulang.", err);
      try {
        await updateBin(messagesBinId, []); // If fetching fails or data is corrupt, force initialize
        toast.info("Data pesan berhasil diperbaiki dan diinisialisasi ulang.");
        return [];
      } catch (retryErr) {
        console.error("Gagal menginisialisasi pesan setelah upaya kedua:", retryErr);
        toast.error("Sangat gagal menginisialisasi pesan. Periksa konfigurasi JSONBin.io Anda.");
        return []; // Return empty array if all fails
      }
    }
  }, [messagesBinId, JSONBIN_HEADERS, updateBin]);

  // --- Fetch all data (groups, users, messages) ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Initialize groups and messages with robust checks
      const fetchedGroups = await initializeGroupData();
      const fetchedMessages = await initializeMessageData();

      // Fetch users
      let fetchedUsers = [];
      try {
        const usersResponse = await axios.get(`${API_BASE_URL}/${usersBinId}`, { headers: JSONBIN_HEADERS });
        fetchedUsers = Array.isArray(usersResponse.data.record) ? usersResponse.data.record : [];
      } catch (err) {
        console.error("Gagal memuat pengguna. Menggunakan array kosong.", err);
        toast.warn("Gagal memuat daftar pengguna. Aplikasi akan tetap berfungsi.");
        fetchedUsers = []; // Ensure it's an array even on fetch failure
      }

      setGroups(fetchedGroups);
      setUsers(fetchedUsers);
      setMessages(fetchedMessages);

    } catch (err) {
      console.error("Gagal memuat data chat secara keseluruhan:", err);
      setError("Gagal memuat data chat. Silakan refresh halaman atau periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setHostLoading(false);
    }
  }, [usersBinId, JSONBIN_HEADERS, initializeGroupData, initializeMessageData]);


  useEffect(() => {
    const initializeUserData = async () => {
      let storedUserId = localStorage.getItem('chatAppUserId');
      let allUsers = [];

      try {
        const response = await axios.get(`${API_BASE_URL}/${usersBinId}`, { headers: JSONBIN_HEADERS });
        allUsers = Array.isArray(response.data.record) ? response.data.record : [];
      } catch (err) {
        console.error("Gagal mengambil data pengguna, menginisialisasi array kosong.", err);
        allUsers = []; // Ensure it's an array even on fetch failure
      }

      if (storedUserId) {
        const existingUser = allUsers.find(user => user.id === storedUserId);
        if (existingUser) {
          setCurrentUser(existingUser);
          setProfileUsernameInput(existingUser.username);
          setProfileAvatarUrlInput(existingUser.avatarUrl);
          return;
        }
      }

      // If no stored user or user not found, create a new guest user
      const newUserId = uuidv4();
      const guestNumber = allUsers.filter(u => u.username.startsWith('Guest')).length + 1;
      const newGuestUser = {
        ...DEFAULT_GUEST_PROFILE,
        id: newUserId,
        username: `Guest_${guestNumber}`,
      };

      const updatedUsers = [...allUsers, newGuestUser];
      try {
        await updateBin(usersBinId, updatedUsers);
        localStorage.setItem('chatAppUserId', newUserId);
        setCurrentUser(newGuestUser);
        setProfileUsernameInput(newGuestUser.username);
        setProfileAvatarUrlInput(newGuestUser.avatarUrl);
        toast.success(`Selamat datang, ${newGuestUser.username}! Profil Anda telah dibuat.`);
      } catch (err) {
        console.error("Gagal membuat pengguna tamu baru:", err);
        setError("Gagal membuat profil tamu. Silakan coba lagi.");
        // Fallback to a temporary user if saving fails
        setCurrentUser(newGuestUser);
        setProfileUsernameInput(newGuestUser.username);
        setProfileAvatarUrlInput(newGuestUser.avatarUrl);
      }
    };

    initializeUserData();
    fetchData(); // Call fetchData after user initialization
  }, [fetchData, usersBinId, DEFAULT_GUEST_PROFILE, JSONBIN_HEADERS, updateBin]);


  useEffect(() => {
    // Set selected group if groups are loaded and no group is selected
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    // Add current user to group members if not already there
    if (currentUser && selectedGroupId && groups.length > 0) {
      const currentGroup = groups.find(g => g.id === selectedGroupId);
      if (currentGroup && !currentGroup.members?.includes(currentUser.id)) {
        const updatedGroups = groups.map(group => {
          if (group.id === selectedGroupId) {
            // Ensure members array exists and is an array
            const currentMembers = Array.isArray(group.members) ? group.members : [];
            return { ...group, members: [...currentMembers, currentUser.id] };
          }
          return group;
        });
        setGroups(updatedGroups); // Optimistic update
        updateBin(groupBinId, updatedGroups)
          .catch(err => {
            console.error("Gagal menambahkan pengguna saat ini ke anggota grup:", err);
            // Revert on error if necessary
            setGroups(groups);
          });
      }
    }
  }, [currentUser, selectedGroupId, groups, groupBinId, updateBin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedGroup = groups.find(group => group.id === selectedGroupId);
  const groupMessages = messages
    .filter(msg => selectedGroup && msg.groupId === selectedGroup.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const handleAction = useCallback(async (type, payload) => {
    if (!currentUser) {
      toast.error("Anda harus masuk untuk melakukan tindakan ini.");
      setIsProfileModalOpen(true); // Prompt user to set profile if not logged in
      return;
    }
    if (currentUser.username === "Guest" && type !== 'update_user_profile') {
      toast.warn("Harap atur nama profil Anda terlebih dahulu.");
      setIsProfileModalOpen(true);
      return;
    }

    let originalState;
    let newState;
    let targetBinId;
    let successMessage = "";
    let errorMessage = "";

    switch (type) {
      case 'add_message':
        originalState = messages;
        const newMessage = {
          id: uuidv4(),
          groupId: payload.groupId,
          userId: currentUser.id,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl,
          content: payload.content,
          timestamp: new Date().toISOString(),
          edited: false,
          replyTo: payload.replyTo || null,
          likes: [], // Ensure these are initialized as arrays
          dislikes: [], // Ensure these are initialized as arrays
        };
        newState = [...messages, newMessage];
        setMessages(newState);
        targetBinId = messagesBinId;
        successMessage = "Pesan berhasil dikirim!";
        errorMessage = "Gagal mengirim pesan.";
        break;

      case 'update_message':
        originalState = messages;
        const messageToUpdate = messages.find(msg => msg.id === payload.messageId);
        if (!messageToUpdate || messageToUpdate.userId !== currentUser.id) {
          toast.warn("Anda hanya dapat mengedit pesan Anda sendiri.");
          return;
        }
        newState = messages.map(msg =>
          msg.id === payload.messageId
            ? { ...msg, content: payload.newContent, edited: true, timestamp: new Date().toISOString() }
            : msg
        );
        if (JSON.stringify(originalState) === JSON.stringify(newState)) {
          toast.warn("Tidak ada perubahan yang terdeteksi.");
          return;
        }
        setMessages(newState);
        targetBinId = messagesBinId;
        successMessage = "Pesan berhasil diperbarui!";
        errorMessage = "Gagal memperbarui pesan.";
        break;

      case 'delete_message':
        originalState = messages;
        const messageToDelete = messages.find(msg => msg.id === payload.messageId);
        if (!messageToDelete || messageToDelete.userId !== currentUser.id) {
          toast.warn("Anda hanya dapat menghapus pesan Anda sendiri.");
          return;
        }
        newState = messages.filter(msg => msg.id !== payload.messageId);
        setMessages(newState);
        targetBinId = messagesBinId;
        successMessage = "Pesan berhasil dihapus!";
        errorMessage = "Gagal menghapus pesan.";
        break;

      case 'toggle_reaction':
        originalState = messages;
        newState = messages.map(msg => {
          if (msg.id === payload.messageId) {
            // Ensure likes and dislikes are arrays
            let newLikes = Array.isArray(msg.likes) ? [...msg.likes] : [];
            let newDislikes = Array.isArray(msg.dislikes) ? [...msg.dislikes] : [];
            const userId = currentUser.id;

            if (payload.reactionType === 'like') {
              if (newLikes.includes(userId)) {
                newLikes = newLikes.filter(id => id !== userId);
              } else {
                newLikes.push(userId);
                newDislikes = newDislikes.filter(id => id !== userId); // Remove from dislikes if liked
              }
            } else if (payload.reactionType === 'dislike') {
              if (newDislikes.includes(userId)) {
                newDislikes = newDislikes.filter(id => id !== userId);
              } else {
                newDislikes.push(userId);
                newLikes = newLikes.filter(id => id !== userId); // Remove from likes if disliked
              }
            }
            return { ...msg, likes: newLikes, dislikes: newDislikes };
          }
          return msg;
        });
        setMessages(newState);
        targetBinId = messagesBinId;
        successMessage = "Reaksi berhasil diperbarui!";
        errorMessage = "Gagal memperbarui reaksi.";
        break;

      case 'update_youtube_video':
        originalState = groups;
        newState = groups.map(group => {
          if (group.id === payload.groupId) {
            return {
              ...group,
              currentYouTubeVideo: {
                videoId: payload.videoId,
                lastUpdatedBy: currentUser.id,
                lastUpdatedTime: new Date().toISOString(),
              },
            };
          }
          return group;
        });
        setGroups(newState);
        targetBinId = groupBinId;
        successMessage = "Video YouTube berhasil diperbarui!";
        errorMessage = "Gagal memperbarui video YouTube.";
        break;

      case 'update_user_profile':
        originalState = users;
        const updatedCurrentUser = { ...currentUser, ...payload.profileData };
        newState = users.map(user =>
          user.id === currentUser.id ? updatedCurrentUser : user
        );
        setUsers(newState);
        setCurrentUser(updatedCurrentUser); // Update current user immediately
        targetBinId = usersBinId;
        successMessage = "Profil berhasil diperbarui!";
        errorMessage = "Gagal memperbarui profil.";
        break;

      default:
        console.warn("Aksi tidak dikenal:", type);
        return;
    }

    try {
      if (targetBinId) {
        await updateBin(targetBinId, newState);
        toast.success(successMessage);
      }
    } catch (err) {
      console.error(`Gagal melakukan aksi ${type}:`, err);
      // Revert state on error
      if (type.includes('message') || type === 'toggle_reaction') {
        setMessages(originalState);
      } else if (type === 'update_youtube_video') {
        setGroups(originalState);
      } else if (type === 'update_user_profile') {
        setUsers(originalState);
        setCurrentUser(originalState.find(u => u.id === currentUser.id) || null); // Revert currentUser too
      }
      toast.error(errorMessage);
    }
  }, [messages, groups, users, currentUser, messagesBinId, groupBinId, usersBinId, updateBin]);

  const extractVideoId = (url) => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/g;
    const match = youtubeRegex.exec(url);
    return match ? match[1] : null;
  };

  return (
    <>
      <div className="w-full px-2 sm:px-4 py-6 h-screen flex flex-col">
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
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 flex-1"
        >
          {/* Left Panel: Groups List */}
          <div className="w-full sm:w-80 flex flex-col border-r border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/50 h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center">
                <Icon icon="ph:users-three-duotone" className="text-2xl text-teal-500 mr-2" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Grup Chat</h2>
              </div>
              <Button
                icon="ph:user-circle-gear-duotone"
                className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                onClick={() => setIsProfileModalOpen(true)}
                type="button"
              />
            </div>
            <SimpleBar className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                {loading || hostLoading ? (
                  <div className="w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md text-sm p-3 flex items-center justify-center">
                    <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" />
                    Memuat grup...
                  </div>
                ) : groups.length === 0 ? (
                  <div className={`text-center py-6`}>
                      <Icon
                        icon="ph:door-duotone"
                        className="mx-auto text-4xl text-slate-400 dark:text-slate-500 mb-2"
                      />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Belum ada grup.
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Grup default seharusnya sudah diinisialisasi otomatis. Coba refresh.
                      </p>
                    </div>
                ) : (
                  groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full text-left p-3 rounded-lg flex items-center transition-colors duration-200
                        ${selectedGroupId === group.id
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50'
                        }`}
                    >
                      <Icon icon="ph:hash-duotone" className={`mr-2 text-xl ${selectedGroupId === group.id ? 'text-white' : 'text-teal-500'}`} />
                      <span className="font-medium">{group.name}</span>
                    </button>
                  ))
                )}
              </div>
            </SimpleBar>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center">
                <img
                  src={currentUser?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                  alt="User Avatar"
                  onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_GUEST_PROFILE.avatarUrl; }}
                  className="w-8 h-8 rounded-full object-cover mr-2"
                />
                <span>Masuk sebagai: <strong className="text-teal-600 dark:text-teal-300">{currentUser?.username || "Memuat..."}</strong></span>
              </div>
              {currentUser?.id && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all">ID: {currentUser.id}</p>
              )}
            </div>
          </div>

          {/* Right Panel: Chat Area */}
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50">
            {selectedGroup ? (
              <>
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex items-center">
                  <Icon icon="ph:chats-circle-duotone" className="text-3xl text-teal-500 mr-3" />
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                    {selectedGroup.name}
                  </h2>
                </div>

                <div className="flex-1 overflow-hidden">
                  <SimpleBar className="h-full p-4">
                    {/* YouTube Player Section */}
                    <div className={`${sectionCardClass} mb-6`}>
                      <h3 className={sectionTitleClass}>
                        <Icon icon="ph:youtube-logo-duotone" className="mr-2 text-xl" />
                        YouTube Bersama
                      </h3>
                      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-slate-900 mb-3">
                        {selectedGroup.currentYouTubeVideo?.videoId ? (
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${selectedGroup.currentYouTubeVideo.videoId}?autoplay=0&controls=1`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="absolute top-0 left-0"
                          ></iframe>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">
                            <Icon icon="ph:play-circle-duotone" className="text-4xl mb-2" />
                            <p>Tidak ada video yang sedang diputar.</p>
                            <p>Masukkan URL YouTube di bawah untuk memulai.</p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Textinput
                          type="text"
                          className="flex-1"
                          inputClassName="p-2"
                          placeholder="Masukkan URL YouTube..."
                          value={youtubeUrlInput}
                          onChange={(e) => setYoutubeUrlInput(e.target.value)}
                        />
                        <Button
                          text={<Icon icon="ph:paper-plane-tilt-duotone" className="text-lg" />}
                          className={`${buttonGradientBase} bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 w-12 h-12 flex-shrink-0`}
                          onClick={() => {
                            const videoId = extractVideoId(youtubeUrlInput);
                            if (videoId) {
                              handleAction('update_youtube_video', { groupId: selectedGroup.id, videoId });
                              setYoutubeUrlInput("");
                            } else {
                              toast.error("URL YouTube tidak valid.");
                            }
                          }}
                          disabled={!youtubeUrlInput.trim()}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                        Semua anggota grup dapat mengubah video YouTube.
                      </p>
                    </div>

                    {/* Chat Messages Area */}
                    <div className="space-y-4">
                      {loading && groupMessages.length === 0 && (
                          <div className="text-center py-10">
                            <Icon icon="svg-spinners:ring-resize" className="text-4xl text-teal-500 mx-auto mb-2 animate-spin" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">Memuat pesan...</p>
                          </div>
                        )}
                        {!loading && groupMessages.length === 0 && (
                          <div className={`text-center py-10`}>
                            <Icon
                              icon="ph:envelope-open-duotone"
                              className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3"
                            />
                            <p className="text-base text-slate-500 dark:text-slate-400">
                              Belum ada pesan di grup ini.
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              Kirim pesan pertama Anda!
                            </p>
                          </div>
                        )}
                      {groupMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex items-end ${
                            msg.userId === currentUser?.id ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-xl shadow-sm ${
                              msg.userId === currentUser?.id
                                ? "bg-sky-600 text-white rounded-br-none"
                                : "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-bl-none"
                            }`}
                          >
                            <div className="flex items-center mb-1">
                              <img
                                src={msg.avatarUrl || DEFAULT_GUEST_PROFILE.avatarUrl}
                                alt={msg.username}
                                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_GUEST_PROFILE.avatarUrl; }}
                                className="w-5 h-5 rounded-full mr-2 object-cover"
                              />
                              <span
                                className={`text-xs font-semibold ${
                                  msg.userId === currentUser?.id
                                    ? "text-sky-100"
                                    : "text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {msg.userId === currentUser?.id ? "Anda" : msg.username}
                              </span>
                            </div>
                            {msg.replyTo && messages.find(m => m.id === msg.replyTo) && (
                              <div className={`p-2 rounded-md border text-xs italic mb-2 ${
                                  msg.userId === currentUser?.id
                                    ? 'bg-sky-700/50 border-sky-500/50'
                                    : 'bg-slate-300/50 dark:bg-slate-700/50 border-slate-400/50 dark:border-slate-600/50'
                                }`}>
                                <p className="font-medium mb-1">
                                  Membalas {messages.find(m => m.id === msg.replyTo)?.userId === currentUser?.id ? "Anda" : messages.find(m => m.id === msg.replyTo)?.username}:
                                </p>
                                <p className="truncate">{messages.find(m => m.id === msg.replyTo)?.content}</p>
                              </div>
                            )}

                            {editMessageContent[msg.id] !== undefined ? (
                              <div className="flex flex-col space-y-2">
                                <textarea
                                  className={`${inputBaseClass} font-sans text-sm leading-relaxed min-h-[80px]`}
                                  value={editMessageContent[msg.id]}
                                  onChange={(e) => setEditMessageContent({...editMessageContent, [msg.id]: e.target.value})}
                                  rows={2}
                                />
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    text="Batal"
                                    className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded"
                                    onClick={() => {
                                      const newEditState = { ...editMessageContent };
                                      delete newEditState[msg.id];
                                      setEditMessageContent(newEditState);
                                    }}
                                    type="button"
                                  />
                                  <Button
                                    text="Simpan"
                                    className="text-xs px-2 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded"
                                    onClick={() => {
                                      handleAction('update_message', { messageId: msg.id, newContent: editMessageContent[msg.id] });
                                      const newEditState = { ...editMessageContent };
                                      delete newEditState[msg.id];
                                      setEditMessageContent(newEditState);
                                    }}
                                    type="button"
                                    disabled={!editMessageContent[msg.id].trim()}
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            )}

                            <div className="text-[10px] mt-1.5 opacity-80 flex justify-between items-center">
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                {msg.edited ? "(diedit)" : ""}
                              </span>
                              <div className="flex items-center gap-1.5 ml-2">
                                {msg.userId === currentUser?.id && (
                                  <>
                                    <Icon
                                      icon="ph:pencil-simple-duotone"
                                      onClick={() => setEditMessageContent({...editMessageContent, [msg.id]: msg.content})}
                                      className="cursor-pointer hover:text-yellow-400"
                                      title="Edit Pesan"
                                    />
                                    <Icon
                                      icon="ph:trash-duotone"
                                      onClick={() => handleAction('delete_message', { messageId: msg.id })}
                                      className="cursor-pointer hover:text-red-400"
                                      title="Hapus Pesan"
                                    />
                                  </>
                                )}
                                <Icon
                                  icon={`ph:thumbs-up-${msg.likes?.includes(currentUser?.id) ? 'fill' : 'duotone'}`}
                                  onClick={() => handleAction('toggle_reaction', { messageId: msg.id, reactionType: 'like' })}
                                  className={`cursor-pointer ${
                                    msg.likes?.includes(currentUser?.id)
                                      ? "text-green-400"
                                      : "hover:text-green-400"
                                  }`}
                                  title="Suka"
                                />
                                <span className="text-[9px]">{msg.likes?.length || 0}</span>
                                <Icon
                                  icon={`ph:thumbs-down-${msg.dislikes?.includes(currentUser?.id) ? 'fill' : 'duotone'}`}
                                  onClick={() => handleAction('toggle_reaction', { messageId: msg.id, reactionType: 'dislike' })}
                                  className={`cursor-pointer ${
                                    msg.dislikes?.includes(currentUser?.id)
                                      ? "text-orange-400"
                                      : "hover:text-orange-400"
                                  }`}
                                  title="Tidak Suka"
                                />
                                <span className="text-[9px]">{msg.dislikes?.length || 0}</span>
                                <Icon
                                  icon="ph:chat-circle-dots-duotone"
                                  className="cursor-pointer hover:text-teal-400"
                                  onClick={() => setCurrentReplyToMessage(msg)}
                                  title="Balas Pesan"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </SimpleBar>
                </div>

                {/* Message Input Area */}
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (currentMessageInput.trim()) {
                      handleAction('add_message', {
                        groupId: selectedGroup.id,
                        content: currentMessageInput,
                        replyTo: currentReplyToMessage ? currentReplyToMessage.id : null
                      });
                      setCurrentMessageInput("");
                      setCurrentReplyToMessage(null);
                    }
                  }}
                  className="flex items-end space-x-3 p-4 border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 relative flex-shrink-0"
                >
                  {currentReplyToMessage && (
                    <div className="absolute -top-10 left-0 right-0 mx-4 p-2 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200 text-xs rounded-t-lg flex items-center justify-between shadow-sm">
                      Membalas: <span className="font-semibold truncate max-w-[80%]">{currentReplyToMessage.content}</span>
                      <Button
                        icon="ph:x-bold"
                        className="text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/50 rounded-full w-5 h-5 flex items-center justify-center"
                        onClick={() => setCurrentReplyToMessage(null)}
                        type="button"
                      />
                    </div>
                  )}
                  <textarea
                    className={`${inputBaseClass} resize-none min-h-[40px] max-h-[120px] overflow-y-auto`}
                    placeholder="Ketik pesan Anda..."
                    value={currentMessageInput}
                    onChange={(e) => setCurrentMessageInput(e.target.value)}
                    rows={1}
                    onKeyPress={(e) =>
                       e.key === "Enter" &&
                       !e.shiftKey &&
                       (e.preventDefault(), handleAction('add_message', {
                         groupId: selectedGroup.id,
                         content: currentMessageInput,
                         replyTo: currentReplyToMessage ? currentReplyToMessage.id : null
                       }), setCurrentMessageInput(""), setCurrentReplyToMessage(null))
                    }
                  />
                  <Button
                    type="submit"
                    text={<Icon icon="ph:paper-plane-tilt-duotone" className="text-lg" />}
                    className={`${buttonGradientBase} bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700`}
                    disabled={!currentMessageInput.trim() || !currentUser || currentUser.username === "Guest"}
                  />
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                <div className={`flex-grow flex flex-col items-center justify-center text-center py-10`}>
                    <Icon
                      icon="ph:chat-bubbles-duotone"
                      className="text-6xl text-slate-400 dark:text-slate-500 mb-4"
                    />
                    <p className="text-lg text-slate-500 dark:text-slate-400">
                      Pilih grup untuk memulai obrolan.
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                      Atau buat grup baru jika belum ada.
                    </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Profile Modal */}
      <Modal
        title="Atur Profil Anda"
        activeModal={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          // Revert inputs if cancelled
          if (currentUser) {
            setProfileUsernameInput(currentUser.username);
            setProfileAvatarUrlInput(currentUser.avatarUrl);
          }
        }}
        className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        footerContent={
          <div className="flex justify-end space-x-2">
            <Button
              text="Batal"
              onClick={() => {
                setIsProfileModalOpen(false);
                if (currentUser) {
                  setProfileUsernameInput(currentUser.username);
                  setProfileAvatarUrlInput(currentUser.avatarUrl);
                }
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-md py-2 px-4 text-sm"
            />
            <Button
              onClick={() => {
                if (!profileUsernameInput.trim()) {
                  toast.warn("Nama pengguna tidak boleh kosong.");
                  return;
                }
                handleAction('update_user_profile', {
                  profileData: {
                    username: profileUsernameInput.trim(),
                    avatarUrl: profileAvatarUrlInput.trim() || DEFAULT_GUEST_PROFILE.avatarUrl
                  }
                });
                setIsProfileModalOpen(false);
              }}
              text="Simpan Profil"
              className={`${buttonGradientBase} bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700`}
              disabled={!profileUsernameInput.trim()}
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
                Nama Pengguna Anda *
              </span>
            }
            placeholder="Masukkan nama pengguna Anda"
            value={profileUsernameInput}
            onChange={(e) => setProfileUsernameInput(e.target.value)}
            className={inputBaseClass}
            inputClassName="p-3"
            description="Nama ini akan ditampilkan saat Anda mengirim pesan."
          />
          <div>
            <label className={labelBaseClass}>
              <Icon icon="ph:image-duotone" className="mr-2 text-xl" />
              Avatar (Opsional)
            </label>
            <div className="flex items-center space-x-3 mb-2">
              <img
                src={profileAvatarUrlInput || DEFAULT_GUEST_PROFILE.avatarUrl}
                alt="Pratinjau Avatar"
                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_GUEST_PROFILE.avatarUrl; }}
                className="w-20 h-20 rounded-full object-cover border border-slate-300 dark:border-slate-600 flex-shrink-0"
              />
              <Fileinput
                name="avatarUpload"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  if (files.length > 0) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setProfileAvatarUrlInput(reader.result);
                    };
                    reader.readAsDataURL(files[0]);
                  }
                }}
                className="flex-1"
                placeholder="Pilih gambar baru..."
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Untuk saat ini, gambar avatar akan ditampilkan langsung dari URL atau sebagai Base64.
            </p>
          </div>
        </div>
      </Modal>

      {/* Edit Message Modal (if needed, currently using inline edit) */}
      {/* If you want to use a modal for editing messages, uncomment and adapt this: */}
      {/* {editingMessage && (
        <Modal
          title="Edit Pesan"
          activeModal={true} // Set to true when editingMessage is not null
          onClose={() => {
            setEditMessageContent({}); // Clear editing state
            setEditingMessage(null);
          }}
          className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
          footerContent={
            <div className="flex justify-end space-x-2">
              <Button
                text="Batal"
                onClick={() => {
                  setEditMessageContent({});
                  setEditingMessage(null);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-md py-2 px-4 text-sm"
              />
              <Button
                onClick={() => {
                  handleAction('update_message', { messageId: editingMessage.id, newContent: editMessageContent[editingMessage.id] });
                  setEditMessageContent({});
                  setEditingMessage(null);
                }}
                text="Simpan Perubahan"
                className={`${buttonGradientBase} bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700`}
                disabled={!editMessageContent[editingMessage.id]?.trim()}
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
              value={editMessageContent[editingMessage.id] || ''}
              onChange={(e) => setEditMessageContent({ ...editMessageContent, [editingMessage.id]: e.target.value })}
              rows={5}
              className={`${inputBaseClass} font-sans text-sm leading-relaxed min-h-[80px]`}
              placeholder="Edit pesan Anda..."
            />
          </div>
        </Modal>
      )} */}
    </>
  );
};

export default ChatGroupPage;