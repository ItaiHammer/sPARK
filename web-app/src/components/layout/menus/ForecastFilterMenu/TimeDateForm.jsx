import React, { useState } from "react";
import { motion } from "framer-motion";
import { DateTime } from "luxon";
import { CalendarDays, Timer } from "lucide-react";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// Components
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function TimeDateForm() {
  const {
    timeFilterMenu: {
      form: { day, time },
    },
    updateTimeFilterForm,
  } = useUI();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-12 mb-8"
    >
      <div className="text-base font-medium text-primary-black mb-6">
        Pick Date and Time:
      </div>

      <div className="flex flex-col gap-6 w-full">
        <div className="flex gap-3">
          <Label htmlFor="date-picker" className="text-sm text-secondary-gray">
            <CalendarDays className="text-main-blue w-5 h-5" />
          </Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <div
                id="date-picker"
                className={`w-full text-sm p-2 border border-divider-gray rounded-xl cursor-pointer text-center transition-all duration-200 font-semibold ${
                  calendarOpen
                    ? "border-main-blue bg-main-blue/5 text-main-blue"
                    : "bg-white text-primary-black"
                }`}
              >
                {day
                  ? DateTime.fromISO(day).toFormat("cccc, LLL d")
                  : "Pick a date"}
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={day}
                onSelect={(newDay) => {
                  updateTimeFilterForm({
                    day: DateTime.fromJSDate(newDay).toISO(),
                  });
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-3">
          <Label htmlFor="time-picker" className="text-sm text-secondary-gray">
            <Timer className="text-main-blue w-5 h-5" />
          </Label>
          <Input
            type="time"
            id="time-picker"
            step="1"
            value={time}
            onChange={(e) => {
              updateTimeFilterForm({
                time: e.target.value,
              });
            }}
            onFocus={() => {
              setTimeOpen(true);
            }}
            onBlur={() => {
              setTimeOpen(false);
            }}
            className={`p-4 text-sm text-primary-black border-divider-gray rounded-xl font-semibold bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none text-center flex items-center justify-center transition-all duration-200 ${
              timeOpen
                ? "border-main-blue bg-main-blue/5 text-main-blue"
                : "bg-white text-primary-black"
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default TimeDateForm;
