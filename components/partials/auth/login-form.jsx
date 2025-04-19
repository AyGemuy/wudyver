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
import Button from "@/components/ui/Button";
import Card from '@/components/ui/Card';

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
  <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
    <form onSubmit={handleSubmit(onSubmit)}>
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

      <Button
        text={loading ? "Memproses..." : "Sign In"}
        className="btn-dark w-full"
        isLoading={loading}
        disabled={loading}
        type="submit"
      />
    </form>
    </Card>
    </div>
  );
};

export default LoginForm;
