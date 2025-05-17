const Social = () => {
  return (
    <>
      <ul className="flex">
        <li className="flex-1">
          <a
            href="#"
            className="inline-flex h-10 w-10 bg-[#1C9CEB] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <img src="/assets/images/icon/tw.svg" alt="" />
          </a>
        </li>
        <li className="flex-1">
          <a
            href="#"
            className="inline-flex h-10 w-10 bg-[#395599] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <img src="/assets/images/icon/fb.svg" alt="" />
          </a>
        </li>
        <li className="flex-1">
          <a
            href="#"
            className="inline-flex h-10 w-10 bg-[#0A63BC] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <img src="/assets/images/icon/in.svg" alt="" />
          </a>
        </li>
        <li className="flex-1">
          <a
            href="#"
            className="inline-flex h-10 w-10 bg-[#EA4335] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <img src="/assets/images/icon/gp.svg" alt="" />
          </a>
        </li>
      </ul>
    </>
  );
};

export default Social;
