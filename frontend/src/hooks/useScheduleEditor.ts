import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { createEmptyWeekdayAssignment, createScheduleId, WEEKDAY_LABELS } from '@/constants/schedule';
import type { Plan, PlansState } from '@/store/plansStore';
import {
  type Schedule,
  type ScheduleDayKey,
  type ScheduleWeekdayAssignment,
} from '@/types/schedule';
import {
  type SchedulesState,
  useSchedulesStore,
} from '@/store/schedulesStore';
import { usePlansStore } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';

type ScheduleOption = { label: string; value: string | null };

interface UseScheduleEditorReturn {
  draftWeekdays: ScheduleWeekdayAssignment;
  planNameLookup: Record<string, string>;
  planOptions: ScheduleOption[];
  selectedDay: ScheduleDayKey | null;
  modalDayLabel: string;
  isSaving: boolean;
  selectDay: (day: ScheduleDayKey) => void;
  closeModal: () => void;
  assignPlanToDay: (planId: string | null) => void;
  saveSchedule: () => Promise<boolean>;
}

export const useScheduleEditor = (): UseScheduleEditorReturn => {
  const plans = usePlansStore((state: PlansState) => state.plans);
  const { userPrograms } = useProgramsStore();
  const schedules = useSchedulesStore((state: SchedulesState) => state.schedules);
  const hydrateSchedules = useSchedulesStore((state: SchedulesState) => state.hydrateSchedules);
  const addSchedule = useSchedulesStore((state: SchedulesState) => state.addSchedule);
  const updateSchedule = useSchedulesStore((state: SchedulesState) => state.updateSchedule);

  const [draftWeekdays, setDraftWeekdays] = useState<ScheduleWeekdayAssignment>(createEmptyWeekdayAssignment);
  const [selectedDay, setSelectedDay] = useState<ScheduleDayKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void hydrateSchedules();
  }, [hydrateSchedules]);

  const activeSchedule = schedules[0] ?? null;

  useEffect(() => {
    if (activeSchedule) {
      setDraftWeekdays({ ...activeSchedule.weekdays });
      return;
    }

    setDraftWeekdays(createEmptyWeekdayAssignment());
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
    void Haptics.selectionAsync();
    setSelectedDay(day);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedDay(null);
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
      void Haptics.selectionAsync();
      setSelectedDay(null);
    },
    [selectedDay],
  );

  const saveSchedule = useCallback(async () => {
    if (isSaving) {
      return false;
    }

    setIsSaving(true);
    const scheduleName = activeSchedule?.name ?? 'Weekly Schedule';
    const nextSchedule: Schedule = {
      id: activeSchedule?.id ?? createScheduleId(),
      name: scheduleName,
      weekdays: { ...draftWeekdays },
    };

    try {
      if (activeSchedule) {
        await updateSchedule(nextSchedule);
      } else {
        await addSchedule(nextSchedule);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (error) {
      console.error('[useScheduleEditor] Failed to persist schedule', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeSchedule, addSchedule, draftWeekdays, isSaving, updateSchedule]);

  const modalDayLabel = useMemo(() => {
    if (!selectedDay) {
      return '';
    }

    const match = WEEKDAY_LABELS.find((entry) => entry.key === selectedDay);
    return match?.label ?? '';
  }, [selectedDay]);

  return {
    draftWeekdays,
    planNameLookup,
    planOptions,
    selectedDay,
    modalDayLabel,
    isSaving,
    selectDay,
    closeModal,
    assignPlanToDay,
    saveSchedule,
  };
};
