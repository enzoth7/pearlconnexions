import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-6" aria-label="Loading dashboard"><Skeleton className="h-20 w-full" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div><Skeleton className="h-80" /></div>;
}
