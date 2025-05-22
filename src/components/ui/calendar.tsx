"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CalendarProps {
  className?: string;
  selected?: Date | Date[];
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  mode?: "single" | "range" | "multiple";
  numberOfMonths?: number;
  locale?: Locale;
  showOutsideDays?: boolean;
}

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  month = new Date(),
  onMonthChange,
  mode = "single",
  showOutsideDays = true,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(month);
  const [lastSelected, setLastSelected] = React.useState<Date | null>(null);

  // Get days for the current month
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  // Get weekday names
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Navigate to previous/next month
  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (disabled?.(date)) return;
    setLastSelected(date);
    onSelect?.(date);
  };

  // Determine if a date is selected
  const isDateSelected = (date: Date) => {
    if (!selected) return false;

    if (Array.isArray(selected)) {
      return selected.some((selectedDate) => isSameDay(date, selectedDate));
    }

    return isSameDay(date, selected);
  };

  // Determine if a date was just selected
  const isJustSelected = (date: Date) => {
    return lastSelected ? isSameDay(date, lastSelected) : false;
  };

  // Check if a date is today
  const isToday = (date: Date) => isSameDay(date, new Date());

  // Get days to display
  const daysToDisplay = getDaysInMonth();

  // Start of month begins on which day of week (0-6)
  const startDay = startOfMonth(currentMonth).getDay();

  // Add empty cells for days before start of month
  const emptyCellsBeforeMonth = Array(startDay).fill(null);

  // Generate a 6-row calendar (42 cells total)
  const totalCells = 42;
  const daysArray = [...emptyCellsBeforeMonth, ...daysToDisplay];
  while (daysArray.length < totalCells) {
    daysArray.push(null);
  }

  // Split days into weeks
  const weeksArray = [];
  for (let i = 0; i < daysArray.length; i += 7) {
    weeksArray.push(daysArray.slice(i, i + 7));
  }

  // Effect to update lastSelected when selected prop changes
  React.useEffect(() => {
    if (selected) {
      if (Array.isArray(selected) && selected.length > 0) {
        setLastSelected(selected[selected.length - 1]);
      } else if (!Array.isArray(selected)) {
        setLastSelected(selected);
      }
    }
  }, [selected]);

  return (
    <div className={cn("p-3", className)}>
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="font-medium">{format(currentMonth, "MMMM yyyy")}</div>
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="text-center text-muted-foreground text-sm font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="space-y-1">
          {weeksArray.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => {
                const isOutsideCurrentMonth = day
                  ? !isSameMonth(day, currentMonth)
                  : true;
                const isSelectedDate = day ? isDateSelected(day) : false;
                const isJustSelectedDate = day ? isJustSelected(day) : false;
                const isTodayDate = day ? isToday(day) : false;
                const isDisabled = day
                  ? disabled
                    ? disabled(day)
                    : false
                  : true;

                return (
                  <div key={dayIndex} className="p-0 text-center relative">
                    {day && (showOutsideDays || !isOutsideCurrentMonth) && (
                      <button
                        type="button"
                        onClick={() => handleDateSelect(day)}
                        disabled={isDisabled}
                        className={cn(
                          "h-8 w-8 p-0 font-normal rounded-md mx-auto flex items-center justify-center transition-all duration-200",
                          isSelectedDate &&
                            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                          isJustSelectedDate &&
                            "ring-2 ring-primary ring-offset-1 shadow-md scale-105",
                          isTodayDate &&
                            !isSelectedDate &&
                            "bg-accent text-accent-foreground",
                          !isSelectedDate &&
                            !isTodayDate &&
                            "hover:bg-accent hover:text-accent-foreground",
                          isOutsideCurrentMonth &&
                            "text-muted-foreground opacity-50",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {format(day, "d")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { Calendar };
