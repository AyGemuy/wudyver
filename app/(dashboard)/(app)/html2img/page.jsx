"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Fileinput from "@/components/ui/Fileinput";
import Modal from "@/components/ui/Modal";
import SimpleBar from "simplebar-react";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const HtmlToImagePage = () => {
  const [htmlInput, setHtmlInput] = useState("<h1>Hello, World!</h1>\n<p>This is a sample HTML to be converted to an image.</p>\n<style>\n  body { font-family: sans-serif; background-color: #f0f0f0; padding: 20px; color: #333; }\n  h1 { color: teal; }\n</style>");
  const [imageWidth, setImageWidth] = useState("");
  const [imageHeight, setImageHeight] = useState("");
  const [apiVersion, setApiVersion] = useState("v5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const [inputMode, setInputMode] = useState('text');
  const [selectedHtmlFile, setSelectedHtmlFile] = useState(null);

  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const labelBaseClass = "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center";
  const sectionCardClass = "bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow";
  const sectionTitleClass = "text-lg font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center";
  const buttonGradientBase = "text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed";

  useEffect(() => {
    if (imageUrl && !error && !loading) {
      setShowImageModal(true);
    }
  }, [imageUrl, error, loading]);

  const readHtmlFile = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }, []);

  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type !== 'text/html') {
        toast.error("Hanya file HTML (.html) yang diizinkan.");
        setSelectedHtmlFile(null);
        setHtmlInput("");
        return;
      }
      setSelectedHtmlFile(file);
      readHtmlFile(file)
        .then(content => setHtmlInput(content))
        .catch(err => {
          toast.error("Gagal membaca file HTML.");
          console.error("Error reading HTML file:", err);
          setHtmlInput("");
        });
    } else {
      setSelectedHtmlFile(null);
      setHtmlInput("");
    }
  }, [readHtmlFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let htmlContentToConvert = htmlInput;

    if (inputMode === 'file' && selectedHtmlFile) {
        if (!htmlContentToConvert.trim()) {
            toast.warn("Konten file HTML kosong.");
            return;
        }
    } else if (inputMode === 'text') {
        if (!htmlContentToConvert.trim()) {
            toast.warn("Harap masukkan kode HTML untuk dikonversi.");
            return;
        }
    } else {
        toast.warn("Pilih mode input dan sediakan konten HTML.");
        return;
    }

    setLoading(true);
    setError(null);
    setImageUrl(null);
    setShowImageModal(false);

    const payload = {
      html: htmlContentToConvert,
    };

    const parsedWidth = parseInt(imageWidth);
    const parsedHeight = parseInt(imageHeight);

    if (!isNaN(parsedWidth) && parsedWidth > 0) {
      payload.width = parsedWidth;
    }
    if (!isNaN(parsedHeight) && parsedHeight > 0) {
      payload.height = parsedHeight;
    }

    try {
      const apiEndpoint = `/api/tools/html2img/${apiVersion}`;
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `Gagal menghasilkan gambar (Status: ${response.status})`);
      }

      if (responseData.url) {
        setImageUrl(responseData.url);
        toast.success("Gambar berhasil dibuat!");
      } else {
        throw new Error("URL gambar tidak ditemukan dalam respons.");
      }
    } catch (err) {
      console.error("Failed to generate image:", err);
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyImageUrlToClipboard = async () => {
    if (!imageUrl) {
      toast.info("Tidak ada URL gambar untuk disalin.");
      return;
    }
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopiedUrl(true);
      toast.success("URL Gambar berhasil disalin!");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      toast.error("Gagal menyalin URL gambar.");
    }
  };

  const handleDownloadImage = () => {
    if (!imageUrl) {
      toast.info("Tidak ada gambar untuk diunduh.");
      return;
    }
    const link = document.createElement('a');
    link.href = imageUrl;
    const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1).split('?')[0];
    link.download = filename || `html-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Unduhan gambar dimulai!");
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
          bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:image-square-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                HTML to Image
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Konversi kode HTML dan CSS Anda menjadi file gambar.
            </p>
          </div>

          <SimpleBar className="flex-grow max-h-[calc(100vh-220px)] md:max-h-[calc(100vh-200px)]">
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={sectionCardClass}>
                        <label htmlFor="htmlCode" className={labelBaseClass}>
                            <Icon icon="ph:code-block-duotone" className="mr-2 text-lg" />
                            Sumber HTML
                        </label>

                        <div className="flex mb-3">
                            <Button
                                type="button"
                                text="Teks Langsung"
                                className={`flex-1 text-xs py-2 rounded-l-md transition-colors ${inputMode === 'text' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                                onClick={() => {
                                    setInputMode('text');
                                    setSelectedHtmlFile(null);
                                }}
                            />
                            <Button
                                type="button"
                                text="Unggah File HTML"
                                className={`flex-1 text-xs py-2 rounded-r-md transition-colors ${inputMode === 'file' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                                onClick={() => {
                                    setInputMode('file');
                                    setHtmlInput("");
                                }}
                            />
                        </div>

                        {inputMode === 'text' ? (
                            <Textarea
                                id="htmlCode"
                                placeholder="Masukkan kode HTML Anda di sini..."
                                rows="12"
                                value={htmlInput}
                                onChange={(e) => setHtmlInput(e.target.value)}
                                required
                                className={`${inputBaseClass} font-mono`}
                                disabled={loading}
                            />
                        ) : (
                            <Fileinput
                                id="htmlFileInput"
                                name="htmlFile"
                                selectedFiles={selectedHtmlFile ? [selectedHtmlFile] : []}
                                onChange={handleFileChange}
                                disabled={loading}
                                preview={false}
                                accept=".html"
                                className="w-full"
                            />
                        )}

                        {inputMode === 'file' && selectedHtmlFile && (
                            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 flex items-center">
                                <Icon icon="ph:file-html-duotone" className="mr-2 text-lg" />
                                File dipilih: <span className="font-medium truncate ml-1">{selectedHtmlFile.name}</span>
                            </div>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Termasuk tag `&lt;style&gt;` untuk styling.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className={sectionCardClass}>
                            <label htmlFor="apiVersion" className={labelBaseClass}>
                                <Icon icon="ph:git-commit-duotone" className="mr-2 text-lg" />
                                Versi API <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">(Opsional)</span>
                            </label>
                            <Textinput
                                id="apiVersion"
                                type="text"
                                placeholder="v5"
                                value={apiVersion}
                                onChange={(e) => setApiVersion(e.target.value)}
                                className={inputBaseClass}
                                disabled={loading}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Versi *endpoint* API yang akan digunakan (mis. `v1`, `v2`, `v5`).
                            </p>
                        </div>

                        <div className={sectionCardClass}>
                            <label htmlFor="imageWidth" className={labelBaseClass}>
                                <Icon icon="ph:arrows-out-line-horizontal-duotone" className="mr-2 text-lg" />
                                Lebar Gambar (px) <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">(Opsional)</span>
                            </label>
                            <Textinput
                                id="imageWidth"
                                type="number"
                                placeholder="Auto (lebar konten HTML)"
                                value={imageWidth}
                                min={1}
                                step={10}
                                onChange={(e) => setImageWidth(e.target.value)}
                                className={inputBaseClass}
                                disabled={loading}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              Tetapkan lebar piksel untuk gambar yang dihasilkan.
                            </p>
                        </div>

                        <div className={sectionCardClass}>
                            <label htmlFor="imageHeight" className={labelBaseClass}>
                                <Icon icon="ph:arrows-out-line-vertical-duotone" className="mr-2 text-lg" />
                                Tinggi Gambar (px) <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">(Opsional)</span>
                            </label>
                            <Textinput
                                id="imageHeight"
                                type="number"
                                placeholder="Auto (tinggi konten HTML)"
                                value={imageHeight}
                                min={1}
                                step={10}
                                onChange={(e) => setImageHeight(e.target.value)}
                                className={inputBaseClass}
                                disabled={loading}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              Tetapkan tinggi piksel untuk gambar yang dihasilkan.
                            </p>
                        </div>
                    </div>
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="svg-spinners:ring-resize" className="text-xl mr-2" />
                        Menghasilkan Gambar...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:file-image-duotone" className="text-xl mr-2" />
                        Hasilkan Gambar
                      </span>
                    )
                  }
                  className={`${buttonGradientBase} w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 rounded-lg py-2.5 sm:py-3`}
                  type="submit"
                  isLoading={loading}
                  disabled={loading || (inputMode === 'text' && !htmlInput.trim()) || (inputMode === 'file' && !selectedHtmlFile)}
                />

                {error && !loading && (
                  <div className="mt-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-600/70 flex items-start text-sm">
                    <Icon icon="ph:warning-octagon-duotone" className="text-xl mr-2.5 mt-0.5 flex-shrink-0" />
                    <p className="whitespace-pre-wrap break-all">{error}</p>
                  </div>
                )}
              </form>

              {imageUrl && !loading && (
                <div className={`mt-6 ${sectionCardClass}`}>
                  <h3 className={sectionTitleClass}>
                    <Icon icon="ph:image-preview-duotone" className="mr-2 text-xl" />
                    Pratinjau Langsung
                  </h3>
                  <div className="max-w-full overflow-hidden rounded-md border border-slate-300 dark:border-slate-600">
                    <img
                        src={imageUrl}
                        alt="Generated Preview"
                        className="w-full h-auto object-contain max-h-[500px] bg-white dark:bg-slate-200 cursor-pointer"
                        onClick={() => setShowImageModal(true)}
                    />
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <Button
                        text={
                            <span className="flex items-center justify-center">
                                <Icon icon="ph:download-duotone" className="mr-2" />
                                Unduh Gambar
                            </span>
                        }
                        className={`${buttonGradientBase} flex-1 bg-emerald-500 hover:bg-emerald-600 rounded-lg py-2 px-4`}
                        onClick={handleDownloadImage}
                        disabled={!imageUrl || loading}
                    />
                    <Button
                        text={
                            <span className="flex items-center justify-center">
                                <Icon icon={copiedUrl ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-2" />
                                {copiedUrl ? "URL Tersalin!" : "Salin URL Gambar"}
                            </span>
                        }
                        className={`${buttonGradientBase} flex-1 bg-sky-500 hover:bg-sky-600 rounded-lg py-2 px-4`}
                        onClick={copyImageUrlToClipboard}
                        disabled={!imageUrl || loading}
                    />
                  </div>
                </div>
              )}

            </div>
          </SimpleBar>
        </Card>
      </div>

      <Modal
        title={
            <div className="flex items-center text-slate-900 dark:text-slate-50">
                <Icon icon="ph:image-file-duotone" className="mr-2 h-5 w-5 flex-shrink-0 text-teal-500 dark:text-teal-400 sm:h-6 sm:w-6"/>
                <span className="text-sm font-medium sm:text-base">Gambar yang Dihasilkan</span>
            </div>
        }
        activeModal={showImageModal}
        onClose={() => setShowImageModal(false)}
        className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        footerContent={
          <div className="flex flex-col sm:flex-row justify-end w-full gap-3">
            <Button
              text="Tutup"
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-lg py-2 px-4"
              onClick={() => setShowImageModal(false)}
            />
             <Button
              text={
                <span className="flex items-center justify-center">
                  <Icon icon="ph:download-duotone" className="mr-2" />
                  Unduh Gambar
                </span>
              }
              className={`${buttonGradientBase} bg-emerald-500 hover:bg-emerald-600 rounded-lg py-2 px-4`}
              onClick={handleDownloadImage}
              disabled={!imageUrl || loading}
            />
            <Button
              text={
                <span className="flex items-center justify-center">
                  <Icon icon={copiedUrl ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-2" />
                  {copiedUrl ? "URL Tersalin!" : "Salin URL"}
                </span>
              }
              className={`${buttonGradientBase} bg-sky-500 hover:bg-sky-600 rounded-lg py-2 px-4`}
              onClick={copyImageUrlToClipboard}
              disabled={!imageUrl || loading}
            />
          </div>
        }
      >
        {imageUrl ? (
          <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md border border-slate-200 dark:border-slate-600/50">
            <SimpleBar style={{ maxHeight: "70vh" }}>
              <img
                src={imageUrl}
                alt="Generated Output"
                className="w-full h-auto object-contain rounded bg-white dark:bg-slate-200"
              />
            </SimpleBar>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 py-4 text-center">Tidak ada gambar untuk ditampilkan.</p>
        )}
      </Modal>
    </>
  );
};

export default HtmlToImagePage;