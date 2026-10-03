export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const STATUS_LABELS: Record<string, string> = {
  created: "Создана",
  confirmed: "Подтверждена",
  waiting: "Ожидание",
  in_progress: "На приёме",
  completed: "Завершена",
  cancelled: "Отменена",
  no_show: "Неявка",
  rescheduled: "Перенесена",
};

/** ISO weekday 1..7 (Mon..Sun) for a yyyy-mm-dd local date */
export function isoWeekday(date: string) {
  const d = new Date(date + "T00:00:00");
  return ((d.getDay() + 6) % 7) + 1;
}

/** Build all slot start times for a schedule on a local date */
export function buildSlots(date: string, start: string, end: string, minutes: number) {
  const out: Date[] = [];
  const s = new Date(`${date}T${start.slice(0, 5)}:00`);
  const e = new Date(`${date}T${end.slice(0, 5)}:00`);
  for (let t = s.getTime(); t + minutes * 60000 <= e.getTime(); t += minutes * 60000) out.push(new Date(t));
  return out;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
