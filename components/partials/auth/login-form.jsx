"use client";
import React, { useState, useEffect } from "react";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import Checkbox from "@/components/ui/Checkbox";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { handleLogin } from "./store";
import { toast } from "react-toastify";
import Cookies from "js-cookie";

const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
    password: yup.string().required("Password is Required"),
  })
  .required();

const LoginForm = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = Cookies.get("auth_token");
    if (token) router.push("/analytics");
  }, [router]);

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "all",
  });

  const onSubmit = async (data) => {
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok || !result.token) {
        throw new Error(result.message || "Login failed");
      }

      Cookies.set("auth_token", result.token, {
        expires: 1,
        secure: true,
        sameSite: "strict",
      });

      dispatch(handleLogin(true));
      toast.success(result.message || "Login successful");

      router.push("/analytics");
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Textinput
        name="email"
        label="email"
        type="email"
        register={register}
        error={errors?.email}
      />
      <Textinput
        name="password"
        label="password"
        type="password"
        register={register}
        error={errors.password}
      />
      <div className="flex justify-between">
        <Checkbox
          value={checked}
          onChange={() => setChecked(!checked)}
          label="Keep me signed in"
        />
        <Link
          href="/forgot-password"
          className="text-sm text-slate-800 dark:text-slate-400 leading-6 font-medium"
        >
          Forgot Password?
        </Link>
      </div>

      <button
        type="submit"
        className="btn btn-dark block w-full text-center active:scale-95 active:bg-opacity-90 transition duration-100"
      >
        Sign in
      </button>
    </form>
  );
};

export default LoginForm;
