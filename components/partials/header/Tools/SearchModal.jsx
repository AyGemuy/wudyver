"use client";

import React, { Fragment, useState, useEffect } from "react";
import { Dialog, Transition, Combobox } from "@headlessui/react";
import Icon from "@/components/ui/Icon";

const SearchModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allPaths, setAllPaths] = useState([]);
  const [loading, setLoading] = useState(true);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    const fetchPaths = async () => {
      try {
        const res = await fetch("/api/openapi");
        const json = await res.json();
        const paths = Object.keys(json.paths || {});
        setAllPaths(paths);
      } catch (err) {
        console.error("Failed to load OpenAPI paths", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaths();
  }, []);

  const filtered = allPaths.filter((p) =>
    p.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    closeModal();
    window.location.href = path;
  };

  return (
    <>
      <div>
        <button
          onClick={openModal}
          className="flex items-center xl:text-sm text-lg xl:text-slate-400 text-slate-800 dark:text-slate-300 px-1 space-x-3 rtl:space-x-reverse"
        >
          <Icon icon="heroicons-outline:search" />
          <span className="xl:inline-block hidden">Search...</span>
        </button>
      </div>

      <Transition show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-[9999] overflow-y-auto p-4 md:pt-[25vh] pt-20"
          onClose={closeModal}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/60 backdrop-filter backdrop-blur-sm backdrop-brightness-10" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel>
              <Combobox value="" onChange={handleSelect}>
                <div className="relative">
                  <div className="relative mx-auto max-w-xl rounded-md bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-gray-500-500 dark:ring-light divide-y divide-gray-500-300 dark:divide-light">
                    <div className="flex bg-white dark:bg-slate-800 px-3 rounded-md py-3 items-center">
                      <div className="text-slate-700 dark:text-slate-300 ltr:pr-2 rtl:pl-2 text-lg">
                        <Icon icon="heroicons-outline:search" />
                      </div>
                      <Combobox.Input
                        className="bg-transparent outline-none border-none w-full dark:placeholder:text-slate-300 dark:text-slate-200"
                        placeholder="Search API paths..."
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <Transition
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Combobox.Options className="max-h-40 overflow-y-auto text-sm py-2">
                        {loading && (
                          <div className="text-center py-2 text-slate-500 dark:text-white">
                            Loading...
                          </div>
                        )}

                        {!loading && filtered.length === 0 && query !== "" && (
                          <div className="text-center py-2 text-slate-500 dark:text-white">
                            No result found
                          </div>
                        )}

                        {filtered.map((path, i) => (
                          <Combobox.Option key={i} value={path}>
                            {({ active }) => (
                              <div
                                className={`px-4 text-[15px] py-2 font-mono cursor-pointer ${
                                  active
                                    ? "bg-slate-900 dark:bg-slate-600 dark:bg-opacity-60 text-white"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {path}
                              </div>
                            )}
                          </Combobox.Option>
                        ))}
                      </Combobox.Options>
                    </Transition>
                  </div>
                </div>
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
};

export default SearchModal;
