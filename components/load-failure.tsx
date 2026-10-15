'use client'

import { Button } from '@/components/ui/button'

export function LoadFailure({ message, retry }: { message: string; retry?: () => void }) {
  return <section className="mx-auto my-8 max-w-3xl rounded-xl border border-destructive/30 p-6" role="alert">
    <p className="text-sm leading-7">{message}</p>
    <Button type="button" variant="outline" className="mt-4" onClick={retry || (() => window.location.reload())}>تلاش دوباره</Button>
  </section>
}
