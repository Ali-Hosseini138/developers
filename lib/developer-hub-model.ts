import type { StoreApp } from '@/lib/types'

export type DeveloperSubmission = {
  id: number
  appId: number
  hasApk?: boolean
  hasListingChanges?: boolean
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
  hasDraft?: boolean
  draft?: Partial<Omit<DeveloperHubApp, 'draft'>> & { changedFields?: string[]; removeIcon?: boolean } | null
  id: number
  packageName: string
  developerEmail?: string
  developerWebsite?: string
  name: string
  nameEn?: string
  shortDescription?: string
  longDescription?: string
  shortDescriptionEn?: string
  longDescriptionEn?: string
  isAndroidTv?: boolean
  isAirMouseCompatible?: boolean
  hasInAppPayment?: boolean
  paymentCommitmentAcceptedAt?: string | null
  paymentDeadlineStartedAt?: string | null
  paymentDeadlineAt?: string | null
  paymentCompletedAt?: string | null
  categoryId?: number
  category?: { id: number; name: string; isValid?: boolean }
  applicationType?: number
  ageLimit?: number
  supportsSso?: boolean
  supportsNetboxPayment?: boolean
  iconUrl?: string | null
  bannerUrl?: string | null
  backgroundImageUrl?: string | null
  screenshots?: Array<{ id: number; url: string; weight: number }>
  installCount?: number
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
    hasDraft: Boolean(row.hasDraft),
    draftChangedFields: row.draft?.changedFields || [],
    draft: row.draft ? mapDeveloperHubApp({ ...row, ...row.draft, id: row.id, packageName: row.packageName, isPublished: row.isPublished, canEdit: row.canEdit, canSubmit: row.canSubmit, hasDraft: row.hasDraft, ...(row.draft.removeIcon ? { iconUrl: null } : {}), draft: null }, developer) : null,
    id: String(row.id),
    supportEmail: row.developerEmail || '',
    website: row.developerWebsite || '',
    name: row.name || '',
    nameEn: row.nameEn || undefined,
    tagline: row.shortDescription || '',
    description: row.longDescription || '',
    taglineEn: row.shortDescriptionEn || '',
    descriptionEn: row.longDescriptionEn || '',
    developedForAndroidTv: Boolean(row.isAndroidTv),
    airMouseCompatible: Boolean(row.isAirMouseCompatible),
    hasInAppPayment: Boolean(row.hasInAppPayment),
    paymentCommitmentAcceptedAt: row.paymentCommitmentAcceptedAt,
    paymentDeadlineStartedAt: row.paymentDeadlineStartedAt,
    paymentDeadlineAt: row.paymentDeadlineAt,
    paymentCompletedAt: row.paymentCompletedAt,
    category: ((row.category?.name || 'تکنولوژی و اینترنت') as StoreApp['category']),
    categoryId: row.categoryId ?? row.category?.id,
    applicationType: row.applicationType,
    ageLimit: row.ageLimit,
    supportsSso: Boolean(row.supportsSso),
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
    downloads: Number(row.installCount || 0),
    platforms: [],
    tags: [],
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : '—',
    reviews: [],
    packageName: row.packageName || undefined,
    canEdit: Boolean(row.canEdit),
    canSubmit: Boolean(row.canSubmit),
    isPublished: Boolean(row.isPublished),
    submissionHistory: row.submissions || [],
    latestSubmissionId: latest ? String(latest.id) : undefined,
    latestSubmissionStatus: latest?.status,
    latestSubmissionDisplay: latest?.statusDisplay,
    latestSubmissionCanCancel: Boolean(latest?.canCancel),
    latestSubmissionErrors: latest?.errors || [],
    rejectionReason: latest?.rejectionReason || undefined,
    reviewReason: latest?.rejectionReason || undefined,
  }
}
