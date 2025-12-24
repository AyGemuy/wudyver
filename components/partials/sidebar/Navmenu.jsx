import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Collapse } from "react-collapse";
import Icon from "@/components/ui/Icon";
import { toggleActiveChat } from "@/components/partials/app/chat/store";
import { useDispatch } from "react-redux";
import useMobileMenu from "@/hooks/useMobileMenu";
import Submenu from "./Submenu";
const Navmenu = ({ menus }) => {
  const router = useRouter();
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  const toggleSubmenu = (i) => {
    if (activeSubmenu === i) {
      setActiveSubmenu(null);
    } else {
      setActiveSubmenu(i);
    }
  };

  const location = usePathname();
  const locationName = location.replace("/", "");

  const [mobileMenu, setMobileMenu] = useMobileMenu();
  const dispatch = useDispatch();

  useEffect(() => {
    let submenuIndex = null;
    menus.map((item, i) => {
      if (!item.child) return;
      if (item.link === locationName) {
        submenuIndex = null;
      } else {
        const ciIndex = item.child.findIndex(
          (ci) => ci.childlink === locationName
        );
        if (ciIndex !== -1) {
          submenuIndex = i;
        }
      }
    });

    setActiveSubmenu(submenuIndex);
    dispatch(toggleActiveChat(false));
    if (mobileMenu) {
      setMobileMenu(false);
    }
  }, [router, location]);

  return (
    <>
      <ul>
        {menus.map((item, i) => (
          <li
            key={i}
            className={` single-sidebar-menu 
              ${item.child ? "item-has-children" : ""}
              ${activeSubmenu === i ? "open" : ""}
              ${locationName === item.link ? "menu-item-active" : ""}`}
          >
            {/* single menu with no childred*/}
            {!item.child && !item.isHeadr && (
              <Link className="menu-link" href={item.link}>
                <span className="menu-icon flex-grow-0">
                  <Icon icon={item.icon} />
                </span>
                <div className="text-box flex-grow">{item.title}</div>
                {item.badge && <span className="menu-badge">{item.badge}</span>}
              </Link>
            )}
            {/* only for menulabel */}
            {item.isHeadr && !item.child && (
              <div className="menulabel">{item.title}</div>
            )}
            {/*    !!sub menu parent   */}
            {item.child && (
              <div
                className={`menu-link ${
                  activeSubmenu === i
                    ? "parent_active not-collapsed"
                    : "collapsed"
                }`}
                onClick={() => toggleSubmenu(i)}
              >
                <div className="flex-1 flex items-start">
                  <span className="menu-icon">
                    <Icon icon={item.icon} />
                  </span>
                  <div className="text-box">{item.title}</div>
                </div>
                <div className="flex-0">
                  <div
                    className={`menu-arrow transform transition-all duration-300 ${
                      activeSubmenu === i ? " rotate-90" : ""
                    }`}
                  >
                    <Icon icon="heroicons-outline:chevron-right" />
                  </div>
                </div>
              </div>
            )}

            <Submenu
              activeSubmenu={activeSubmenu}
              item={item}
              i={i}
              locationName={locationName}
            />
          </li>
        ))}
        <li className="single-sidebar-menu">
          <a
            href="https://dashcode-react-doc.codeshaper.tech/"
            target="_blank"
            className="menu-link"
          >
            <span className="menu-icon">
              <Icon icon="heroicons:document" />
            </span>
            <div className="text-box">Documentation</div>
          </a>
        </li>
      </ul>
    </>
  );
};

export default Navmenu;
