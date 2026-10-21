import { useAdmin } from "@/hooks/use-admin";
import { Icon } from "@/components";
import { DirectorySearch, ExportButton } from "./EmployeeFilters.style";
export function EmployeeFilters({
  status,
  setStatus,
  onExport,
  hasRows,
}: {
  status: string;
  setStatus: (value: string) => void;
  onExport: () => void;
  hasRows: boolean;
}) {
  const { search, setSearch } = useAdmin();
  return (
    <div className="controls-row">
      <DirectorySearch className="input-shell">
        <Icon name="search" />
        <input
          type="search"
          aria-label="Find an employee"
          placeholder="Find an employee by name or ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </DirectorySearch>
      <select
        className="company-switch"
        aria-label="Filter attendance status"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="all">All statuses</option>
        {["Present", "Late", "Not checked in", "On leave"].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <button
        className="btn"
        onClick={() => {
          setSearch("");
          setStatus("all");
        }}
      >
        Clear filters
      </button>
      <ExportButton
        className="btn"
        disabled={!hasRows}
        onClick={() => onExport()}
      >
        <Icon name="file" />
        Export CSV
      </ExportButton>
    </div>
  );
}
