"use client";

import { useEffect, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";
import Header from "@/components/partials/header";
import Sidebar from "@/components/partials/sidebar";
import Settings from "@/components/partials/settings";
import FloatingMusic from '@/components/partials/FloatingMusic';
import useWidth from "@/hooks/useWidth";
import useSidebar from "@/hooks/useSidebar";
import useContentWidth from "@/hooks/useContentWidth";
import useMenulayout from "@/hooks/useMenulayout";
import useMenuHidden from "@/hooks/useMenuHidden";
import Footer from "@/components/partials/footer";
import MobileMenu from "@/components/partials/sidebar/MobileMenu";
import useMobileMenu from "@/hooks/useMobileMenu";
import useMonoChrome from "@/hooks/useMonoChrome";
import MobileFooter from "@/components/partials/footer/MobileFooter";
import useRtl from "@/hooks/useRtl";
import useDarkMode from "@/hooks/useDarkMode";
import useSkin from "@/hooks/useSkin";
import Loading from "@/components/Loading";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import useNavbarType from "@/hooks/useNavbarType";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

export default function RootLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const location = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" && location !== "/login") {
      router.push("/login");
    }
  }, [status, router, location]);

  const { width, breakpoints } = useWidth();
  const [collapsed] = useSidebar();
  const [isRtl] = useRtl();
  const [isDark] = useDarkMode();
  const [skin] = useSkin();
  const [navbarType] = useNavbarType();
  const [isMonoChrome] = useMonoChrome();

  const switchHeaderClass = () => {
    if (menuType === "horizontal" || menuHidden) {
      return "ltr:ml-0 rtl:mr-0";
    } else if (collapsed) {
      return "ltr:ml-[72px] rtl:mr-[72px]";
    } else {
      return "ltr:ml-[248px] rtl:mr-[248px]";
    }
  };

  const [contentWidth] = useContentWidth();
  const [menuType] = useMenulayout();
  const [menuHidden] = useMenuHidden();
  const [mobileMenu, setMobileMenu] = useMobileMenu();

  if (status === "loading") {
    return <Loading />;
  }

  if (status === "unauthenticated" && location !== "/login") {
    return null;
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`app-warp ${isDark ? "dark" : "light"} ${
        skin === "bordered" ? "skin--bordered" : "skin--default"
      }
      ${navbarType === "floating" ? "has-floating" : ""}
      `}
    >
      <ToastContainer />
      <Header className={width > breakpoints.xl ? switchHeaderClass() : ""} />
      {menuType === "vertical" && width > breakpoints.xl && !menuHidden && (
        <Sidebar />
      )}
      <MobileMenu
        className={`${
          width < breakpoints.xl && mobileMenu
            ? "left-0 visible opacity-100 z-[9999]"
            : "left-[-300px] invisible opacity-0 z-[-999] "
        }`}
      />
      {width < breakpoints.xl && mobileMenu && (
        <div
          className="overlay bg-slate-900/50 backdrop-filter backdrop-blur-sm opacity-100 fixed inset-0 z-[999]"
          onClick={() => setMobileMenu(false)}
        ></div>
      )}
      <Settings />
      <FloatingMusic />
      <div
        className={`content-wrapper transition-all duration-150 ${
          width > 1280 ? switchHeaderClass() : ""
        }`}
      >
        <div className="page-content page-min-height">
          <div
            className={
              contentWidth === "boxed" ? "container mx-auto" : "container-fluid"
            }
          >
            <motion.div
              key={location}
              initial="pageInitial"
              animate="pageAnimate"
              exit="pageExit"
              variants={{
                pageInitial: {
                  opacity: 0,
                  y: 50,
                },
                pageAnimate: {
                  opacity: 1,
                  y: 0,
                },
                pageExit: {
                  opacity: 0,
                  y: -50,
                },
              }}
              transition={{
                type: "tween",
                ease: "easeInOut",
                duration: 0.5,
              }}
            >
              <Suspense fallback={<Loading />}>
                <Breadcrumbs />
                {children}
              </Suspense>
            </motion.div>
          </div>
        </div>
      </div>
      {width < breakpoints.md && <MobileFooter />}
      {width > breakpoints.md && (
        <Footer className={width > breakpoints.xl ? switchHeaderClass() : ""} />
      )}
    </div>
  );
}
