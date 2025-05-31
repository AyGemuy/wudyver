"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";
import SimpleBar from "simplebar-react";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const HtmlToImagePage = () => {
  const [htmlInput, setHtmlInput] = useState("<h1>Hello, World!</h1>\n<p>This is a sample HTML to be converted to an image.</p>\n<style>\n  body { font-family: sans-serif; background-color: #f0f0f0; padding: 20px; color: #333; }\n  h1 { color: teal; }\n</style>");
  const [imageWidth, setImageWidth] = useState("");
  const [imageHeight, setImageHeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (imageUrl && !error && !loading) {
      setShowImageModal(true);
    }
  }, [imageUrl, error, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!htmlInput.trim()) {
      toast.warn("Harap masukkan kode HTML.");
      return;
    }

    setLoading(true);
    setError(null);
    setImageUrl(null);

    const payload = {
      html: htmlInput,
    };

    const parsedWidth = parseInt(imageWidth);
    const parsedHeight = parseInt(imageHeight);

    if (parsedWidth > 0) {
      payload.width = parsedWidth;
    }
    if (parsedHeight > 0) {
      payload.height = parsedHeight;
    }
    
    try {
      const response = await fetch("/api/tools/html2img/v5", {
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
    const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1).split('?')[0] || `image-${Date.now()}.png`;
    link.download = filename;
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
                options?.type === 'warn' ? 'bg-yellow-500 text-black' :
                'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
            }
        />
        <Card
          bodyClass="relative p-0 md:p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center justify-start">
              <div className="flex items-center">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md">
                  <Icon icon="ph:image-square-duotone" className="text-2xl" />
                </div>
                <h1 className="ml-3 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                  HTML to Image Converter
                </h1>
              </div>
            </div>
          </div>

          <SimpleBar className="max-h-[calc(100vh-220px)] md:max-h-[calc(100vh-200px)]">
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/50">
                        <label htmlFor="htmlCode" className="block text-sm font-medium text-slate-700 dark:text-teal-300 mb-2 flex items-center">
                        <Icon icon="ph:code-block-duotone" className="mr-2 text-lg" />
                        HTML Code
                        </label>
                        <Textarea
                        id="htmlCode"
                        placeholder="Masukkan kode HTML Anda di sini..."
                        rows="12"
                        value={htmlInput}
                        onChange={(e) => setHtmlInput(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md font-mono focus:ring-teal-500 focus:border-teal-500 text-sm"
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/50">
                            <label htmlFor="imageWidth" className="block text-sm font-medium text-slate-700 dark:text-teal-300 mb-2 flex items-center">
                            <Icon icon="ph:arrows-out-line-horizontal-duotone" className="mr-2 text-lg" />
                            Image Width (px) <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">(Opsional)</span>
                            </label>
                            <Textinput
                            id="imageWidth"
                            type="number"
                            placeholder="Default API"
                            value={imageWidth}
                            min={1}
                            step={10}
                            onChange={(e) => setImageWidth(e.target.value)}
                            className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/50">
                            <label htmlFor="imageHeight" className="block text-sm font-medium text-slate-700 dark:text-teal-300 mb-2 flex items-center">
                            <Icon icon="ph:arrows-out-line-vertical-duotone" className="mr-2 text-lg" />
                            Image Height (px) <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">(Opsional)</span>
                            </label>
                            <Textinput
                            id="imageHeight"
                            type="number"
                            placeholder="Default API"
                            value={imageHeight}
                            min={1}
                            step={10}
                            onChange={(e) => setImageHeight(e.target.value)}
                            className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="line-md:loading-twotone-loop" className="text-xl mr-2" />
                        Generating Image...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:image-duotone" className="text-xl mr-2" />
                        Generate Image
                      </span>
                    )
                  }
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-lg py-2.5 sm:py-3 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                  type="submit"
                  isLoading={loading}
                  disabled={loading}
                />

                {error && !loading && (
                  <div className="mt-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-600/70 flex items-start text-sm">
                    <Icon icon="ph:warning-octagon-duotone" className="text-xl mr-2.5 mt-0.5 flex-shrink-0" />
                    <p className="whitespace-pre-wrap break-all">{error}</p>
                  </div>
                )}
              </form>

              {imageUrl && !loading && (
                <div className="mt-6 bg-slate-50 dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/50">
                  <h3 className="text-lg font-medium text-slate-800 dark:text-teal-300 mb-3 flex items-center">
                    <Icon icon="ph:image-preview-duotone" className="mr-2 text-xl" />
                    Live Preview
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
                                Download Image
                            </span>
                        }
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 px-4 font-medium"
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
                        className="flex-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg py-2 px-4 font-medium"
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
                <span className="text-sm font-medium sm:text-base">Generated Image</span>
            </div>
        }
        activeModal={showImageModal}
        onClose={() => setShowImageModal(false)}
        className="max-w-3xl lg:max-w-4xl"
        themeClass="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl"
        footerContent={
          <div className="flex flex-col sm:flex-row justify-end w-full gap-3">
            <Button
              text="Close"
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-lg py-2 px-4"
              onClick={() => setShowImageModal(false)}
            />
             <Button
              text={
                <span className="flex items-center justify-center">
                  <Icon icon="ph:download-duotone" className="mr-2" />
                  Download Image
                </span>
              }
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 px-4 font-medium"
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
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg py-2 px-4 font-medium"
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