export type EntityId = string;
/** Dates and timestamps in API responses are ISO strings, never JS Date objects. */
export type ISODate = string;
export type ISODateTime = string;
export interface ApiError {
  code: string;
  message: string | string[];
  requestId: string;
}
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface TableColumnDefinition<Key extends string = string> {
  key: Key;
  label: string;
  align?: "left" | "center" | "right";
}
