"use client";
import React, { useState, useEffect } from "react";
import InputGroup from "@/components/ui/InputGroup";
import Icon from "@/components/ui/Icon";
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
import Button from "@/components/ui/Button";

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
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-2 py-6">
      <div className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
          <InputGroup
            type="email"
            label="email"
            id="email"
            name="email"
            placeholder="Your email"
            prepend={<Icon icon="heroicons-outline:user" />}
            register={register}
            error={errors?.email}
          />
          <InputGroup
            type="password"
            label="password"
            id="password"
            name="password"
            placeholder="Your password"
            prepend={<Icon icon="heroicons-outline:lock-closed" />}
            register={register}
            error={errors?.password}
            hasicon
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

          <Button
            text={loading ? "Memproses..." : "Sign In"}
            className="btn-dark w-full"
            isLoading={loading}
            disabled={loading}
            type="submit"
          />
        </form>
      </div>
    </div>
  );
};

export default LoginForm;