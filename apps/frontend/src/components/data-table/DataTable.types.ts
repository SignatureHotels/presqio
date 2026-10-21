import type { ReactNode } from "react";
import type { TableColumnDefinition } from "@presqio/lib";
export interface DataTableColumn<Row> extends TableColumnDefinition {
  render: (row: Row) => ReactNode;
  className?: string;
}
export interface DataTableProps<Row extends { id: string }> {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  emptyMessage: string;
}
