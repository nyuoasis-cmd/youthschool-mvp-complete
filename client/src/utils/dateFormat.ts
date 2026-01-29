const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

export const formatDateToKorean = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (!isValidDate(date)) return "";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = DAYS[date.getDay()];

  return `${year}. ${month}. ${day}.(${dayOfWeek})`;
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return "";
  const formattedStart = formatDateToKorean(startDate);
  const formattedEnd = formatDateToKorean(endDate);

  if (!formattedStart || !formattedEnd) return "";
  return `${formattedStart} ~ ${formattedEnd}`;
};

export const calculateDateRange = (
  startDate: string,
  endDate: string
): { totalDays: number; schoolDays: number } | null => {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!isValidDate(start) || !isValidDate(end)) return null;
  if (end < start) return null;

  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  let schoolDays = 0;

  const cursor = new Date(start);
  while (cursor <= end) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      schoolDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { totalDays, schoolDays };
};
