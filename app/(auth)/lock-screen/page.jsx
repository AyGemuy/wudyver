"use client";

import React from "react";
import Link from "next/link";
import Lock from "@/components/partials/auth/lock";
import useDarkMode from "@/hooks/useDarkMode";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const LockScreen = () => {
  const [isDark] = useDarkMode();
  const { data: session, status } = useSession();
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  if (status === "loading") {
    return <div className="text-center py-10">Memuat...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="loginwrapper">
      <div className="lg-inner-column">
        <div className="left-column relative z-[1]">
          <div className="max-w-[520px] pt-20 ltr:pl-20 rtl:pr-20">
            <Link href="/">
              <img
                src={
                  isDark
                    ? "/assets/images/logo/logo-white.svg"
                    : "/assets/images/logo/logo.svg"
                }
                alt=""
                className="mb-10"
              />
            </Link>

            <h4>
              Buka kunci kinerja{" "}
              <span className="text-slate-800 dark:text-slate-400 font-bold">
                proyek Anda
              </span>
            </h4>
          </div>
          <div className="absolute left-0 2xl:bottom-[-160px] bottom-[-130px] h-full w-full z-[-1]">
            <img
              src="/assets/images/auth/ils1.svg"
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
        </div>
        <div className="right-column relative">
          <div className="inner-content h-full flex flex-col bg-white dark:bg-slate-800">
            <div className="auth-box2 flex flex-col justify-center h-full">
              <div className="mobile-logo text-center mb-6 lg:hidden block">
                <Link href="/">
                  <img
                    src={
                      isDark
                        ? "/assets/images/logo/logo-white.svg"
                        : "/assets/images/logo/logo.svg"
                    }
                    alt=""
                    className="mx-auto"
                  />
                </Link>
              </div>
              <div className="text-center mb-10">
                <h4 className="font-medium mb-4">Layar Terkunci</h4>
                <div className="text-slate-500 dark:text-slate-400 text-base">
                  Masukkan kata sandi Anda untuk membuka kunci layar!
                </div>
              </div>
              <div className="author-bio text-center mb-8">
                <div className="h-14 w-14 mx-auto rounded-full">
                  <img
                    src={session?.user?.image || "/assets/images/all-img/user-big.png"}
                    alt={session?.user?.name || "Pengguna"}
                    className="w-full h-full object-cover block rounded-full"
                  />
                </div>
                <div className="text-slate-900 dark:text-white text-base font-medium mt-4">
                  {session?.user?.email || "Tamu"}
                </div>
              </div>
              <Lock />

              {session?.user && (
                <div className="md:max-w-[345px] mx-auto font-normal text-slate-500 dark:text-slate-400 mt-12 uppercase text-sm">
                  Bukan Anda ? kembali
                  <Link
                    href="/login"
                    className="text-slate-900 dark:text-white font-medium hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      signIn();
                    }}
                  >
                    Masuk
                  </Link>
                </div>
              )}
            </div>
            <div className="auth-footer text-center">
              Copyright {currentYear}, Dashcode Hak Cipta Dilindungi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;