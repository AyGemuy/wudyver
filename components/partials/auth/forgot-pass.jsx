"use client";
import React, { useState } from "react";
import InputGroup from "@/components/ui/InputGroup";
import Icon from "@/components/ui/Icon";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import Card from '@/components/ui/Card';
import Button from "@/components/ui/Button"; // Pastikan Button diimport

const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
  })
  .required();

const ForgotPass = () => {
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState(null); // state untuk menampilkan response

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    const loadingToast = toast.loading("Sending recovery email...");
    setLoading(true);
    setApiResult(null); // reset sebelumnya

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();
      setApiResult(result); // tampilkan hasil

      if (res.ok && result.status === 200) {
        toast.update(loadingToast, {
          render: result.message || "Recovery email sent. Please check your inbox.",
          type: "success",
          isLoading: false,
          autoClose: 1500,
        });
      } else {
        throw new Error(result.message || "User not found");
      }
    } catch (err) {
      toast.update(loadingToast, {
        render: err.message || "Something went wrong",
        type: "error",
        isLoading: false,
        autoClose: 1500,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full px-2 py-6">
        <Card
          bodyClass="relative p-4 h-full overflow-hidden"
          className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
            <InputGroup
              type="email"
              label="Email"
              id="email"
              name="email" // Tambahkan prop 'name'
              placeholder="Enter your email"
              prepend={<Icon icon="heroicons-outline:user" />}
              register={register} // Teruskan fungsi register
              error={errors?.email}
            />

            <Button
              type="submit"
              className="btn-dark block w-full text-center"
              disabled={loading}
              text={loading ? "Sending..." : "Send recovery email"}
              isLoading={loading}
            />
          </form>

          {/* tampilkan JSON result */}
          {apiResult && (
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded">
              <h4 className="font-semibold mb-2">API Result:</h4>
              <pre className="text-sm whitespace-pre-wrap break-all">
                {JSON.stringify(apiResult, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default ForgotPass;