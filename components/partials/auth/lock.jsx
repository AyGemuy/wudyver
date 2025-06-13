import React, { useState } from "react";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Card from '@/components/ui/Card';

const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
    password: yup.string().required("Password is Required"),
  })
  .required();
const Lock = () => {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
  <div className="w-full px-2 py-6">
  <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
      <Textinput
        name="email"
        label="email"
        type="password"
        register={register}
        error={errors.password}
      />

      <button className="btn btn-dark block w-full text-center">Unlock</button>
    </form>
    </Card>
    </div>
  );
};

export default Lock;
