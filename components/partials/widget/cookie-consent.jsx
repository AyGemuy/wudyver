"use client";

import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const COOKIE_NAME = "wudysoft_cookie_consent";

const CustomCookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      setVisible(false);
      return;
    }

    if (status === "authenticated") {
      setVisible(false);
      return;
    }

    if (status === "unauthenticated") {
      const consentGiven = Cookies.get(COOKIE_NAME);

      if (consentGiven === "accepted") {
        setVisible(false);
      } else {
        setTimeout(() => setVisible(true), 1000);
      }
    }
  }, [status]);

  const acceptCookie = () => {
    Cookies.set(COOKIE_NAME, "accepted", { expires: 365 });
    toast.success("Anda menyetujui penggunaan cookie. Selamat datang!");
    setVisible(false);
    router.push("/");
  };

  const declineCookie = () => {
    toast.info("Anda menolak penggunaan cookie non-esensial. Anda akan diarahkan ke halaman login.");
    setVisible(false);
    router.push("/login");
  };

  if (!visible) return null;

  const buttonPrimaryClass = "flex-1 group relative overflow-hidden bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600 hover:from-teal-600 hover:via-teal-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 transform hover:scale-[1.02] py-3 px-4 text-sm sm:text-base flex items-center justify-center space-x-2";
  const buttonSecondaryClass = "flex-1 group relative overflow-hidden bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-slate-500/20 transition-all duration-300 transform hover:scale-[1.02] py-3 px-4 text-sm sm:text-base flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-600";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(options) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer
            ${
              options?.type === "success"
                ? "bg-emerald-500 text-white"
                : options?.type === "error"
                ? "bg-red-500 text-white"
                : options?.type === "warn"
                ? "bg-yellow-500 text-white"
                : "bg-sky-500 text-white"
            } dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />

      <div className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm" />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <Card
          bodyClass="relative p-5 sm:p-6 md:p-7 flex flex-col h-full overflow-hidden"
          className="w-full max-w-sm sm:max-w-md md:max-w-lg
                      min-h-fit max-h-[90vh] overflow-y-auto
                      border border-teal-400/40 dark:border-teal-500/60
                      rounded-2xl shadow-2xl shadow-teal-500/10
                      bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg
                      transition-all duration-500 ease-out
                      hover:shadow-3xl hover:shadow-teal-500/20"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md">
                <Icon icon="material-symbols:cookie-outline" className="text-2xl" />
              </div>
              <div>
                <h1 className="font-bold text-xl sm:text-2xl text-teal-600 dark:text-teal-300">
                  Kebijakan Cookie
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pengaturan privasi situs web
                </p>
              </div>
            </div>

            <button
              onClick={declineCookie}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
            >
              <Icon
                icon="material-symbols:close"
                className="text-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              />
            </button>
          </div>

          <div className="space-y-4 mb-6 flex-grow">
            <div
              className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20
                          rounded-xl p-4 border border-teal-200/50 dark:border-teal-700/50"
            >
              <div className="flex items-start space-x-3">
                <Icon
                  icon="material-symbols:info-outline"
                  className="text-teal-500 text-xl mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm leading-relaxed">
                    Situs ini menggunakan cookie untuk meningkatkan pengalaman
                    Browse Anda.{" "}
                    <span className="font-medium text-teal-600 dark:text-teal-300">
                      Cookie esensial
                    </span>{" "}
                    diperlukan untuk fungsi dasar situs, sedangkan{" "}
                    <span className="font-medium text-cyan-600 dark:text-cyan-300">
                      cookie non-esensial
                    </span>{" "}
                    digunakan untuk analitik dan personalisasi konten.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs sm:text-sm">
              {status === "loading" && (
                <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/50 dark:border-amber-700/50">
                  <Icon
                    icon="material-symbols:hourglass-top"
                    className="text-amber-500 animate-spin"
                  />
                  <span className="text-amber-700 dark:text-amber-300">
                    Memuat informasi sesi...
                  </span>
                </div>
              )}

              {session && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200/50 dark:border-green-700/50">
                  <Icon
                    icon="material-symbols:verified-user"
                    className="text-green-500"
                  />
                  <span className="text-green-700 dark:text-green-300">
                    Masuk sebagai: {session.user.email}
                  </span>
                </div>
              )}

              {!session && status === "unauthenticated" && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                  <Icon
                    icon="material-symbols:person-off-outline"
                    className="text-blue-500"
                  />
                  <span className="text-blue-700 dark:text-blue-300">
                    Anda belum masuk. Persetujuan cookie diperlukan untuk
                    melanjutkan.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button
              onClick={acceptCookie}
              text={
                <>
                  <Icon icon="material-symbols:check-circle-outline" className="text-lg sm:text-xl group-hover:scale-110 transition-transform duration-200" />
                  <span>Ya, Saya Setuju</span>
                  <div className="absolute inset-0 bg-white/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </>
              }
              className={buttonPrimaryClass}
            />

            <Button
              onClick={declineCookie}
              text={
                <>
                  <Icon icon="material-symbols:cancel-outline" className="text-lg sm:text-xl group-hover:scale-110 transition-transform duration-200" />
                  <span>Tidak, Terima Kasih</span>
                </>
              }
              className={buttonSecondaryClass}
            />
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-600">
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              Dengan memilih "Ya, Saya Setuju", Anda menyetujui penggunaan
              semua jenis cookie sesuai dengan kebijakan privasi kami.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
};

export default CustomCookieConsent;
