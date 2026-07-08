import { Card, CardContent } from '@/shared/components/card'

export function DeckSkeleton() {
  return (
    <Card className="flex flex-col justify-between h-full relative overflow-hidden animate-pulse">
      <div className="h-3 w-full bg-primary-300 border-b border-outline"></div>

      <CardContent className="p-4 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-2 bg-neutral-100 rounded-md h-16 border border-outline"
              ></div>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex-1 h-9 bg-neutral-200 rounded-md"></div>
            <div className="flex-[3] h-9 bg-neutral-200 rounded-md"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
