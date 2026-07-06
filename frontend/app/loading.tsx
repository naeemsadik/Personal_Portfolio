import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container py-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-1/2" />
          <Skeleton className="mt-4 h-6 w-full max-w-md" />
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-11 w-32 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-full" />
          </div>
        </div>
        <Skeleton className="aspect-square w-full max-w-[640px] rounded-2xl" />
      </div>
    </div>
  );
}
