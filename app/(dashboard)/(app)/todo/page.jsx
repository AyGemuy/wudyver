"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import SimpleBar from "simplebar-react";
import { useSelector, useDispatch } from "react-redux";
import {
  openAddModal,
  setFilter,
  setSearch,
  toggleMobileTodoSidebar,
  fetchTodosFromRoutes,
} from "@/components/partials/app/todo/store";
import Todos from "@/components/partials/app/todo/Todos";
import AddTodo from "@/components/partials/app/todo/AddTodo";
import { ToastContainer } from "react-toastify";
import EditTodoModal from "@/components/partials/app/todo/EditTodo";
import Topfilter from "@/components/partials/app/todo/Topfilter";
import BottomFilter from "@/components/partials/app/todo/BottomFilter";
import ListLoading from "@/components/skeleton/ListLoading";
import Badge from "@/components/ui/Badge";
import TodoHeader from "@/components/partials/app/todo/TodoHeader";
import useWidth from "@/hooks/useWidth";

const topfilterList = [
  {
    value: "all",
    name: "My Task",
    icon: "uil:image-v",
  },
  {
    value: "fav",
    name: "Starred",
    icon: "heroicons:star",
  },
  {
    value: "done",
    name: "Completed",
    icon: "heroicons:document-check",
  },
  {
    value: "trash",
    name: "Trash",
    icon: "heroicons:trash",
  },
];

const bottomfilterList = [
  {
    name: "Team",
    value: "team",
  },
  {
    name: "low",
    value: "low",
  },
  {
    name: "medium",
    value: "medium",
  },
  {
    name: "high",
    value: "high",
  },
  {
    name: "update",
    value: "update",
  },
];

const TodoPage = () => {
  const { todos, editModal, filter, todoSearch, mobileTodoSidebar } =
    useSelector((state) => state.todo);
  const { width, breakpoints } = useWidth();
  const dispatch = useDispatch();

  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchTodosFromRoutes()).finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timeout);

    // Tutup sidebar di mobile jika filter berubah
    if (width < breakpoints.lg && mobileTodoSidebar) {
      dispatch(toggleMobileTodoSidebar(false));
    }
  }, [filter]);

  const filteredTodos = todos
    .filter((todo) => {
      if (todoSearch) {
        return todo.title.toLowerCase().includes(todoSearch.toLowerCase());
      }
      return true;
    })
    .filter((todo) => {
      if (filter === "all") return todo;
      if (filter === "fav") return todo.isfav;
      if (filter === "done") return todo.isDone;
      return todo.category.some((cat) => cat.value === filter);
    });

  const handleFilter = (filter) => {
    dispatch(setFilter(filter));
  };

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-background p-4">
        <div
          className={`transition-all duration-150 flex-none min-w-[260px] 
          ${
            width < breakpoints.lg
              ? "absolute h-full top-0 md:w-[260px] w-[200px] z-[999]"
              : "flex-none min-w-[260px]"
          }
          ${
            width < breakpoints.lg && mobileTodoSidebar
              ? "left-0 "
              : "-left-full "
          }`}
        >
  <Card className="w-full max-w-3xl p-10 border rounded-2xl shadow-2xl bg-card text-card-foreground">
            <div className="flex-1 h-full px-6">
              <Button
                icon="heroicons-outline:plus"
                text="Add Task"
                className="btn-dark w-full block"
                onClick={() => dispatch(openAddModal(true))}
              />
            </div>

            <SimpleBar className="h-full px-6">
              <ul className="list mt-6">
                {topfilterList.map((item, i) => (
                  <Topfilter
                    filter={filter}
                    item={item}
                    key={i}
                    onClick={() => handleFilter(item.value)}
                  />
                ))}
              </ul>
              <div className="block py-4 text-slate-800 dark:text-slate-400 font-semibold text-xs uppercase">
                Tags
              </div>
              <ul>
                {bottomfilterList.map((item, i) => (
                  <BottomFilter
                    filter={filter}
                    item={item}
                    key={i}
                    onClick={() => handleFilter(item.value)}
                  />
                ))}
              </ul>
            </SimpleBar>
          </Card>
        </div>

        {/* Overlay */}
        {width < breakpoints.lg && mobileTodoSidebar && (
          <div
            className="overlay bg-slate-900 dark:bg-slate-900 dark:bg-opacity-60 bg-opacity-60 backdrop-filter backdrop-blur-sm absolute w-full flex-1 inset-0 z-[99] rounded-md"
            onClick={() =>
              dispatch(toggleMobileTodoSidebar(!mobileTodoSidebar))
            }
          ></div>
        )}

        <div className="flex-1 md:w-[calc(100%-320px)]">
          <Card bodyClass="p-0 h-full" className="h-full bg-white">
            <SimpleBar className="h-full all-todos overflow-x-hidden">
              <TodoHeader
                onChange={(e) => dispatch(setSearch(e.target.value))}
              />

              {isLoading && <ListLoading count={filteredTodos.length || 3} />}
              {!isLoading && (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700 -mb-6 h-full">
                  {filteredTodos.map((todo, i) => (
                    <Todos key={i} todo={todo} />
                  ))}
                  {filteredTodos.length === 0 && (
                    <li className="mx-6 mt-6">
                      <Badge
                        label="No Result Found"
                        className="bg-danger-500 text-white w-full block text-start"
                      />
                    </li>
                  )}
                </ul>
              )}
            </SimpleBar>
          </Card>
        </div>
      </div>

      <AddTodo />
      <EditTodoModal />
    </>
  );
};

export default TodoPage;
