"use client";

import SimpleBar from "simplebar-react";
import { useState, useCallback, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Fileinput from "@/components/ui/Fileinput";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import axios from 'axios';

const UploaderPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hostLoading, setHostLoading] = useState(true);
  const [selectedHost, setSelectedHost] = useState('Catbox');
  const [availableHosts, setAvailableHosts] = useState([]);
  const [uploadResults, setUploadResults] = useState([]);
  const [showJsonResponse, setShowJsonResponse] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  useEffect(() => {
    const fetchHosts = async () => {
      setHostLoading(true);
      try {
        const response = await axios.get('/api/tools/upload');
        setAvailableHosts(response.data.hosts);
        if (response.data.hosts.length > 0) {
          setSelectedHost(response.data.hosts[0]);
        }
      } catch (error) {
        console.error('Gagal mengambil daftar host:', error);
        toast.error('Gagal memuat daftar host. Silakan coba lagi.');
      } finally {
        setHostLoading(false);
      }
    };
    fetchHosts();
  }, []);

  const handleFileChange = useCallback((e) => {
    const newFiles = Array.from(e.target.files);
    
    if (newFiles.length === 0) return;

    // Check for duplicate files based on name and size
    const existingFileKeys = selectedFiles.map(file => `${file.name}-${file.size}`);
    const uniqueNewFiles = newFiles.filter(file => {
      const fileKey = `${file.name}-${file.size}`;
      return !existingFileKeys.includes(fileKey);
    });

    if (uniqueNewFiles.length === 0) {
      toast.warn("Semua file yang dipilih sudah ada dalam daftar!");
      return;
    }

    // Add unique files to existing selection
    setSelectedFiles(prev => [...prev, ...uniqueNewFiles]);
    
    // Show success message
    const duplicateCount = newFiles.length - uniqueNewFiles.length;
    toast.success(
      `${uniqueNewFiles.length} file ditambahkan!${
        duplicateCount > 0 ? ` (${duplicateCount} file duplikat diabaikan)` : ''
      }`
    );

    // Clear the input value so the same files can be selected again if needed
    e.target.value = '';
  }, [selectedFiles]);

  const removeFile = useCallback((indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    toast.info("File dihapus dari daftar");
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.warn("Mohon pilih file untuk diunggah!");
      return;
    }

    setLoading(true);
    const results = [];
    const totalFiles = selectedFiles.length;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'mengunggah', progress: 0 }
        }));

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await axios.post(`/api/tools/upload?host=${selectedHost}`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: { status: 'mengunggah', progress: percentCompleted }
              }));
            }
          });

          const result = {
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(2) + ' KB',
            url: response.data.result,
            success: true,
            rawResponse: response.data,
            timestamp: new Date().toLocaleString()
          };

          results.push(result);

          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: 'berhasil', progress: 100 }
          }));

          toast.success(`${file.name} berhasil diunggah! (${i + 1}/${totalFiles})`);
        } catch (fileError) {
          const errorResult = {
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(2) + ' KB',
            error: fileError.response?.data?.error || fileError.message,
            success: false,
            rawResponse: fileError.response?.data || { error: fileError.message },
            timestamp: new Date().toLocaleString()
          };

          results.push(errorResult);

          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: 'gagal', progress: 0 }
          }));

          toast.error(`${file.name} gagal diunggah: ${errorResult.error}`);
        }
      }

      setUploadResults(results);

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`Unggah selesai! ${successCount} berhasil${failCount > 0 ? `, ${failCount} gagal` : ''}`);
      }
    } catch (error) {
      console.error('Kesalahan unggah:', error);
      toast.error(`Unggah gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type = 'URL') => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} berhasil disalin ke clipboard!`);
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setUploadResults([]);
    setUploadProgress({});
  };

  const downloadAllUrls = () => {
    const successResults = uploadResults.filter(r => r.success);
    const urls = successResults.map(r => r.url).join('\n');
    const blob = new Blob([urls], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upload-urls.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="w-full px-2 sm:px-4 py-6">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          theme="colored"
          toastClassName={(options) =>
            `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer
            ${options?.type === 'success' ? 'bg-emerald-500 text-white' :
              options?.type === 'error' ? 'bg-red-500 text-white' :
              options?.type === 'warn' ? 'bg-yellow-500 text-white' :
              'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
          }
        />
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:cloud-arrow-up-bold" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Unggah File
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Unggah banyak file ke berbagai penyedia hosting dan dapatkan tautan langsung.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <form onSubmit={handleUpload} className="space-y-4 sm:space-y-5">
                {/* Host Selection */}
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="hostSelect" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:globe-stand-bold" className="mr-2 text-xl" />
                    Pilih Penyedia Hosting
                  </label>
                  {hostLoading ? (
                    <div className="w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md text-sm p-3 flex items-center">
                      <Icon icon="ph:spinner-gap-bold" className="animate-spin mr-2 text-lg" />
                      Memuat host...
                    </div>
                  ) : (
                    <select
                      id="hostSelect"
                      value={selectedHost}
                      onChange={(e) => setSelectedHost(e.target.value)}
                      disabled={loading || hostLoading}
                      className="w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm p-3"
                    >
                      {availableHosts.map((host) => (
                        <option key={host} value={host}>
                          {host}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* File Selection */}
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="fileInput" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:folder-fill" className="mr-2 text-xl" />
                    Pilih File (Banyak)
                  </label>
                  <Fileinput
                    id="fileInput"
                    name="fileUpload"
                    multiple
                    selectedFiles={[]} // Always show empty to allow continuous selection
                    onChange={handleFileChange}
                    disabled={loading}
                    preview={false} // Disable preview since we'll show our own list
                    className="w-full"
                  />
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center">
                    <Icon icon="ph:info-bold" className="mr-1" />
                    Pilih file satu per satu atau sekaligus. File akan ditambahkan ke daftar yang sudah ada.
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                          <Icon icon="ph:file-image-bold" className="mr-1 text-base" />
                          {selectedFiles.length} file dipilih
                        </span>
                        <Button
                          text="Bersihkan Semua"
                          className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded flex items-center"
                          onClick={clearFiles}
                          disabled={loading}
                          type="button"
                        />
                      </div>

                      {/* Enhanced File List Preview */}
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-xs bg-white dark:bg-slate-700/50 p-2 rounded border">
                            <div className="flex items-center min-w-0 flex-1">
                              <Icon icon="ph:file-text-bold" className="mr-2 text-slate-500 flex-shrink-0" />
                              <span className="truncate text-slate-700 dark:text-slate-300">{file.name}</span>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <span className="text-slate-500 dark:text-slate-400">
                                {formatFileSize(file.size)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                disabled={loading}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                title="Hapus file"
                              >
                                <Icon icon="ph:x-bold" className="text-xs" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:spinner-gap-bold" className="animate-spin mr-2 text-lg" />
                        Mengunggah...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:upload-bold" className="mr-1.5 text-lg" />
                        Unggah {selectedFiles.length > 0 ? `${selectedFiles.length} File` : 'File'}
                      </span>
                    )
                  }
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70"
                  disabled={loading || selectedFiles.length === 0 || hostLoading}
                  type="submit"
                />
              </form>

              {/* Loading State with Progress */}
              {loading && (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow">
                    <Icon icon="ph:cloud-arrow-up-bold" className="text-4xl text-teal-500 mb-3 animate-pulse" />
                    <p className="text-sm text-slate-600 dark:text-teal-300">Sedang mengunggah {selectedFiles.length} file...</p>
                  </div>

                  {/* Progress for each file */}
                  <div className="space-y-2">
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{fileName}</span>
                          <Icon
                            icon={
                              progress.status === 'mengunggah' ? "ph:spinner-gap-bold" :
                              progress.status === 'berhasil' ? "ph:check-circle-bold" :
                              "ph:x-circle-bold"
                            }
                            className={`text-sm ml-2 ${
                              progress.status === 'mengunggah' ? 'text-blue-500 animate-spin' :
                              progress.status === 'berhasil' ? 'text-green-500' :
                              'text-red-500'
                            }`}
                          />
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              progress.status === 'berhasil' ? 'bg-green-500' :
                              progress.status === 'gagal' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${progress.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Results */}
              {uploadResults.length > 0 && !loading && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-300 flex items-center">
                      <Icon icon="ph:receipt-bold" className="mr-2 text-xl" />
                      Hasil Unggah ({uploadResults.length})
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Button
                        text={
                          <span className="flex items-center">
                            <Icon icon="ph:code-bold" className="mr-1 text-sm" />
                            {showJsonResponse ? 'Sembunyikan JSON' : 'Tampilkan JSON'}
                          </span>
                        }
                        className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded"
                        onClick={() => setShowJsonResponse(!showJsonResponse)}
                        type="button"
                      />
                      {uploadResults.some(r => r.success) && (
                        <Button
                          text={
                            <span className="flex items-center">
                              <Icon icon="ph:download-bold" className="mr-1 text-sm" />
                              Unduh URL
                            </span>
                          }
                          className="text-xs px-3 py-1 bg-teal-200 hover:bg-teal-300 dark:bg-teal-600 dark:hover:bg-teal-700 text-teal-700 dark:text-teal-200 rounded"
                          onClick={downloadAllUrls}
                          type="button"
                        />
                      )}
                    </div>
                  </div>

                  {uploadResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.success
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/50'
                          : 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-2">
                            <Icon
                              icon={result.success ? "ph:check-circle-bold" : "ph:warning-circle-bold"}
                              className={`text-xl mr-2 ${
                                result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <span className={`font-medium text-sm ${
                                result.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                              }`}>
                                {result.fileName}
                              </span>
                              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1 space-x-3">
                                <span className="flex items-center">
                                  <Icon icon="ph:stack-bold" className="mr-1" />
                                  {result.fileSize}
                                </span>
                                <span className="flex items-center">
                                  <Icon icon="ph:clock-bold" className="mr-1" />
                                  {result.timestamp}
                                </span>
                              </div>
                            </div>
                          </div>

                          {result.success ? (
                            <div className="ml-7 space-y-2">
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline break-all flex items-center"
                              >
                                <Icon icon="ph:link-bold" className="mr-1 text-base flex-shrink-0" />
                                {result.url}
                              </a>

                              {showJsonResponse && (
                                <div className="mt-3 p-3 bg-slate-800 dark:bg-slate-900 rounded text-xs text-green-400 font-mono overflow-x-auto">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400">Respons JSON Mentah:</span>
                                    <Button
                                      text={<Icon icon="ph:copy-bold" className="text-sm" />}
                                      className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                                      onClick={() => copyToClipboard(JSON.stringify(result.rawResponse, null, 2), 'Respons JSON')}
                                      type="button"
                                    />
                                  </div>
                                  <pre>{JSON.stringify(result.rawResponse, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="ml-7 space-y-2">
                              <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                                <Icon icon="ph:warning-bold" className="mr-1 text-base flex-shrink-0" />
                                {result.error}
                              </p>

                              {showJsonResponse && (
                                <div className="mt-3 p-3 bg-slate-800 dark:bg-slate-900 rounded text-xs text-red-400 font-mono overflow-x-auto">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400">Respons Error Mentah:</span>
                                    <Button
                                      text={<Icon icon="ph:copy-bold" className="text-sm" />}
                                      className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                                      onClick={() => copyToClipboard(JSON.stringify(result.rawResponse, null, 2), 'Respons Error')}
                                      type="button"
                                    />
                                  </div>
                                  <pre>{JSON.stringify(result.rawResponse, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {result.success && (
                          <Button
                            text={<Icon icon="ph:copy-bold" className="text-lg" />}
                            className="ml-3 p-2 bg-emerald-200 hover:bg-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-200 rounded"
                            onClick={() => copyToClipboard(result.url)}
                            type="button"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Enhanced Info Box */}
              <div className="flex items-start p-3 bg-teal-50 dark:bg-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-700/50 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0">
                  <Icon icon="ph:info-bold" className="text-lg" />
                </div>
                <div className="text-sm text-teal-700 dark:text-teal-300 pt-0.5 space-y-1">
                  <p>• Pilih file satu per satu atau sekaligus - file akan ditambahkan ke daftar</p>
                  <p>• Hapus file individual dengan tombol X di sebelah nama file</p>
                  <p>• Sistem otomatis mencegah duplikasi file berdasarkan nama dan ukuran</p>
                  <p>• Lihat respons JSON mentah untuk debugging</p>
                  <p>• Unduh semua URL hasil unggah sebagai file teks</p>
                </div>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default UploaderPage;