import React, { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import { useForm, Controller } from "react-hook-form";
import Select from "@/components/ui/Select";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { dateClick } from "./store";
import Flatpickr from "react-flatpickr";
import FormGroup from "@/components/ui/FormGroup";

const EventModal = ({ activeModal, onClose, selectedEvent }) => {
  const { categories } = useSelector((state) => state.calendar);
  const dispatch = useDispatch();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    if (selectedEvent) {
      setStartDate(selectedEvent.date);
      setEndDate(selectedEvent.date);
    }
  }, [selectedEvent]);

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
    dispatch(dateClick({ data, selectedEvent, startDate, endDate }));

    onClose();
    reset();
  };
  return (
    <div>
      <Modal
        title="Event"
        labelclassName="btn-outline-dark"
        activeModal={activeModal}
        onClose={onClose}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
          <Textinput
            name="title"
            label="Event Name"
            type="text"
            placeholder="Enter Event Name"
            register={register}
            error={errors.title}
          />
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
            error={errors.cata}
            name="cata"
          />
          <div className="ltr:text-right rtl:text-left">
            <button className="btn btn-dark  text-center">Submit</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EventModal;
