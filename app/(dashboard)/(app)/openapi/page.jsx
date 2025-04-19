'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOpenApiSpec } from '@/components/partials/app/openapi/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textinput from '@/components/ui/Textinput';
import Textarea from '@/components/ui/Textarea';
import SimpleBar from 'simplebar-react';
import { ToastContainer, toast } from 'react-toastify';

const ApiOpenapi = () => {
  const dispatch = useDispatch();
  const { spec, status, error } = useSelector((state) => state.openapi);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [params, setParams] = useState([{ key: '', value: '' }]);
  const [bodyInput, setBodyInput] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchOpenApiSpec());
  }, [status, dispatch]);

  const tags = useMemo(() => {
    if (!spec) return [];
    const tagSet = new Set();
    Object.values(spec.paths).forEach((methods) => {
      Object.values(methods).forEach((op) => {
        op.tags?.forEach((tag) => tagSet.add(tag));
      });
    });
    return Array.from(tagSet);
  }, [spec]);

  const structuredEndpoints = useMemo(() => {
    if (!spec || !selectedTag) return {};
    const grouped = {};
    Object.entries(spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, op]) => {
        if (op.tags?.includes(selectedTag)) {
          const parts = path.split('/').filter(Boolean);
          const group = parts.length > 1 ? parts[0] : 'root';
          if (!grouped[group]) grouped[group] = [];
          grouped[group].push({
            method: method.toUpperCase(),
            path,
            summary: op.summary || '',
          });
        }
      });
    });
    return grouped;
  }, [spec, selectedTag]);

  const handleTryIt = async () => {
    if (!selectedEndpoint) {
      toast.error('Pilih endpoint terlebih dahulu!', { autoClose: 2000 });
      return;
    }
    const queryParams = params
      .filter((p) => p.key && p.value)
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    const fullUrl = `${spec.servers?.[0]?.url || ''}${selectedEndpoint.path}${
      selectedEndpoint.method === 'GET' && queryParams ? `?${queryParams}` : ''
    }`;
    const options = {
      method: selectedEndpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (selectedEndpoint.method === 'POST') {
      try {
        options.body = JSON.stringify(JSON.parse(bodyInput));
      } catch {
        toast.error('Input body tidak valid JSON!', { autoClose: 2000 });
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch(fullUrl, options);
      const data = await res.json().catch(() => ({}));
      setResponse(data);
      toast.success('Respons berhasil diambil!', { autoClose: 2000 });
    } catch (err) {
      setResponse({ error: 'Fetch failed', details: err.message });
      toast.error('Gagal mengambil respons!', { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const handleParamChange = (index, field, value) => {
    const newParams = [...params];
    newParams[index][field] = value;
    setParams(newParams);
  };

  const addParam = () => setParams([...params, { key: '', value: '' }]);

  const removeParam = (index) => {
    const newParams = [...params];
    newParams.splice(index, 1);
    setParams(newParams);
  };

  return (
    <div className="w-full px-2 py-6">
  <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
        <h1 className="text-xl font-bold text-center">Swagger-like API Playground</h1>
        {status === 'loading' && <p className="text-gray-500">Memuat spesifikasi API...</p>}
        {status === 'failed' && <p className="text-red-600">Gagal: {error}</p>}
        {status === 'succeeded' && spec && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Pilih Tag</label>
                <select
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-900"
                  value={selectedTag}
                  onChange={(e) => {
                    setSelectedTag(e.target.value);
                    setSelectedEndpoint(null);
                    setParams([{ key: '', value: '' }]);
                    setResponse(null);
                  }}
                >
                  <option value="">-- Pilih Tag --</option>
                  {tags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              {Object.keys(structuredEndpoints).length > 0 && (
                <div>
                  <label className="text-sm font-medium">Pilih Endpoint</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-900"
                    onChange={(e) => {
                      const [method, ...pathParts] = e.target.value.split('::');
                      const path = pathParts.join('::');
                      setSelectedEndpoint({ method, path });
                      setResponse(null);
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
              {selectedEndpoint && selectedEndpoint.method === 'GET' && (
                <div>
                  <h2 className="text-sm font-semibold mb-2">Query Parameters</h2>
                  <div className="space-y-2">
                    {params.map((p, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Textinput
                          placeholder="Key"
                          value={p.key}
                          onChange={(e) => handleParamChange(idx, 'key', e.target.value)}
                        />
                        <Textinput
                          placeholder="Value"
                          value={p.value}
                          onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                        />
                        <Button
                          size="icon-sm"
                          className="btn-danger"
                          onClick={() => removeParam(idx)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" className="btn-dark" onClick={addParam}>+ Add Param</Button>
                  </div>
                </div>
              )}
              {selectedEndpoint && selectedEndpoint.method === 'POST' && (
                <div>
                  <h2 className="text-sm font-semibold mb-2">Body (JSON)</h2>
                  <Textarea
                    className="w-full"
                    rows={6}
                    placeholder='{ "key": "value" }'
                    value={bodyInput}
                    onChange={(e) => setBodyInput(e.target.value)}
                  />
                </div>
              )}
            </div>
            <Button className="btn-dark w-full mt-4" onClick={handleTryIt} disabled={!selectedEndpoint || loading}>
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
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ApiOpenapi;
