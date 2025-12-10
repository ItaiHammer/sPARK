import React, { useState } from "react";
import { motion } from "framer-motion";
import { DateTime } from "luxon";
import { CalendarDays, Timer, ChevronRight } from "lucide-react";

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
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <div
              id="date-picker"
              className={`flex items-center justify-between text-sm p-4 border border-divider-gray rounded-xl transition-all duration-200 ${
                calendarOpen
                  ? "border-main-blue bg-main-blue/5 text-main-blue"
                  : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <CalendarDays className="text-main-blue w-6 h-6" />
                <div className="flex flex-col">
                  <Label
                    htmlFor="date-picker"
                    className="text-sm text-primary-black font-semibold"
                  >
                    Date
                  </Label>
                  <p className="text-sm text-secondary-gray">
                    {day
                      ? DateTime.fromISO(day).toFormat("cccc, LLL d")
                      : "Pick a date"}
                  </p>
                </div>
              </div>

              <ChevronRight className="text-secondary-gray w-5 h-5" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
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

        <div className="flex gap-3">
          <Label
            htmlFor="time-picker"
            className={`w-full text-sm p-4 border border-divider-gray rounded-xl transition-all duration-200 ${
              timeOpen ? "border-main-blue bg-main-blue/5 text-main-blue" : ""
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <Timer className="text-main-blue w-6 h-6" />

                <div className="flex flex-col">
                  <p className="text-sm text-primary-black font-semibold">
                    Time
                  </p>
                  <Input
                    type="time"
                    id="time-picker"
                    step={1000 * 60}
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
                    className={`text-sm border-none p-0 m-0 shadow-none text-secondary-gray appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none`}
                  />
                </div>
              </div>

              <ChevronRight className="text-secondary-gray w-5 h-5" />
            </div>
          </Label>
        </div>
      </div>
    </motion.div>
  );
}

export default TimeDateForm;
