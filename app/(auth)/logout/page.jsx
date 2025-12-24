"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { handleLogin } from "@/components/partials/auth/store";
import { signOut, useSession } from "next-auth/react";
import useDarkMode from "@/hooks/useDarkMode";
import Cookies from 'js-cookie';

const LogoutPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentYear] = useState(new Date().getFullYear());
  const [isDark] = useDarkMode();
  const [logoutMessage, setLogoutMessage] = useState("Sedang keluar...");

  useEffect(() => {
    const performLogout = async () => {
      setLogoutMessage("Sedang memproses logout...");

      try {
        await signOut({ redirect: false });
        console.log("NextAuth signOut completed.");
      } catch (error) {
        console.error("Failed to perform NextAuth signOut:", error);
        setLogoutMessage("Terjadi kesalahan saat logout NextAuth.");
      }

      dispatch(handleLogin(false));
      Cookies.remove('is_authenticated');
      console.log("Redux state and 'is_authenticated' cookie cleared.");

      setLogoutMessage("Anda telah berhasil keluar. Mengarahkan ke halaman login...");

      const redirectTimer = setTimeout(() => {
        router.push("/login");
      }, 2000);

      return () => clearTimeout(redirectTimer);
    };

    if (status !== "loading" && status !== "unauthenticated") {
      performLogout();
    } else if (status === "unauthenticated") {
      dispatch(handleLogin(false));
      Cookies.remove('is_authenticated');
      setLogoutMessage("Sesi Anda sudah berakhir. Mengarahkan ke halaman login...");
      const redirectTimer = setTimeout(() => {
        router.push("/login");
      }, 2000);
      return () => clearTimeout(redirectTimer);
    }
  }, [dispatch, router, status]);

  return (
    <div className="loginwrapper">
      <div className="lg-inner-column">
        <div className="right-column relative">
          <div className="inner-content h-full flex flex-col bg-white dark:bg-slate-800">
            <div className="auth-box h-full flex flex-col justify-center">
              <div className="mobile-logo text-center mb-6 lg:hidden block">
                <Link href="/">
                  <img
                    src={
                      isDark
                        ? "/assets/images/logo/logo-white.svg"
                        : "/assets/images/logo/logo.svg"
                    }
                    alt="Logo"
                    className="mx-auto"
                  />
                </Link>
              </div>
              <div className="text-center 2xl:mb-10 mb-4">
                <h4 className="font-medium">Logout</h4>
                <div className="text-slate-500 dark:text-slate-400 text-base">
                  {logoutMessage}
                </div>
                {(status === "loading" || logoutMessage.includes("memproses")) && !logoutMessage.includes("berhasil keluar") ? (
                  <div className="mt-6 flex justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-white"></div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="auth-footer text-center">
              Copyright {currentYear}, Dashcode All Rights Reserved.
            </div>
          </div>
        </div>

        <div
          className="left-column bg-cover bg-no-repeat bg-center"
          style={{
            backgroundImage: `url(/assets/images/all-img/login-bg.png)`,
          }}
        >
          <div className="flex flex-col h-full justify-center">
            <div className="flex-1 flex flex-col justify-center items-center">
              <Link href="/">
                <img
                  src="/assets/images/logo/logo-white.svg"
                  alt="Logo"
                  className="mb-10"
                />
              </Link>
            </div>
            <div>
              <div className="black-500-title max-w-[525px] mx-auto pb-20 text-center">
                Buka Proyek Anda{" "}
                <span className="text-white font-bold">kinerja</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutPage;