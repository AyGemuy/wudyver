'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textinput from '@/components/ui/Textinput';
import { Clipboard } from 'react-bootstrap-icons';
import {
  setNama,
  setCopied,
  fetchArtiNama
} from "@/components/partials/app/arti-nama/store";
import { ToastContainer, toast } from 'react-toastify';
import SimpleBar from "simplebar-react";

const PageArtinama = () => {
  const dispatch = useDispatch();
  const { nama, artinama, catatan, loading, error } = useSelector(state => state.artinama);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error("Nama tidak boleh kosong!", { autoClose: 2000 });
      return;
    }
    dispatch(fetchArtiNama(nama)).then(() => {
      toast.success("Berhasil mendapatkan arti nama!", { autoClose: 2000 });
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(artinama).then(() => {
      toast.success('Berhasil disalin!', { autoClose: 2000 });
      dispatch(setCopied(true));
      setTimeout(() => dispatch(setCopied(false)), 2000);
    });
  };

  return (
    <div className="w-full px-2 py-6">
  <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
        <h1 className="text-2xl font-bold text-center mb-4">Cek Arti Nama</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Masukkan Nama</label>
            <Textinput
              type="text"
              placeholder="Contoh: aldi"
              value={nama}
              onChange={(e) => dispatch(setNama(e.target.value))}
              required
              disabled={loading}
            />
          </div>

          <Button
            text={loading ? "Mencari..." : "Cari Arti"}
            className="btn-dark w-full"
            isLoading={loading}
            disabled={loading}
            type="submit"
          />
        </form>

        {loading && (
          <p className="text-sm text-gray-500 mt-3">Sedang mencari arti nama...</p>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 mt-4 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {artinama && !loading && (
          <div className="mt-6 text-left">
            <h5 className="text-lg font-semibold mb-2">Arti Nama:</h5>
            <SimpleBar style={{ maxHeight: 200 }}>
              <pre className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap break-words">{artinama}</pre>
            </SimpleBar>

            {catatan && (
              <p className="text-gray-500 mt-2">
                <strong>Catatan:</strong> {catatan}
              </p>
            )}

            <Button
              text="Salin"
              className="btn-dark w-full"
              onClick={handleCopy}
              disabled={loading}
            >
              <Clipboard size={18} />
            </Button>
          </div>
        )}
      </Card>

      <ToastContainer position="top-right" />
    </div>
  );
};

export default PageArtinama;
