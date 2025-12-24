"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import Card from "@/components/ui/Card";
import Textinput from "@/components/ui/Textinput";
import GroupChart5 from "@/components/partials/widget/chart/group-chart5";
import HistoryChart from "@/components/partials/widget/chart/history-chart";
import AccountReceivable from "@/components/partials/widget/chart/account-receivable";
import AccountPayable from "@/components/partials/widget/chart/account-payable";
import TransactionsTable from "@/components/partials/table/transactions";
import SelectMonth from "@/components/partials/SelectMonth";
import SimpleBar from "simplebar-react";

const CardSlider = dynamic(() => import("@/components/partials/widget/CardSlider"), { ssr: false });

const users = ["Ab", "Bc", "Cd", "Df", "Ab", "Sd", "Sg"];

const BankingPage = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid xl:grid-cols-4 md:grid-cols-2 gap-5 items-center">
          <div className="flex space-x-4 items-center">
            <img src="/assets/images/all-img/main-user.png" alt="" className="w-20 h-20 rounded-full" />
            <div>
              <h4 className="text-xl font-medium">
                <span className="block font-light">Good evening,</span>
                <span className="block">Mr. Jone Doe</span>
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-300">Welcome to Dashcode</p>
            </div>
          </div>
          <GroupChart5 />
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-5">
        <div className="lg:col-span-4 col-span-12 space-y-5">
          <Card title="My card">
            <div className="mt-2">
              <CardSlider />
            </div>
          </Card>
          <Card title="Quick transfer">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2 text-sm font-medium">
                  <span>Contacts</span>
                  <a href="#" className="underline">View all</a>
                </div>
                <SimpleBar>
                  <ul className="flex space-x-4 py-2">
                    {users.map((name, i) => (
                      <li
                        key={i}
                        onClick={() => setActiveIndex(i)}
                        className={`h-10 w-10 rounded-full bg-primary-500 text-white flex items-center justify-center cursor-pointer ${
                          activeIndex === i ? "ring-2 ring-offset-2 ring-primary-500" : ""
                        }`}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                </SimpleBar>
              </div>

              <Textinput placeholder="$6547" label="Amount" />
              <Textinput placeholder="3458-3548-6548-3244" label="Recipient account number" isMask />

              <div className="flex justify-between items-center pt-2">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total amount</p>
                  <p className="text-lg font-medium">$6547</p>
                </div>
                <button className="btn btn-dark">Send money</button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 col-span-12 space-y-5">
          <TransactionsTable />
          <Card title="History" headerslot={<SelectMonth />}>
            <HistoryChart />
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Account Receivable" headerslot={<SelectMonth />}>
          <AccountReceivable />
        </Card>
        <Card title="Account Payable" headerslot={<SelectMonth />}>
          <AccountPayable />
        </Card>
      </div>
    </div>
  );
};

export default BankingPage;
