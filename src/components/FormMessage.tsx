export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
  if (success) return <p role="status" className="text-sm text-ok">{success}</p>;
  return null;
}
