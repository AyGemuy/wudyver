"use client";
import React from "react";
import { topMenu } from "@/constant/data";
import Icon from "@/components/ui/Icon";
import { usePathname } from "next/navigation";
import Link from "next/link";

const HorizentalMenu = () => {
  const location = usePathname();
  return (
    <div className="main-menu">
      <ul>
        {topMenu?.map((item, i) => (
          <li
            key={i}
            className={
              item.child
                ? "menu-item-has-children"
                : "" || item.megamenu
                ? "menu-item-has-children has-megamenu"
                : ""
            }
          >
            {/* Single menu*/}
            {!item.child && !item.megamenu && (
              <Link href={`${item.link}`}>
                <div className="flex flex-1 items-center space-x-[6px] rtl:space-x-reverse">
                  <span className="icon-box">
                    <Icon icon={item.icon} />
                  </span>
                  <div className="text-box">{item.title}</div>
                </div>
              </Link>
            )}
            {/* has dropdown*/}
            {(item.child || item.megamenu) && (
              <a>
                <div className="flex flex-1 items-center space-x-[6px] rtl:space-x-reverse">
                  <span className="icon-box">
                    <Icon icon={item.icon} />
                  </span>
                  <div className="text-box">{item.title}</div>
                </div>
                <div className="flex-none text-sm ltr:ml-3 rtl:mr-3 leading-[1] relative top-1">
                  <Icon icon="heroicons-outline:chevron-down" />
                </div>
              </a>
            )}
            {/* Dropdown menu*/}
            {item.child && (
              <ul className="sub-menu">
                {item.child.map((childitem, index) => (
                  <li key={index}>
                    <Link href={`${childitem.link}`}>
                      <div className="flex space-x-2 items-start rtl:space-x-reverse">
                        <Icon
                          icon={childitem.childicon}
                          className="leading-[1] text-base"
                        />
                        <span className="leading-[1]">
                          {childitem.childtitle}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {/* Megamenu*/}
            {item.megamenu && (
              <div className="rt-mega-menu">
                <div className="flex flex-wrap space-x-8 justify-between rtl:space-x-reverse">
                  {item.megamenu.map((m_item, m_i) => (
                    <div key={m_i}>
                      {/* mega menu title*/}
                      <div className="text-sm font-medium text-slate-900 dark:text-white mb-2 flex space-x-1 items-center">
                        {/* <Icon icon={m_item.megamenuicon} /> */}
                        <span> {m_item.megamenutitle}</span>
                      </div>
                      {/* single menu item*/}
                      {m_item.singleMegamenu.map((ms_item, ms_i) => (
                        <Link href={`${ms_item.m_childlink}`} key={ms_i}>
                          <div className="flex items-center space-x-2 text-[15px] leading-6 rtl:space-x-reverse">
                            <span
                              className={`h-[6px] w-[6px] rounded-full border border-slate-600 dark:border-white inline-block flex-none ${
                                location === ms_item.m_childlink
                                  ? " bg-slate-900 dark:bg-white"
                                  : ""
                              }`}
                            ></span>
                            <span
                              className={`capitalize ${
                                location === ms_item.m_childlink
                                  ? " text-slate-900 dark:text-white font-medium"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {ms_item.m_childtitle}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HorizentalMenu;
