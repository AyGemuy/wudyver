"use client";
import React, { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const formatIDR = (amount) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);

const tables = [
  {
    title: "Free",
    price_Yearly: 5_000,
    price_Monthly: 5_000,
    button: "Get Started Free",
    bg: "bg-purple-500",
    img: "/assets/images/all-img/big-shap5.png",
    isFree: true,
  },
  {
    title: "Basic",
    price_Yearly: 260_000,
    price_Monthly: 160_000,
    button: "Try it free",
    bg: "bg-success-500",
    img: "/assets/images/all-img/big-shap3.png",
  },
  {
    title: "Advanced",
    price_Yearly: 960_000,
    price_Monthly: 260_000,
    button: "Buy now",
    bg: "bg-warning-500",
    img: "/assets/images/all-img/big-shap1.png",
  },
  {
    title: "Business",
    price_Yearly: 1_960_000,
    price_Monthly: 200_000,
    button: "Buy now",
    bg: "bg-info-500",
    ribon: "Most popular",
    img: "/assets/images/all-img/big-shap2.png",
  },
  {
    title: "Got a large team?",
    price_Yearly: 1_260_000,
    price_Monthly: 160_000,
    button: "Request a quote",
    bg: "bg-primary-500",
    img: "/assets/images/all-img/big-shap4.png",
  },
];

const tables2 = [
  {
    title: "Free",
    price_Yearly: 5_000,
    price_Monthly: 5_000,
    button: "Get Started Free",
    bg: "bg-white",
    isFree: true,
  },
  {
    title: "Basic",
    price_Yearly: 260_000,
    price_Monthly: 160_000,
    button: "Try it free",
    bg: "bg-white",
  },
  {
    title: "Advanced",
    price_Yearly: 960_000,
    price_Monthly: 260_000,
    button: "Buy now",
    bg: "bg-white",
  },
  {
    title: "Business",
    price_Yearly: 1_960_000,
    price_Monthly: 200_000,
    button: "Buy now",
    bg: "bg-slate-900",
    ribon: "Most popular",
  },
  {
    title: "Got a large team?",
    price_Yearly: 1_260_000,
    price_Monthly: 160_000,
    button: "Request a quote",
    bg: "bg-white",
  },
];

const PricingPage = () => {
  const [check, setCheck] = useState(true);
  const toggle = () => setCheck(!check);

  return (
    <div>
      <div className="space-y-5">
        <Card>
          <div className="flex justify-between mb-6">
            <h4 className="text-slate-900 text-xl font-medium">Packages</h4>
            <label className="inline-flex text-sm cursor-pointer">
              <input type="checkbox" onChange={toggle} hidden />
              <span className={`${check ? "bg-slate-900 text-white" : "dark:text-slate-300"} px-[18px] py-1 transition rounded`}>
                Yearly
              </span>
              <span className={`${!check ? "bg-slate-900 text-white" : "dark:text-slate-300"} px-[18px] py-1 transition rounded`}>
                Monthly
              </span>
            </label>
          </div>

          <div className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-5">
            {tables.map((item, i) => (
              <div key={i} className={`${item.bg} price-table bg-opacity-[0.16] dark:bg-opacity-[0.36] rounded-[6px] p-6 text-slate-900 dark:text-white relative overflow-hidden z-[1]`}>
                <div className="overlay absolute right-0 top-0 w-full h-full z-[-1]">
                  <img src={item.img} alt="" className="ml-auto block" />
                </div>
                {item.ribon && (
                  <div className="text-sm font-medium bg-slate-900 text-white py-2 text-center absolute ltr:-right-[43px] top-6 px-10 transform ltr:rotate-[45deg]">
                    {item.ribon}
                  </div>
                )}
                <header className="mb-6">
                  <h4 className="text-xl mb-5">{item.title}</h4>
                  <div className="space-x-4 flex items-center mb-5">
                    <span className="text-[32px] leading-10 font-medium">
                      {formatIDR(check ? item.price_Yearly : item.price_Monthly)}
                    </span>
                    {!item.isFree && (
                      <span className="text-xs text-warning-500 font-medium px-3 py-1 rounded-full bg-white uppercase">
                        Save 20%
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">per user/month, annually</p>
                </header>
                <div className="price-body space-y-8">
                  <p className="text-sm leading-5 text-slate-600">
                    {item.isFree
                      ? "Get started with essential features for free, with an option to upgrade."
                      : "Designed for teams who need to manage complex workflows with more automation and integration."}
                  </p>
                  <Button text={item.button} className="btn-outline-dark w-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-5">
          {tables2.map((item, i) => (
            <div key={i} className={`${item.bg} price-table rounded-[6px] shadow-base dark:bg-slate-800 p-6 text-slate-900 dark:text-white relative overflow-hidden z-[1]`}>
              {item.ribon && (
                <div className="text-sm font-medium bg-white text-slate-900 py-2 text-center absolute ltr:-right-[43px] top-6 px-10 transform ltr:rotate-[45deg]">
                  {item.ribon}
                </div>
              )}
              <header className="mb-6">
                <h4 className={`text-xl mb-5 ${item.bg === "bg-slate-900" ? "text-slate-100" : "text-slate-900 dark:text-slate-300"}`}>
                  {item.title}
                </h4>
                <div className={`space-x-4 flex items-center mb-5 ${item.bg === "bg-slate-900" ? "text-slate-100" : "text-slate-900 dark:text-slate-300"}`}>
                  <span className="text-[32px] leading-10 font-medium">
                    {formatIDR(check ? item.price_Yearly : item.price_Monthly)}
                  </span>
                  {!item.isFree && (
                    <span className="text-xs bg-warning-50 text-warning-500 font-medium px-2 py-1 rounded-full dark:bg-slate-700 uppercase">
                      Save 20%
                    </span>
                  )}
                </div>
                <p className={`text-sm ${item.bg === "bg-slate-900" ? "text-slate-100" : "text-slate-500 dark:text-slate-300"}`}>
                  per user/month, annually
                </p>
              </header>
              <div className="price-body space-y-8">
                <p className={`text-sm leading-5 ${item.bg === "bg-slate-900" ? "text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
                  {item.isFree
                    ? "Get started with essential features for free, with an option to upgrade."
                    : "Designed for teams who need to manage complex workflows with more automation and integration."}
                </p>
                <Button
                  text={item.button}
                  className={`w-full ${
                    item.bg === "bg-slate-900" ? "text-slate-100 border-slate-300 border" : "btn-outline-dark"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;