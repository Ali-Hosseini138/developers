import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toFa } from '@/lib/format'

export function StarRating({
  rating,
  size = 14,
  showValue = true,
  className,
}: {
  rating: number
  size?: number
  showValue?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              'shrink-0',
              i < Math.round(rating)
                ? 'fill-chart-3 text-chart-3'
                : 'fill-muted text-muted',
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-xs font-medium text-muted-foreground">
          {toFa(rating.toFixed(1))}
        </span>
      )}
    </div>
  )
}
