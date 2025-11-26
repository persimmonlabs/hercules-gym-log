import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  formatDateToLocalISO,
  getDeviceCurrentDate,
  getTodayLocalISO,
  parseLocalISODate,
} from '@/utils/date';

export interface UseMonthlyCalendarOptions {
  initialMonth?: string;
  selectedDate?: string;
  markers?: string[];
  onSelectDate?: (isoDate: string) => void;
  locale?: string;
  currentMonth?: string;
  onCurrentMonthChange?: (isoDate: string) => void;
}

export interface CalendarGridItem {
  isoDate: string;
  date: Date;
  dayLabel: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasMarker: boolean;
}

const DAYS_IN_GRID = 42;
const DAY_MS = 86_400_000;

const createDateFromISO = (iso?: string): Date => {
  if (!iso) return getDeviceCurrentDate();
  return parseLocalISODate(iso);
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const getGridDates = (referenceDate: Date): Date[] => {
  const firstOfMonth = startOfMonth(referenceDate);
  const sundayOffset = firstOfMonth.getDay();
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - sundayOffset);
  return Array.from({ length: DAYS_IN_GRID }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
};

const getWeekdayLabels = (formatter: Intl.DateTimeFormat): string[] => {
  const sundayReference = new Date(2024, 0, 7, 12); // Local Sunday at noon avoids timezone drift
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const day = new Date(sundayReference);
    day.setDate(sundayReference.getDate() + offset);
    return formatter.format(day);
  });
};

export const useMonthlyCalendar = (options: UseMonthlyCalendarOptions = {}) => {
  const {
    initialMonth,
    selectedDate,
    markers = [],
    onSelectDate,
    locale = 'en-US',
    currentMonth,
    onCurrentMonthChange,
  } = options;

  const todayISO = useMemo(() => getTodayLocalISO(), []);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    startOfMonth(createDateFromISO(initialMonth ?? todayISO))
  );
  const [internalSelectedDate, setInternalSelectedDate] = useState<string>(selectedDate ?? todayISO);

  useEffect(() => {
    if (!selectedDate) return;
    setInternalSelectedDate(selectedDate);
    const nextVisible = startOfMonth(createDateFromISO(selectedDate));
    setVisibleMonth((prev) =>
      prev.getFullYear() === nextVisible.getFullYear() && prev.getMonth() === nextVisible.getMonth()
        ? prev
        : nextVisible
    );
  }, [selectedDate]);

  useEffect(() => {
    if (!currentMonth) return;
    const nextVisible = startOfMonth(createDateFromISO(currentMonth));
    setVisibleMonth((prev) =>
      prev.getFullYear() === nextVisible.getFullYear() && prev.getMonth() === nextVisible.getMonth()
        ? prev
        : nextVisible
    );
  }, [currentMonth]);

  const markerSet = useMemo(() => new Set(markers), [markers]);
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale]
  );
  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    [locale]
  );

  const weekdayLabels = useMemo(() => getWeekdayLabels(weekdayFormatter), [weekdayFormatter]);
  const gridDates = useMemo(() => getGridDates(visibleMonth), [visibleMonth]);

  const gridItems = useMemo<CalendarGridItem[]>(
    () =>
      gridDates.map((date) => {
        const isoDate = formatDateToLocalISO(date);
        return {
          isoDate,
          date,
          dayLabel: `${date.getDate()}`,
          isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
          isToday: isoDate === todayISO,
          isSelected: isoDate === internalSelectedDate,
          hasMarker: markerSet.has(isoDate),
        };
      }),
    [gridDates, internalSelectedDate, markerSet, todayISO, visibleMonth]
  );

  const monthLabel = useMemo(() => monthFormatter.format(visibleMonth), [monthFormatter, visibleMonth]);

  const changeMonth = useCallback(
    (offset: number) => {
      setVisibleMonth((prev) => {
        const newDate = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
        onCurrentMonthChange?.(formatDateToLocalISO(newDate));
        return newDate;
      });
    },
    [onCurrentMonthChange]
  );

  const selectDate = useCallback(
    (isoDate: string) => {
      setInternalSelectedDate(isoDate);
      const targetMonth = startOfMonth(createDateFromISO(isoDate));
      setVisibleMonth((prev) =>
        prev.getFullYear() === targetMonth.getFullYear() && prev.getMonth() === targetMonth.getMonth()
          ? prev
          : targetMonth
      );
      onSelectDate?.(isoDate);
    },
    [onSelectDate]
  );

  return {
    monthLabel,
    weekdayLabels,
    gridItems,
    visibleMonth,
    selectedDate: internalSelectedDate,
    todayISO,
    goToPreviousMonth: () => changeMonth(-1),
    goToNextMonth: () => changeMonth(1),
    selectDate,
  } as const;
};
