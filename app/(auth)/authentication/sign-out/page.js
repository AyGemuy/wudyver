"use client";
import {
  useEffect
} from "react";
import Cookies from "js-cookie";
const SignOut = () => {
  useEffect(() => {
    Cookies.remove("auth_token");
    window.location.href = "/authentication/sign-in";
  }, []);
  return null;
};
export default SignOut;