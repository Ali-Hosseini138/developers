import type { StoreApp } from '@/lib/types'

export type DeveloperSubmission = {
  id: number
  appId: number
  kind: 'new' | 'update'
  status: 'processing' | 'parse_failed' | 'pending_review' | 'approved' | 'rejected' | 'cancelled'
  statusDisplay: string
  versionCode: number | null
  versionName: string | null
  changeLog: string
  submittedAt: string
  cancelledAt: string | null
  decidedAt: string | null
  rejectionReason: string | null
  errors: Array<{ code: string; message: string }>
  canCancel: boolean
}

export type DeveloperHubApp = {
  id: number
  packageName: string
  name: string
  nameEn?: string
  shortDescription?: string
  longDescription?: string
  categoryId?: number
  category?: { id: number; name: string; isValid?: boolean }
  applicationType?: number
  ageLimit?: number
  supportsNetboxPayment?: boolean
  iconUrl?: string | null
  bannerUrl?: string | null
  backgroundImageUrl?: string | null
  screenshots?: Array<{ id: number; url: string; weight: number }>
  isPublished?: boolean
  canEdit?: boolean
  canSubmit?: boolean
  createdAt: string
  updatedAt: string
  latestSubmission?: DeveloperSubmission | null
  submissions?: DeveloperSubmission[]
}

function normalizeStatus(app: DeveloperHubApp): StoreApp['status'] {
  const status = app.latestSubmission?.status || app.submissions?.[0]?.status
  if (status === 'processing') return 'processing'
  if (status === 'parse_failed') return 'parse_failed'
  if (status === 'pending_review') return 'pending'
  if (status === 'rejected') return 'rejected'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'approved' || app.isPublished) return 'published'
  return 'draft'
}

export function mapDeveloperHubApp(row: DeveloperHubApp, developer = 'توسعه‌دهنده'): StoreApp {
  const latest = row.latestSubmission || row.submissions?.[0] || null
  return {
    id: String(row.id),
    name: row.name || '',
    nameEn: row.nameEn || undefined,
    tagline: row.shortDescription || '',
    description: row.longDescription || '',
    category: ((row.category?.name || 'تکنولوژی و اینترنت') as StoreApp['category']),
    categoryId: row.categoryId ?? row.category?.id,
    applicationType: row.applicationType,
    ageLimit: row.ageLimit,
    supportsNetboxPayment: Boolean(row.supportsNetboxPayment),
    icon: row.iconUrl || '/placeholder.svg',
    banner: row.bannerUrl || undefined,
    backgroundImage: row.backgroundImageUrl || undefined,
    screenshots: (row.screenshots || []).slice().sort((a, b) => a.weight - b.weight).map((item) => item.url),
    developer,
    status: normalizeStatus(row),
    version: latest?.versionName || '',
    price: 0,
    rating: 0,
    downloads: 0,
    platforms: [],
    tags: [],
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toLocaleString('fa-IR') : '—',
    reviews: [],
    packageName: row.packageName || undefined,
    canEdit: Boolean(row.canEdit),
    canSubmit: Boolean(row.canSubmit),
    isPublished: Boolean(row.isPublished),
    latestSubmissionId: latest ? String(latest.id) : undefined,
    latestSubmissionStatus: latest?.status,
    latestSubmissionDisplay: latest?.statusDisplay,
    latestSubmissionCanCancel: Boolean(latest?.canCancel),
    latestSubmissionErrors: latest?.errors || [],
    rejectionReason: latest?.rejectionReason || undefined,
    reviewReason: latest?.rejectionReason || undefined,
  }
}
