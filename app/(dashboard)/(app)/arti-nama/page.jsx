"use client";

import { useDispatch, useSelector } from "react-redux";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { setNama, setCopied, fetchArtiNama } from "@/components/partials/app/arti-nama/store";
import { ToastContainer, toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import { Icon } from '@iconify/react';

const PageArtinama = () => {
  const dispatch = useDispatch();
  const { nama, artinama, catatan, loading, error } = useSelector((state) => state.artinama);

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
      toast.success("Berhasil disalin!", { autoClose: 2000 });
      dispatch(setCopied(true));
      setTimeout(() => dispatch(setCopied(false)), 2000);
    });
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2000}
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
                  <Icon icon="material-symbols:sparkle" className="text-2xl" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                Cek Arti Nama
              </h4>
              <p className="text-sm text-center text-slate-400 mt-2">Temukan makna di balik namamu</p>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <label className="text-sm font-medium text-purple-300 mb-2 block flex items-center">
                    <Icon icon="material-symbols:person" className="mr-2" />
                    Masukkan Nama
                  </label>
                  <Textinput
                    type="text"
                    placeholder="Contoh: aldi"
                    value={nama}
                    onChange={(e) => dispatch(setNama(e.target.value))}
                    required
                    disabled={loading}
                    className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                  />
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="material-symbols:refresh" className="animate-spin mr-2" /> Mencari...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="material-symbols:search" className="mr-2" /> Cari Arti
                      </span>
                    )
                  }
                  className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white rounded-xl py-4 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                  isLoading={loading}
                  disabled={loading}
                  type="submit"
                />
              </form>

              {loading && (
                <div className="flex items-center justify-center mt-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="animate-pulse flex items-center">
                    <div className="w-8 h-8 bg-purple-700 rounded-full mr-3"></div>
                    <p className="text-purple-300">Sedang mencari arti nama...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-rose-900 bg-opacity-30 border border-rose-700 text-rose-300 rounded-xl flex items-center">
                  <Icon icon="material-symbols:warning" className="text-xl mr-3" />
                  <p>{error}</p>
                </div>
              )}

              {artinama && !loading && (
                <div className="mt-6 text-left">
                  <div className="flex items-center mb-4">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-600 text-white mr-2">
                      <Icon icon="material-symbols:article" className="text-lg" />
                    </span>
                    <h5 className="text-lg font-semibold text-purple-300">Arti Nama:</h5>
                  </div>

                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4">
                    <SimpleBar style={{ maxHeight: 200 }}>
                      <pre className="bg-slate-900 p-4 rounded-lg text-sm whitespace-pre-wrap break-words text-purple-200 font-mono">
                        {artinama}
                      </pre>
                    </SimpleBar>
                  </div>

                  {catatan && (
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4 flex">
                      <Icon icon="material-symbols:push-pin" className="text-xl mr-2 text-violet-300" />
                      <div>
                        <p className="text-violet-300 font-medium mb-1">Catatan:</p>
                        <p className="text-slate-300 text-sm">{catatan}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    text={
                      <span className="flex items-center justify-center">
                        <Icon icon="material-symbols:content-copy" className="mr-2" /> Salin
                      </span>
                    }
                    className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl py-3 font-medium transition-all duration-300"
                    onClick={handleCopy}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default PageArtinama;