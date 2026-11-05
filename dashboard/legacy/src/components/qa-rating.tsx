import { qaRating } from "@/lib/qa-capture";
export function QaRating({ ratio }: { ratio: number | null }) {
  const rating = qaRating(ratio);
  return <div className={`inline-flex flex-wrap items-center justify-center gap-1 rounded-full px-3 py-1.5 text-center text-xs font-semibold ${rating.className}`} title="Internal QA classification; not an official regulator rating">{rating.value !== null && `${rating.value.toFixed(2)}% · `}{rating.label}</div>;
}
