'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRoutes, invokeApi, setEndpoint, setMethod,
  setBody, setResponse, setSortBy, setPage
} from '@/components/partials/app/playground/store';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textinput from '@/components/ui/Textinput';
import Textarea from '@/components/ui/Textarea';
import SimpleBar from 'simplebar-react';
import { ToastContainer, toast } from 'react-toastify';

const ApiPlayground = () => {
  const dispatch = useDispatch();
  const {
    routes, endpoint, method, body, response,
    sortBy, page, pageSize
  } = useSelector(state => state.apiPlayground);

  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');

  useEffect(() => {
    dispatch(fetchRoutes());
  }, [dispatch]);

  const handleSubmit = () => dispatch(invokeApi());

  const handleTryIt = async () => {
    if (!selectedPath || !method) return;
    setLoading(true);
    try {
      await dispatch(invokeApi());
      toast.success('Permintaan berhasil diproses!');
    } catch (err) {
      toast.error('Terjadi kesalahan saat memproses permintaan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (e) => dispatch(setSortBy(e.target.value));
  const handlePageChange = (dir) => dispatch(setPage(page + dir));

  const handleRouteClick = (r) => {
    dispatch(setEndpoint(r.path));
    dispatch(setMethod(r.method.toUpperCase()));
    setSelectedPath(r.path);
  };

  const sortedRoutes = [...routes].sort((a, b) =>
    sortBy === 'asc'
      ? a.path.localeCompare(b.path)
      : sortBy === 'desc'
      ? b.path.localeCompare(a.path)
      : 0
  );

  const paginatedRoutes = sortedRoutes.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Card
      bodyClass="relative p-4 h-full overflow-hidden"
      className="h-full w-full sm:w-auto bg-white shadow-md"
    >
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">API Playground</h1>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="w-full md:w-auto px-4 py-2 border rounded-md"
          >
            <option value="asc">Sort A-Z</option>
            <option value="desc">Sort Z-A</option>
          </select>

          <div className="flex gap-2 items-center w-full md:w-auto justify-between md:justify-start">
            <Button onClick={() => handlePageChange(-1)} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm">Page {page}</span>
            <Button onClick={() => handlePageChange(1)} disabled={page * pageSize >= routes.length}>
              Next
            </Button>
          </div>
        </div>

        <SimpleBar className="border rounded-md p-4 mb-6 max-h-64 text-sm space-y-2">
          {paginatedRoutes.map((r, i) => (
            <li
              key={i}
              className="cursor-pointer hover:underline transition list-none"
              onClick={() => handleRouteClick(r)}
            >
              <span className="font-semibold">{r.method.toUpperCase()}</span> - {r.path}
            </li>
          ))}
        </SimpleBar>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Textinput
            label="Endpoint"
            value={endpoint}
            onChange={(e) => {
              dispatch(setEndpoint(e.target.value));
              setSelectedPath(e.target.value);
            }}
          />
          <Textinput
            label="Method"
            value={method}
            onChange={(e) => dispatch(setMethod(e.target.value))}
            placeholder="GET, POST, etc."
          />
        </div>

        <Textarea
          label="Request Body (JSON)"
          value={body}
          onChange={(e) => dispatch(setBody(e.target.value))}
          rows={6}
          className="mb-4"
        />

        <Button className="btn-dark w-full" onClick={handleSubmit}>
          Send Request
        </Button>

        <Button
          className="btn-dark w-full"
          onClick={handleTryIt}
          disabled={!selectedPath || !method || loading}
        >
          {loading ? 'Memproses...' : 'Coba Endpoint'}
        </Button>

        {response && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Response:</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md text-sm whitespace-pre-wrap break-words overflow-auto">
              {response}
            </pre>
          </div>
        )}

        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar />
      </Card>
    </div>
  );
};

export default ApiPlayground;
