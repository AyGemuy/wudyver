"use client";

import { useDispatch, useSelector } from "react-redux";
import { setSourceCode, setTimeoutMs, setCopied, runPlaywrightCode } from "@/components/partials/app/playwright/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import SimpleBar from "simplebar-react";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import { useState, useEffect } from "react";

const PlaywrightPage = () => {
  const dispatch = useDispatch();
  const { sourceCode, timeoutMs, loading, error, output, copied } = useSelector((state) => state.playwright);

  const [showOutputModal, setShowOutputModal] = useState(false);

  useEffect(() => {
    if (output && !error && !loading) {
      setShowOutputModal(true);
    }
  }, [output, error, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sourceCode.trim()) {
        toast.warn("Harap masukkan source code.");
        return;
    }
    dispatch(runPlaywrightCode({ sourceCode, timeout: timeoutMs }));
  };

  const copyOutputToClipboard = async () => {
    if (!output) {
        toast.info("Tidak ada output untuk disalin.");
        return;
    }
    try {
      await navigator.clipboard.writeText(output);
      dispatch(setCopied(true));
      toast.success("Output berhasil disalin!");
      setTimeout(() => dispatch(setCopied(false)), 2000);
    } catch (err) {
      console.error("Failed to copy output:", err);
      toast.error("Gagal menyalin output.");
    }
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
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="devicon:playwright" className="text-2xl" /> 
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Playwright
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Playwright Test Runner!
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-220px)] md:max-h-[calc(100vh-200px)]">
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/50">
                  <label htmlFor="sourceCode" className="block text-sm font-medium text-slate-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:code-duotone" className="mr-2 text-lg" />
                    Source Code
                  </label>
                  <Textarea
                    id="sourceCode"
                    placeholder="Masukkan kode Playwright Anda di sini..."
                    rows="10"
                    value={sourceCode}
                    onChange={(e) => dispatch(setSourceCode(e.target.value))}
                    required
                    className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md font-mono focus:ring-teal-500 focus:border-teal-500 text-sm"
                  />
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/50">
                  <label htmlFor="timeout" className="block text-sm font-medium text-slate-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:timer-duotone" className="mr-2 text-lg" />
                    Timeout (ms)
                  </label>
                  <Textinput
                    id="timeout"
                    type="number"
                    placeholder="Default: 30000"
                    value={timeoutMs}
                    min={1000}
                    step={1000}
                    onChange={(e) => dispatch(setTimeoutMs(Number(e.target.value)))}
                    required
                    className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="line-md:loading-twotone-loop" className="text-xl mr-2" />
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:play-circle-duotone" className="text-xl mr-2" />
                        Execute Script
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
            </div>
          </SimpleBar>
        </Card>
      </div>

      <Modal
        title={
            <div className="flex items-center text-slate-900 dark:text-slate-50">
              <Icon icon="ph:terminal-window-duotone" className="mr-2 h-5 w-5 flex-shrink-0 text-teal-500 dark:text-teal-400 sm:h-6 sm:w-6"/>
              <span className="text-sm font-medium sm:text-base">Playwright Output</span>
            </div>
        }
        activeModal={showOutputModal}
        onClose={() => setShowOutputModal(false)}
        className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        footerContent={
          <div className="flex flex-col sm:flex-row justify-end w-full gap-3">
            <Button
              text="Close"
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-lg py-2 px-4"
              onClick={() => setShowOutputModal(false)}
            />
            <Button
              text={
                <span className="flex items-center justify-center">
                  <Icon icon={copied ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-2" />
                  {copied ? "Tersalin!" : "Salin Output"}
                </span>
              }
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg py-2 px-4 font-medium"
              onClick={copyOutputToClipboard}
              disabled={!output || loading}
            />
          </div>
        }
      >
        {output ? (
          <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md border border-slate-200 dark:border-slate-600/50">
            <SimpleBar style={{ maxHeight: "60vh" }}>
              <SyntaxHighlighter
                language="plaintext"
                style={atomOneLight}
                customStyle={{
                    margin: 0,
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    backgroundColor: 'transparent',
                }}
                showLineNumbers={true}
                wrapLines={true}
                lineNumberStyle={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}
              >
                {output}
              </SyntaxHighlighter>
            </SimpleBar>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 py-4 text-center">Tidak ada output untuk ditampilkan.</p>
        )}
      </Modal>
    </>
  );
};

export default PlaywrightPage;