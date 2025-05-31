"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoginForm from "@/components/partials/auth/login-form";
import Social from "@/components/partials/auth/social";
import useDarkMode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import { useDispatch } from "react-redux";
import { fetchUsersFromAPI } from "@/components/partials/auth/store";

const LoginPage = () => {
  const dispatch = useDispatch();
  const [currentYear] = useState(new Date().getFullYear());
  const [isDark] = useDarkMode();

  useEffect(() => {
    dispatch(fetchUsersFromAPI());
  }, [dispatch]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/assets/images/all-img/login-bg.png)',
          filter: 'blur(3px)',
          transform: 'scale(1.1)', // Mencegah border blur
        }}
      ></div>
      
      {/* Overlay untuk mengatur brightness dan kontras */}
      <div className="absolute inset-0 w-full h-full bg-black/30 dark:bg-black/50 z-[1]"></div>
      
      {/* Gradient overlay untuk efek tambahan */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-teal-500/20 via-transparent to-cyan-500/20 dark:from-teal-700/30 dark:via-transparent dark:to-cyan-700/30 z-[2]"></div>
      
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-8 sm:py-12">
        <Card
          bodyClass="p-6 sm:p-8 md:p-10"
          className="w-full border border-white/30 dark:border-white/20 rounded-xl shadow-2xl bg-white/90 text-slate-800 dark:bg-slate-800/90 dark:text-slate-100 backdrop-blur-md"
        >
          <div className="flex flex-col items-center">
            <Link href="/" className="mb-6 sm:mb-8 block">
              <img
                src={
                  isDark
                    ? "/assets/images/logo/logo-white.svg"
                    : "/assets/images/logo/logo.svg"
                }
                alt="Logo Perusahaan"
                className="h-10 sm:h-12 drop-shadow-sm"
              />
            </Link>
            
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 mb-2 drop-shadow-sm">
                Selamat Datang!
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Masuk untuk mengakses dasbor dan layanan Anda.
              </p>
            </div>
            
            <LoginForm />
            
            <div className="my-6 sm:my-8 flex items-center w-full">
              <hr className="flex-grow border-slate-300 dark:border-slate-700" />
              <span className="mx-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase">
                Atau lanjutkan dengan
              </span>
              <hr className="flex-grow border-slate-300 dark:border-slate-700" />
            </div>
            
            <div className="w-full max-w-xs mx-auto space-y-3">
              <Social />
            </div>
            
            <div className="mt-8 sm:mt-10 text-sm sm:text-base text-center">
              <span className="text-slate-600 dark:text-slate-300">
                Belum punya akun?{" "}
              </span>
              <Link
                href="/register"
                className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline transition-colors duration-200"
              >
                Daftar di sini
              </Link>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/80 dark:text-white/70 z-10 px-4 drop-shadow-md">
        Copyright &copy; {currentYear}. Semua Hak Cipta Dilindungi.
      </div>
    </div>
  );
};

export default LoginPage;