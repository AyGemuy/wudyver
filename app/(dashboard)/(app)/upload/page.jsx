"use client";

import SimpleBar from "simplebar-react";
import { useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Fileinput from "@/components/ui/Fileinput";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import axios from 'axios';

const UploaderPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHost, setSelectedHost] = useState('Catbox');
  const [availableHosts, setAvailableHosts] = useState(['Catbox']);
  const [uploadResults, setUploadResults] = useState([]);

  // Fetch available hosts on component mount
  useState(() => {
    const fetchHosts = async () => {
      try {
        const response = await axios.get('/api/tools/upload');
        setAvailableHosts(response.data.hosts);
      } catch (error) {
        console.error('Failed to fetch hosts:', error);
      }
    };
    fetchHosts();
  }, []);

  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setUploadResults([]);
  }, []);

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast.warn("Mohon pilih file untuk diupload!");
      return;
    }

    setLoading(true);
    const results = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Convert file to base64
        const base64File = await convertFileToBase64(file);
        
        // Upload file
        const response = await axios.post(`/api/tools/upload?host=${selectedHost}`, {
          file: base64File
        });

        results.push({
          fileName: file.name,
          url: response.data.result,
          success: true
        });

        toast.success(`${file.name} berhasil diupload!`);
      }

      setUploadResults(results);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload gagal: ${error.response?.data?.error || error.message}`);
      
      results.push({
        fileName: selectedFiles[0]?.name || 'Unknown',
        error: error.response?.data?.error || error.message,
        success: false
      });
      setUploadResults(results);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("URL berhasil disalin ke clipboard!");
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setUploadResults([]);
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
                <Icon icon="material-symbols:cloud-upload-outline" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                File Uploader
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Upload file ke berbagai hosting provider dan dapatkan link langsung.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <form onSubmit={handleUpload} className="space-y-4 sm:space-y-5">
                {/* Host Selection */}
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="hostSelect" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:server-duotone" className="mr-2 text-xl" />
                    Pilih Hosting Provider
                  </label>
                  <select
                    id="hostSelect"
                    value={selectedHost}
                    onChange={(e) => setSelectedHost(e.target.value)}
                    disabled={loading}
                    className="w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm p-3"
                  >
                    {availableHosts.map((host) => (
                      <option key={host} value={host}>
                        {host}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Selection */}
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="fileInput" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:file-duotone" className="mr-2 text-xl" />
                    Pilih File
                  </label>
                  <Fileinput
                    id="fileInput"
                    name="fileUpload"
                    multiple
                    selectedFiles={selectedFiles}
                    onChange={handleFileChange}
                    disabled={loading}
                    preview
                    className="w-full"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedFiles.length} file terpilih
                      </span>
                      <Button
                        text="Clear"
                        className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded"
                        onClick={clearFiles}
                        disabled={loading}
                        type="button"
                      />
                    </div>
                  )}
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" /> 
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:cloud-arrow-up-duotone" className="mr-1.5 text-lg" />
                        Upload Files
                      </span>
                    )
                  }
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70"
                  disabled={loading || selectedFiles.length === 0}
                  type="submit"
                />
              </form>

              {/* Loading State */}
              {loading && (
                <div className="mt-6 flex flex-col items-center justify-center p-6 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow">
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-teal-300">Sedang mengupload file...</p>
                </div>
              )}

              {/* Upload Results */}
              {uploadResults.length > 0 && !loading && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-300 flex items-center">
                    <Icon icon="ph:check-circle-duotone" className="mr-2 text-xl" />
                    Hasil Upload
                  </h3>
                  {uploadResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border flex items-start justify-between ${
                        result.success
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/50'
                          : 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <Icon
                            icon={result.success ? "ph:check-circle-duotone" : "ph:warning-octagon-duotone"}
                            className={`text-xl mr-2 ${
                              result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          />
                          <span className={`font-medium text-sm ${
                            result.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                          }`}>
                            {result.fileName}
                          </span>
                        </div>
                        {result.success ? (
                          <div className="ml-7">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline break-all"
                            >
                              {result.url}
                            </a>
                          </div>
                        ) : (
                          <div className="ml-7">
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {result.error}
                            </p>
                          </div>
                        )}
                      </div>
                      {result.success && (
                        <Button
                          text={<Icon icon="ph:copy-duotone" className="text-lg" />}
                          className="ml-3 p-2 bg-emerald-200 hover:bg-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-200 rounded"
                          onClick={() => copyToClipboard(result.url)}
                          type="button"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Info Box */}
              <div className="flex items-start p-3 bg-teal-50 dark:bg-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-700/50 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0">
                  <Icon icon="ph:info-duotone" className="text-lg" />
                </div>
                <div className="text-sm text-teal-700 dark:text-teal-300 pt-0.5 space-y-1">
                  <p>• Anda dapat mengupload multiple file sekaligus</p>
                  <p>• Link download akan muncul setelah upload selesai</p>
                  <p>• Klik tombol copy untuk menyalin URL ke clipboard</p>
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