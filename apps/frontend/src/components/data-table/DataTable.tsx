import type { DataTableProps } from "./DataTable.types";
import { Table, TableScroll } from "./DataTable.style";
export function DataTable<Row extends { id: string }>({
  rows,
  columns,
  emptyMessage,
}: DataTableProps<Row>) {
  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                scope="col"
                key={column.key}
                style={{ textAlign: column.align }}
              >
                {column.label || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.className}
                    style={{ textAlign: column.align }}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="empty-cell">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </TableScroll>
  );
}
