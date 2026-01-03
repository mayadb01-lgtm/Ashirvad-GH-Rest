import { useCallback } from "react";
import dayjs from "dayjs";

/**
 * Hook for date navigation logic.
 * @param {Object} params
 * @param {dayjs.Dayjs} [params.startDate]
 * @param {dayjs.Dayjs} [params.endDate]
 * @param {function} [params.setStartDate]
 * @param {function} [params.setEndDate]
 * @param {dayjs.Dayjs} [params.date] - For single date mode
 * @param {function} [params.setDate] - For single date mode
 */
export const useDateNavigation = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  date,
  setDate,
} = {}) => {
  const goToPreviousRange = useCallback(() => {
    if (startDate && setStartDate && setEndDate) {
      const prevMonth = dayjs(startDate).subtract(1, "month");
      setStartDate(prevMonth.startOf("month"));
      setEndDate(prevMonth.endOf("month"));
    }
  }, [startDate, setStartDate, setEndDate]);

  const goToNextRange = useCallback(() => {
    if (startDate && setStartDate && setEndDate) {
      const nextMonth = dayjs(startDate).add(1, "month");
      setStartDate(nextMonth.startOf("month"));
      setEndDate(nextMonth.endOf("month"));
    }
  }, [startDate, setStartDate, setEndDate]);

  const goToPreviousDate = useCallback(() => {
    if (date && setDate) {
      setDate(dayjs(date).subtract(1, "day"));
    }
  }, [date, setDate]);

  const goToNextDate = useCallback(() => {
    if (date && setDate) {
      setDate(dayjs(date).add(1, "day"));
    }
  }, [date, setDate]);

  return {
    goToPreviousRange,
    goToNextRange,
    goToPreviousDate,
    goToNextDate,
  };
};
