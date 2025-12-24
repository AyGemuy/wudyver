const activity = [
  {
    id: 1,
    img: "/assets/images/users/user-1.jpg",
  },
  {
    id: 2,
    img: "/assets/images/users/user-2.jpg",
  },
  {
    id: 3,
    img: "/assets/images/users/user-3.jpg",
  },
  {
    id: 4,
    img: "/assets/images/users/user-4.jpg",
  },
  {
    id: 5,
    img: "/assets/images/users/user-5.jpg",
  },
  {
    id: 6,
    img: "/assets/images/users/user-6.jpg",
  },
  {
    id: 7,
    img: "/assets/images/users/user-1.jpg",
  },
  {
    id: 6,
    img: "/assets/images/users/user-2.jpg",
  },
  {
    id: 7,
    img: "/assets/images/users/user-3.jpg",
  },
  {
    id: 8,
    img: "/assets/images/users/user-4.jpg",
  },
];

const RecentActivity = () => {
  return (
    <div>
      <ul className="list-item space-y-3 h-full overflow-x-auto">
        {activity.map((item, i) => (
          <li
            className="flex items-center space-x-3 rtl:space-x-reverse border-b border-slate-100 dark:border-slate-700 last:border-b-0 pb-3 last:pb-0"
            key={i}
          >
            <div>
              <div className="w-8 h-8 rounded-[100%]">
                <img
                  src={item.img}
                  alt=""
                  className="w-full h-full rounded-[100%] object-cover"
                />
              </div>
            </div>
            <div className="text-start overflow-hidden text-ellipsis whitespace-nowrap max-w-[63%]">
              <div className="text-sm text-slate-600 dark:text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap">
                Finance KPI Mobile app launch preparion meeting.
              </div>
            </div>
            <div className="flex-1 ltr:text-right rtl:text-left">
              <div className="text-sm font-light text-slate-400 dark:text-slate-400">
                1 hours
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivity;
