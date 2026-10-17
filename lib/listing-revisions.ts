export type ListingSnapshot = Record<string, unknown>
export type ListingChanges = { current: ListingSnapshot; proposed: ListingSnapshot; changedFields: string[] }

export function isListingOnlySubmission(detail: { hasApk?: boolean; hasListingChanges?: boolean; apkUrl?: string | null; listingChanges?: ListingChanges | null }) {
  return detail.hasApk !== true && detail.hasListingChanges !== false &&
    (detail.hasApk === false || detail.apkUrl === null) &&
    (detail.hasListingChanges === true || Boolean(detail.listingChanges))
}

const aliases: Record<string, string> = {
  name_en: 'nameEn', developer_email: 'developerEmail', developer_website: 'developerWebsite',
  long_description: 'longDescription', long_description_en: 'longDescriptionEn',
  short_description: 'shortDescription', short_description_en: 'shortDescriptionEn',
  category_id: 'categoryId', category: 'categoryId', application_type: 'applicationType', age_limit: 'ageLimit',
  supports_netbox_payment: 'supportsNetboxPayment', has_in_app_payment: 'hasInAppPayment',
  payment_commitment_accepted: 'paymentCommitmentAccepted', is_android_tv: 'isAndroidTv', is_air_mouse_compatible: 'isAirMouseCompatible',
  icon: 'iconUrl', icon_url: 'iconUrl', banner: 'bannerUrl', banner_url: 'bannerUrl',
  background_image: 'backgroundImageUrl', backgroundImage: 'backgroundImageUrl', background_image_url: 'backgroundImageUrl',
  removeIcon: 'iconUrl', remove_icon: 'iconUrl', clearScreenshots: 'screenshots', clear_screenshots: 'screenshots',
}
export const listingFieldLabels: Record<string, string> = {
  name: 'عنوان فارسی', nameEn: 'عنوان انگلیسی', developerEmail: 'ایمیل پشتیبانی', developerWebsite: 'وب‌سایت',
  longDescription: 'توضیحات فارسی', longDescriptionEn: 'توضیحات انگلیسی', categoryId: 'دسته‌بندی',
  applicationType: 'نوع اپلیکیشن', ageLimit: 'محدودیت سنی', supportsNetboxPayment: 'نت‌باکس پیمنت',
  hasInAppPayment: 'پرداخت درون‌برنامه‌ای', paymentCommitmentAccepted: 'پذیرش تعهد پرداخت',
  isAndroidTv: 'مخصوص Android TV', isAirMouseCompatible: 'سازگاری ایرماوس',
  iconUrl: 'آیکون', bannerUrl: 'بنر', backgroundImageUrl: 'تصویر پس‌زمینه', screenshots: 'تصاویر محیط اپلیکیشن',
}
export function listingFieldValue(snapshot: ListingSnapshot, field: string): unknown {
  if (field === 'iconUrl' && (snapshot.removeIcon === true || snapshot.remove_icon === true)) return null
  if (field === 'screenshots' && (snapshot.clearScreenshots === true || snapshot.clear_screenshots === true)) return []
  if (field in snapshot) return snapshot[field]
  const alias = Object.keys(aliases).find(key => aliases[key] === field && key in snapshot)
  return alias ? snapshot[alias] : undefined
}
export function listingChangeRows(changes: ListingChanges) {
  const fields = changes.changedFields?.length ? changes.changedFields : Object.keys(changes.proposed || {}).filter(key => JSON.stringify(changes.current?.[key]) !== JSON.stringify(changes.proposed?.[key]))
  return [...new Set(fields.map(key => aliases[key] || key))].filter(key => key in listingFieldLabels).map(key => ({
    key, label: listingFieldLabels[key], current: listingFieldValue(changes.current || {}, key), proposed: listingFieldValue(changes.proposed || {}, key),
  }))
}
export function listingValueText(field: string, value: unknown, snapshot: ListingSnapshot) {
  if (value == null || value === '') return '—'
  if (field === 'categoryId') {
    const category = snapshot.category
    if (category && typeof category === 'object' && 'name' in category && (!('id' in category) || String(category.id) === String(value) || typeof value === 'object')) return String(category.name)
    if (value && typeof value === 'object' && 'name' in value) return String(value.name)
    return typeof snapshot.categoryName === 'string' ? snapshot.categoryName : 'نام دسته‌بندی در پاسخ موجود نیست'
  }
  if (field === 'applicationType') return Number(value) === 2 ? 'بازی' : Number(value) === 1 ? 'برنامه' : '—'
  if (field === 'ageLimit') return Number(value) === 0 ? 'همه سنین' : `+${Number(value).toLocaleString('fa-IR')}`
  if (typeof value === 'boolean' || value === 'true' || value === 'false') return value === true || value === 'true' ? 'بله' : 'خیر'
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '—'
}
