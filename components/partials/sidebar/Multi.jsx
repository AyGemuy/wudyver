import React from "react";
import { Collapse } from "react-collapse";
import Link from "next/link";

const Multilevel = ({ activeMultiMenu, j, subItem, locationName }) => {
  return (
    <Collapse isOpened={activeMultiMenu === j}>
      <ul className="space-y-[14px] pl-4">
        {subItem?.multi_menu?.map((item, i) => (
          <li key={i} className=" first:pt-[14px]">
            <Link href={item.multiLink}>
              <span
                className={`${
                  locationName === item.multiLink
                    ? " text-black dark:text-white font-medium"
                    : "text-slate-600 dark:text-slate-300"
                } text-sm flex space-x-3 items-center transition-all duration-150`}
              >
                <span
                  className={`${
                    locationName === item.multiLink
                      ? " bg-slate-900 dark:bg-slate-300 ring-4 ring-opacity-[15%] ring-black-500 dark:ring-slate-300 dark:ring-opacity-20"
                      : ""
                  } h-2 w-2 rounded-full border border-slate-600 dark:border-white inline-block flex-none`}
                ></span>
                <span className="flex-1">{item.multiTitle}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Collapse>
  );
};

export default Multilevel;
