import React from "react";
import useSkin from "@/hooks/useSkin";

const Card = ({
  children,
  title,
  subtitle,
  headerslot,
  className = "custom-class  bg-white ",
  bodyClass = "p-6",
  noborder,
  titleClass = "custom-class ",
}) => {
  const [skin] = useSkin();

  return (
    <div
      className={`
        card rounded-md   dark:bg-slate-800   ${
          skin === "bordered"
            ? " border border-slate-200 dark:border-slate-700"
            : "shadow-base"
        }
   
    ${className}
        `}
    >
      {(title || subtitle) && (
        <header className={`card-header ${noborder ? "no-border" : ""}`}>
          <div>
            {title && <div className={`card-title ${titleClass}`}>{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {headerslot && <div className="card-header-slot">{headerslot}</div>}
        </header>
      )}
      <main className={`card-body ${bodyClass}`}>{children}</main>
    </div>
  );
};

export default Card;
