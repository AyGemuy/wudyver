"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import InputGroup from "@/components/ui/InputGroup";
import Icon from "@/components/ui/Icon";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import Checkbox from "@/components/ui/Checkbox";
import Cookies from "js-cookie";
import Button from "@/components/ui/Button";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      <div className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
          <InputGroup
            type="email"
            label="Email"
            id="email"
            name="email"
            placeholder="Enter your email"
            prepend={<Icon icon="heroicons-outline:user" />}
            register={register}
            error={errors?.email}
          />
          <InputGroup
            type={showPassword ? "text" : "password"}
            label="Password"
            id="password"
            name="password"
            placeholder="Enter your password"
            prepend={<Icon icon="heroicons-outline:lock-closed" />}
            register={register}
            error={errors?.password}
            hasicon
          />
          <InputGroup
            type={showConfirmPassword ? "text" : "password"}
            label="Confirm Password"
            id="confirmpassword"
            name="confirmpassword"
            placeholder="Confirm your password"
            prepend={<Icon icon="heroicons-outline:lock-closed" />}
            register={register}
            error={errors?.confirmpassword}
            hasicon
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
      </div>
    </div>
  );
};

export default RegForm;