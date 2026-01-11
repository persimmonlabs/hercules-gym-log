import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { triggerHaptic } from '@/utils/haptics';

import { createEmptyWeekdayAssignment, createScheduleId, WEEKDAY_LABELS } from '@/constants/schedule';
import type { Plan, PlansState } from '@/store/plansStore';
import {
  type Schedule,
  type ScheduleDayKey,
  type ScheduleWeekdayAssignment,
  type ScheduleType,
  type RotatingDay,
  type RotatingScheduleConfig,
} from '@/types/schedule';
import {
  type SchedulesState,
  useSchedulesStore,
} from '@/store/schedulesStore';
import { usePlansStore } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';

type ScheduleOption = { label: string; value: string | null };

const MAX_ROTATING_DAYS = 14;

const createEmptyRotatingSchedule = (): RotatingScheduleConfig => ({
  days: [],
  startDate: null,
});

const normalizeRotatingSchedule = (rotating?: RotatingScheduleConfig): RotatingScheduleConfig => {
  if (!rotating) {
    return createEmptyRotatingSchedule();
  }

  return {
    ...rotating,
    days: (rotating.days ?? []).map((day, index) => ({
      ...day,
      dayNumber: index + 1,
    })),
  };
};

const createRotatingDayId = (): string => {
  return `day-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getWeekdayAssignmentsFromRotating = (
  rotating: RotatingScheduleConfig,
  referenceDate?: Date,
): ScheduleWeekdayAssignment => {
  const assignment = createEmptyWeekdayAssignment();

  if (!rotating.startDate || rotating.days.length === 0) {
    return assignment;
  }

  const now = referenceDate ? new Date(referenceDate) : new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const start = new Date(rotating.startDate);
  start.setHours(0, 0, 0, 0);

  WEEKDAY_LABELS.forEach(({ key }, index) => {
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + index);
    const diffDays = Math.floor((targetDate.getTime() - start.getTime()) / MS_PER_DAY);

    if (diffDays < 0) {
      assignment[key] = null;
      return;
    }

    const rotationLength = rotating.days.length;
    if (rotationLength === 0) {
      assignment[key] = null;
      return;
    }

    const rotationIndex = ((diffDays % rotationLength) + rotationLength) % rotationLength;
    const rotationDay = rotating.days[rotationIndex];
    assignment[key] = rotationDay?.planId ?? null;
  });

  return assignment;
};

interface UseScheduleEditorReturn {
  scheduleType: ScheduleType;
  setScheduleType: (type: ScheduleType) => void;
  draftWeekdays: ScheduleWeekdayAssignment;
  draftRotating: RotatingScheduleConfig;
  planNameLookup: Record<string, string>;
  planOptions: ScheduleOption[];
  selectedDay: ScheduleDayKey | null;
  selectedRotatingDayIndex: number | null;
  modalDayLabel: string;
  isSaving: boolean;
  selectDay: (day: ScheduleDayKey) => void;
  selectRotatingDay: (index: number) => void;
  closeModal: () => void;
  assignPlanToDay: (planId: string | null) => void;
  assignPlanToRotatingDay: (planId: string | null) => void;
  addRotatingDay: (isRest?: boolean) => void;
  removeRotatingDay: (index: number) => void;
  moveRotatingDayUp: (index: number) => void;
  moveRotatingDayDown: (index: number) => void;
  setRotatingStartDate: (date: number | null) => void;
  saveSchedule: () => Promise<boolean>;
}

export const useScheduleEditor = (): UseScheduleEditorReturn => {
  const plans = usePlansStore((state: PlansState) => state.plans);
  const { userPrograms } = useProgramsStore();
  const schedules = useSchedulesStore((state: SchedulesState) => state.schedules);
  const hydrateSchedules = useSchedulesStore((state: SchedulesState) => state.hydrateSchedules);
  const addSchedule = useSchedulesStore((state: SchedulesState) => state.addSchedule);
  const updateSchedule = useSchedulesStore((state: SchedulesState) => state.updateSchedule);

  const [scheduleType, setScheduleType] = useState<ScheduleType>('weekly');
  const [draftWeekdays, setDraftWeekdays] = useState<ScheduleWeekdayAssignment>(createEmptyWeekdayAssignment);
  const [draftRotating, setDraftRotating] = useState<RotatingScheduleConfig>(createEmptyRotatingSchedule);
  const [selectedDay, setSelectedDay] = useState<ScheduleDayKey | null>(null);
  const [selectedRotatingDayIndex, setSelectedRotatingDayIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const lastInitializedScheduleIdRef = useRef<string | null>(null);

  useEffect(() => {
    void hydrateSchedules();
  }, [hydrateSchedules]);

  const activeSchedule = schedules[0] ?? null;

  useEffect(() => {
    const activeId = activeSchedule?.id ?? null;

    // Only initialize drafts when the active schedule changes (prevents overwriting
    // in-progress edits when schedules re-hydrate).
    if (activeId === lastInitializedScheduleIdRef.current) {
      return;
    }

    lastInitializedScheduleIdRef.current = activeId;

    if (activeSchedule) {
      setScheduleType(activeSchedule.type || 'weekly');
      setDraftWeekdays({ ...activeSchedule.weekdays });
      setDraftRotating(normalizeRotatingSchedule(activeSchedule.rotating));
      return;
    }

    setScheduleType('weekly');
    setDraftWeekdays(createEmptyWeekdayAssignment());
    setDraftRotating(createEmptyRotatingSchedule());
  }, [activeSchedule]);

  const planNameLookup = useMemo(() => {
    const lookup = plans.reduce<Record<string, string>>((acc, plan: Plan) => {
      acc[plan.id] = plan.name;
      return acc;
    }, {});

    userPrograms.forEach((prog) => {
      prog.workouts.forEach((workout) => {
        lookup[workout.id] = `${prog.name}: ${workout.name}`;
      });
    });

    return lookup;
  }, [plans, userPrograms]);

  const planOptions = useMemo<ScheduleOption[]>(() => {
    const options = [
      { label: 'Rest Day', value: null },
      ...plans.map((plan: Plan) => ({ label: plan.name, value: plan.id })),
    ];

    if (userPrograms.length > 0) {
      userPrograms.forEach((prog) => {
        prog.workouts.forEach((workout) => {
          options.push({
            label: `${prog.name}: ${workout.name}`,
            value: workout.id,
          });
        });
      });
    }

    return options;
  }, [plans, userPrograms]);

  const selectDay = useCallback((day: ScheduleDayKey) => {
    triggerHaptic('selection');
    setSelectedDay(day);
  }, []);

  const selectRotatingDay = useCallback((index: number) => {
    triggerHaptic('selection');
    setSelectedRotatingDayIndex(index);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedDay(null);
    setSelectedRotatingDayIndex(null);
  }, []);

  const assignPlanToDay = useCallback(
    (planId: string | null) => {
      if (!selectedDay) {
        return;
      }

      setDraftWeekdays((prev) => ({
        ...prev,
        [selectedDay]: planId,
      }));
      triggerHaptic('selection');
      setSelectedDay(null);
    },
    [selectedDay],
  );

  const assignPlanToRotatingDay = useCallback(
    (planId: string | null) => {
      if (selectedRotatingDayIndex === null) {
        return;
      }

      setDraftRotating((prev) => {
        const newDays = [...prev.days];
        if (newDays[selectedRotatingDayIndex]) {
          newDays[selectedRotatingDayIndex] = {
            ...newDays[selectedRotatingDayIndex],
            planId,
          };
        }
        return { ...prev, days: newDays };
      });
      triggerHaptic('selection');
      setSelectedRotatingDayIndex(null);
    },
    [selectedRotatingDayIndex],
  );

  const addRotatingDay = useCallback((isRest: boolean = false) => {
    triggerHaptic('selection');
    setSelectedDay(null);

    if (draftRotating.days.length >= MAX_ROTATING_DAYS) {
      return;
    }

    const newIndex = draftRotating.days.length;

    setDraftRotating((prev) => {
      const newDayNumber = prev.days.length + 1;
      const newDay: RotatingDay = {
        id: createRotatingDayId(),
        dayNumber: newDayNumber,
        planId: null,
      };
      return { ...prev, days: [...prev.days, newDay] };
    });

    setSelectedRotatingDayIndex(newIndex);
  }, [draftRotating.days.length]);

  const removeRotatingDay = useCallback((index: number) => {
    triggerHaptic('warning');
    setDraftRotating((prev) => {
      const newDays = prev.days.filter((_, i) => i !== index);
      // Renumber the days
      return {
        ...prev,
        days: newDays.map((day, i) => ({ ...day, dayNumber: i + 1 })),
      };
    });
  }, []);

  const moveRotatingDayUp = useCallback((index: number) => {
    if (index === 0) return;
    triggerHaptic('selection');
    setDraftRotating((prev) => {
      const newDays = [...prev.days];
      [newDays[index - 1], newDays[index]] = [newDays[index], newDays[index - 1]];
      // Renumber the days
      return {
        ...prev,
        days: newDays.map((day, i) => ({ ...day, dayNumber: i + 1 })),
      };
    });
  }, []);

  const moveRotatingDayDown = useCallback((index: number) => {
    setDraftRotating((prev) => {
      if (index >= prev.days.length - 1) return prev;
      triggerHaptic('selection');
      const newDays = [...prev.days];
      [newDays[index], newDays[index + 1]] = [newDays[index + 1], newDays[index]];
      // Renumber the days
      return {
        ...prev,
        days: newDays.map((day, i) => ({ ...day, dayNumber: i + 1 })),
      };
    });
  }, []);

  const setRotatingStartDate = useCallback((date: number | null) => {
    triggerHaptic('selection');
    setDraftRotating((prev) => ({ ...prev, startDate: date }));
  }, []);

  const saveSchedule = useCallback(async () => {
    if (isSaving) {
      return false;
    }

    setIsSaving(true);
    const scheduleName = activeSchedule?.name ?? (scheduleType === 'weekly' ? 'Weekly Schedule' : 'Rotating Schedule');

    const normalizedRotating = normalizeRotatingSchedule(draftRotating);

    const nextSchedule: Schedule = {
      id: activeSchedule?.id ?? createScheduleId(),
      name: scheduleName,
      type: scheduleType,
      weekdays: scheduleType === 'rotating'
        ? getWeekdayAssignmentsFromRotating(normalizedRotating)
        : { ...draftWeekdays },
      rotating: scheduleType === 'rotating' ? normalizedRotating : undefined,
    };

    try {
      if (activeSchedule) {
        await updateSchedule(nextSchedule);
      } else {
        await addSchedule(nextSchedule);
      }

      await triggerHaptic('success');
      return true;
    } catch (error) {
      console.error('[useScheduleEditor] Failed to persist schedule', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeSchedule, addSchedule, draftWeekdays, draftRotating, isSaving, scheduleType, updateSchedule]);

  const modalDayLabel = useMemo(() => {
    if (selectedRotatingDayIndex !== null) {
      return `Day ${selectedRotatingDayIndex + 1}`;
    }

    if (!selectedDay) {
      return '';
    }

    const match = WEEKDAY_LABELS.find((entry) => entry.key === selectedDay);
    return match?.label ?? '';
  }, [selectedDay, selectedRotatingDayIndex]);

  return {
    scheduleType,
    setScheduleType,
    draftWeekdays,
    draftRotating,
    planNameLookup,
    planOptions,
    selectedDay,
    selectedRotatingDayIndex,
    modalDayLabel,
    isSaving,
    selectDay,
    selectRotatingDay,
    closeModal,
    assignPlanToDay,
    assignPlanToRotatingDay,
    addRotatingDay,
    removeRotatingDay,
    moveRotatingDayUp,
    moveRotatingDayDown,
    setRotatingStartDate,
    saveSchedule,
  };
};
