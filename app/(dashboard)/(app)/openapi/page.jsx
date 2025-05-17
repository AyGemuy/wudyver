"use client"

import { useEffect, useState, useMemo } from "react"
import { useSelector, useDispatch } from "react-redux"
import { fetchOpenApiSpec } from "@/components/partials/app/openapi/store"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Textinput from "@/components/ui/Textinput"
import Textarea from "@/components/ui/Textarea"
import SimpleBar from "simplebar-react"
import { ToastContainer, toast } from "react-toastify"

const ApiOpenapi = () => {
  const dispatch = useDispatch()
  const { spec, status, error } = useSelector((state) => state.openapi)
  const [selectedTag, setSelectedTag] = useState("")
  const [selectedEndpoint, setSelectedEndpoint] = useState(null)
  const [params, setParams] = useState([{ key: "", value: "" }])
  const [bodyInput, setBodyInput] = useState("")
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === "idle") dispatch(fetchOpenApiSpec())
  }, [status, dispatch])

  const tags = useMemo(() => {
    if (!spec) return []
    const tagSet = new Set()
    Object.values(spec.paths).forEach((methods) => {
      Object.values(methods).forEach((op) => {
        op.tags?.forEach((tag) => tagSet.add(tag))
      })
    })
    return Array.from(tagSet)
  }, [spec])

  const structuredEndpoints = useMemo(() => {
    if (!spec || !selectedTag) return {}
    const grouped = {}
    Object.entries(spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, op]) => {
        if (op.tags?.includes(selectedTag)) {
          const parts = path.split("/").filter(Boolean)
          const group = parts.length > 1 ? parts[0] : "root"
          if (!grouped[group]) grouped[group] = []
          grouped[group].push({
            method: method.toUpperCase(),
            path,
            summary: op.summary || "",
          })
        }
      })
    })
    return grouped
  }, [spec, selectedTag])

  const handleTryIt = async () => {
    if (!selectedEndpoint) {
      toast.error("Pilih endpoint terlebih dahulu!", { autoClose: 2000 })
      return
    }
    const queryParams = params
      .filter((p) => p.key && p.value)
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join("&")
    const fullUrl = `${spec.servers?.[0]?.url || ""}${selectedEndpoint.path}${
      selectedEndpoint.method === "GET" && queryParams ? `?${queryParams}` : ""
    }`
    const options = {
      method: selectedEndpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
    }
    if (selectedEndpoint.method === "POST") {
      try {
        options.body = JSON.stringify(JSON.parse(bodyInput))
      } catch {
        toast.error("Input body tidak valid JSON!", { autoClose: 2000 })
        return
      }
    }
    setLoading(true)
    try {
      const res = await fetch(fullUrl, options)
      const data = await res.json().catch(() => ({}))
      setResponse(data)
      toast.success("Respons berhasil diambil!", { autoClose: 2000 })
    } catch (err) {
      setResponse({ error: "Fetch failed", details: err.message })
      toast.error("Gagal mengambil respons!", { autoClose: 2000 })
    } finally {
      setLoading(false)
    }
  }

  const handleParamChange = (index, field, value) => {
    const newParams = [...params]
    newParams[index][field] = value
    setParams(newParams)
  }

  const addParam = () => setParams([...params, { key: "", value: "" }])

  const removeParam = (index) => {
    const newParams = [...params]
    newParams.splice(index, 1)
    setParams(newParams)
  }

  // Method color mapping for futuristic design
  const getMethodColor = (method) => {
    switch (method) {
      case "GET":
        return "bg-cyan-600"
      case "POST":
        return "bg-emerald-600"
      case "PUT":
        return "bg-amber-600"
      case "DELETE":
        return "bg-rose-600"
      default:
        return "bg-slate-600"
    }
  }

  return (
    <div className="w-full px-2 py-6">
  <Card
    bodyClass="relative p-6 h-full overflow-hidden"
    className="w-full border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
  >
        <div className="flex items-center justify-center mb-6 space-x-2">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-cyan-500 text-white">
            <span className="text-xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
            API Explorer
          </h1>
        </div>

        {status === "loading" && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="ml-3 text-cyan-400">Memuat spesifikasi API...</p>
          </div>
        )}

        {status === "failed" && (
          <div className="p-4 rounded-xl bg-rose-900 bg-opacity-30 border border-rose-700 text-rose-300">
            <div className="flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              <p>Gagal: {error}</p>
            </div>
          </div>
        )}

        {status === "succeeded" && spec && (
          <>
            <div className="space-y-6">
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  <span className="mr-2">🏷️</span>Pilih Tag
                </label>
                <select
                  className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-800 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                  value={selectedTag}
                  onChange={(e) => {
                    setSelectedTag(e.target.value)
                    setSelectedEndpoint(null)
                    setParams([{ key: "", value: "" }])
                    setResponse(null)
                  }}
                >
                  <option value="">-- Pilih Tag --</option>
                  {tags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {Object.keys(structuredEndpoints).length > 0 && (
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    <span className="mr-2">🔌</span>Pilih Endpoint
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-800 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                    onChange={(e) => {
                      const [method, ...pathParts] = e.target.value.split("::")
                      const path = pathParts.join("::")
                      setSelectedEndpoint({ method, path })
                      setResponse(null)
                    }}
                  >
                    <option value="">-- Pilih Endpoint --</option>
                    {Object.entries(structuredEndpoints).map(([group, endpoints]) => (
                      <optgroup key={group} label={group}>
                        {endpoints.map((ep) => (
                          <option key={`${ep.method}::${ep.path}`} value={`${ep.method}::${ep.path}`}>
                            [{ep.method}] {ep.path}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              {selectedEndpoint && (
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                  <div className="flex items-center mb-4">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${getMethodColor(selectedEndpoint.method)}`}
                    >
                      {selectedEndpoint.method}
                    </span>
                    <span className="ml-2 text-slate-300 font-mono text-sm overflow-x-auto">
                      {selectedEndpoint.path}
                    </span>
                  </div>

                  {selectedEndpoint.method === "GET" && (
                    <div>
                      <h2 className="text-sm font-semibold mb-3 text-cyan-400 flex items-center">
                        <span className="mr-2">🔍</span>Query Parameters
                      </h2>
                      <div className="space-y-3">
                        {params.map((p, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Textinput
                              placeholder="Key"
                              value={p.key}
                              onChange={(e) => handleParamChange(idx, "key", e.target.value)}
                              className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                            />
                            <Textinput
                              placeholder="Value"
                              value={p.value}
                              onChange={(e) => handleParamChange(idx, "value", e.target.value)}
                              className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                            />
                            <Button
                              size="icon-sm"
                              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 w-10 flex items-center justify-center"
                              onClick={() => removeParam(idx)}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-4 py-2 transition-all duration-200"
                          onClick={addParam}
                        >
                          <span className="mr-1">➕</span> Add Param
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.method === "POST" && (
                    <div>
                      <h2 className="text-sm font-semibold mb-3 text-emerald-400 flex items-center">
                        <span className="mr-2">📝</span>Body (JSON)
                      </h2>
                      <Textarea
                        className="w-full bg-slate-900 border-slate-700 text-slate-200 rounded-xl font-mono"
                        rows={6}
                        placeholder='{ "key": "value" }'
                        value={bodyInput}
                        onChange={(e) => setBodyInput(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-xl py-3 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
              onClick={handleTryIt}
              disabled={!selectedEndpoint || loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⟳</span> Memproses...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <span className="mr-2">🚀</span> Coba Endpoint
                </span>
              )}
            </Button>

            {response && (
              <div className="mt-6 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <h4 className="text-sm font-semibold mb-3 text-purple-400 flex items-center">
                  <span className="mr-2">📊</span>Respons:
                </h4>
                <SimpleBar style={{ maxHeight: 300 }}>
                  <pre className="text-sm whitespace-pre-wrap break-words bg-slate-900 p-4 rounded-xl font-mono text-cyan-300 border border-slate-700">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </SimpleBar>
              </div>
            )}
          </>
        )}
      </Card>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName="bg-slate-800 text-slate-200 border border-slate-700"
      />
    </div>
  )
}

export default ApiOpenapi
