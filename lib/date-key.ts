export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toCheckInDateKey(date: Date) {
  const checkInDay = new Date(date);

  // Treat after-midnight, before-dawn reflections as belonging to the prior day.
  if (checkInDay.getHours() < 4) {
    checkInDay.setDate(checkInDay.getDate() - 1);
  }

  return toDateKey(checkInDay);
}
