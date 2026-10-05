'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toFa } from '@/lib/format'

export interface WizardStep {
  id: number
  title: string
  subtitle: string
}

export function WizardStepper({
  steps,
  current,
  onStepClick,
}: {
  steps: WizardStep[]
  current: number
  onStepClick?: (id: number) => void
}) {
  return (
    <ol className="flex flex-col gap-1">
      {steps.map((step, i) => {
        const isDone = step.id < current
        const isActive = step.id === current
        const clickable = onStepClick && step.id <= current
        return (
          <li key={step.id}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(step.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-transparent hover:bg-secondary/60',
                !clickable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isDone && 'bg-accent text-accent-foreground',
                  isActive && 'bg-primary text-primary-foreground',
                  !isDone && !isActive && 'bg-secondary text-muted-foreground',
                )}
              >
                {isDone ? <Check className="size-4" /> : toFa(step.id)}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {step.subtitle}
                </span>
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className="ms-7 h-3 w-px bg-border" aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}
