"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import axios from "axios";
import { useRouter } from 'next/navigation';
import {
  setPastes,
  addPaste,
  removePaste,
  clearPastes,
  setError,
} from "@/components/partials/app/paste/store";
import apiConfig from "@/configs/apiConfig";

const PasteManager = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { pastes, error } = useSelector((state) => state.paste);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [syntax, setSyntax] = useState("text");
  const [expireIn, setExpireIn] = useState("");
  const [deleteKey, setDeleteKey] = useState("");
  const [viewKey, setViewKey] = useState("");
  const [viewedPaste, setViewedPaste] = useState(null);

  const [loadingStates, setLoadingStates] = useState({
    list: true,
    create: false,
    getView: false,
    deleteByKey: false,
    deleteListItem: null,
    clearAll: false,
  });

  const apiUrl = "/api/tools/paste/v1";
  const DELETE_PASSWORD = apiConfig.PASSWORD;

  const fetchPasteList = async () => {
    setLoadingStates((prev) => ({ ...prev, list: true }));
    try {
      const response = await axios.get(`${apiUrl}?action=list`);
      dispatch(setPastes(response.data));
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Gagal mengambil daftar paste.";
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoadingStates((prev) => ({ ...prev, list: false }));
    }
  };

  const handleCreatePaste = async () => {
    if (!content.trim()) {
      toast.warn("Konten tidak boleh kosong.");
      return;
    }
    setLoadingStates((prev) => ({ ...prev, create: true }));
    try {
      const response = await axios.post(apiUrl, {
        action: "create",
        title: title,
        content: content,
        syntax: syntax,
        expireIn: expireIn,
      });
      dispatch(addPaste(response.data));
      toast.success(`Paste berhasil dibuat dengan key: ${response.data.key}`);
      setTitle("");
      setContent("");
      setSyntax("text");
      setExpireIn("");
      fetchPasteList();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Gagal membuat paste.";
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoadingStates((prev) => ({ ...prev, create: false }));
    }
  };

  const handleGetPaste = async () => {
    if (!viewKey) {
      toast.warn("Masukkan Key untuk melihat paste.");
      return;
    }
    setLoadingStates((prev) => ({ ...prev, getView: true }));
    setViewedPaste(null);
    try {
      const response = await axios.get(`${apiUrl}?action=get&key=${viewKey}`);
      setViewedPaste(response.data);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        "Gagal mengambil paste atau paste tidak ditemukan/kadaluarsa.";
      dispatch(setError(errorMessage));
      setViewedPaste(null);
      toast.error(errorMessage);
    } finally {
      setLoadingStates((prev) => ({ ...prev, getView: false }));
    }
  };

  const handleDeletePaste = async (keyToDelete) => {
    const actualKey = keyToDelete || deleteKey;
    if (!actualKey) {
      toast.warn("Masukkan Key untuk menghapus paste.");
      return;
    }

    const enteredPassword = prompt(
      `Untuk menghapus paste (Key: ${actualKey}), masukkan password:`
    );

    if (enteredPassword === null) {
      toast.info("Penghapusan dibatalkan.");
      return;
    }

    if (enteredPassword !== DELETE_PASSWORD) {
      toast.error("Password salah. Penghapusan dibatalkan.");
      return;
    }

    if (keyToDelete) {
      setLoadingStates((prev) => ({ ...prev, deleteListItem: actualKey }));
    } else {
      setLoadingStates((prev) => ({ ...prev, deleteByKey: true }));
    }

    try {
      const response = await axios.delete(
        `${apiUrl}?action=delete&key=${actualKey}`
      );
      dispatch(removePaste(actualKey));
      toast.success(response.data.message);
      if (actualKey === deleteKey) {
        setDeleteKey("");
      }
      if (viewedPaste && viewedPaste.key === actualKey) {
        setViewedPaste(null);
      }
      fetchPasteList();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Gagal menghapus paste.";
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      if (keyToDelete) {
        setLoadingStates((prev) => ({ ...prev, deleteListItem: null }));
      } else {
        setLoadingStates((prev) => ({ ...prev, deleteByKey: false }));
      }
    }
  };

  const handleClearAllPastes = async () => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin menghapus SEMUA paste? Tindakan ini tidak dapat diurungkan."
      )
    ) {
      const enteredPassword = prompt(
        `Untuk menghapus SEMUA paste, masukkan password:`
      );

      if (enteredPassword === null) {
        toast.info("Penghapusan semua paste dibatalkan.");
        return;
      }

      if (enteredPassword !== DELETE_PASSWORD) {
        toast.error("Password salah. Penghapusan semua paste dibatalkan.");
        return;
      }

      setLoadingStates((prev) => ({ ...prev, clearAll: true }));
      try {
        const response = await axios.delete(`${apiUrl}?action=clear`);
        dispatch(clearPastes());
        toast.success(response.data.message);
        setViewedPaste(null);
      } catch (err) {
        const errorMessage =
          err.response?.data?.error || "Gagal menghapus semua paste.";
        dispatch(setError(errorMessage));
        toast.error(errorMessage);
      } finally {
        setLoadingStates((prev) => ({ ...prev, clearAll: false }));
      }
    }
  };

  const copyToClipboard = async (text, type = "key") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} berhasil disalin!`);
    } catch (err) {
      toast.error(`Gagal menyalin ${type}.`);
    }
  };

  const confirmDelete = (key, pasteTitle) => {
    const titleDisplay = pasteTitle || "(Tanpa Judul)";
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus paste "${titleDisplay}" (Key: ${key})? \nAnda akan diminta password setelah ini.`
      )
    ) {
      handleDeletePaste(key);
    }
  };

  const handleViewPastePage = (key) => {
    router.push(`/paste/${key}`);
  };

  useEffect(() => {
    fetchPasteList();
  }, []);

  const inputBaseClass =
    "w-full bg-white text-slate-900 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500";
  const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";
  const sectionTitleClass =
    "text-base sm:text-lg font-medium text-emerald-700 dark:text-emerald-400 mb-3 flex items-center";
  const sectionCardClass =
    "bg-white dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/60";

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
          } text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:clipboard-text-duotone" className="text-2xl" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-center sm:text-left bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                  Paste Manager
                </h1>
                <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-1">
                  Buat, lihat, dan kelola paste Anda.
                </p>
              </div>
            </div>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
              <div className={sectionCardClass}>
                <label className={sectionTitleClass}>
                  <Icon icon="ph:plus-circle-duotone" className="mr-2 text-xl" />
                  Buat Paste Baru
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pasteTitle" className={labelClass}>
                      Judul (Opsional)
                    </label>
                    <Textinput
                      id="pasteTitle"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={inputBaseClass}
                      placeholder="Judul Paste Anda"
                      disabled={loadingStates.create}
                    />
                  </div>
                  <div>
                    <label htmlFor="pasteSyntax" className={labelClass}>
                      Syntax Highlighting
                    </label>
                    <select
                      id="pasteSyntax"
                      className={inputBaseClass}
                      value={syntax}
                      onChange={(e) => setSyntax(e.target.value)}
                      disabled={loadingStates.create}
                    >
                      <option value="text">Plain Text</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="sql">SQL</option>
                      <option value="php">PHP</option>
                      <option value="java">Java</option>
                      <option value="csharp">C#</option>
                      <option value="cpp">C++</option>
                      <option value="ruby">Ruby</option>
                      <option value="go">Go</option>
                      <option value="markdown">Markdown</option>
                    </select>
                  </div>
                  <div className="col-span-full">
                    <label htmlFor="pasteContent" className={labelClass}>
                      Konten*
                    </label>
                    <textarea
                      id="pasteContent"
                      className={`${inputBaseClass} h-32 sm:h-40 resize-y`}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Masukkan konten paste di sini..."
                      disabled={loadingStates.create}
                      required
                    ></textarea>
                  </div>
                  <div>
                    <label htmlFor="pasteExpireIn" className={labelClass}>
                      Kadaluarsa (detik, opsional)
                    </label>
                    <Textinput
                      id="pasteExpireIn"
                      type="number"
                      value={expireIn}
                      onChange={(e) => setExpireIn(e.target.value)}
                      placeholder="Biarkan kosong agar tidak kadaluarsa"
                      className={inputBaseClass}
                      disabled={loadingStates.create}
                    />
                  </div>
                  <div className="sm:self-end">
                    <Button
                      text={loadingStates.create ? "Membuat..." : "Buat Paste"}
                      icon={
                        loadingStates.create
                          ? "svg-spinners:ring-resize"
                          : "ph:floppy-disk-back-duotone"
                      }
                      className="w-full text-white bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 rounded-md py-2.5 shadow-sm hover:shadow-md font-medium"
                      isLoading={loadingStates.create}
                      onClick={handleCreatePaste}
                    />
                  </div>
                </div>
              </div>

              <div className={sectionCardClass}>
                <label className={sectionTitleClass}>
                  <Icon
                    icon="ph:magnifying-glass-duotone"
                    className="mr-2 text-xl"
                  />
                  Lihat Paste Berdasarkan Key
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                  <div className="sm:col-span-2">
                    <label htmlFor="viewKeyInput" className={labelClass}>
                      Key Paste
                    </label>
                    <Textinput
                      id="viewKeyInput"
                      type="text"
                      value={viewKey}
                      onChange={(e) => setViewKey(e.target.value)}
                      placeholder="Masukkan Key"
                      className={inputBaseClass}
                      disabled={loadingStates.getView}
                    />
                  </div>
                  <div>
                    <Button
                      text={loadingStates.getView ? "Mencari..." : "Lihat"}
                      icon={
                        loadingStates.getView
                          ? "svg-spinners:ring-resize"
                          : "ph:eye-duotone"
                      }
                      className="w-full text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 rounded-md py-2.5 shadow-sm hover:shadow-md font-medium"
                      isLoading={loadingStates.getView}
                      onClick={handleGetPaste}
                    />
                  </div>
                </div>
                {loadingStates.getView && (
                  <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md text-center">
                    <Icon
                      icon="svg-spinners:blocks-shuffle-3"
                      className="text-3xl text-emerald-500 mx-auto mb-2"
                    />
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Memuat detail paste...
                    </p>
                  </div>
                )}
                {!loadingStates.getView && viewedPaste && (
                  <div className="mt-4 space-y-2 p-3 sm:p-4 bg-slate-100 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                    <h5 className="font-semibold text-emerald-600 dark:text-emerald-300 mb-2 text-sm">
                      Detail Paste: "{viewedPaste.title || "(Tanpa Judul)"}"
                    </h5>
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <p>
                        <strong>Key:</strong>{" "}
                        <code className="bg-slate-200 dark:bg-slate-600 px-1 rounded text-sky-700 dark:text-sky-300">
                          {viewedPaste.key}
                        </code>
                      </p>
                      <p>
                        <strong>Syntax:</strong> {viewedPaste.syntax}
                      </p>
                      {viewedPaste.expiresAt && (
                        <p>
                          <strong>Kadaluarsa:</strong>{" "}
                          {new Date(viewedPaste.expiresAt).toLocaleString()}
                        </p>
                      )}
                      <p>
                        <strong>Link (Raw):</strong>{" "}
                        <a
                          href={`/api/tools/paste/v1?action=get&key=${viewedPaste.key}&raw=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-500 hover:underline hover:text-sky-400 break-all"
                        >
                          Buka Link Raw
                        </a>
                      </p>
                    </div>
                    <p className={`${labelClass} mt-2 mb-0`}>Konten:</p>
                    <SimpleBar className="max-h-60">
                      <pre className="whitespace-pre-wrap text-sm bg-slate-200 dark:bg-slate-800 p-2 sm:p-3 rounded-md border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100">
                        {viewedPaste.content}
                      </pre>
                    </SimpleBar>
                    <div className="mt-3">
                      <Button
                        text="Lihat Halaman Paste"
                        icon="ph:arrow-square-out-duotone"
                        className="w-full text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-md py-2.5 shadow-sm hover:shadow-md font-medium"
                        onClick={() => handleViewPastePage(viewedPaste.key)}
                      />
                    </div>
                  </div>
                )}
                {!loadingStates.getView && !viewedPaste && viewKey && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50 rounded-md text-center">
                    <Icon
                      icon="ph:warning-circle-duotone"
                      className="text-2xl text-yellow-500 mx-auto mb-1"
                    />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Paste tidak ditemukan atau sudah kadaluarsa.
                    </p>
                  </div>
                )}
              </div>

              <div className={sectionCardClass}>
                <label className={sectionTitleClass}>
                  <Icon icon="ph:trash-duotone" className="mr-2 text-xl" />
                  Hapus Paste Berdasarkan Key
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                  <div className="sm:col-span-2">
                    <label htmlFor="deleteKeyInput" className={labelClass}>
                      Key Paste
                    </label>
                    <Textinput
                      id="deleteKeyInput"
                      type="text"
                      value={deleteKey}
                      onChange={(e) => setDeleteKey(e.target.value)}
                      placeholder="Masukkan Key"
                      className={inputBaseClass}
                      disabled={loadingStates.deleteByKey}
                    />
                  </div>
                  <div>
                    <Button
                      text={loadingStates.deleteByKey ? "Menghapus..." : "Hapus"}
                      icon={
                        loadingStates.deleteByKey
                          ? "svg-spinners:ring-resize"
                          : "ph:trash-simple-duotone"
                      }
                      className="w-full text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 rounded-md py-2.5 shadow-sm hover:shadow-md font-medium"
                      isLoading={loadingStates.deleteByKey}
                      onClick={() => handleDeletePaste()}
                    />
                  </div>
                </div>
              </div>

              <div className={sectionCardClass}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                  <label className={sectionTitleClass}>
                    <Icon
                      icon="ph:list-bullets-duotone"
                      className="mr-2 text-xl"
                    />
                    Daftar Semua Paste
                  </label>
                  <Button
                    text={
                      loadingStates.clearAll ? "Membersihkan..." : "Hapus Semua Paste"
                    }
                    icon={
                      loadingStates.clearAll
                        ? "svg-spinners:ring-resize"
                        : "ph:toilet-paper-duotone"
                    }
                    className="text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-md py-2 px-3 text-xs sm:text-sm shadow-sm hover:shadow font-medium whitespace-nowrap"
                    isLoading={loadingStates.clearAll}
                    disabled={
                      loadingStates.clearAll ||
                      loadingStates.list ||
                      !pastes ||
                      pastes.length === 0
                    }
                    onClick={handleClearAllPastes}
                  />
                </div>
                <SimpleBar style={{ maxHeight: "400px" }} className="-mx-1">
                  {loadingStates.list ? (
                    <div className="text-center py-10">
                      <Icon
                        icon="svg-spinners:blocks-shuffle-3"
                        className="text-4xl text-emerald-500 mb-2 mx-auto"
                      />
                      <p className="text-slate-500 dark:text-slate-400">
                        Memuat daftar paste...
                      </p>
                    </div>
                  ) : pastes && pastes.length > 0 ? (
                    <div className="space-y-3 px-1">
                      {pastes.map((paste) => (
                        <div
                          key={paste._id || paste.key}
                          className="p-3 bg-slate-50 dark:bg-slate-700/60 rounded-lg border border-slate-200 dark:border-slate-600/70 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-150 shadow-sm hover:shadow-md"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start mb-1.5">
                            <div className="flex-1 mb-2 sm:mb-0">
                              <h6
                                className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm truncate"
                                title={paste.title || "(Tanpa Judul)"}
                              >
                                {paste.title || "(Tanpa Judul)"}
                              </h6>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded-sm">
                                  {paste.syntax}
                                </span>
                                {paste.expiresAt && (
                                  <span className="text-amber-600 dark:text-amber-400 flex items-center">
                                    <Icon
                                      icon="ph:clock-countdown-duotone"
                                      className="inline mr-1 text-xs"
                                    />
                                    {new Date(paste.expiresAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 self-start sm:self-center">
                              <Button
                                icon="ph:copy-duotone"
                                onClick={() => copyToClipboard(paste.key, "Key")}
                                className="p-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white rounded"
                                title="Salin Key"
                                disabled={loadingStates.deleteListItem === paste.key}
                              />
                              <Button
                                icon="ph:link-duotone"
                                onClick={() =>
                                  copyToClipboard(
                                    `${window.location.origin}/api/tools/paste/v1?action=get&key=${paste.key}&raw=true`,
                                    "Link"
                                  )
                                }
                                className="p-1.5 text-xs bg-teal-500 hover:bg-teal-600 text-white rounded"
                                title="Salin Link Raw"
                                disabled={loadingStates.deleteListItem === paste.key}
                              />
                              <Button
                                icon="ph:eye-duotone"
                                onClick={() => handleViewPastePage(paste.key)}
                                className="p-1.5 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded"
                                title="Lihat Halaman Paste Ini"
                                disabled={loadingStates.deleteListItem === paste.key}
                              />
                              <Button
                                icon={
                                  loadingStates.deleteListItem === paste.key
                                    ? "svg-spinners:ring-resize"
                                    : "ph:trash-duotone"
                                }
                                onClick={() =>
                                  confirmDelete(paste.key, paste.title)
                                }
                                className={`p-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded ${
                                  loadingStates.deleteListItem === paste.key
                                    ? "opacity-70 cursor-wait"
                                    : ""
                                }`}
                                title="Hapus Paste"
                                disabled={loadingStates.deleteListItem === paste.key}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs">
                            <code
                              className="text-sky-600 dark:text-sky-400 bg-slate-100 dark:bg-slate-600/70 px-1.5 py-0.5 rounded text-xs truncate max-w-full sm:max-w-[calc(100%-100px)]"
                              title={paste.key}
                            >
                              Key: {paste.key}
                            </code>
                            <a
                              href={`/api/tools/paste/v1?action=get&key=${paste.key}&raw=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors duration-200"
                            >
                              <Icon icon="ph:arrow-square-out-duotone" />
                              Buka Raw
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Icon
                        icon="ph:files-duotone"
                        className="text-4xl text-slate-400 dark:text-slate-500 mb-2 mx-auto"
                      />
                      <p className="text-slate-500 dark:text-slate-400">
                        Belum ada paste yang tersimpan.
                      </p>
                    </div>
                  )}
                </SimpleBar>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default PasteManager;