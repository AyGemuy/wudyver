import React, { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import { useForm, Controller } from "react-hook-form";
import Select from "@/components/ui/Select";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { updateEvent, removeEvent } from "./store";
import Flatpickr from "react-flatpickr";
import FormGroup from "@/components/ui/FormGroup";

const FormValidationSchema = yup
  .object({
    title: yup.string().required("Event Name is required"),
    cata: yup
      .string()
      // .when("title", {
      //   is: (title) => title.length > 0,
      //   then: yup.string().required("Category is required"),

      //   otherwise: yup.string().notRequired(),
      // })
      .required("Category is required"),
  })
  .required();
const EditEventModal = ({ editModal, onCloseEditModal, editItem }) => {
  const { categories } = useSelector((state) => state.calendar);
  const dispatch = useDispatch();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    if (editItem) {
      setStartDate(editItem.event.start);
      setEndDate(editItem.event.end);
    }
    reset(editItem);
  }, [editModal]);

  const {
    register,
    control,
    reset,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(FormValidationSchema),
    mode: "all",
  });

  const onSubmit = (data) => {
    dispatch(updateEvent({ data, editItem, startDate, endDate }));
    // close modal
    onCloseEditModal();
    reset();
  };
  return (
    <div>
      <Modal
        title="Edit event"
        labelclassName="btn-outline-dark"
        activeModal={editModal}
        onClose={onCloseEditModal}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
          <FormGroup error={errors.title}>
            <input
              label="Event Name"
              type="text"
              placeholder="Enter Event Name"
              defaultValue={editItem?.event?.title}
              className="form-control py-2"
              {...register("title")}
            />
          </FormGroup>
          <FormGroup
            label="Start Date"
            id="default-picker"
            error={errors.startDate}
          >
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <Flatpickr
                  className="form-control py-2"
                  id="default-picker"
                  placeholder="yyyy, dd M"
                  value={startDate}
                  onChange={(date) => setStartDate(date[0])}
                  options={{
                    altInput: true,
                    altFormat: "F j, Y",
                    dateFormat: "Y-m-d",
                  }}
                />
              )}
            />
          </FormGroup>
          <FormGroup
            label="End Date"
            id="default-picker2"
            error={errors.endDate}
          >
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <Flatpickr
                  className="form-control py-2"
                  id="default-picker2"
                  placeholder="yyyy, dd M"
                  value={endDate}
                  onChange={(date) => setEndDate(date[0])}
                  options={{
                    altInput: true,
                    altFormat: "F j, Y",
                    dateFormat: "Y-m-d",
                  }}
                />
              )}
            />
          </FormGroup>

          <Select
            label="Basic Select"
            options={categories}
            register={register}
            defaultValue={editItem?.event?.classNames[0]}
            error={errors.cata}
            name="cata"
          />
          <div className=" flex justify-between">
            <button
              className="btn btn-danger  text-center"
              onClick={() => {
                dispatch(
                  removeEvent({
                    editItem,
                  })
                );
                onCloseEditModal();
              }}
            >
              Delete
            </button>
            <button className="btn btn-dark  text-center">Submit</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EditEventModal;
