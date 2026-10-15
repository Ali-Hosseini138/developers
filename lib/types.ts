export type AppCategory =
  | 'چندرسانه‌ای'
  | 'سازگار با ماوس'
  | 'تکنولوژی و اینترنت'
  | 'بازی'
  | 'موسیقی'

export const CATEGORIES: AppCategory[] = [
  'چندرسانه‌ای',
  'سازگار با ماوس',
  'تکنولوژی و اینترنت',
  'بازی',
  'موسیقی',
]

export const PLATFORMS = ['وب', 'ویندوز', 'مک', 'لینوکس', 'اندروید', 'iOS'] as const
export type Platform = (typeof PLATFORMS)[number]

export interface AppReview {
  id: string
  author: string
  rating: number
  comment: string
  date: string
}

export interface StoreApp {
  id: string
  name: string
  nameEn?: string
  tagline: string
  taglineEn?: string
  description: string
  descriptionEn?: string
  category: AppCategory
  icon: string
  banner?: string
  screenshots: string[]
  videoUrl?: string
  developer: string
  ownerId?: string
  status?: 'draft' | 'processing' | 'parse_failed' | 'pending' | 'published' | 'rejected' | 'cancelled'
  version: string
  price: number // 0 = رایگان
  rating: number
  downloads: number
  platforms: Platform[]
  tags: string[]
  updatedAt: string
  featured?: boolean
  reviews: AppReview[]
  // اطلاعات نمایشی
  website?: string
  supportEmail?: string
  // فایل نصبی
  apkName?: string
  apkSize?: string
  apkPath?: string
  iconPath?: string
  bannerPath?: string
  screenshotPaths?: string[]
  packageName?: string
  ageRestriction?: 'همه سنین' | '+۷' | '+۱۲' | '+۱۵' | '+۱۸'
  hasInAppPayment?: boolean
  netboxPaymentIntegrated?: boolean
  netboxPaymentGraceAccepted?: boolean
  netboxPaymentGraceDeadline?: string
  paymentCommitmentAcceptedAt?: string | null
  paymentDeadlineStartedAt?: string | null
  paymentDeadlineAt?: string | null
  paymentCompletedAt?: string | null
  developedForAndroidTv?: boolean
  airMouseCompatible?: boolean
  reviewReason?: string
  reviewedAt?: string
  canEdit?: boolean
  canSubmit?: boolean
  isPublished?: boolean
  latestSubmissionId?: string
  latestSubmissionStatus?: string
  latestSubmissionDisplay?: string
  latestSubmissionCanCancel?: boolean
  latestSubmissionErrors?: Array<{ code: string; message: string }>
  rejectionReason?: string
  backgroundImage?: string
  categoryId?: number
  applicationType?: number
  ageLimit?: number
  supportsNetboxPayment?: boolean
}

export interface User {
  id?: string
  name: string
  email: string
  phone?: string
  nationalId?: string
  organization?: string
  termsAcceptedAt?: string
}

export type TicketStatus = 'open' | 'answered' | 'closed'

export interface SupportTicket {
  id: string
  subject: string
  message: string
  status: TicketStatus
  createdAt: string
  developer: string
  adminReply?: string
  repliedAt?: string
}
