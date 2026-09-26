const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const uuidQueryParam = (value: unknown) =>
  typeof value === "string" && UUID.test(value) ? value : "";

export const postgrestSearchTerm = (value: string) => value.replace(/[,%()"']/g, " ").trim();

export const dateQueryParam = (value: unknown) => {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : "";
};
