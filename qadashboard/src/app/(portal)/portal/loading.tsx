import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-6" aria-label="Loading reports"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>;
}
