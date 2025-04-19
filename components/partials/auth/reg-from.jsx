"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import Checkbox from "@/components/ui/Checkbox";
import Cookies from "js-cookie";
import Button from "@/components/ui/Button";
import Card from '@/components/ui/Card';

const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(20, "Password shouldn't be more than 20 characters")
      .required("Password is required"),
    confirmpassword: yup
      .string()
      .oneOf([yup.ref("password"), null], "Passwords must match")
      .required("Please confirm password"),
  })
  .required();

const RegForm = () => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    if (!checked) {
      toast.error("You must accept the terms and conditions");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.token) {
        throw new Error(result.message || "Registration failed");
      }

      Cookies.set("auth_token", result.token, {
        expires: 1,
        secure: true,
        sameSite: "strict",
      });

      toast.success(result.message || "Registration successful");
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
    <form onSubmit={handleSubmit(onSubmit)} >
      <Textinput
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email"
        register={register}
        error={errors.email}
      />
      <Textinput
        name="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        register={register}
        error={errors.password}
      />
      <Textinput
        name="confirmpassword"
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        register={register}
        error={errors.confirmpassword}
      />
      <Checkbox
        label="You accept our Terms and Conditions and Privacy Policy"
        value={checked}
        onChange={() => setChecked(!checked)}
      />
      <Button
        text={loading ? "Memproses..." : "Create an account"}
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

export default RegForm;
