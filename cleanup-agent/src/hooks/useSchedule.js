import { useState, useEffect } from "react";
import { getSchedule, saveSchedule, checkAndRunSchedule } from "../api";

const DEFAULT_SCHEDULE = { enabled: false, days: [], time: "03:00", actions: [], last_run: "" };

export function useSchedule({ addToast }) {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    getSchedule()
      .then((s) => setSchedule(s || DEFAULT_SCHEDULE))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await checkAndRunSchedule();
        if (result?.ran) {
          addToast(`🕐 ${result.message}`, "success");
          getSchedule().then((s) => setSchedule(s)).catch(() => {});
        }
      } catch (e) { void e; }
    }, 60000);
    return () => clearInterval(interval);
  }, [addToast]);

  const handleSaveSchedule = async () => {
    setScheduleLoading(true);
    try {
      await saveSchedule(schedule);
      addToast("Đã lưu lịch dọn tự động", "success");
    } catch (e) {
      addToast("Lỗi lưu lịch: " + e, "error");
    }
    setScheduleLoading(false);
  };

  const toggleScheduleDay = (day) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort(),
    }));
  };

  const toggleScheduleAction = (actionType) => {
    setSchedule((prev) => ({
      ...prev,
      actions: prev.actions.includes(actionType)
        ? prev.actions.filter((a) => a !== actionType)
        : [...prev.actions, actionType],
    }));
  };

  return {
    schedule,
    setSchedule,
    scheduleLoading,
    handleSaveSchedule,
    toggleScheduleDay,
    toggleScheduleAction,
  };
}
