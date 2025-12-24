"use client";

import HorizentalWizard from "@/components/partials/froms/HorizentalWizard";
import Vertical from "@/components/partials/froms/Vertical";

const FormWizard = () => {
  return (
    <div className=" space-y-5">
      <div>
        <Vertical />
      </div>
      <div>
        <HorizentalWizard />
      </div>
    </div>
  );
};

export default FormWizard;
