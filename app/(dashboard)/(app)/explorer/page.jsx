"use client";

import { useEffect, useState, Fragment, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomOneDark,
  atomOneLight,
} from "react-syntax-highlighter/dist/cjs/styles/hljs";
import { useForm, useFieldArray } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import SimpleBar from "simplebar-react";

const ITEMS_PER_PAGE = 15;

const INPUT_BASE_CLASSES =
  "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
const BUTTON_SECONDARY_CLASSES =
  "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150 disabled:opacity-50";

const BADGE_METHOD_COLORS = {
  GET: "bg-green-100 text-green-700 border border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600/50",
  POST: "bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-700/30 dark:text-sky-300 dark:border-sky-600/50",
  PUT: "bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600/50",
  DELETE: "bg-red-100 text-red-700 border border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600/50",
  PATCH:
    "bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-700/30 dark:text-indigo-300 dark:border-indigo-600/50",
  OPTIONS:
    "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/50",
  HEAD: "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600/50",
};

const APIExplorerPage = () => {
  const [apis, setApis] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortedTagKeys, setSortedTagKeys] = useState([]);
  const [apiFetchError, setApiFetchError] = useState(null);

  const [activeTag, setActiveTag] = useState(null);
  const [selectedEndpointForDetails, setSelectedEndpointForDetails] =
    useState(null);
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

  const {
    fields: pathFields,
    append: appendPath,
    remove: removePath,
  } = useFieldArray({ control, name: "pathParams" });
  const {
    fields: queryFields,
    append: appendQuery,
    remove: removeQuery,
  } = useFieldArray({ control, name: "queryParams" });
  const {
    fields: headerFields,
    append: appendHeader,
    remove: removeHeader,
  } = useFieldArray({ control, name: "headerParams" });
  const {
    fields: bodyFields,
    append: appendBody,
    remove: removeBody,
  } = useFieldArray({ control, name: "requestBodyParams" });

  useEffect(() => {
    const fetchSpec = async () => {
      setLoading(true);
      setApiFetchError(null);
      setApis({});
      setSortedTagKeys([]);
      try {
        const res = await fetch("/api/openapi");
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `Gagal mengambil spesifikasi: ${res.status} ${
              res.statusText
            }. ${errorText.substring(0, 100)}`
          );
        }
        const data = await res.json();
        const paths = data?.paths || {};
        const grouped = {};
        const tagsFromSpec = data?.tags || [];
        const tagOrder = tagsFromSpec.map((tag) => tag.name);

        Object.entries(paths).forEach(([path, methods]) => {
          Object.entries(methods).forEach(([method, details]) => {
            const endpointTag = details.tags?.[0] || "Lain-lain";
            if (!grouped[endpointTag]) {
              grouped[endpointTag] = {
                description:
                  tagsFromSpec.find((t) => t.name === endpointTag)
                    ?.description || "Endpoint dalam grup ini.",
                endpoints: [],
              };
            }
            grouped[endpointTag].endpoints.push({
              path,
              method: method.toUpperCase(),
              details,
              id: `${method.toUpperCase()}-${path}`,
            });
          });
        });

        for (const tag in grouped) {
          grouped[tag].endpoints.sort((a, b) => a.path.localeCompare(b.path));
        }

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
      } catch (err) {
        console.error("Gagal mengambil spesifikasi API:", err);
        setApiFetchError(err.message);
        toast.error(`Gagal memuat spesifikasi API: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchSpec();
  }, []);

  useEffect(() => {
    return () => {
      if (tryItResponseUrl) URL.revokeObjectURL(tryItResponseUrl);
    };
  }, [tryItResponseUrl]);

  const handleTagClick = useCallback((tagKey) => {
    setActiveTag(tagKey);
    setSelectedEndpointForDetails(null);
    setSearchTerm("");
    setCurrentPage(1);
  }, []);

  const handleEndpointClick = useCallback((apiEndpoint) => {
    setSelectedEndpointForDetails(apiEndpoint);
  }, []);

  const handleGoBack = useCallback(() => {
    setActiveTag(null);
    setSelectedEndpointForDetails(null);
    setSearchTerm("");
    setCurrentPage(1);
  }, []);

  const openTryItModal = useCallback(
    (api) => {
      setCurrentApiEndpoint(api);
      setTryItResponse(null);
      setTryItResponseType(null);
      if (tryItResponseUrl) URL.revokeObjectURL(tryItResponseUrl);
      setTryItResponseUrl(null);
      setTryItError(null);
      setResponseCopied(false);
      reset();

      setValue("method", api.method.toUpperCase());

      removePath();
      removeQuery();
      removeHeader();
      removeBody();

      const apiDetails = api.details;

      appendPath(
        (apiDetails.parameters?.filter((p) => p.in === "path") || []).map(
          (p) => ({
            name: p.name,
            value: p.example ?? p.schema?.default ?? "",
            required: p.required,
            description: p.description,
          })
        )
      );
      appendQuery(
        (apiDetails.parameters?.filter((p) => p.in === "query") || []).map(
          (p) => ({
            name: p.name,
            value: p.example ?? p.schema?.default ?? "",
            required: p.required,
            description: p.description,
          })
        )
      );
      appendHeader(
        (apiDetails.parameters?.filter((p) => p.in === "header") || []).map(
          (p) => ({
            name: p.name,
            value: p.example ?? p.schema?.default ?? "",
            required: p.required,
            description: p.description,
          })
        )
      );

      const requestBodyContent =
        apiDetails.requestBody?.content?.["application/json"];
      if (requestBodyContent) {
        if (requestBodyContent.example) {
          try {
            const exampleData =
              typeof requestBodyContent.example === "string"
                ? JSON.parse(requestBodyContent.example)
                : requestBodyContent.example;
            if (
              typeof exampleData === "object" &&
              exampleData !== null &&
              !Array.isArray(exampleData)
            ) {
              Object.entries(exampleData).forEach(([key, value]) =>
                appendBody({
                  key,
                  value: JSON.stringify(value, null, 2),
                  required: apiDetails.requestBody?.required || false,
                  description: "",
                })
              );
            } else {
              appendBody({
                key: "",
                value: JSON.stringify(exampleData, null, 2),
                required: apiDetails.requestBody?.required || false,
                description: "Raw JSON Body",
              });
            }
          } catch (e) {
            appendBody({
              key: "",
              value:
                typeof requestBodyContent.example === "string"
                  ? requestBodyContent.example
                  : "{\n  \n}",
              required: apiDetails.requestBody?.required || false,
              description: "Raw JSON Body (Error parsing example)",
            });
          }
        } else if (requestBodyContent.schema?.properties) {
          Object.entries(requestBodyContent.schema.properties).forEach(
            ([key, prop]) =>
              appendBody({
                key,
                value:
                  prop.default !== undefined
                    ? JSON.stringify(prop.default, null, 2)
                    : "",
                required: requestBodyContent.schema.required?.includes(key) || false,
                description: prop.description || "",
              })
          );
        } else {
          appendBody({
            key: "",
            value: "{\n  \n}",
            required: apiDetails.requestBody?.required || false,
            description: "Raw JSON Body (No example/properties)",
          });
        }
      } else if (
        ["POST", "PUT", "PATCH"].includes(api.method.toUpperCase()) &&
        apiDetails.requestBody
      ) {
        appendBody({
          key: "",
          value: "",
          required: apiDetails.requestBody.required || false,
          description: "Raw Request Body (Specify Content-Type in Headers)",
        });
      }
      setShowTryItModal(true);
    },
    [
      reset,
      setValue,
      removePath,
      removeQuery,
      removeHeader,
      removeBody,
      appendPath,
      appendQuery,
      appendHeader,
      appendBody,
      tryItResponseUrl,
    ]
  );

  const executeTryIt = async (formData) => {
    setTryItLoading(true);
    setTryItResponse(null);
    setTryItResponseType(null);
    if (tryItResponseUrl) URL.revokeObjectURL(tryItResponseUrl);
    setTryItResponseUrl(null);
    setTryItError(null);
    setResponseCopied(false);

    let url = currentApiEndpoint.path;
    let requestBodyData = {};
    const headers = {};
    const methodToExecute = formData.method.toUpperCase();

    formData.pathParams?.forEach((p) => {
      if (p.value) url = url.replace(`{${p.name}}`, encodeURIComponent(p.value));
    });

    const queryParams = new URLSearchParams();
    formData.queryParams?.forEach((p) => {
      if (p.name && p.value) queryParams.append(p.name, p.value);
    });
    if (queryParams.toString()) url = `${url}?${queryParams.toString()}`;

    let explicitContentType = false;
    formData.headerParams?.forEach((p) => {
      if (p.name && p.value) {
        headers[p.name] = p.value;
        if (p.name.toLowerCase() === "content-type") explicitContentType = true;
      }
    });

    let finalBody;
    if (
      ["POST", "PUT", "PATCH"].includes(methodToExecute) &&
      formData.requestBodyParams?.length > 0
    ) {
      const effectiveContentType =
        headers["Content-Type"] ||
        (explicitContentType ? undefined : "application/json");
      if (!headers["Content-Type"] && !explicitContentType && effectiveContentType === "application/json") {
        headers["Content-Type"] = "application/json";
      }

      let rawBodyValue = "";
      if (
        formData.requestBodyParams.length === 1 &&
        formData.requestBodyParams[0].key === ""
      ) {
        rawBodyValue = formData.requestBodyParams[0].value;
      }

      if (effectiveContentType === "application/json") {
        if (rawBodyValue) {
          try {
            requestBodyData = JSON.parse(rawBodyValue);
          } catch (e) {
            toast.error(`JSON tidak valid pada request body.`);
            setTryItError("JSON tidak valid pada request body.");
            setTryItLoading(false);
            return;
          }
        } else {
          formData.requestBodyParams.forEach((p) => {
            if (p.key) {
              try {
                if (p.value.trim().startsWith("{") || p.value.trim().startsWith("["))
                  requestBodyData[p.key] = JSON.parse(p.value);
                else if (p.value === "true") requestBodyData[p.key] = true;
                else if (p.value === "false") requestBodyData[p.key] = false;
                else if (!isNaN(p.value) && p.value.trim() !== "" && !p.value.startsWith("0") && p.value.length < 16)
                  requestBodyData[p.key] = Number(p.value);
                else requestBodyData[p.key] = p.value;
              } catch (e) {
                toast.error(`JSON tidak valid untuk key "${p.key}".`);
                setTryItError(`JSON tidak valid untuk key "${p.key}".`);
                setTryItLoading(false);
                return;
              }
            }
          });
        }
        finalBody = JSON.stringify(requestBodyData);
      } else {
        finalBody = rawBodyValue || (formData.requestBodyParams[0] ? formData.requestBodyParams[0].value : undefined);
      }
    }

    try {
      const res = await fetch(url, {
        method: methodToExecute,
        headers: headers,
        body: finalBody,
      });

      const contentTypeHeader = res.headers.get("content-type");
      if (!res.ok) {
        let errResMsg = `HTTP Error: ${res.status} ${res.statusText}. `;
        try {
          if (contentTypeHeader?.includes("application/json"))
            errResMsg += JSON.stringify(await res.json(), null, 2);
          else errResMsg += await res.text();
        } catch (e) {
          /* ignore */
        }
        setTryItError(errResMsg);
      } else {
        setTryItError(null);
        if (contentTypeHeader?.includes("application/json")) {
          setTryItResponse(await res.json());
          setTryItResponseType("json");
        } else if (contentTypeHeader?.startsWith("text/")) {
          setTryItResponse(await res.text());
          setTryItResponseType("text");
        } else if (contentTypeHeader?.startsWith("image/")) {
          const b = await res.blob();
          const newUrl = URL.createObjectURL(b);
          setTryItResponseUrl(newUrl);
          setTryItResponse(newUrl);
          setTryItResponseType("image");
        } else if (contentTypeHeader?.startsWith("video/")) {
          const b = await res.blob();
          const newUrl = URL.createObjectURL(b);
          setTryItResponseUrl(newUrl);
          setTryItResponse(newUrl);
          setTryItResponseType("video");
        } else if (
          contentTypeHeader?.includes("pdf") ||
          contentTypeHeader?.includes("document") ||
          contentTypeHeader?.startsWith("application/octet-stream")
        ) {
          const b = await res.blob();
          const newUrl = URL.createObjectURL(b);
          setTryItResponseUrl(newUrl);
          let fn = "downloaded_file";
          const cd = res.headers.get("content-disposition");
          if (cd) {
            const m = cd.match(/filename="?([^"]+)"?/);
            if (m && m[1]) fn = m[1];
          }
          setTryItResponse({ url: newUrl, filename: fn });
          setTryItResponseType("document");
        } else {
          try {
            const b = await res.blob();
            const newUrl = URL.createObjectURL(b);
            setTryItResponseUrl(newUrl);
            let fn = "downloaded_blob";
            const cd = res.headers.get("content-disposition");
            if (cd) {
              const m = cd.match(/filename="?([^"]+)"?/);
              if (m && m[1]) fn = m[1];
            }
            setTryItResponse({ url: newUrl, filename: fn });
            setTryItResponseType("blob");
          } catch {
            setTryItResponse(await res.text());
            setTryItResponseType("text");
          }
        }
        toast.success("Permintaan API berhasil!");
      }
    } catch (err) {
      setTryItError(err.message || "Error tidak terduga saat eksekusi API.");
      toast.error(`Error eksekusi API: ${err.message}`);
    } finally {
      setTryItLoading(false);
    }
  };

  const renderParametersForm = useCallback(() => (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      <div>
        <label className="block text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">
          Metode HTTP:
        </label>
        <select {...register("method")} className={INPUT_BASE_CLASSES}>
          {Object.keys(BADGE_METHOD_COLORS).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {pathFields.length > 0 && (
        <div>
          <h5 className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">
            Parameter Path:
          </h5>
          <div className="space-y-3">
            {pathFields.map((f, i) => (
              <div key={f.id}>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-mono bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[11px] mr-1">
                    {f.name}
                  </span>
                  {f.required && <span className="text-red-500 ml-1">*</span>}
                  {f.description && (
                    <span className="text-slate-500 dark:text-slate-500 text-[10px] italic ml-1">
                      {" "}
                      - {f.description}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  {...register(`pathParams.${i}.value`, { required: f.required })}
                  placeholder={`Nilai untuk ${f.name}`}
                  className={INPUT_BASE_CLASSES}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h5 className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">
          Parameter Query:
        </h5>
        <div className="space-y-3">
          {queryFields.map((f, i) => (
            <div
              key={f.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
            >
              <input
                type="text"
                {...register(`queryParams.${i}.name`, {
                  required: f.required && watch(`queryParams.${i}.value`) !== "",
                })}
                placeholder="Nama Param"
                className={`${INPUT_BASE_CLASSES} sm:flex-1`}
              />
              <input
                type="text"
                {...register(`queryParams.${i}.value`)}
                placeholder={f.description || `Nilai Param`}
                className={`${INPUT_BASE_CLASSES} sm:flex-1`}
              />
              <button
                type="button"
                onClick={() => removeQuery(i)}
                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md self-start sm:self-center mt-1 sm:mt-0"
              >
                <Icon icon="ph:x-circle-duotone" className="text-lg" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => appendQuery({ name: "", value: "", required: false, description: "" })}
          text="Tambah Query"
          icon="ph:plus-circle-duotone"
          className={`${BUTTON_SECONDARY_CLASSES} mt-2`}
          iconClassName="mr-1"
        />
      </div>

      <div>
        <h5 className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">
          Parameter Header:
        </h5>
        <div className="space-y-3">
          {headerFields.map((f, i) => (
            <div
              key={f.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
            >
              <input
                type="text"
                {...register(`headerParams.${i}.name`, {
                  required: f.required && watch(`headerParams.${i}.value`) !== "",
                })}
                placeholder="Nama Header"
                className={`${INPUT_BASE_CLASSES} sm:flex-1`}
              />
              <input
                type="text"
                {...register(`headerParams.${i}.value`)}
                placeholder={f.description || `Nilai Header`}
                className={`${INPUT_BASE_CLASSES} sm:flex-1`}
              />
              <button
                type="button"
                onClick={() => removeHeader(i)}
                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md self-start sm:self-center mt-1 sm:mt-0"
              >
                <Icon icon="ph:x-circle-duotone" className="text-lg" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => appendHeader({ name: "", value: "", required: false, description: "" })}
          text="Tambah Header"
          icon="ph:plus-circle-duotone"
          className={`${BUTTON_SECONDARY_CLASSES} mt-2`}
          iconClassName="mr-1"
        />
      </div>

      {(watchedMethod === "POST" ||
        watchedMethod === "PUT" ||
        watchedMethod === "PATCH") && (
        <div>
          <h5 className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5">
            Request Body:
          </h5>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Untuk JSON, isi key-value atau JSON string mentah (key kosong). Untuk tipe lain, isi body mentah di value.
          </p>
          <div className="space-y-3">
            {bodyFields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-4">
                  <input
                    type="text"
                    {...register(`requestBodyParams.${i}.key`)}
                    placeholder="Key (opsional)"
                    className={INPUT_BASE_CLASSES}
                    title="Biarkan kosong jika mengirim JSON mentah di kolom Value"
                  />
                </div>
                <div className="col-span-10 sm:col-span-7">
                  <textarea
                    {...register(`requestBodyParams.${i}.value`, {
                      required: f.required,
                    })}
                    placeholder={
                      f.description ||
                      "Value (string, angka, atau JSON string untuk objek/array)"
                    }
                    rows={
                      watch(`requestBodyParams.${i}.value`)?.split("\n").length > 2
                        ? Math.min(
                            watch(`requestBodyParams.${i}.value`)?.split("\n").length,
                            10
                          )
                        : 3
                    }
                    className={`${INPUT_BASE_CLASSES} resize-y leading-relaxed font-mono text-xs`}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-center justify-end self-start sm:self-center pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => removeBody(i)}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md"
                  >
                    <Icon icon="ph:x-circle-duotone" className="text-lg" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => appendBody({ key: "", value: "", required: false, description: "" })}
            text="Tambah Field Body"
            icon="ph:plus-circle-duotone"
            className={`${BUTTON_SECONDARY_CLASSES} mt-2`}
            iconClassName="mr-1"
          />
        </div>
      )}
      {pathFields.length === 0 &&
        queryFields.length === 0 &&
        headerFields.length === 0 &&
        !["POST", "PUT", "PATCH"].includes(watchedMethod) && (
          <p className="italic text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            Tidak ada parameter atau body untuk metode ini.
          </p>
        )}
    </div>
  ), [
    register,
    pathFields,
    queryFields,
    headerFields,
    bodyFields,
    watchedMethod,
    appendQuery,
    removeQuery,
    appendHeader,
    removeHeader,
    appendBody,
    removeBody,
    watch,
  ]);

  const copyResponseToClipboard = async () => {
    if (!tryItResponse && !tryItResponseUrl) return;
    let textToCopy = "",
      toastMessage = "";
    if (tryItResponseType === "json") {
      textToCopy = JSON.stringify(tryItResponse, null, 2);
      toastMessage = "Response JSON disalin!";
    } else if (tryItResponseType === "text") {
      textToCopy = String(tryItResponse);
      toastMessage = "Response teks disalin!";
    } else if (
      (["image", "video", "document", "blob"].includes(tryItResponseType) &&
        (tryItResponse?.url || typeof tryItResponse === "string"))
    ) {
      textToCopy = tryItResponse?.url || tryItResponse;
      toastMessage = "URL Response disalin!";
    }
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setResponseCopied(true);
        toast.success(toastMessage);
        setTimeout(() => setResponseCopied(false), 2000);
      } catch (err) {
        toast.error("Gagal menyalin.");
      }
    } else toast.warn("Tidak ada yang bisa disalin untuk tipe respons ini.");
  };

  const currentSyntaxTheme =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? atomOneDark
      : atomOneLight;

  const endpointsToShow = activeTag && apis[activeTag] ? apis[activeTag].endpoints : [];
  const filteredEndpoints = endpointsToShow.filter(
    (endpoint) =>
      endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.details.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredEndpoints.length / ITEMS_PER_PAGE);
  const paginatedEndpoints = filteredEndpoints.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  }, []);

  const getFileIcon = (method) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "ph:file-arrow-down-duotone";
      case "POST":
        return "ph:file-arrow-up-duotone";
      case "PUT":
        return "ph:file-code-duotone";
      case "DELETE":
        return "ph:file-x-duotone";
      case "PATCH":
        return "ph:file-plus-duotone";
      default:
        return "ph:file-duotone";
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-6">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${
            o?.type === "success"
              ? "bg-emerald-500 text-white"
              : o?.type === "error"
              ? "bg-red-500 text-white"
              : o?.type === "warning"
              ? "bg-yellow-500 text-white"
              : "bg-teal-500 text-white"
          } dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
              <Icon icon="ph:compass-tool-duotone" className="text-2xl sm:text-3xl" />
            </div>
            <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
              API Explorer
            </h1>
          </div>
          <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
            Jelajahi API Explorer!
          </p>
          {activeTag && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                onClick={handleGoBack}
                text="Kembali ke Kategori"
                icon="ph:arrow-left-duotone"
                className={`${BUTTON_SECONDARY_CLASSES}`}
                iconClassName="mr-1"
              />
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Path:{" "}
                <code className="bg-slate-100 dark:bg-slate-700 p-1 rounded text-teal-600 dark:text-teal-300 break-all">
                  Kategori / {activeTag}
                </code>
              </span>
            </div>
          )}
          {!activeTag && (
            <div className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Path:{" "}
              <code className="bg-slate-100 dark:bg-slate-700 p-1 rounded text-teal-600 dark:text-teal-300 break-all">
                Kategori API
              </code>
            </div>
          )}
        </div>

        {loading && !apiFetchError && (
          <div className="flex flex-col items-center justify-center p-10 min-h-[300px]">
            <Icon
              icon="svg-spinners:blocks-shuffle-3"
              className="text-5xl text-teal-500 mb-4"
            />
            <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
              Memuat Spesifikasi API...
            </p>
          </div>
        )}
        {apiFetchError && !loading && (
          <div className="flex flex-col items-center justify-center p-10 min-h-[300px] bg-red-50 dark:bg-red-800/20 rounded-b-xl">
            <Icon
              icon="ph:warning-octagon-duotone"
              className="text-5xl text-red-500 mb-4"
            />
            <p className="text-lg font-semibold text-red-700 dark:text-red-300">
              Gagal Memuat API
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center max-w-xl">
              {apiFetchError}
            </p>
          </div>
        )}

        {!loading && !apiFetchError && (
          <div className="md:flex md:min-h-[calc(100vh-310px)] md:max-h-[calc(100vh-240px)]">
            <div className="w-full md:w-2/5 lg:w-1/3 border-r-0 md:border-r border-b md:border-b-0 border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 flex flex-col">
              {activeTag && (
                <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/60">
                  <input
                    type="text"
                    placeholder={`Cari di ${activeTag}...`}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={INPUT_BASE_CLASSES}
                  />
                </div>
              )}
              <SimpleBar className="flex-grow md:max-h-[calc(100vh-400px)]">
                <div className="p-3 sm:p-2 space-y-0.5">
                  {!activeTag ? (
                    sortedTagKeys.length > 0 ? (
                      sortedTagKeys.map((tagKey) => (
                        <button
                          key={tagKey}
                          onClick={() => handleTagClick(tagKey)}
                          title={apis[tagKey]?.description || tagKey}
                          className="w-full text-left flex items-center px-2.5 py-2.5 my-0.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-700/30 transition-colors duration-150 group"
                        >
                          <Icon
                            icon="ph:folder-duotone"
                            className="w-5 h-5 mr-2.5 flex-shrink-0 text-yellow-500 dark:text-yellow-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-300"
                          />
                          <span className="truncate text-sm text-slate-700 dark:text-slate-300 group-hover:text-teal-700 dark:group-hover:text-teal-200 font-medium">
                            {tagKey}
                          </span>
                          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 pl-2 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                            ({apis[tagKey]?.endpoints.length || 0})
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        <Icon
                          icon="ph:binoculars-duotone"
                          className="mx-auto text-4xl opacity-70 mb-2"
                        />
                        <p className="text-sm">Tidak ada kategori API ditemukan.</p>
                      </div>
                    )
                  ) : (
                    paginatedEndpoints.length > 0 ? (
                      paginatedEndpoints.map((api) => (
                        <button
                          key={api.id}
                          onClick={() => handleEndpointClick(api)}
                          title={`${api.method} ${api.path}\n${
                            api.details.summary || ""
                          }`}
                          className={`w-full text-left flex items-center px-2.5 py-2 my-0.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-700/30 transition-colors duration-150 group ${
                            selectedEndpointForDetails?.id === api.id
                              ? "bg-teal-100 dark:bg-teal-600/40 ring-1 ring-teal-400 dark:ring-teal-500"
                              : ""
                          }`}
                        >
                          <Icon
                            icon={getFileIcon(api.method)}
                            className={`w-5 h-5 mr-2.5 flex-shrink-0 ${
                              selectedEndpointForDetails?.id === api.id
                                ? "text-teal-600 dark:text-teal-300"
                                : "text-slate-400 dark:text-slate-500 group-hover:text-teal-500 dark:group-hover:text-teal-400"
                            }`}
                          />
                          <div className="flex-grow min-w-0">
                            <span
                              className={`truncate text-xs font-mono ${
                                selectedEndpointForDetails?.id === api.id
                                  ? "text-teal-700 dark:text-teal-200 font-semibold"
                                  : "text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                              }`}
                            >
                              {api.path}
                            </span>
                            <span
                              className={`block truncate text-[11px] ${
                                selectedEndpointForDetails?.id === api.id
                                  ? "text-teal-600 dark:text-teal-300"
                                  : "text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400"
                              }`}
                            >
                              {api.details.summary || "Tanpa ringkasan"}
                            </span>
                          </div>
                          <span
                            className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                              BADGE_METHOD_COLORS[api.method] ||
                              "bg-gray-200 text-gray-700"
                            } ${
                              selectedEndpointForDetails?.id === api.id
                                ? "ring-1 ring-offset-1 dark:ring-offset-teal-600/40 ring-offset-teal-100 ring-teal-500"
                                : ""
                            }`}
                          >
                            {api.method}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        <Icon
                          icon="ph:files-thin"
                          className="mx-auto text-4xl opacity-70 mb-2"
                        />
                        <p className="text-sm">
                          {searchTerm
                            ? "Tidak ada endpoint yang cocok."
                            : "Tidak ada endpoint di kategori ini."}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </SimpleBar>
              {activeTag && totalPages > 1 && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-700/60 flex justify-between items-center text-xs">
                  <Button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    text="Prev"
                    icon="ph:caret-left-bold"
                    className={`${BUTTON_SECONDARY_CLASSES} px-2.5 py-1`}
                  />
                  <span>
                    Hal {currentPage} dari {totalPages}
                  </span>
                  <Button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    text="Next"
                    icon="ph:caret-right-bold"
                    iconPosition="right"
                    className={`${BUTTON_SECONDARY_CLASSES} px-2.5 py-1`}
                  />
                </div>
              )}
            </div>

            <div className="w-full md:w-3/5 lg:w-2/3 bg-slate-50 dark:bg-slate-900/30 flex flex-col">
              {selectedEndpointForDetails ? (
                <SimpleBar className="h-full">
                  <div className="p-4 sm:p-6">
                    <Card
                      className="border border-slate-200 dark:border-slate-700/60 rounded-lg bg-white dark:bg-slate-800/60 shadow"
                      bodyClass="p-3 sm:p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center mb-3 sm:mb-4">
                        <span
                          className={`inline-block font-bold text-xs sm:text-sm px-2.5 py-1 rounded mr-0 sm:mr-3 mb-1.5 sm:mb-0 ${
                            BADGE_METHOD_COLORS[
                              selectedEndpointForDetails.method.toUpperCase()
                            ] || "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {selectedEndpointForDetails.method.toUpperCase()}
                        </span>
                        <h3 className="text-sm sm:text-base font-mono font-semibold text-teal-700 dark:text-teal-200 truncate break-all">
                          {selectedEndpointForDetails.path}
                        </h3>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-xs prose-headings:font-semibold prose-headings:uppercase prose-headings:tracking-wider prose-headings:text-slate-500 prose-headings:dark:text-slate-400 prose-ul:pl-4">
                        <h5>Ringkasan</h5>
                        <p className="text-slate-700 dark:text-slate-200">
                          {selectedEndpointForDetails.details.summary ||
                            "Tidak ada ringkasan."}
                        </p>
                        {selectedEndpointForDetails.details.description && (
                          <>
                            <h5>Deskripsi</h5>
                            <p className="text-slate-700 dark:text-slate-200">
                              {selectedEndpointForDetails.details.description}
                            </p>
                          </>
                        )}
                        {selectedEndpointForDetails.details.parameters?.length > 0 && (
                          <>
                            <h5>Parameter</h5>
                            <ul className="list-none p-0 m-0 space-y-1.5">
                              {selectedEndpointForDetails.details.parameters.map(
                                (param, pIdx) => (
                                  <li
                                    key={pIdx}
                                    className="text-[11px] leading-relaxed pb-1 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center">
                                      <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] dark:bg-slate-600 dark:text-slate-200 mr-1.5 shrink-0 mb-0.5 sm:mb-0">
                                        {param.name}
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px]">
                                        ({param.in}, {param.schema?.type || "any"})
                                        {param.required && (
                                          <strong className="text-red-500 dark:text-red-400">
                                            {" "}
                                            (wajib)
                                          </strong>
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 italic text-[10px] sm:text-[11px] mt-0.5 sm:pl-1">
                                      {param.description || "Tanpa deskripsi."}
                                    </p>
                                  </li>
                                )
                              )}
                            </ul>
                          </>
                        )}
                        {selectedEndpointForDetails.details.requestBody && (
                          <>
                            <h5>Request Body</h5>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Tipe Konten yang Diharapkan:{" "}
                              <span className="font-medium">
                                {Object.keys(
                                  selectedEndpointForDetails.details.requestBody
                                    .content || {}
                                ).join(", ") || "Tidak spesifik"}
                              </span>
                              {selectedEndpointForDetails.details.requestBody
                                .required && (
                                <strong className="text-red-500 dark:text-red-400">
                                  {" "}
                                  (wajib)
                                </strong>
                              )}
                            </p>
                            {selectedEndpointForDetails.details.requestBody.description && (
                              <p className="text-[11px] italic text-slate-500 dark:text-slate-400">
                                {
                                  selectedEndpointForDetails.details.requestBody
                                    .description
                                }
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="mt-4 sm:mt-5 flex justify-end">
                        <Button
                          onClick={() => openTryItModal(selectedEndpointForDetails)}
                          text="Coba API Ini!"
                          icon="ph:lightning-duotone"
                          iconClassName="mr-1.5"
                          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-150"
                        />
                      </div>
                    </Card>
                  </div>
                </SimpleBar>
              ) : (
                <div className="flex items-center justify-center h-full p-10">
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    <Icon
                      icon={
                        activeTag ? "ph:file-search-duotone" : "ph:folders-duotone"
                      }
                      className="text-7xl mb-4 opacity-60"
                    />
                    <p className="text-lg">
                      {activeTag
                        ? "Pilih endpoint dari panel kiri."
                        : "Pilih kategori API dari panel kiri."}
                    </p>
                    <p className="text-sm mt-1">
                      {activeTag
                        ? "Detail endpoint akan ditampilkan di sini."
                        : "Daftar endpoint akan muncul di panel kiri."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {currentApiEndpoint && (
        <Modal
          title={
            <div className="flex items-center text-slate-900 dark:text-slate-50">
              <Icon
                icon="ph:lightning-duotone"
                className="mr-2 h-5 w-5 flex-shrink-0 text-teal-500 dark:text-teal-400 sm:h-6 sm:w-6"
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm font-medium sm:text-base">Coba:</span>
                <span
                  className={`inline-block whitespace-nowrap font-semibold text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${
                    BADGE_METHOD_COLORS[
                      currentApiEndpoint.method.toUpperCase()
                    ] || "bg-gray-200 text-gray-700"
                  }`}
                >
                  {currentApiEndpoint.method.toUpperCase()}
                </span>
                <span
                  className="font-mono text-xs text-slate-600 dark:text-slate-400 sm:text-sm truncate"
                  title={currentApiEndpoint.path}
                >
                  {currentApiEndpoint.path}
                </span>
              </div>
            </div>
          }
          activeModal={showTryItModal}
          onClose={() => setShowTryItModal(false)}
          className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
          footerContent={
            <div className="flex flex-col sm:flex-row justify-end w-full gap-3 p-1">
              <Button
                type="button"
                text="Tutup"
                onClick={() => setShowTryItModal(false)}
                className={`${BUTTON_SECONDARY_CLASSES} px-3 py-1.5`}
              />
              <Button
                type="submit"
                text={
                  tryItLoading ? (
                    <>
                      <Icon icon="svg-spinners:ring-resize" className="mr-2 text-lg" />{" "}
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Icon icon="ph:paper-plane-tilt-fill" className="mr-2 text-lg" />{" "}
                      Kirim Permintaan
                    </>
                  )
                }
                onClick={handleSubmit(executeTryIt)}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white px-4 py-2 text-sm shadow-sm hover:shadow-md flex items-center justify-center"
                disabled={tryItLoading}
              />
            </div>
          }
        >
          <SimpleBar style={{ maxHeight: "70vh" }} className="p-0.5">
            <form onSubmit={handleSubmit(executeTryIt)} className="space-y-4 p-0.5">
              {renderParametersForm()}
              {tryItLoading && (
                <div className="mt-4 text-center text-slate-600 dark:text-slate-400 flex items-center justify-center text-sm">
                  {" "}
                  <Icon icon="svg-spinners:ring-resize" className="mr-2 text-xl" />{" "}
                  Mengeksekusi permintaan...{" "}
                </div>
              )}
              {tryItError && (
                <div className="mt-4 p-3 bg-red-100/80 border border-red-300 text-red-700 rounded-lg dark:bg-red-900/50 dark:border-red-700/60 dark:text-red-300 text-xs">
                  <h5 className="font-semibold mb-1 flex items-center text-sm">
                    <Icon icon="ph:warning-circle-duotone" className="mr-2 text-lg" />{" "}
                    Error:
                  </h5>
                  <pre className="whitespace-pre-wrap break-all font-mono">
                    {tryItError}
                  </pre>
                </div>
              )}
              {tryItResponse !== null && !tryItError && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                      Respons:
                    </h5>
                    {(tryItResponseType === "json" ||
                      tryItResponseType === "text" ||
                      (["image", "video", "document", "blob"].includes(
                        tryItResponseType
                      ) &&
                        (tryItResponse?.url || typeof tryItResponse === "string"))) && (
                      <Button
                        onClick={copyResponseToClipboard}
                        text={
                          <>
                            <Icon
                              icon={
                                responseCopied
                                  ? "ph:check-circle-duotone"
                                  : "ph:copy-duotone"
                              }
                              className="mr-1 text-sm"
                            />{" "}
                            {responseCopied
                              ? "Disalin!"
                              : tryItResponseType === "json" ||
                                tryItResponseType === "text"
                              ? "Salin"
                              : "Salin URL"}
                          </>
                        }
                        className={`${
                          responseCopied
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-teal-500 hover:bg-teal-600"
                        } text-white py-1 px-2 rounded text-[10px] dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors duration-150`}
                      />
                    )}
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden">
                    {tryItResponseType === "json" && (
                      <SyntaxHighlighter
                        language="json"
                        style={currentSyntaxTheme}
                        customStyle={{ margin: 0, padding: "0.75rem", borderRadius: "0px" }}
                        className="text-xs max-h-96 overflow-auto simple-scrollbar"
                      >
                        {JSON.stringify(tryItResponse, null, 2)}
                      </SyntaxHighlighter>
                    )}
                    {tryItResponseType === "text" && (
                      <pre className="rounded-none p-3 text-xs max-h-96 overflow-auto bg-slate-50 dark:bg-slate-800/70 whitespace-pre-wrap break-all simple-scrollbar">
                        {String(tryItResponse)}
                      </pre>
                    )}
                    {tryItResponseType === "image" &&
                      typeof tryItResponse === "string" && (
                        <img
                          src={tryItResponse}
                          alt="API Response"
                          className="max-w-full h-auto block p-2 bg-slate-50 dark:bg-slate-800/70"
                        />
                      )}
                    {tryItResponseType === "video" &&
                      typeof tryItResponse === "string" && (
                        <video
                          src={tryItResponse}
                          controls
                          className="max-w-full h-auto block p-2 bg-slate-50 dark:bg-slate-800/70"
                        >
                          Browser Anda tidak mendukung tag video.
                        </video>
                      )}
                    {(tryItResponseType === "document" ||
                      tryItResponseType === "blob") &&
                      tryItResponse?.url && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/70">
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-2">
                            {" "}
                            Menerima berkas:{" "}
                            <span className="font-medium">
                              {tryItResponse.filename || "download"}
                            </span>{" "}
                          </p>
                          <a
                            href={tryItResponse.url}
                            download={tryItResponse.filename || "download"}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
                          >
                            {" "}
                            <Icon
                              icon="ph:download-simple-duotone"
                              className="mr-1.5 text-base"
                            />{" "}
                            Unduh Berkas{" "}
                          </a>
                          {tryItResponseType === "document" &&
                            tryItResponse.filename?.toLowerCase().endsWith(".pdf") && (
                              <div className="mt-3 rounded overflow-hidden border border-slate-300 dark:border-slate-600">
                                <embed
                                  src={tryItResponse.url}
                                  type="application/pdf"
                                  width="100%"
                                  height="280px"
                                />{" "}
                              </div>
                            )}
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

export default APIExplorerPage;