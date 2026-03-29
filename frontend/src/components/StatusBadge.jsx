const statusClassMap = {
  draft: "bg-slate-200 text-slate-700",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700"
};

export default function StatusBadge({ status }) {
  const className = statusClassMap[status] || "bg-slate-200 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}
