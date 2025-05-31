"use client";

import { useEffect, useState, Fragment } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";
import { Disclosure, Transition } from "@headlessui/react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight, atomOneDark } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import { useForm, useFieldArray } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import SimpleBar from "simplebar-react";

const OpenApiInterfacePage = () => {
  const [apis, setApis] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiFetchError, setApiFetchError] = useState(null);
  const [sortedTagKeys, setSortedTagKeys] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showTryItModal, setShowTryItModal] = useState(false);
  const [currentApiEndpoint, setCurrentApiEndpoint] = useState(null);
  const [tryItResponse, setTryItResponse] = useState(null);
  const [tryItResponseType, setTryItResponseType] = useState(null);
  const [tryItResponseUrl, setTryItResponseUrl] = useState(null);
  const [tryItLoading, setTryItLoading] = useState(false);
  const [tryItError, setTryItError] = useState(null);
  const [responseCopied, setResponseCopied] = useState(false);
  const [searchTermForTags, setSearchTermForTags] = useState("");

  const { register, handleSubmit, reset, setValue, control, watch } = useForm();
  const watchedMethod = watch("method");

  const { fields: pathFields, append: appendPath, remove: removePath } = useFieldArray({ control, name: "pathParams" });
  const { fields: queryFields, append: appendQuery, remove: removeQuery } = useFieldArray({ control, name: "queryParams" });
  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({ control, name: "headerParams" });
  const { fields: bodyFields, append: appendBody, remove: removeBody } = useFieldArray({ control, name: "requestBodyParams" });

  useEffect(() => {
    const fetchSpec = async () => {
      setLoading(true);
      setApiFetchError(null);
      try {
        const res = await fetch("/api/openapi");
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Gagal mengambil spesifikasi: ${res.status} ${res.statusText}. ${errorText.substring(0,200)}`);
        }
        const data = await res.json();
        if (!data || typeof data.paths !== 'object') {
            throw new Error("Format spesifikasi API tidak valid atau tidak ditemukan.");
        }
        const paths = data.paths;
        const grouped = {};
        const tagsFromSpec = data.tags || [];
        const tagOrder = tagsFromSpec.map(tag => tag.name);

        Object.entries(paths).forEach(([path, methods]) => {
          Object.entries(methods).forEach(([method, details]) => {
            if (method.toLowerCase() === 'parameters') return;
            const tag = details.tags?.[0] || "Lain-lain";
            if (!grouped[tag]) {
                grouped[tag] = {
                    description: tagsFromSpec.find(t => t.name === tag)?.description || "Endpoint dalam grup ini.",
                    endpoints: []
                };
            }
            grouped[tag].endpoints.push({ path, method: method.toUpperCase(), details });
          });
        });

        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            const indexA = tagOrder.indexOf(a);
            const indexB = tagOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            if (a === "Lain-lain") return 1;
            if (b === "Lain-lain") return -1;
            return a.localeCompare(b);
        });

        setSortedTagKeys(sortedKeys);
        setApis(grouped);

        const initialFilteredTags = sortedKeys.filter(tag =>
            tag.toLowerCase().includes(searchTermForTags.toLowerCase())
        );
        if (initialFilteredTags.length > 0 && !selectedTag) {
            // setSelectedTag(initialFilteredTags[0]); // MODIFIED: Don't auto-select to show placeholder
        } else if (initialFilteredTags.length === 0) {
            setSelectedTag(null);
        }

      } catch (err) {
        console.error("Gagal mengambil spesifikasi:", err);
        setApiFetchError(err.message);
        toast.error(`Gagal memuat spesifikasi API: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchSpec();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    return () => { if (tryItResponseUrl) URL.revokeObjectURL(tryItResponseUrl); };
  }, [tryItResponseUrl]);

  const methodColors = {
    GET: "bg-green-100 text-green-700 border border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600/50",
    POST: "bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-700/30 dark:text-cyan-300 dark:border-cyan-600/50",
    PUT: "bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600/50",
    DELETE: "bg-red-100 text-red-700 border border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600/50",
    PATCH: "bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-700/30 dark:text-indigo-300 dark:border-indigo-600/50",
    OPTIONS: "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/50",
    HEAD: "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600/50"
  };

  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150";


  const handleTagChange = (tag) => { setSelectedTag(tag); };
  const handleSearchTagChange = (event) => {
    setSearchTermForTags(event.target.value);
    const currentFiltered = sortedTagKeys.filter(t => t.toLowerCase().includes(event.target.value.toLowerCase()));
    // MODIFIED: Logic to handle selection for placeholder consistency
    if (!event.target.value && selectedTag) { // If search is cleared, keep selection or clear if desired
        // setSelectedTag(null); // Option: clear selection when search is cleared
    } else if (selectedTag && !currentFiltered.includes(selectedTag)) {
        setSelectedTag(currentFiltered.length > 0 ? currentFiltered[0] : null);
    } else if (!selectedTag && currentFiltered.length > 0) {
        // setSelectedTag(currentFiltered[0]); // Option: auto-select first result
    } else if (currentFiltered.length === 0) {
        setSelectedTag(null);
    }
  };


  const openTryItModal = (api) => {
    setCurrentApiEndpoint(api);
    setTryItResponse(null); setTryItResponseType(null);
    if (tryItResponseUrl) URL.revokeObjectURL(tryItResponseUrl);
    setTryItResponseUrl(null); setTryItError(null); setResponseCopied(false);
    reset();
    setValue("method", api.method.toUpperCase());
    removePath(); removeQuery(); removeHeader(); removeBody();

    const apiDetails = api.details;
    appendPath( (apiDetails.parameters?.filter(p => p.in === "path") || []).map(p => ({ name: p.name, value: p.example ?? p.schema?.default ?? "", required: p.required, description: p.description })) );
    appendQuery( (apiDetails.parameters?.filter(p => p.in === "query") || []).map(p => ({ name: p.name, value: p.example ?? p.schema?.default ?? "", required: p.required, description: p.description })) );
    appendHeader( (apiDetails.parameters?.filter(p => p.in === "header") || []).map(p => ({ name: p.name, value: p.example ?? p.schema?.default ?? "", required: p.required, description: p.description })) );

    const requestBodyContent = apiDetails.requestBody?.content?.["application/json"];
    if (requestBodyContent) {
      if (requestBodyContent.example) {
        try {
          const exampleData = typeof requestBodyContent.example === 'string' ? JSON.parse(requestBodyContent.example) : requestBodyContent.example;
          if (typeof exampleData === 'object' && exampleData !== null && !Array.isArray(exampleData)) {
            Object.entries(exampleData).forEach(([key, value]) => appendBody({ key, value: JSON.stringify(value, null, 2), required: apiDetails.requestBody?.required || false, description: "" }));
          } else {
            appendBody({ key: "", value: JSON.stringify(exampleData, null, 2), required: apiDetails.requestBody?.required || false, description: "Raw JSON Body" });
          }
        } catch (e) {
          appendBody({ key: "", value: typeof requestBodyContent.example === 'string' ? requestBodyContent.example : "{\n  \n}", required: apiDetails.requestBody?.required || false, description: "Raw JSON Body (Error parsing example)" });
        }
      } else if (requestBodyContent.schema?.properties) {
        Object.entries(requestBodyContent.schema.properties).forEach(([key, prop]) => appendBody({ key, value: prop.default !== undefined ? JSON.stringify(prop.default, null, 2) : "", required: requestBodyContent.schema.required?.includes(key) || false, description: prop.description || "" }));
      } else {
        appendBody({ key: "", value: "{\n  \n}", required: apiDetails.requestBody?.required || false, description: "Raw JSON Body" });
      }
    } else if (["POST", "PUT", "PATCH"].includes(api.method.toUpperCase()) && apiDetails.requestBody) {
        appendBody({ key: "", value: "", required: apiDetails.requestBody.required || false, description: "Raw Request Body (Specify Content-Type in Headers)" });
    }
    setShowTryItModal(true);
  };

  const executeTryIt = async (formData) => {
    setTryItLoading(true);
    setTryItResponse(null); setTryItResponseType(null);
    if (tryItResponseUrl) URL.revokeObjectURL(tryItResponseUrl);
    setTryItResponseUrl(null); setTryItError(null); setResponseCopied(false);

    let url = currentApiEndpoint.path;
    const headers = {};
    const methodToExecute = formData.method.toUpperCase();

    formData.pathParams?.forEach(p => { if (p.value) url = url.replace(`{${p.name}}`, encodeURIComponent(p.value)); });

    const queryParams = new URLSearchParams();
    formData.queryParams?.forEach(p => { if (p.name && p.value) queryParams.append(p.name, p.value); });
    if (queryParams.toString()) url = `${url}?${queryParams.toString()}`;

    let explicitContentType = false;
    formData.headerParams?.forEach(p => {
      if (p.name && p.value) {
        headers[p.name] = p.value;
        if (p.name.toLowerCase() === 'content-type') explicitContentType = true;
      }
    });

    let finalBody;
    if (["POST", "PUT", "PATCH"].includes(methodToExecute) && formData.requestBodyParams?.length > 0) {
        const effectiveContentType = headers["Content-Type"] || (explicitContentType ? undefined : "application/json");
        if (!headers["Content-Type"] && !explicitContentType && effectiveContentType === "application/json") {
            headers["Content-Type"] = "application/json";
        }
        let bodyObject = {};
        let isRawJson = formData.requestBodyParams.length === 1 && formData.requestBodyParams[0].key === "";

        if (effectiveContentType === "application/json") {
            if (isRawJson) {
                try { bodyObject = JSON.parse(formData.requestBodyParams[0].value); } catch (e) { toast.error(`JSON tidak valid pada request body.`); setTryItError("JSON tidak valid pada request body."); setTryItLoading(false); return; }
            } else {
                formData.requestBodyParams.forEach(p => {
                    if (p.key) {
                        try {
                            if (p.value.trim().startsWith('{') || p.value.trim().startsWith('[')) bodyObject[p.key] = JSON.parse(p.value);
                            else if (p.value === "true") bodyObject[p.key] = true;
                            else if (p.value === "false") bodyObject[p.key] = false;
                            else if (!isNaN(p.value) && p.value.trim() !== "" && !p.value.startsWith("0") && p.value.length < 16 ) bodyObject[p.key] = Number(p.value);
                            else bodyObject[p.key] = p.value;
                        } catch (e) { toast.error(`JSON tidak valid untuk key "${p.key}".`); setTryItError(`JSON tidak valid untuk key "${p.key}".`); setTryItLoading(false); return; }
                    }
                });
            }
            finalBody = JSON.stringify(bodyObject);
        } else {
            finalBody = isRawJson ? formData.requestBodyParams[0].value : (formData.requestBodyParams[0] ? formData.requestBodyParams[0].value : undefined);
        }
    }

    try {
      const res = await fetch(url, { method: methodToExecute, headers, body: finalBody });
      const contentTypeHeader = res.headers.get("content-type");
      if (!res.ok) {
        let errResMsg = `HTTP Error: ${res.status} ${res.statusText}. `;
        try { if (contentTypeHeader?.includes("application/json")) errResMsg += JSON.stringify(await res.json(), null, 2); else errResMsg += await res.text(); } catch (e) { /* ignore */ }
        setTryItError(errResMsg);
      } else {
        setTryItError(null);
        if (contentTypeHeader?.includes("application/json")) { setTryItResponse(await res.json()); setTryItResponseType("json"); }
        else if (contentTypeHeader?.startsWith("text/")) { setTryItResponse(await res.text()); setTryItResponseType("text"); }
        else if (contentTypeHeader?.startsWith("image/")) { const b = await res.blob(); const u = URL.createObjectURL(b); setTryItResponseUrl(u); setTryItResponse(u); setTryItResponseType("image"); }
        else if (contentTypeHeader?.startsWith("video/")) { const b = await res.blob(); const u = URL.createObjectURL(b); setTryItResponseUrl(u); setTryItResponse(u); setTryItResponseType("video"); }
        else if (contentTypeHeader?.includes("pdf") || contentTypeHeader?.includes("document") || contentTypeHeader?.startsWith("application/octet-stream")) {
          const b = await res.blob(); const u = URL.createObjectURL(b); setTryItResponseUrl(u);
          let fn = "downloaded_file"; const cd = res.headers.get("content-disposition"); if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m && m[1]) fn = m[1];}
          setTryItResponse({ url: u, filename: fn }); setTryItResponseType("document");
        } else {
          try {
            const b = await res.blob(); const u = URL.createObjectURL(b); setTryItResponseUrl(u);
            let fn = "downloaded_blob"; const cd = res.headers.get("content-disposition"); if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m && m[1]) fn = m[1];}
            setTryItResponse({ url: u, filename: fn }); setTryItResponseType("blob");
          } catch { setTryItResponse("Tipe respons tidak diketahui atau tidak dapat diproses."); setTryItResponseType("text"); }
        }
        toast.success("Permintaan API berhasil!");
      }
    } catch (err) { setTryItError(err.message || "Error eksekusi tidak terduga."); }
    finally { setTryItLoading(false); }
  };

  const renderParametersForm = () => (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      <div>
        <label className="block text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">Metode HTTP:</label>
        <select {...register("method")} className={inputBaseClass}>
          {Object.keys(methodColors).map(m => (<option key={m} value={m}>{m}</option>))}
        </select>
      </div>
      {pathFields.length > 0 && (
        <div>
          <h5 className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">Parameter Path:</h5>
          <div className="space-y-3">
            {pathFields.map((f, i) => (
              <div key={f.id}>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-mono bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[11px] mr-1">{f.name}</span>
                  {f.required && <span className="text-red-500 ml-1">*</span>}
                  {f.description && <span className="text-slate-500 dark:text-slate-500 text-[10px] italic ml-1"> - {f.description}</span>}
                </label>
                <input type="text" {...register(`pathParams.${i}.value`, { required: f.required })} placeholder={`Nilai untuk ${f.name}`} className={inputBaseClass} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h5 className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">Parameter Query:</h5>
        <div className="space-y-3">
          {queryFields.map((f, i) => (
            <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input type="text" {...register(`queryParams.${i}.name`, { required: f.required && f.value !== "" })} placeholder="Nama Param" className={`${inputBaseClass} sm:flex-1`} />
              <input type="text" {...register(`queryParams.${i}.value`)} placeholder={f.description || `Nilai Param`} className={`${inputBaseClass} sm:flex-1`} />
              <button type="button" onClick={() => removeQuery(i)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md self-start sm:self-center mt-1 sm:mt-0"><Icon icon="ph:x-circle-duotone" className="text-lg" /></button>
            </div>
          ))}
        </div>
        <Button type="button" onClick={() => appendQuery({ name: "", value: "", required: false, description: "" })} text="Tambah Query" icon="ph:plus-circle-duotone" className={`${buttonSecondaryClass} mt-2`} iconClassName="mr-1" />
      </div>
      <div>
        <h5 className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">Parameter Header:</h5>
        <div className="space-y-3">
          {headerFields.map((f, i) => (
            <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input type="text" {...register(`headerParams.${i}.name`, { required: f.required && f.value !== "" })} placeholder="Nama Header" className={`${inputBaseClass} sm:flex-1`} />
              <input type="text" {...register(`headerParams.${i}.value`)} placeholder={f.description || `Nilai Header`} className={`${inputBaseClass} sm:flex-1`} />
              <button type="button" onClick={() => removeHeader(i)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md self-start sm:self-center mt-1 sm:mt-0"><Icon icon="ph:x-circle-duotone" className="text-lg" /></button>
            </div>
          ))}
        </div>
        <Button type="button" onClick={() => appendHeader({ name: "", value: "", required: false, description: "" })} text="Tambah Header" icon="ph:plus-circle-duotone" className={`${buttonSecondaryClass} mt-2`} iconClassName="mr-1" />
      </div>
      {(watchedMethod === "POST" || watchedMethod === "PUT" || watchedMethod === "PATCH") && (
        <div>
          <h5 className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">Request Body:</h5>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Untuk JSON, isi key-value atau JSON string mentah (key kosong). Untuk tipe lain, isi body mentah di value.</p>
          <div className="space-y-3">
            {bodyFields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-4">
                  <input type="text" {...register(`requestBodyParams.${i}.key`)} placeholder="Key (opsional)" className={inputBaseClass} title="Biarkan kosong jika mengirim JSON mentah di kolom Value" />
                </div>
                <div className="col-span-10 sm:col-span-7">
                  <textarea {...register(`requestBodyParams.${i}.value`, { required: f.required })} placeholder={f.description || "Value (string, angka, atau JSON string untuk objek/array)"} rows={f.value?.split('\n').length > 2 ? Math.min(f.value?.split('\n').length, 10) : 3} className={`${inputBaseClass} resize-y leading-relaxed font-mono text-xs`} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-center justify-end self-start sm:self-center pt-1 sm:pt-0">
                  <button type="button" onClick={() => removeBody(i)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md"><Icon icon="ph:x-circle-duotone" className="text-lg" /></button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" onClick={() => appendBody({ key: "", value: "", required: false, description: "" })} text="Tambah Field Body" icon="ph:plus-circle-duotone" className={`${buttonSecondaryClass} mt-2`} iconClassName="mr-1"/>
        </div>
      )}
      {pathFields.length === 0 && queryFields.length === 0 && headerFields.length === 0 && !["POST", "PUT", "PATCH"].includes(watchedMethod) && (<p className="italic text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Tidak ada parameter atau body untuk metode ini.</p>)}
    </div>
  );

  const copyResponseToClipboard = async () => {
    if (!tryItResponse && !tryItResponseUrl) return;
    let textToCopy = "", toastMessage = "Respons disalin!";
    if (tryItResponseType === "json") textToCopy = JSON.stringify(tryItResponse, null, 2);
    else if (tryItResponseType === "text") textToCopy = String(tryItResponse);
    else if ((["image", "video", "document", "blob"].includes(tryItResponseType)) && (tryItResponse?.url || typeof tryItResponse === 'string')) {
      textToCopy = tryItResponse?.url || tryItResponse; toastMessage = "URL Respons disalin!";
    }
    if (textToCopy) {
      try { await navigator.clipboard.writeText(textToCopy); setResponseCopied(true); toast.success(toastMessage); setTimeout(() => setResponseCopied(false), 2000); }
      catch (err) { toast.error("Gagal menyalin."); }
    } else toast.warn("Tidak ada yang bisa disalin untuk tipe respons ini.");
  };

  const syntaxHighlighterStyleLight = { ...atomOneLight, hljs: { ...atomOneLight.hljs, background: 'rgb(248 250 252 / 1)' } };
  const syntaxHighlighterStyleDark = { ...atomOneDark, hljs: { ...atomOneDark.hljs, background: 'rgb(30 41 59 / 0.7)' } };

  const filteredSortedTagKeys = sortedTagKeys.filter(tag =>
    tag.toLowerCase().includes(searchTermForTags.toLowerCase())
  );

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-6">
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-black' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center mb-3 sm:mb-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mr-3 shrink-0">
                        <Icon icon="ph:plugs-connected-duotone" className="text-2xl sm:text-3xl" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                            Antarmuka OpenAPI
                        </h1>
                        {selectedTag && (
                             <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                                 Path: <code className="bg-slate-100 dark:bg-slate-700 p-0.5 px-1 rounded text-teal-600 dark:text-teal-300">{selectedTag}</code>
                            </p>
                        )}
                        {/* ADDED: Show current path if no tag selected, for consistency if needed */}
                        {!selectedTag && (
                             <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                                 Jelajahi tag API yang tersedia
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {loading ? (
             <div className="flex flex-col items-center justify-center p-10 min-h-[calc(100vh-260px)]"><Icon icon="svg-spinners:blocks-shuffle-3" className="text-5xl sm:text-6xl text-teal-500 mb-4" /><p className="text-lg sm:text-xl font-medium text-slate-600 dark:text-slate-300">Memuat Spesifikasi...</p></div>
        ) : apiFetchError ? (
            <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[calc(100vh-300px)] bg-red-50 dark:bg-red-800/20 rounded-b-xl">
                <Icon icon="ph:warning-octagon-duotone" className="text-5xl sm:text-6xl text-red-500 mb-4" />
                <p className="text-lg sm:text-xl font-semibold text-red-700 dark:text-red-300">Gagal Memuat Data Antarmuka API</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center max-w-xl">{apiFetchError}</p>
            </div>
        ) : (
        // MODIFIED: Adjusted overall height to be closer to GitHub Explorer's structure
        <div className="md:flex md:min-h-[calc(100vh-270px)] md:max-h-[calc(100vh-230px)]">
            {/* Left Pane: Tag List */}
            <div className="w-full md:w-2/5 lg:w-1/3 border-r border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 flex flex-col">
                <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/60">
                    <input
                        type="text"
                        placeholder="Cari tag API..."
                        value={searchTermForTags}
                        onChange={handleSearchTagChange}
                        className={inputBaseClass}
                    />
                </div>
                {/* MODIFIED: Adjusted max-height to be closer to GitHub Explorer (allowing for potential pagination if added) */}
                <SimpleBar className="flex-grow md:max-h-[calc(100vh-380px)]">
                    <div className="p-3 sm:p-2 space-y-0.5">
                        {filteredSortedTagKeys.length > 0 ? filteredSortedTagKeys.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => handleTagChange(tag)}
                                title={`Tag: ${tag}\nEndpoints: ${apis[tag]?.endpoints.length || 0}`}
                                className={`w-full text-left flex items-center px-2.5 py-2 my-0.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-700/30 transition-colors duration-150 group ${selectedTag === tag ? "bg-teal-100 dark:bg-teal-600/40 ring-1 ring-teal-400 dark:ring-teal-500" : ""}`}
                            >
                                <Icon
                                    icon="ph:tag-duotone" // Consistent with OpenAPI context
                                    className={`w-5 h-5 mr-2.5 flex-shrink-0 ${selectedTag === tag ? "text-teal-600 dark:text-teal-300" : "text-slate-400 dark:text-slate-500 group-hover:text-teal-500 dark:group-hover:text-teal-400"}`}
                                />
                                <span className={`truncate text-sm ${selectedTag === tag ? "text-teal-700 dark:text-teal-200 font-medium" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"}`}>
                                    {tag}
                                </span>
                                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${selectedTag === tag ? "bg-teal-200 text-teal-700 dark:bg-teal-500/50 dark:text-teal-100" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600"}`}>
                                    {apis[tag]?.endpoints.length || 0}
                                </span>
                            </button>
                        )) : (
                            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                {/* MODIFIED: Icon changed for consistency with GitHub Explorer's "empty" state */}
                                <Icon icon="ph:files-thin" className="mx-auto text-4xl opacity-70 mb-2"/>
                                <p className="text-sm">{searchTermForTags ? "Tidak ada tag yang cocok." : "Tidak ada tag tersedia."}</p>
                            </div>
                        )}
                    </div>
                </SimpleBar>
                {/* ADDED: Placeholder for pagination if you choose to implement it like GitHub Explorer */}
                {/* {totalPagesForTags > 1 && ( ...pagination controls... )} */}
            </div>

            {/* Right Pane: Endpoints for Selected Tag or Placeholder */}
            <div className="w-full md:w-3/5 lg:w-2/3 bg-slate-50 dark:bg-slate-900/30 flex flex-col">
                {/* MODIFIED: Max height for scrollbar consistency */}
                <SimpleBar className="flex-grow h-full" style={{ maxHeight: 'calc(100vh - 230px)' }}>
                    <div className="p-4 sm:p-6">
                    {/* MODIFIED: Placeholder when no tag is selected - to match GitHub Explorer style */}
                    {!selectedTag && !loading && !apiFetchError && sortedTagKeys.length > 0 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-slate-500 dark:text-slate-400 p-10">
                            <Icon icon="ph:code-block-thin" className="text-7xl mb-4 opacity-60" /> {/* Icon from GitHub Explorer */}
                            <p className="text-lg">Pilih tag dari panel kiri untuk melihat endpoint.</p>
                            <p className="text-sm mt-1">Detail endpoint dan opsi "Coba!" akan muncul di sini.</p>
                            {filteredSortedTagKeys.length === 0 && searchTermForTags && <p className="text-sm mt-1">Tidak ada tag yang cocok dengan pencarian Anda.</p>}
                        </div>
                    )}
                    {!selectedTag && sortedTagKeys.length === 0 && !loading && !apiFetchError && (
                         <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-slate-500 dark:text-slate-400 p-10">
                            <Icon icon="ph:archive-box-duotone" className="text-7xl mb-4 opacity-60" />
                            <p className="text-lg">Tidak Ada Endpoint API Ditemukan.</p>
                            <p className="text-sm mt-1">Periksa sumber spesifikasi OpenAPI Anda atau coba lagi.</p>
                        </div>
                    )}

                    {selectedTag && apis[selectedTag] && (
                        <div className="mb-8">
                            <div className="flex items-center mb-4 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-600 text-white mr-3 dark:bg-teal-700 shadow shrink-0">
                                    <Icon icon="ph:tag-fill" className="text-lg" />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300">{selectedTag}</h3>
                                    {apis[selectedTag].description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{apis[selectedTag].description}</p>}
                                </div>
                            </div>

                            <div className="space-y-3">
                            {apis[selectedTag].endpoints.map((api, idx) => (
                                <Disclosure key={idx} as="div" className="bg-white dark:bg-slate-700/70 rounded-lg border border-slate-200/90 dark:border-slate-600/80 shadow-sm hover:shadow-md transition-shadow duration-150">
                                {({ open }) => (
                                    <>
                                    <Disclosure.Button className="flex justify-between items-center w-full text-start px-4 py-3 sm:px-5 sm:py-3.5 font-medium text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-opacity-75 data-[headlessui-state=open]:rounded-b-none rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                        <div className="flex items-center flex-wrap min-w-0">
                                            <span className={`px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-md mr-2 mb-1 sm:mb-0 whitespace-nowrap ${methodColors[api.method.toUpperCase()] || "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-300"}`}>
                                                {api.method.toUpperCase()}
                                            </span>
                                            <span className="font-mono text-teal-600 dark:text-teal-400 break-all text-xs sm:text-sm truncate" title={api.path}>{api.path}</span>
                                        </div>
                                        <Icon icon="ph:caret-down-bold" className={`${open ? "rotate-180 transform" : ""} transition-transform duration-200 text-lg text-teal-600 dark:text-teal-400 ml-2`} />
                                    </Disclosure.Button>
                                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0 -translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-75" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 -translate-y-1">
                                    <Disclosure.Panel className="bg-slate-50 dark:bg-slate-700/40 text-sm rounded-b-lg border-t border-slate-200/90 dark:border-slate-600/80 px-4 py-4 sm:px-5 sm:py-5">
                                        <div className="space-y-4">
                                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-1.5 prose-headings:text-xs prose-headings:font-medium prose-headings:text-slate-500 prose-headings:dark:text-slate-400">
                                                <h5>Deskripsi</h5>
                                                <p>{api.details.summary || api.details.description || "Tidak ada deskripsi tersedia."}</p>
                                                {api.details.parameters?.length > 0 && (<>
                                                    <h5>Parameter</h5>
                                                    <ul className="list-none p-0 m-0">
                                                    {api.details.parameters.map((param, pIdx) => (
                                                        <li key={pIdx} className="mb-1">
                                                            <span className="font-mono bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[10px] dark:bg-slate-600 dark:text-slate-200">{param.name}</span>
                                                            <span className="text-slate-600 dark:text-slate-300 text-[10px]"> ({param.in}, {param.schema?.type || 'any'}){param.required && <strong className="text-red-500"> (wajib)</strong>} - {param.description || "Tanpa deskripsi."}</span>
                                                        </li>
                                                    ))}
                                                    </ul>
                                                </>)}
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <Button onClick={() => openTryItModal(api)} text={<><Icon icon="ph:play-circle-duotone" className="mr-1.5 text-base" /> Coba!</>} className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"/>
                                            </div>
                                        </div>
                                    </Disclosure.Panel>
                                    </Transition>
                                    </>
                                )}
                                </Disclosure>
                            ))}
                            </div>
                        </div>
                    )}
                    </div>
                </SimpleBar>
            </div>
        </div>
        )}
      </Card>

      {currentApiEndpoint && (
        <Modal
          title={
            <div className="flex items-center text-slate-900 dark:text-slate-50">
              <Icon icon="ph:lightning-duotone" className="mr-2 h-5 w-5 flex-shrink-0 text-teal-500 dark:text-teal-400 sm:h-6 sm:w-6"/>
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm font-medium sm:text-base">Coba:</span>
                <span className={`inline-block whitespace-nowrap font-semibold text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${methodColors[currentApiEndpoint.method.toUpperCase()] || 'bg-gray-200 text-gray-700'}`}>
                  {currentApiEndpoint.method.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400 sm:text-sm truncate" title={currentApiEndpoint.path}>
                  {currentApiEndpoint.path}
                </span>
              </div>
            </div>
          }
          activeModal={showTryItModal}
          onClose={() => setShowTryItModal(false)}
          className="max-w-3xl" // Consistent with GitHub Explorer's file preview modal width
          themeClass="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xl"
          footerContent={
            // MODIFIED: Footer layout similar to GitHub Explorer, using buttonSecondaryClass and primary action button
            <div className="flex flex-col sm:flex-row justify-end w-full gap-3 p-1">
                {/* <Button type="button" text="Informasi Lain" onClick={() => {}} className={`${buttonSecondaryClass} text-xs px-2 py-1 sm:mr-auto`} /> // Example of additional button */}
                <Button type="button" text="Tutup" onClick={() => setShowTryItModal(false)} className={`${buttonSecondaryClass} px-3 py-1.5 w-full sm:w-auto`} />
                <Button
                    type="submit" // This will trigger the form inside the modal
                    text={tryItLoading ? <><Icon icon="svg-spinners:ring-resize" className="mr-2 text-lg" /> Mengirim...</> : <><Icon icon="ph:paper-plane-tilt-fill" className="mr-2 text-lg" /> Kirim Permintaan</>}
                    onClick={handleSubmit(executeTryIt)} // Ensure this is linked to the form
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white w-full sm:w-auto px-4 py-2 text-sm shadow-sm hover:shadow-md flex items-center justify-center"
                    disabled={tryItLoading}
                />
            </div>
          }
        >
          {/* MODIFIED: Max height consistency */}
          <SimpleBar style={{ maxHeight: '70vh' }} className="pr-1">
            <form onSubmit={handleSubmit(executeTryIt)} className="space-y-4 p-0.5">
              {renderParametersForm()}
              {tryItLoading && ( <div className="mt-4 text-center text-slate-600 dark:text-slate-400 flex items-center justify-center text-sm"> <Icon icon="svg-spinners:ring-resize" className="mr-2 text-xl" /> Mengeksekusi permintaan... </div> )}
              {tryItError && (<div className="mt-4 p-3 bg-red-100/80 border border-red-300 text-red-700 rounded-lg dark:bg-red-900/50 dark:border-red-700/60 dark:text-red-300 text-xs"><h5 className="font-semibold mb-1 flex items-center text-sm"><Icon icon="ph:warning-circle-duotone" className="mr-2 text-lg" /> Error:</h5><pre className="whitespace-pre-wrap break-all font-mono">{tryItError}</pre></div>)}
              {tryItResponse !== null && !tryItError && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">Respons:</h5>
                    {(tryItResponseType === "json" || tryItResponseType === "text" || (["image", "video", "document", "blob"].includes(tryItResponseType) && tryItResponse)) && (
                      // MODIFIED: Copy button styling to match GitHub Explorer's primary modal action button (teal)
                      <Button onClick={copyResponseToClipboard} text={<><Icon icon={responseCopied ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-1 text-sm" /> {responseCopied ? "Disalin!" : (tryItResponseType === "json" || tryItResponseType === "text" ? "Salin" : "Salin URL")}</>}
                       className={`${responseCopied ? 'bg-green-500 hover:bg-green-600' : 'bg-teal-500 hover:bg-teal-600'} text-white py-1 px-2 rounded text-[10px] transition-colors duration-150`}
                      />
                    )}
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden">
                    {tryItResponseType === "json" && (
                        <SyntaxHighlighter language="json" style={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? syntaxHighlighterStyleDark : syntaxHighlighterStyleLight} customStyle={{ margin: 0, padding: '0.75rem', borderRadius: '0px'}} className="text-xs max-h-96 overflow-auto simple-scrollbar">
                        {JSON.stringify(tryItResponse, null, 2)}
                        </SyntaxHighlighter>
                    )}
                    {tryItResponseType === "text" && ( <pre className="rounded-none p-3 text-xs max-h-96 overflow-auto bg-slate-50 dark:bg-slate-800/70 whitespace-pre-wrap break-all simple-scrollbar">{String(tryItResponse)}</pre> )}
                    {tryItResponseType === "image" && typeof tryItResponse === 'string' && ( <img src={tryItResponse} alt="Respons API" className="max-w-full h-auto block p-2 bg-slate-50 dark:bg-slate-800/70" /> )}
                    {tryItResponseType === "video" && typeof tryItResponse === 'string' && ( <video src={tryItResponse} controls className="max-w-full h-auto block p-2 bg-slate-50 dark:bg-slate-800/70">Browser Anda tidak mendukung tag video.</video> )}
                    {(tryItResponseType === "document" || tryItResponseType === "blob") && tryItResponse?.url && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/70">
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-2"> Berkas diterima: <span className="font-medium">{tryItResponse.filename || "download"}</span> </p>
                        <a href={tryItResponse.url} download={tryItResponse.filename || "download"} className="inline-flex items-center px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"> <Icon icon="ph:download-simple-duotone" className="mr-1.5 text-base" /> Unduh Berkas </a>
                        {tryItResponseType === "document" && tryItResponse.filename?.toLowerCase().endsWith(".pdf") && ( <div className="mt-3 rounded overflow-hidden border border-slate-300 dark:border-slate-600"> <embed src={tryItResponse.url} type="application/pdf" width="100%" height="280px" /> </div> )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </SimpleBar>
        </Modal>
      )}
    </div>
  );
};

export default OpenApiInterfacePage;