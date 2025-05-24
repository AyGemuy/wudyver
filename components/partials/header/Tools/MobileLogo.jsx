import React from "react";
import Link from "next/link";
import useDarkMode from "@/hooks/useDarkMode";

import MainLogo from "@/assets/images/logo/logo.svg";
import LogoWhite from "@/assets/images/logo/logo-white.svg";
const MobileLogo = () => {
  const [isDark] = useDarkMode();
  return (
    <Link href="/analytics">
      <img src={isDark ? LogoWhite : MainLogo} alt="" />
    </Link>
  );
};

export default MobileLogo;
