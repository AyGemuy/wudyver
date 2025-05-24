"use client";

import { useDispatch, useSelector } from "react-redux";
import { setSourceCode, setTimeoutMs, setCopied, runPlaywrightCode } from "@/components/partials/app/playwright/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import SimpleBar from "simplebar-react";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const PlaywrightPage = () => {
  const dispatch = useDispatch();
  const { sourceCode, timeoutMs, loading, error, output, copied } = useSelector((state) => state.playwright);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sourceCode) return toast.error("Harap masukkan source code.");
    dispatch(runPlaywrightCode({ sourceCode, timeout: timeoutMs }));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      dispatch(setCopied(true));
      setTimeout(() => dispatch(setCopied(false)), 2000);
    } catch {
      toast.error("Gagal menyalin ke clipboard.");
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName="bg-slate-800 text-slate-200 border border-slate-700"
      />
      <div className="w-full px-2 py-6">
        <Card
          bodyClass="relative p-6 h-full overflow-hidden"
          className="w-full border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
        >
          <SimpleBar className="h-full">
            <div className="p-6 border-b border-purple-800 bg-gradient-to-r from-slate-800 to-purple-900 rounded-t-3xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-lg">
                  <Icon icon="material-symbols:theater-comedy" className="text-2xl" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                Playwright Test Runner
              </h4>
              <p className="text-sm text-center text-slate-400 mt-2">Execute and test your Playwright scripts</p>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <label className="text-sm font-medium text-purple-300 mb-2 block flex items-center">
                    <Icon icon="material-symbols:code" className="mr-2" />
                    Source Code
                  </label>
                  <Textarea
                    id="sourceCode"
                    placeholder="Masukkan kode Playwright Anda di sini..."
                    rows="8"
                    value={sourceCode}
                    onChange={(e) => dispatch(setSourceCode(e.target.value))}
                    required
                    className="w-full bg-slate-900 border-slate-700 text-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <label className="text-sm font-medium text-purple-300 mb-2 block flex items-center">
                    <Icon icon="material-symbols:timer" className="mr-2" />
                    Timeout (ms)
                  </label>
                  <Textinput
                    id="timeout"
                    type="number"
                    value={timeoutMs}
                    min={1000}
                    onChange={(e) => dispatch(setTimeoutMs(Number(e.target.value)))}
                    required
                    className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                  />
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="material-symbols:refresh" className="animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="material-symbols:play-arrow" className="mr-2" />
                        Execute
                      </span>
                    )
                  }
                  className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white rounded-xl py-4 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                  type="submit"
                  isLoading={loading}
                  disabled={loading}
                />

                {error && (
                  <div className="p-4 rounded-xl bg-rose-900 bg-opacity-30 border border-rose-700 text-rose-300 flex items-center">
                    <Icon icon="material-symbols:warning" className="text-xl mr-2" />
                    <p>{error}</p>
                  </div>
                )}
              </form>

              {output && (
                <div className="mt-6">
                  <div className="flex items-center mb-4">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white mr-2">
                      <Icon icon="material-symbols:bar-chart" className="text-lg" />
                    </span>
                    <h2 className="text-lg font-semibold text-indigo-300">Output</h2>
                  </div>

                  <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-4">
                    <SimpleBar style={{ maxHeight: 400 }}>
                      <div className="bg-slate-900 rounded-xl p-4">
                        <SyntaxHighlighter
                          language="plaintext"
                          style={{
                            ...atomOneLight,
                            hljs: {
                              display: "block",
                              overflowX: "auto",
                              padding: "1em",
                              background: "transparent",
                              color: "#e2e8f0",
                            },
                            "hljs-string": { color: "#a5d6ff" },
                            "hljs-keyword": { color: "#ff7b72" },
                            "hljs-comment": { color: "#8b949e" },
                          }}
                        >
                          {output}
                        </SyntaxHighlighter>
                      </div>
                    </SimpleBar>
                  </div>

                  <Button
                    text={
                      <span className="flex items-center justify-center">
                        <Icon icon={copied ? "material-symbols:check-circle" : "material-symbols:content-copy"} className="mr-2" />
                        {copied ? "Tersalin!" : "Salin ke Clipboard"}
                      </span>
                    }
                    className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl py-3 font-medium transition-all duration-300"
                    onClick={copyToClipboard}
                    disabled={!output}
                  />
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default PlaywrightPage;