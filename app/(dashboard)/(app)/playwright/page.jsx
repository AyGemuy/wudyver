"use client"

import { useDispatch, useSelector } from "react-redux"
import { setSourceCode, setTimeoutMs, setCopied, runPlaywrightCode } from "@/components/partials/app/playwright/store"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Textinput from "@/components/ui/Textinput"
import Textarea from "@/components/ui/Textarea"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs"
import SimpleBar from "simplebar-react"
import { ToastContainer, toast } from "react-toastify"

const PlaywrightPage = () => {
  const dispatch = useDispatch()
  const { sourceCode, timeoutMs, loading, error, output, copied } = useSelector((state) => state.playwright)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!sourceCode) return toast.error("Harap masukkan source code.")
    dispatch(runPlaywrightCode({ sourceCode, timeout: timeoutMs }))
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output)
      dispatch(setCopied(true))
      setTimeout(() => dispatch(setCopied(false)), 2000)
    } catch {
      toast.error("Gagal menyalin ke clipboard.")
    }
  }

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
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
                <span className="text-2xl">🎭</span>
              </div>
              <h1 className="ml-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                Playwright Test Runner
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <label className="text-sm font-medium text-indigo-300 mb-2 block flex items-center">
                  <span className="mr-2">📝</span>Source Code
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
                <label className="text-sm font-medium text-indigo-300 mb-2 block flex items-center">
                  <span className="mr-2">⏱️</span>Timeout (ms)
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
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl py-4 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⟳</span> Memproses...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">▶️</span> Execute
                  </span>
                )}
              </Button>

              {error && (
                <div className="p-4 rounded-xl bg-rose-900 bg-opacity-30 border border-rose-700 text-rose-300 flex items-center">
                  <span className="text-xl mr-2">⚠️</span>
                  <p>{error}</p>
                </div>
              )}
            </form>
          </Card>

          <div className="mt-6" />

          {output && (
            <Card
              bodyClass="relative p-6 h-full overflow-hidden"
              className="w-full border border-indigo-700 rounded-3xl shadow-lg bg-slate-900 text-slate-100 backdrop-blur-sm bg-opacity-40"
            >
              <div className="flex items-center mb-4">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white mr-2">
                  <span className="text-lg">📊</span>
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
                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl py-3 font-medium transition-all duration-300 flex items-center justify-center"
                onClick={copyToClipboard}
                disabled={!output}
              >
                <span className="mr-2">{copied ? "✅" : "📋"}</span>
                {copied ? "Tersalin!" : "Salin ke Clipboard"}
              </Button>
            </Card>
          )}
        </div>
    </>
  )
}

export default PlaywrightPage
