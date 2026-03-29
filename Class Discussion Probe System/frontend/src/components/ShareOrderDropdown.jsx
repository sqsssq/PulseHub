export default function ShareOrderDropdown({ count, value, onChange, small = false }) {
  return (
    <select
      className={`soft-input ${small ? "w-[88px] min-w-[88px]" : ""}`}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    >
      <option value="">-- (unassigned)</option>
      {Array.from({ length: count }, (_, index) => index + 1).map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
