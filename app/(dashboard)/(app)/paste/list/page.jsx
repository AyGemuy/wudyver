"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ToastContainer, toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import axios from "axios";
import { useRouter } from 'next/navigation';
import {
  setPastes,
  removePaste,
  clearPastes,
  setError,
} from "@/components/partials/app/paste/store";
import apiConfig from "@/configs/apiConfig";

const PasteListPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { pastes, error } = useSelector((state) => state.paste);

  const [loadingStates, setLoadingStates] = useState({
    list: true,
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

  const handleDeletePaste = async (keyToDelete, pasteTitle) => {
    const actualKey = keyToDelete;
    if (!actualKey) {
      toast.warn("Key untuk menghapus paste tidak ditemukan.");
      return;
    }

    const enteredPassword = prompt(
      `Untuk menghapus paste "${pasteTitle || '(Tanpa Judul)'}" (Key: ${actualKey}), masukkan password:`
    );

    if (enteredPassword === null) {
      toast.info("Penghapusan dibatalkan.");
      return;
    }

    if (enteredPassword !== DELETE_PASSWORD) {
      toast.error("Password salah. Penghapusan dibatalkan.");
      return;
    }

    setLoadingStates((prev) => ({ ...prev, deleteListItem: actualKey }));

    try {
      const response = await axios.delete(
        `${apiUrl}?action=delete&key=${actualKey}`
      );
      dispatch(removePaste(actualKey));
      toast.success(response.data.message);
      fetchPasteList(); // Muat ulang daftar untuk memastikan konsistensi
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Gagal menghapus paste.";
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoadingStates((prev) => ({ ...prev, deleteListItem: null }));
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
      handleDeletePaste(key, pasteTitle);
    }
  };

  const handleViewPastePage = (key) => {
    router.push(`/paste/${key}`);
  };

  useEffect(() => {
    fetchPasteList();
  }, []);

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
              <div className="ml-0 sm:ml-4">
                <h1 className="text-xl md:text-2xl font-bold text-center sm:text-left bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                  Daftar Paste
                </h1>
                <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-1">
                  Lihat dan kelola semua paste Anda di sini.
                </p>
              </div>
            </div>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
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

export default PasteListPage;