"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import useDarkMode from "@/hooks/useDarkMode";
import RegForm from "@/components/partials/auth/reg-from";
import Social from "@/components/partials/auth/social";
import { useDispatch } from "react-redux";
import { fetchUsersFromAPI } from "@/components/partials/auth/store";

const RegPage = () => {
  const dispatch = useDispatch();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    dispatch(fetchUsersFromAPI());
  }, [dispatch]);

  const [isDark] = useDarkMode();

  return (
    <>
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
                Unlock your Project
                <span className="text-slate-800 dark:text-slate-400 font-bold">
                  performance
                </span>
              </h4>
            </div>
            <div className="absolute left-0 bottom-[-130px] h-full w-full z-[-1]">
              <img
                src="/assets/images/auth/ils1.svg"
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
          </div>
          <div className="right-column relative bg-white dark:bg-slate-800">
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
                      alt=""
                      className="mx-auto"
                    />
                  </Link>
                </div>
                <div className="text-center 2xl:mb-10 mb-5">
                  <h4 className="font-medium">Sign up</h4>
                  <div className="text-slate-500 dark:text-slate-400 text-base">
                    Create an account to start using Dashcode
                  </div>
                </div>
                <RegForm />
                <div className=" relative border-b-[#9AA2AF] border-opacity-[16%] border-b pt-6">
                  <div className=" absolute inline-block  bg-white dark:bg-slate-800 left-1/2 top-1/2 transform -translate-x-1/2 px-4 min-w-max text-sm  text-slate-500  dark:text-slate-400font-normal ">
                    Or continue with
                  </div>
                </div>
                <div className="max-w-[242px] mx-auto mt-8 w-full">
                  <Social />
                </div>
                <div className="max-w-[225px] mx-auto font-normal text-slate-500 dark:text-slate-400 2xl:mt-12 mt-6 uppercase text-sm">
                  Already registered?
                  <Link
                    href="/login"
                    className="text-slate-900 dark:text-white font-medium hover:underline"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
              <div className="auth-footer text-center">
                Copyright {currentYear}, Dashcode All Rights Reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegPage;