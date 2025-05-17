"use client"

import SimpleBar from "simplebar-react"
import { useDispatch, useSelector } from "react-redux"
import useWidth from "@/hooks/useWidth"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Textinput from "@/components/ui/Textinput"
import { ToastContainer, toast } from "react-toastify"
import { setUrl, beautifyZip } from "@/components/partials/app/beauty-js/store"

const BeautyPage = () => {
  const dispatch = useDispatch()
  const { url, loading } = useSelector((state) => state.beauty)
  const { width, breakpoints } = useWidth()

  const handleUrlChange = (e) => {
    dispatch(setUrl(e.target.value))
  }

  const handleBeautify = () => {
    if (!url.trim()) {
      toast.warn("Mohon masukkan URL ZIP")
      return
    }
    dispatch(beautifyZip(url))
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
          <SimpleBar className="h-full">
            <div className="p-6 border-b border-purple-800 bg-gradient-to-r from-slate-800 to-purple-900 rounded-t-3xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-lg">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
              <h4 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                Beautify ZIP File
              </h4>
              <p className="text-sm text-center text-slate-400 mt-2">Extract and beautify JS/CSS files from ZIP</p>
            </div>

            <div className="p-6">
              <div className="mb-6 bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <label className="block text-sm font-medium text-purple-300 mb-3 flex items-center">
                  <span className="mr-2">🔗</span>
                  Masukkan URL ZIP
                </label>
                <Textinput
                  id="pn"
                  type="text"
                  placeholder="https://example.com/file.zip"
                  value={url}
                  onChange={handleUrlChange}
                  className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                />
              </div>

              <Button
                text={
                  loading ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-2">⟳</span> Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <span className="mr-2">✨</span> Beautify
                    </span>
                  )
                }
                className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white rounded-xl py-4 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                isLoading={loading}
                disabled={loading}
                onClick={handleBeautify}
              />

              <div className="mt-6 flex items-center p-4 bg-slate-800 rounded-xl border border-slate-700">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900 text-blue-300 mr-3">
                  <span className="text-lg">ℹ️</span>
                </div>
                <span className="text-sm text-slate-300">File akan otomatis terdownload setelah proses selesai</span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                  <span className="text-2xl mb-2">🔍</span>
                  <span className="text-xs text-slate-400 text-center">Extract</span>
                </div>
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                  <span className="text-2xl mb-2">🧹</span>
                  <span className="text-xs text-slate-400 text-center">Clean</span>
                </div>
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                  <span className="text-2xl mb-2">💾</span>
                  <span className="text-xs text-slate-400 text-center">Download</span>
                </div>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  )
}

export default BeautyPage
