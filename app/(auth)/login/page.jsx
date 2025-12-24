"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoginForm from "@/components/partials/auth/login-form";
import Social from "@/components/partials/auth/social";
import useDarkMode from "@/hooks/useDarkMode";
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
                <h4 className="font-medium">Sign in</h4>
                <div className="text-slate-500 dark:text-slate-400 text-base">
                  Sign in to your account to start using Dashcode
                </div>
              </div>
              <LoginForm />
              <div className=" relative border-b-[#9AA2AF] border-opacity-[16%] border-b pt-6">
                <div className=" absolute inline-block bg-white dark:bg-slate-800 left-1/2 top-1/2 transform -translate-x-1/2 px-4 min-w-max text-sm text-slate-500 dark:text-slate-400 font-normal ">
                  Or continue with
                </div>
              </div>
              <div className="max-w-[242px] mx-auto mt-8 w-full">
                <Social />
              </div>
              <div className="md:max-w-[345px] mt-6 mx-auto font-normal text-slate-500 dark:text-slate-400 mt-12 uppercase text-sm">
                Don’t have an account?{" "}
                <Link
                  href="/register"
                  className="text-slate-900 dark:text-white font-medium hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </div>
            <div className="auth-footer text-center">
              Copyright {currentYear}, Dashcode All Rights Reserved.
            </div>
          </div>
        </div>
        <div
          className="left-column bg-cover bg-no-repeat bg-center "
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
                Unlock your Project{" "}
                <span className="text-white font-bold">performance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;