/** A plain GET form, so the filter works without JavaScript and the URL is shareable. */
export function DepartmentFilter({ departments, value }: { departments: { id: string; name: string }[]; value: string | null }) {
  return (
    <form className="no-print flex w-full flex-wrap items-center gap-2 sm:w-auto" method="get">
      <label htmlFor="department" className="text-sm font-semibold text-ink/60">
        Department
      </label>
      <select id="department" name="department" defaultValue={value ?? ''} className="input h-9 min-w-0 flex-1 sm:w-auto sm:flex-none">
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-secondary btn-sm">
        Apply
      </button>
    </form>
  );
}
