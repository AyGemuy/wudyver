"use client";

import { useEffect, useState, Fragment } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import { toast, ToastContainer } from "react-toastify";
import SimpleBar from "simplebar-react";
import { useForm, useFieldArray } from "react-hook-form";

const ITEMS_PER_PAGE = 15;
const INITIAL_PATH = "__TAGS_ROOT__"; 

const ApiSpecExplorerPage = () => {
  const [apiSpecData, setApiSpecData] = useState(null); 
  const [fileList, setFileList] = useState([]); 
  const [currentBrowsePath, setCurrentBrowsePath] = useState(INITIAL_PATH); 
  const [pathHistory, setPathHistory] = useState([INITIAL_PATH]); 

  const [loadingList, setLoadingList] = useState(true); 
  const [error, setError] = useState(null); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1); 

  const [showTryItModal, setShowTryItModal] = useState(false);
  const [currentApiEndpoint, setCurrentApiEndpoint] = useState(null); 
  const [tryItResponse, setTryItResponse] = useState(null);
  const [tryItResponseType, setTryItResponseType] = useState(null);
  const [tryItResponseUrl, setTryItResponseUrl] = useState(null);
  const [tryItLoading, setTryItLoading] = useState(false);
  const [tryItError, setTryItError] = useState(null);
  const [responseCopied, setResponseCopied] = useState(false);

  const { register, handleSubmit, reset, setValue, control, watch } = useForm();
  const watchedMethod = watch("method");

  const { fields: pathFields, append: appendPath, remove: removePath } = useFieldArray({ control, name: "pathParams" });
  const { fields: queryFields, append: appendQuery, remove: removeQuery } = useFieldArray({ control, name: "queryParams" });
  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({ control, name: "headerParams" });
  const { fields: bodyFields, append: appendBody, remove: removeBody } = useFieldArray({ control, name: "requestBodyParams" });

  const processOpenApiSpec = (data) => {
    if (!data || typeof data.paths !== 'object') {
      throw new Error("Format spesifikasi API tidak valid atau tidak ditemukan.");
    }
    const paths = data.paths;
    const groupedByTag = {};
    const specTags = data.tags || []; 
    const tagOrder = specTags.map(tag => tag.name); 

    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, details]) => {
        if (method.toLowerCase() === 'parameters') return; 
        
        const tagName = details.tags?.[0] || "Lain-lain"; 
        if (!groupedByTag[tagName]) {
          groupedByTag[tagName] = {
            description: specTags.find(t => t.name === tagName)?.description || "Endpoint dalam grup ini.",
            endpoints: []
          };
        }
        groupedByTag[tagName].endpoints.push({
          name: details.summary || `${method.toUpperCase()} ${path}`, 
          path: path,
          method: method.toUpperCase(),
          type: 'endpoint', 
          details: details,
          parentTag: tagName,
          id: `${tagName}-${path}-${method.toUpperCase()}` 
        });
      });
    });
    
    for (const tagName in groupedByTag) {
        groupedByTag[tagName].endpoints.sort((a, b) => {
            if (a.path < b.path) return -1;
            if (a.path > b.path) return 1;
            if (a.method < b.method) return -1;
            if (a.method > b.method) return 1;
            return 0;
        });
    }

    const sortedTagNames = Object.keys(groupedByTag).sort((a, b) => {
        const indexA = tagOrder.indexOf(a);
        const indexB = tagOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB; 
        if (indexA !== -1) return -1; 
        if (indexB !== -1) return 1;  
        if (a === "Lain-lain") return 1; 
        if (b === "Lain-lain") return -1;
        return a.localeCompare(b); 
    });

    const tags = sortedTagNames.map(tagName => ({
      name: tagName,
      type: 'dir', 
      path: tagName, 
      id: tagName,   
      description: groupedByTag[tagName].description,
      endpointCount: groupedByTag[tagName].endpoints.length
    }));

    return { tags, endpointsByTag: groupedByTag, sortedTagNames };
  };

  const fetchApiEndpoints = async (browsePath) => {
    setLoadingList(true);
    setError(null);
    setFileList([]);
    setCurrentPage(1); 

    try {
      let processedData = apiSpecData;
      if (!processedData) {
        const res = await fetch("/api/openapi"); 
        if (!res.ok) {
          const errorData = await res.text();
          throw new Error(`OpenAPI Spec Error (${res.status}): ${errorData.substring(0,200) || 'Gagal mengambil spesifikasi API.'}`);
        }
        const rawData = await res.json();
        processedData = processOpenApiSpec(rawData);
        setApiSpecData(processedData); 
      }

      if (browsePath === INITIAL_PATH) {
        setFileList(processedData.tags);
      } else {
        const endpoints = processedData.endpointsByTag[browsePath]?.endpoints || [];
        setFileList(endpoints); 
      }
      setCurrentBrowsePath(browsePath);

    } catch (err) {
      console.error("Gagal mengambil/memproses spesifikasi API:", err);
      setError(err.message);
      toast.error(`Error memuat data API: ${err.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchApiEndpoints(currentBrowsePath);
  }, [currentBrowsePath]); 

  useEffect(() => {
    return () => { if (tryItResponseUrl) URL.revokeObjectURL(tryItResponseUrl); };
  }, [tryItResponseUrl]);

  const handleItemClick = async (item) => {
    if (item.type === "dir") { 
      setPathHistory(prev => [...prev, item.path]);
      setCurrentBrowsePath(item.path); 
      setSearchTerm(""); 
    } else if (item.type === "endpoint") { 
      openTryItModal(item); 
    }
  };
  
  const methodDisplayInfo = {
    GET:     { colorClass: "text-green-500 dark:text-green-400", icon: "ph:arrow-circle-right-duotone" },
    POST:    { colorClass: "text-sky-500 dark:text-sky-400", icon: "ph:arrow-circle-down-duotone" },
    PUT:     { colorClass: "text-yellow-500 dark:text-yellow-400", icon: "ph:pencil-circle-duotone" },
    DELETE:  { colorClass: "text-red-500 dark:text-red-400", icon: "ph:trash-duotone" },
    PATCH:   { colorClass: "text-indigo-500 dark:text-indigo-400", icon: "ph:note-pencil-duotone" },
    OPTIONS: { colorClass: "text-purple-500 dark:text-purple-400", icon: "ph:arrows-clockwise-duotone" },
    HEAD:    { colorClass: "text-pink-500 dark:text-pink-400", icon: "ph:question-duotone" },
    DEFAULT: { colorClass: "text-slate-500 dark:text-slate-400", icon: "ph:plug-duotone" }
  };

  const getEndpointIcon = (method = "DEFAULT") => { 
    return methodDisplayInfo[method.toUpperCase()]?.icon || methodDisplayInfo.DEFAULT.icon;
  };
  const getMethodColorClass = (method = "DEFAULT") => { 
    return methodDisplayInfo[method.toUpperCase()]?.colorClass || methodDisplayInfo.DEFAULT.colorClass;
  }

  const filteredItems = fileList.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.type === 'endpoint' && item.path.toLowerCase().includes(searchTerm.toLowerCase())) 
  );

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); 
  };

  const handleGoBack = () => {
    if (pathHistory.length > 1) {
      const newPathHistory = [...pathHistory];
      newPathHistory.pop(); 
      const previousPath = newPathHistory[newPathHistory.length - 1]; 
      setPathHistory(newPathHistory);
      setCurrentBrowsePath(previousPath); 
      setSearchTerm(""); 
    }
  };
  
  const syntaxHighlighterTheme = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? atomOneDark : atomOneLight;
  // UPDATED: inputBaseClass focus color to teal
  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150 disabled:opacity-50";

  const methodColorsTryItModal = { 
    GET: "bg-green-100 text-green-700 border border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600/50",
    POST: "bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-700/30 dark:text-sky-300 dark:border-sky-600/50",
    PUT: "bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600/50",
    DELETE: "bg-red-100 text-red-700 border border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600/50",
    PATCH: "bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-700/30 dark:text-indigo-300 dark:border-indigo-600/50",
    OPTIONS: "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/50",
    HEAD: "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600/50"
  };
  // UPDATED: tryItInputBaseClass focus color to teal
  const tryItInputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const tryItButtonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150";

  const openTryItModal = (apiEndpoint) => {
    setCurrentApiEndpoint(apiEndpoint);
    setTryItResponse(null); setTryItResponseType(null);
    if (tryItResponseUrl) URL.revokeObjectURL(tryItResponseUrl);
    setTryItResponseUrl(null); setTryItError(null); setResponseCopied(false);
    reset(); 

    setValue("method", apiEndpoint.method.toUpperCase()); 
    removePath(); removeQuery(); removeHeader(); removeBody();

    const apiDetails = apiEndpoint.details;
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
        Object.entries(requestBodyContent.schema.properties).forEach(([key, prop]) => appendBody({ key, value: prop.default !== undefined ? JSON.stringify(prop.default, null, 2) : (prop.type === 'object' ? '{}' : prop.type === 'array' ? '[]' : ''), required: requestBodyContent.schema.required?.includes(key) || false, description: prop.description || "" }));
      } else { 
        appendBody({ key: "", value: "{\n  \n}", required: apiDetails.requestBody?.required || false, description: "Raw JSON Body (No example/properties)" });
      }
    } else if (["POST", "PUT", "PATCH"].includes(apiEndpoint.method.toUpperCase()) && apiDetails.requestBody) {
        const firstContentType = Object.keys(apiDetails.requestBody.content || {})[0];
        const description = firstContentType ? `Raw Request Body (e.g., ${firstContentType})` : "Raw Request Body";
        appendBody({ key: "", value: "", required: apiDetails.requestBody.required || false, description });
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
        let isRawJsonBodyInput = formData.requestBodyParams.length === 1 && formData.requestBodyParams[0].key === "";

        if (effectiveContentType === "application/json") {
            if (isRawJsonBodyInput) { 
                try { bodyObject = JSON.parse(formData.requestBodyParams[0].value || "{}"); }  
                catch (e) { toast.error(`JSON tidak valid pada request body.`); setTryItError("JSON tidak valid pada request body."); setTryItLoading(false); return; }
            } else { 
                formData.requestBodyParams.forEach(p => {
                    if (p.key) {
                        try {
                            if (p.value.trim().startsWith('{') || p.value.trim().startsWith('[')) bodyObject[p.key] = JSON.parse(p.value);
                            else if (p.value === "true") bodyObject[p.key] = true;
                            else if (p.value === "false") bodyObject[p.key] = false;
                            else if (!isNaN(p.value) && p.value.trim() !== "" && !p.value.startsWith("0") && p.value.length < 16 ) bodyObject[p.key] = Number(p.value);
                            else bodyObject[p.key] = p.value; 
                        } catch (e) { 
                            toast.warn(`Gagal parse JSON untuk key "${p.key}", menggunakan sebagai string.`);
                            bodyObject[p.key] = p.value;
                        }
                    }
                });
            }
            finalBody = JSON.stringify(bodyObject);
        } else { 
            finalBody = isRawJsonBodyInput ? formData.requestBodyParams[0].value : (formData.requestBodyParams[0] ? formData.requestBodyParams[0].value : undefined);
        }
    }

    try {
      const res = await fetch(url, { method: methodToExecute, headers, body: finalBody });
      const contentTypeHeader = res.headers.get("content-type");
      
      if (!res.ok) {
        let errResMsg = `HTTP Error: ${res.status} ${res.statusText}. `;
        try {  
          if (contentTypeHeader?.includes("application/json")) errResMsg += JSON.stringify(await res.json(), null, 2);  
          else errResMsg += await res.text();  
        } catch (e) { /* ignore */ }
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
            const b = await res.blob(); 
            const u = URL.createObjectURL(b); setTryItResponseUrl(u);
            let fn = "downloaded_blob"; const cd = res.headers.get("content-disposition"); if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m && m[1]) fn = m[1];}
            setTryItResponse({ url: u, filename: fn, type: b.type }); setTryItResponseType("blob");
          } catch { 
            try {
                setTryItResponse(await res.text()); setTryItResponseType("text");
            } catch { 
                setTryItResponse("Tipe respons tidak diketahui atau tidak dapat diproses."); setTryItResponseType("text");
            }
          }
        }
        toast.success("Permintaan API berhasil!");
      }
    } catch (err) {  
      setTryItError(err.message || "Error eksekusi tidak terduga.");  
      toast.error(`Error eksekusi API: ${err.message}`);
    }
    finally { setTryItLoading(false); }
  };

  const renderParametersForm = () => (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      <div>
        <label className="block text-xs sm:text-sm font-medium text-sky-700 dark:text-sky-300 mb-1.5">Metode HTTP:</label>
        <select {...register("method")} className={tryItInputBaseClass}>
          {Object.keys(methodColorsTryItModal).map(m => (<option key={m} value={m}>{m}</option>))}
        </select>
      </div>
      {pathFields.length > 0 && (
        <div>
          <h5 className="text-xs sm:text-sm font-medium text-sky-700 dark:text-sky-300 mb-1.5">Parameter Path:</h5>
          <div className="space-y-3">
            {pathFields.map((f, i) => (
              <div key={f.id}>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-mono bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[11px] mr-1">{f.name}</span>
                  {f.required && <span className="text-red-500 ml-1">*</span>}
                  {f.description && <span className="text-slate-500 dark:text-slate-500 text-[10px] italic ml-1"> - {f.description}</span>}
                </label>
                <input type="text" {...register(`pathParams.${i}.value`, { required: f.required })} placeholder={`Nilai untuk ${f.name}`} className={tryItInputBaseClass} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h5 className="text-xs sm:text-sm font-medium text-sky-700 dark:text-sky-300 mb-1.5">Parameter Query:</h5>
        <div className="space-y-3">
          {queryFields.map((f, i) => (
            <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input type="text" {...register(`queryParams.${i}.name`, { required: f.required && watch(`queryParams.${i}.value`) !== "" })} placeholder="Nama Param" className={`${tryItInputBaseClass} sm:flex-1`} />
              <input type="text" {...register(`queryParams.${i}.value`)} placeholder={f.description || `Nilai Param`} className={`${tryItInputBaseClass} sm:flex-1`} />
              <button type="button" onClick={() => removeQuery(i)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md self-start sm:self-center mt-1 sm:mt-0"><Icon icon="ph:x-circle-duotone" className="text-lg" /></button>
            </div>
          ))}
        </div>
        <Button type="button" onClick={() => appendQuery({ name: "", value: "", required: false, description: "" })} text="Tambah Query" icon="ph:plus-circle-duotone" className={`${tryItButtonSecondaryClass} mt-2`} iconClassName="mr-1" />
      </div>
      <div>
        <h5 className="text-xs sm:text-sm font-medium text-sky-700 dark:text-sky-300 mb-1.5">Parameter Header:</h5>
        <div className="space-y-3">
          {headerFields.map((f, i) => (
            <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input type="text" {...register(`headerParams.${i}.name`, { required: f.required && watch(`headerParams.${i}.value`) !== "" })} placeholder="Nama Header" className={`${tryItInputBaseClass} sm:flex-1`} />
              <input type="text" {...register(`headerParams.${i}.value`)} placeholder={f.description || `Nilai Header`} className={`${tryItInputBaseClass} sm:flex-1`} />
              <button type="button" onClick={() => removeHeader(i)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md self-start sm:self-center mt-1 sm:mt-0"><Icon icon="ph:x-circle-duotone" className="text-lg" /></button>
            </div>
          ))}
        </div>
        <Button type="button" onClick={() => appendHeader({ name: "", value: "", required: false, description: "" })} text="Tambah Header" icon="ph:plus-circle-duotone" className={`${tryItButtonSecondaryClass} mt-2`} iconClassName="mr-1" />
      </div>
      {(watchedMethod === "POST" || watchedMethod === "PUT" || watchedMethod === "PATCH") && (
        <div>
          <h5 className="text-xs sm:text-sm font-medium text-sky-700 dark:text-sky-300 mb-1.5">Request Body:</h5>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Untuk JSON, isi key-value atau JSON string mentah (key kosong). Untuk tipe lain, isi body mentah di value (key kosong).</p>
          <div className="space-y-3">
            {bodyFields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-4">
                  <input type="text" {...register(`requestBodyParams.${i}.key`)} placeholder="Key (opsional)" className={tryItInputBaseClass} title="Biarkan kosong jika mengirim JSON/text mentah di kolom Value" />
                </div>
                <div className="col-span-10 sm:col-span-7">
                  <textarea {...register(`requestBodyParams.${i}.value`, { required: f.required })} placeholder={f.description || "Value (string, angka, atau JSON string untuk objek/array)"} rows={watch(`requestBodyParams.${i}.value`)?.split('\n').length > 2 ? Math.min(watch(`requestBodyParams.${i}.value`)?.split('\n').length, 10) : 3} className={`${tryItInputBaseClass} resize-y leading-relaxed font-mono text-xs`} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-center justify-end self-start sm:self-center pt-1 sm:pt-0">
                  <button type="button" onClick={() => removeBody(i)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md"><Icon icon="ph:x-circle-duotone" className="text-lg" /></button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" onClick={() => appendBody({ key: "", value: "", required: false, description: "" })} text="Tambah Field Body" icon="ph:plus-circle-duotone" className={`${tryItButtonSecondaryClass} mt-2`} iconClassName="mr-1"/>
        </div>
      )}
      {pathFields.length === 0 && queryFields.length === 0 && headerFields.length === 0 && !["POST", "PUT", "PATCH"].includes(watchedMethod) && (<p className="italic text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Tidak ada parameter atau body yang diperlukan untuk metode ini.</p>)}
    </div>
  );

  const copyResponseToClipboard = async () => {
    if (!tryItResponse && !tryItResponseUrl) return;
    let textToCopy = "";
    let toastMessage = "Respons disalin!";
    
    if (tryItResponseType === "json") textToCopy = JSON.stringify(tryItResponse, null, 2);
    else if (tryItResponseType === "text") textToCopy = String(tryItResponse);
    else if ((["image", "video", "document", "blob"].includes(tryItResponseType)) && (tryItResponse?.url || typeof tryItResponse === 'string')) {
      textToCopy = tryItResponse?.url || tryItResponse;  
      toastMessage = "URL Respons disalin!";
    }
    
    if (textToCopy) {
      try {  
        await navigator.clipboard.writeText(textToCopy);  
        setResponseCopied(true);  
        toast.success(toastMessage);  
        setTimeout(() => setResponseCopied(false), 2000);  
      }
      catch (err) { toast.error("Gagal menyalin."); }
    } else {
      toast.warn("Tidak ada konten valid untuk disalin.");
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-6">
      {/* UPDATED: ToastContainer default color to teal */}
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}/>
      
      <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        {/* --- HEADER BARU --- */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            {/* Kontainer untuk Ikon, Judul, dan Subjudul */}
            <div className="flex-grow mb-3 sm:mb-0">
              <div className="flex flex-col sm:flex-row items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                  {/* UPDATED: Icon for API Explorer */}
                  <Icon icon="ph:binoculars-duotone" className="text-2xl sm:text-3xl" /> 
                </div>
                <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                  API Explorer
                </h1>
              </div>
              {/* UPDATED: Subtitle */}
              <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
                Jelajahi dan interaksikan spesifikasi OpenAPI Anda dengan mudah.
              </p>
            </div>

            {/* Tombol Kembali */}
            {pathHistory.length > 1 && (
              <Button
                  onClick={handleGoBack}
                  text="Kembali"
                  icon="ph:arrow-left-duotone"
                  className={`${buttonSecondaryClass} self-end sm:self-center`}
                  iconClassName="mr-1"
              />
            )}
          </div>

          {/* Tampilan Path Saat Ini */}
          <div className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Path: <code className="bg-slate-100 dark:bg-slate-700 p-1 rounded text-teal-600 dark:text-teal-300 break-all"> {/* UPDATED: Path code color to teal */}
              {currentBrowsePath === INITIAL_PATH ? "Daftar Tag API" : `Tag: ${currentBrowsePath}`}
            </code>
          </div>
        </div>
        {/* --- AKHIR HEADER BARU --- */}


        {loadingList && !error && ( <div className="flex flex-col items-center justify-center p-10 min-h-[300px]"><Icon icon="svg-spinners:blocks-shuffle-3" className="text-5xl text-teal-500 mb-4" /><p className="text-lg font-medium text-slate-600 dark:text-slate-300">Memuat Spesifikasi API...</p></div>)}
        {error && !loadingList && (<div className="flex flex-col items-center justify-center p-10 min-h-[300px] bg-red-50 dark:bg-red-800/20 rounded-b-xl"><Icon icon="ph:warning-octagon-duotone" className="text-5xl text-red-500 mb-4" /><p className="text-lg font-semibold text-red-700 dark:text-red-300">Gagal Memuat</p><p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center max-w-xl">{error}</p></div>)}

        {!loadingList && !error && (
          <div className="md:flex md:min-h-[calc(100vh-300px)] md:max-h-[calc(100vh-230px)]"> 
            <div className="w-full md:w-full border-r-0 md:border-r border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 flex flex-col"> 
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/60">
                <input
                  type="text"
                  placeholder={currentBrowsePath === INITIAL_PATH ? "Cari tag..." : `Cari di ${currentBrowsePath}...`}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={inputBaseClass} // Menggunakan inputBaseClass yang telah diupdate fokusnya
                />
              </div>
              <SimpleBar className="flex-grow md:max-h-[calc(100vh-400px)]"> 
                <div className="p-3 sm:p-2 space-y-0.5">
                  {paginatedItems.length > 0 ? paginatedItems.map((item) => (
                    <button
                      key={item.id || item.name} 
                      onClick={() => handleItemClick(item)}
                      title={
                        item.type === 'dir' 
                        ? `Tag: ${item.name}\nDeskripsi: ${item.description || '-'}\nJumlah Endpoint: ${item.endpointCount}` 
                        : `Endpoint: ${item.name}\nMethod: ${item.method}\nPath: ${item.path}`
                      }
                      className={`w-full text-left flex items-center px-2.5 py-2 my-0.5 rounded-md hover:bg-sky-50 dark:hover:bg-sky-700/30 transition-colors duration-150 group ${
                        showTryItModal && currentApiEndpoint?.id === item.id && item.type === 'endpoint' 
                        ? "bg-sky-100 dark:bg-sky-600/40 ring-1 ring-sky-400 dark:ring-sky-500" 
                        : ""
                      }`}
                    >
                      <Icon
                        icon={item.type === 'dir' ? "ph:tag-duotone" : getEndpointIcon(item.method)}
                        className={`w-5 h-5 mr-2.5 flex-shrink-0 ${
                          item.type === 'dir' ? "text-yellow-500 dark:text-yellow-400" : 
                          (showTryItModal && currentApiEndpoint?.id === item.id ? "text-sky-600 dark:text-sky-300" : getMethodColorClass(item.method) || "text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400")
                        }`}
                      />
                      <span className={`truncate text-sm ${
                        showTryItModal && currentApiEndpoint?.id === item.id && item.type === 'endpoint' 
                        ? "text-sky-700 dark:text-sky-200 font-medium" 
                        : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                      }`}>
                        {item.type === 'endpoint' ? `${item.method} - ${item.name}` : item.name}
                      </span>
                      {item.type === 'dir' && typeof item.endpointCount === 'number' && (
                        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 pl-2 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                          {item.endpointCount}
                        </span>
                      )}
                        {item.type === 'endpoint' && (
                            <span className="ml-auto text-xs font-mono text-slate-400 dark:text-slate-500 pl-2 truncate group-hover:text-slate-600 dark:group-hover:text-slate-300" title={item.path}>
                                {item.path}
                            </span>
                        )}
                    </button>
                  )) : (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      <Icon icon={currentBrowsePath === INITIAL_PATH ? "ph:tags-thin" : "ph:plugs-thin"} className="mx-auto text-4xl opacity-70 mb-2"/>
                      <p className="text-sm">{searchTerm ? "Tidak ada yang cocok." : (currentBrowsePath === INITIAL_PATH ? "Tidak ada tag API." : "Tag ini tidak memiliki endpoint.")}</p>
                    </div>
                  )}
                </div>
              </SimpleBar>
              {totalPages > 1 && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-700/60 flex justify-between items-center text-xs">
                  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} text="Prev" icon="ph:caret-left-bold" className={`${buttonSecondaryClass} px-2.5 py-1`} />
                  <span>Hal {currentPage} dari {totalPages}</span>
                  <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} text="Next" icon="ph:caret-right-bold" iconPosition="right" className={`${buttonSecondaryClass} px-2.5 py-1`} />
                </div>
              )}
            </div>

              <div className="hidden md:flex md:w-0 lg:w-0"> 
              </div>
          </div>
        )}
      </Card>

      {currentApiEndpoint && ( 
        <Modal
          title={
            <div className="flex items-center text-slate-900 dark:text-slate-50">
              <Icon icon="ph:lightning-duotone" className="mr-2 h-5 w-5 flex-shrink-0 text-sky-500 dark:text-sky-400 sm:h-6 sm:w-6"/>
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm font-medium sm:text-base">Coba:</span>
                <span className={`inline-block whitespace-nowrap font-semibold text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${methodColorsTryItModal[currentApiEndpoint.method.toUpperCase()] || 'bg-gray-200 text-gray-700'}`}>
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
          // UPDATED: Modal className to use teal border, consistent with Card
          className="max-w-2xl border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80" // max-w-2xl, consistent modal border
          footerContent={ 
            <div className="flex flex-col sm:flex-row justify-end w-full gap-3">
              <Button type="button" text="Tutup" onClick={() => setShowTryItModal(false)} className={`${tryItButtonSecondaryClass} w-full sm:w-auto px-4 py-2 text-sm`} />
              <Button
                type="submit"
                text={tryItLoading ? <><Icon icon="svg-spinners:ring-resize" className="mr-2 text-lg" /> Mengirim...</> : <><Icon icon="ph:paper-plane-tilt-fill" className="mr-2 text-lg" /> Kirim Permintaan</>}
                onClick={handleSubmit(executeTryIt)}
                // UPDATED: Primary button in modal to use teal gradient
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white w-full sm:w-auto px-4 py-2 text-sm shadow-sm hover:shadow-md flex items-center justify-center"
                disabled={tryItLoading}
              />
            </div>
          }
        >
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
                      <Button onClick={copyResponseToClipboard} text={<><Icon icon={responseCopied ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-1 text-sm" /> {responseCopied ? "Disalin!" : (tryItResponseType === "json" || tryItResponseType === "text" ? "Salin" : "Salin URL")}</>} className={`${responseCopied ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-400 hover:bg-slate-500'} text-white py-1 px-2 rounded text-[10px] dark:bg-slate-600 dark:hover:bg-slate-500 transition-colors duration-150`}/>
                    )}
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden">
                    {tryItResponseType === "json" && (
                        <SyntaxHighlighter language="json" style={syntaxHighlighterTheme} customStyle={{ margin: 0, padding: '0.75rem', borderRadius: '0px'}} className="text-xs max-h-96 overflow-auto simple-scrollbar">
                        {JSON.stringify(tryItResponse, null, 2)}
                        </SyntaxHighlighter>
                    )}
                    {tryItResponseType === "text" && ( <pre className="rounded-none p-3 text-xs max-h-96 overflow-auto bg-slate-100 dark:bg-slate-700/50 whitespace-pre-wrap break-all simple-scrollbar">{String(tryItResponse)}</pre> )}
                    {tryItResponseType === "image" && typeof tryItResponse === 'string' && ( <img src={tryItResponse} alt="Respons API" className="max-w-full h-auto block p-2 bg-slate-100 dark:bg-slate-700/50" /> )}
                    {tryItResponseType === "video" && typeof tryItResponse === 'string' && ( <video src={tryItResponse} controls className="max-w-full h-auto block p-2 bg-slate-100 dark:bg-slate-700/50">Browser Anda tidak mendukung tag video.</video> )}
                    {(tryItResponseType === "document" || tryItResponseType === "blob") && tryItResponse?.url && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-700/50">
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-2"> Berkas diterima: <span className="font-medium">{tryItResponse.filename || "download"}</span> {tryItResponse.type && `(${tryItResponse.type})`}</p>
                        {/* UPDATED: Download button in modal to use teal gradient */}
                        <a href={tryItResponse.url} download={tryItResponse.filename || "download"} className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xs font-medium rounded-md transition-colors shadow-sm hover:shadow"> <Icon icon="ph:download-simple-duotone" className="mr-1.5 text-base" /> Unduh Berkas </a>
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

export default ApiSpecExplorerPage;