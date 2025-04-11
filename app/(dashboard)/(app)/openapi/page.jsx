'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOpenApiSpec } from "@/components/partials/app/openapi/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import SimpleBar from "simplebar-react";
import { ToastContainer, toast } from 'react-toastify';

const PAGE_SIZE = 5;

const ApiOpenapi = () => {
  const dispatch = useDispatch();
  const { spec, status, error } = useSelector((state) => state.openapi);
  const [selectedPath, setSelectedPath] = useState(null);
  const [method, setMethod] = useState('');
  const [params, setParams] = useState({});
  const [response, setResponse] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchOpenApiSpec());
  }, [status, dispatch]);

  const endpoints = useMemo(() => {
    if (!spec) return [];

    let entries = Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((m) => ({
        method: m.toUpperCase(),
        path,
        value: `${m}::${path}`,
      }))
    );

    return entries.sort((a, b) =>
      sortAsc ? a.path.localeCompare(b.path) : b.path.localeCompare(a.path)
    );
  }, [spec, sortAsc]);

  const paginatedEndpoints = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return endpoints.slice(start, start + PAGE_SIZE);
  }, [endpoints, currentPage]);

  const totalPages = Math.ceil(endpoints.length / PAGE_SIZE);

  const handleTryIt = async () => {
    if (!selectedPath || !method) {
      toast.error("Pilih endpoint terlebih dahulu!", { autoClose: 2000 });
      return;
    }

    const url = selectedPath.replace(/\{(.+?)\}/g, (_, key) => params[key] || '');
    const fullUrl = url.startsWith('http') ? url : `${spec.servers?.[0]?.url || ''}${url}`;
    const bodySchema = spec.paths[selectedPath][method]?.requestBody?.content?.['application/json']?.schema;
    const body = bodySchema ? JSON.parse(params.body || '{}') : undefined;

    setLoading(true);
    try {
      const res = await fetch(fullUrl, {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json().catch(() => ({}));
      setResponse(data);
      toast.success("Respons berhasil diambil!", { autoClose: 2000 });
    } catch (err) {
      setResponse({ error: 'Fetch failed', details: err.message });
      toast.error("Gagal mengambil respons!", { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const renderParameters = () => {
    if (!selectedPath || !method) return null;
    const pathParams = spec.paths[selectedPath][method]?.parameters || [];
    const hasBody = spec.paths[selectedPath][method]?.requestBody;

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {pathParams.map((p) => (
          <Textinput
            key={p.name}
            label={`${p.name} (${p.in})`}
            value={params[p.name] || ''}
            onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
          />
        ))}
        {hasBody && (
          <div className="md:col-span-2">
            <Textarea
              label="Body (JSON)"
              rows={5}
              value={params.body || ''}
              onChange={(e) => setParams({ ...params, body: e.target.value })}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Card
      bodyClass="relative p-4 h-full overflow-hidden"
      className="h-full w-full sm:w-auto bg-white shadow-md"
    >
        <h1 className="text-2xl font-bold text-center">Manual API Playground</h1>

        {status === 'loading' && <p className="text-yellow-500 text-center">Memuat spesifikasi API...</p>}
        {status === 'failed' && <p className="text-red-600 text-center">Gagal: {error}</p>}

        {status === 'succeeded' && spec && (
          <>
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <label className="text-sm font-medium">Pilih Endpoint</label>
                <Button size="sm" onClick={() => setSortAsc(!sortAsc)}>
                  Sort: {sortAsc ? 'A-Z' : 'Z-A'}
                </Button>
              </div>

              <select
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900"
                onChange={(e) => {
                  const [m, path] = e.target.value.split('::');
                  setMethod(m);
                  setSelectedPath(path);
                  setParams({});
                  setResponse(null);
                }}
              >
                <option value="">-- Pilih Endpoint --</option>
                {paginatedEndpoints.map((ep) => (
                  <option key={ep.value} value={ep.value}>
                    [{ep.method}] {ep.path}
                  </option>
                ))}
              </select>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <Button size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <span>Halaman {currentPage} dari {totalPages}</span>
                  <Button size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </div>

            {renderParameters()}

            <Button className="btn-dark w-full" onClick={handleTryIt} disabled={!selectedPath || !method || loading}>
              {loading ? 'Memproses...' : 'Coba Endpoint'}
            </Button>

            {response && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">Respons:</h4>
                <SimpleBar style={{ maxHeight: 300 }}>
                  <pre className="text-sm whitespace-pre-wrap break-words bg-gray-100 dark:bg-gray-900 p-3 rounded-md">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </SimpleBar>
              </div>
            )}
          </>
        )}
      </Card>
      <ToastContainer position="top-right" />
    </div>
  );
};

export default ApiOpenapi;
