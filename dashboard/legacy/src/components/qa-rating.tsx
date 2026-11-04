import { qaRating } from "@/lib/qa-capture";
export function QaRating({ ratio }: { ratio: number | null }) {
  const rating = qaRating(ratio);
  return <span className={`inline-flex flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${rating.className}`} title="Internal QA classification; not an official regulator rating">{rating.value !== null && `${rating.value.toFixed(2)}% · `}{rating.label}</span>;
}
