import type { StoreApp } from '@/lib/types'

export type DeveloperAppMetadata = {
  packageName: string
  name: string
  nameEn: string
  shortDescription: string
  shortDescriptionEn: string
  longDescription: string
  longDescriptionEn: string
  categoryId: string
  applicationType: string
  ageLimit: string
  supportsNetboxPayment: boolean
  isAndroidTv: boolean
  isAirMouseCompatible: boolean
}

export function changedDeveloperMetadata(app: StoreApp, next: DeveloperAppMetadata) {
  const previous: DeveloperAppMetadata = {
    packageName: app.packageName || '', name: app.name, nameEn: app.nameEn || '',
    shortDescription: app.tagline, shortDescriptionEn: app.taglineEn || '',
    longDescription: app.description, longDescriptionEn: app.descriptionEn || '',
    categoryId: app.categoryId ? String(app.categoryId) : '',
    applicationType: app.applicationType === 2 ? '2' : '1', ageLimit: String(app.ageLimit ?? 0),
    supportsNetboxPayment: Boolean(app.supportsNetboxPayment),
    isAndroidTv: Boolean(app.developedForAndroidTv), isAirMouseCompatible: Boolean(app.airMouseCompatible),
  }
  const patch: Record<string, string> = {}
  for (const key of Object.keys(next) as Array<keyof DeveloperAppMetadata>) {
    const current = String(next[key]).trim()
    if (current !== String(previous[key]).trim()) patch[key] = current
  }
  return patch
}

// A successful PATCH is not enough to claim that a corrected package name persisted.
export function unconfirmedDeveloperMetadata(patch: Record<string, string>, detail: Record<string, unknown>) {
  return Object.keys(patch).filter((key) => {
    const value = key === 'categoryId' ? detail.categoryId ?? (detail.category as { id?: unknown } | null)?.id : detail[key]
    return String(value ?? '').trim() !== patch[key]
  })
}
