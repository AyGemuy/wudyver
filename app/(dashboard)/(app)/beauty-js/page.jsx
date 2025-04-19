"use client";

import React from "react";
import SimpleBar from "simplebar-react";
import { useDispatch, useSelector } from "react-redux";
import useWidth from "@/hooks/useWidth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import {
  setUrl,
  setLoading,
  beautifyZip,
} from "@/components/partials/app/beauty-js/store";

const BeautyPage = () => {
  const dispatch = useDispatch();
  const { url, loading } = useSelector((state) => state.beauty);
  const { width, breakpoints } = useWidth();

  const handleUrlChange = (e) => {
    dispatch(setUrl(e.target.value));
  };

  const handleBeautify = () => {
    if (!url.trim()) {
      toast.warn("Mohon masukkan URL ZIP");
      return;
    }
    dispatch(beautifyZip(url));
  };

  return (
    <>
      <ToastContainer />
      <div className="w-full px-2 py-6">
  <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
          <SimpleBar className="h-full">
            <div className="p-4 border-b">
              <h4 className="text-xl font-bold">Beautify ZIP File</h4>
              <p className="text-sm text-slate-500">
                Extract and beautify JS/CSS files from ZIP
              </p>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Masukkan URL ZIP
                </label>
                <Textinput
                  id="pn"
                  type="text"
                  placeholder="https://example.com/file.zip"
                  value={url}
                  onChange={handleUrlChange}
                />
              </div>

              <Button
                text={loading ? "Processing..." : "Beautify"}
                className="btn-dark w-full"
                isLoading={loading}
                disabled={loading}
                onClick={handleBeautify}
              />

              <div className="mt-4 flex items-center">
                <span className="bg-info-100 text-info-600 px-2 py-1 rounded text-xs font-medium">
                  Info
                </span>
                <span className="ml-2 text-sm text-slate-600">
                  File akan otomatis terdownload setelah proses selesai
                </span>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default BeautyPage;
