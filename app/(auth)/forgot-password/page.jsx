"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import useDarkMode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import { Icon } from "@iconify/react";
import { ToastContainer, toast } from "react-toastify";

const EmailInputForm = ({ onSubmitEmail, isLoading }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.warn("Mohon masukkan alamat email Anda.");
      return;
    }
    onSubmitEmail(email);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
        <label htmlFor="email" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
          <Icon icon="ph:envelope-duotone" className="mr-2 text-lg" />
          Alamat Email Terdaftar
        </label>
        <input
          id="email"
          type="email"
          placeholder="contoh@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Icon icon="svg-spinners:ring-resize" className="mr-2 text-lg" />
            Mencari...
          </>
        ) : (
          <>
            <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
            Cari Akun
          </>
        )}
      </button>
    </form>
  );
};


const ForgotPassPage = () => {
  const [isDark] = useDarkMode();
  const [currentYear] = useState(new Date().getFullYear());
  const [retrievedUser, setRetrievedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUserDataByEmail = async (email) => {
    setIsLoading(true);
    setApiError(null);
    setRetrievedUser(null);

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (email.toLowerCase() === "wudysoft@mail.com") {
      const mockApiResponse = {
        status: 200,
        message: "User exists",
        user: {
          _id: "f8746209-516f-4273-9f4d-75d994b1be02",
          email: "wudysoft@mail.com",
          __v: 0,
          createdAt: "2025-03-13T16:31:25.566Z",
          ipAddress: "114.125.203.127",
          password: "wudysoft_password_rahasia",
          updatedAt: "2025-03-13T16:31:25.566Z"
        }
      };
      if (mockApiResponse.status === 200 && mockApiResponse.user) {
        setRetrievedUser(mockApiResponse.user);
        toast.success("Informasi akun berhasil ditemukan!");
      } else {
        setApiError(mockApiResponse.message || "Pengguna tidak ditemukan atau format data salah.");
        toast.error(mockApiResponse.message || "Gagal mengambil data pengguna.");
      }
    } else if (email.toLowerCase() === "error@mail.com") {
        setApiError("Contoh error: Terjadi kesalahan pada server.");
        toast.error("Contoh error: Terjadi kesalahan pada server.");
    }
    else {
      setApiError(`Tidak ada akun yang ditemukan untuk email: ${email}`);
      toast.error(`Akun untuk email ${email} tidak ditemukan.`);
    }
    setIsLoading(false);
  };

  const handleCopyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success(`${fieldName} berhasil disalin ke clipboard!`);
      })
      .catch(err => {
        toast.error(`Gagal menyalin ${fieldName}.`);
        console.error('Error copying text: ', err);
      });
  };

  const handleSearchAnotherAccount = () => {
    setRetrievedUser(null);
    setApiError(null);
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-8 sm:py-12 relative overflow-hidden">
      <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          theme="colored"
          toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-teal-500/10 dark:from-teal-700/20 dark:via-cyan-700/10 dark:to-teal-700/20 z-0 opacity-60 dark:opacity-40"></div>

      <div className="relative z-10 w-full max-w-md">
        <Card
          bodyClass="p-6 sm:p-8 md:p-10"
          className="w-full border border-teal-500/30 dark:border-teal-600/50 rounded-xl shadow-2xl bg-white text-slate-800 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-75"
        >
          <div className="flex flex-col items-center">
            <Link href="/" className="mb-6 sm:mb-8 block">
              <img
                src={isDark ? "/assets/images/logo/logo-white.svg" : "/assets/images/logo/logo.svg"}
                alt="Logo Perusahaan"
                className="h-10 sm:h-12"
              />
            </Link>

            {!retrievedUser ? (
              <>
                <div className="text-center mb-5">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 mb-2">
                    Temukan Akun Anda
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                    Masukkan email untuk mencari informasi akun Anda.
                  </p>
                </div>
                <EmailInputForm onSubmitEmail={fetchUserDataByEmail} isLoading={isLoading} />
                
                {apiError && (
                    <div className="mt-4 w-full text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 p-3 rounded-md text-center">
                        {apiError}
                    </div>
                )}
              </>
            ) : (
              <div className="w-full text-center">
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 mb-4">
                  Informasi Akun Ditemukan
                </h1>
                <div className="space-y-4 text-left text-sm sm:text-base">
                  <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600/70">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Email</label>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-200 break-all">{retrievedUser.email}</span>
                      <button
                        onClick={() => handleCopyToClipboard(retrievedUser.email, "Email")}
                        title="Salin Email"
                        className="p-1.5 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
                      >
                        <Icon icon="ph:copy-duotone" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600/70">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Password</label>
                    <div className="flex items-center justify-between">
                      <span className={`text-slate-700 dark:text-slate-200 font-mono break-all ${!showPassword ? 'blur-sm select-none' : ''}`}>
                        {retrievedUser.password}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                            className="p-1.5 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
                        >
                            <Icon icon={showPassword ? "ph:eye-slash-duotone" : "ph:eye-duotone"} className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleCopyToClipboard(retrievedUser.password, "Password")}
                            title="Salin Password"
                            className="p-1.5 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
                        >
                            <Icon icon="ph:copy-duotone" className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSearchAnotherAccount}
                  className="mt-6 w-full text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium py-2 px-4 border border-teal-500/50 dark:border-teal-600/70 rounded-md hover:bg-teal-50 dark:hover:bg-teal-700/30 transition-colors"
                >
                  Cari Akun Lain
                </button>
              </div>
            )}

            <div className="mt-8 sm:mt-10 text-sm sm:text-base text-center">
              <Link
                href="/login"
                className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline"
              >
                Kembali ke Halaman Masuk
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500 dark:text-slate-400/80 z-10 px-4">
        Hak Cipta &copy; {currentYear} NamaPerusahaanAnda. Semua Hak Dilindungi Undang-Undang.
      </div>
    </div>
  );
};

export default ForgotPassPage;