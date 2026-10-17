export type AdminHubUser = {
  id: number
  username: string
  firstName: string
  lastName: string
  isStaff: boolean
  isSuperuser: boolean
  canReviewSubmission: boolean
}

export type AdminSubmissionListItem = {
  id: number
  kind: 'new' | 'update'
  status: 'uploaded' | 'parsing' | 'parse_failed' | 'pending_review' | 'approved' | 'rejected' | 'cancelled'
  submittedAt: string
  updatedAt: string
  app: { id: number; name: string; packageName: string }
  developer: { id: number; name: string }
  versionCode: number | null
  versionName: string | null
  errorCount: number
  warningCount: number
  hasErrors: boolean
  hasWarnings: boolean
}

export type AdminSubmissionDetail = {
  id: number
  kind: 'new' | 'update'
  status: AdminSubmissionListItem['status']
  changeLog: string
  submittedAt: string
  cancelledAt: string | null
  updatedAt: string
  mainApkId: number | null
  canDecide: boolean
  app: {
    developerEmail?: string
    developerWebsite?: string
    id: number
    packageName: string
    name: string
    nameEn?: string
    isAndroidTv: boolean
    isAirMouseCompatible: boolean
    hasInAppPayment: boolean
    paymentDeadlineAt: string | null
    paymentCompletedAt: string | null
    shortDescriptionEn?: string
    longDescriptionEn?: string
    shortDescription: string
    longDescription: string
    category: { id: number; name: string; isValid: boolean }
    applicationType: number
    ageLimit: number
    supportsNetboxPayment: boolean
    bannerUrl: string | null
    backgroundImageUrl: string | null
    mainApplicationId: number | null
    screenshots: Array<{ id: number; url: string; weight: number }>
  }
  developer: {
    id: number
    name: string
    email: string
    accountType: 'individual' | 'legal'
    companyName: string
    isActive: boolean
    dateJoined: string
  }
  publishedApplication: { id: number; name: string; packageName: string } | null
  icons: {
    userIconUrl: string | null
    extractedIconUrl: string | null
    currentStoreIconUrl: string | null
    availableSources: Array<'USER' | 'EXTRACTED'>
  }
  parseReport: {
    packageName: string
    versionCode: number
    versionName: string
    label: string
    minSdkVersion: number | null
    targetSdkVersion: number | null
    architectures: string[]
    fileSizeBytes: number
    fileSizeDisplay: string
    md5Hash: string
    sha256Hash: string
    publicKey: string
    parsedAt: string
  } | null
  installCount: number
  currentStoreMaxVersionCode: number | null
  issues: Array<{ id: number; code: string; severity: 'error' | 'warning'; message: string }>
  errorCount: number
  warningCount: number
  permissions: Array<{ name: string; isUnknown: boolean; isNew: boolean }>
  hasUnknownPermissions: boolean
  decisions: Array<{ id: number; decision: 'approved' | 'rejected'; reviewerUsername: string; reason: string; decidedAt: string }>
  otherSubmissions: Array<{ id: number; kind: 'new' | 'update'; status: string; submittedAt: string; rejectionReason: string | null }>
}

export function adminSubmissionStatusLabel(status: AdminSubmissionListItem['status']) {
  if (status === 'uploaded') return 'بارگذاری شده'
  if (status === 'parsing') return 'در حال پردازش'
  if (status === 'parse_failed') return 'خطای فایل'
  if (status === 'pending_review') return 'در انتظار بررسی'
  if (status === 'approved') return 'منتشر شده'
  if (status === 'rejected') return 'رد شده'
  return 'لغو شده'
}

export function adminSubmissionKindLabel(kind: AdminSubmissionListItem['kind']) {
  return kind === 'new' ? 'انتشار اولیه' : 'به‌روزرسانی'
}
