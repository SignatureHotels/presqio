export function paidHours(start: string, end: string, breakMinutes: number) {
  const minute = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return (((minute(end) - minute(start) + 1440) % 1440) - breakMinutes) / 60;
}
