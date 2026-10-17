import { listingChangeRows, listingValueText, type ListingChanges as Changes } from '@/lib/listing-revisions'

function ListingValue({ field, value, snapshot }: { field: string; value: unknown; snapshot: Record<string, unknown> }) {
  if (field === 'screenshots') {
    const images = Array.isArray(value) ? value.filter(item => item && /^https?:\/\//i.test(typeof item === 'string' ? item : item.url || '')).slice().sort((a, b) => (a.weight || 0) - (b.weight || 0)) : []
    return images.length ? <div className="grid grid-cols-2 gap-2">{images.map((item, index) => <a key={index} href={typeof item === 'string' ? item : item.url} target="_blank" rel="noreferrer"><img src={typeof item === 'string' ? item : item.url} alt={`تصویر محیط اپلیکیشن ${index + 1}`} className="aspect-video w-full rounded-lg border object-cover" /></a>)}</div> : <p>بدون تصویر</p>
  }
  if (['iconUrl', 'bannerUrl', 'backgroundImageUrl'].includes(field)) return typeof value === 'string' && /^https?:\/\//i.test(value) ? <a href={value} target="_blank" rel="noreferrer"><img src={value} alt="تصویر اطلاعات اپلیکیشن" className={`w-full rounded-lg border object-contain ${field === 'iconUrl' ? 'size-24' : 'max-h-64'}`} /></a> : <p>بدون تصویر</p>
  return <p className="whitespace-pre-wrap break-words text-sm leading-7" dir="auto">{listingValueText(field, value, snapshot)}</p>
}

export function ListingChanges({ changes }: { changes: Changes }) {
  const rows = listingChangeRows(changes)
  return <section className="rounded-xl border border-primary/25 bg-card p-5">
    <h3 className="font-bold">تغییرات پیشنهادی برای بررسی</h3>
    <p className="mt-2 text-xs leading-6 text-muted-foreground">اطلاعات ستون پیشنهادی مربوط به همین درخواست است؛ اطلاعات فعلی فروشگاه تا تأیید حفظ می‌شود.</p>
    <div className="mt-4 flex flex-col gap-4">{rows.map(row => <article key={row.key} className="rounded-xl border border-border p-4">
      <h4 className="mb-3 text-sm font-semibold">{row.label}</h4>
      <div className="grid gap-3 sm:grid-cols-2">{(['current', 'proposed'] as const).map(side => <div key={side} className={`min-w-0 rounded-lg p-3 ${side === 'proposed' ? 'bg-primary/5' : 'bg-secondary/50'}`}>
        <p className="mb-2 text-xs text-muted-foreground">{side === 'current' ? 'فعلی' : 'پیشنهادی'}</p>
        <ListingValue field={row.key} value={row[side]} snapshot={changes[side] || {}} />
      </div>)}</div>
    </article>)}</div>
    {!rows.length && <p className="mt-3 text-sm text-muted-foreground">جزئیات تغییرات قابل نمایش در پاسخ موجود نیست.</p>}
  </section>
}
