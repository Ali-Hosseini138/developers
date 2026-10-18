import { appDescription } from './app-description'

export function contactFieldErrors(website: string, email: string): Record<string, string> {
  const errors: Record<string, string> = {}
  const url = website.trim()
  if (url) {
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace(/\.$/, '')
      const validHost = host === 'localhost' || /^\[[0-9a-f:]+\]$/i.test(host) ||
        (host.includes('.') && (/^\d+(?:\.\d+){3}$/.test(host) || /^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/i.test(host.split('.').at(-1) || '')) && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) &&
          (!/^\d+(?:\.\d+){3}$/.test(host) || host.split('.').every(part => Number(part) <= 255)))
      if (!/^https?:\/\/[^/\s]/i.test(url) || !/^https?:$/.test(parsed.protocol) || !validHost || /\s/.test(url) || url.length > 2048) throw new Error('invalid')
    } catch { errors.developerWebsite = 'آدرس کامل و معتبر وب‌سایت را با http:// یا https:// وارد کنید؛ مانند https://example.com.' }
  }
  const address = email.trim()
  const domain = address.split('@')[1] || ''
  const invalidDomain = address && (/[/:?#\[\]\\]/.test(domain) || Boolean(contactFieldErrors('https://' + domain, '').developerWebsite))
  if (address && (invalidDomain || address.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(address) || address.split('@')[0].startsWith('.') || address.split('@')[0].endsWith('.') || address.includes('..'))) {
    errors.developerEmail = 'ایمیل معتبر وارد کنید؛ مانند support@example.com.'
  }
  return errors
}

type UploadFields = {
  apkFile: { name: string; size: number } | null
  name: string; nameEn: string; description: string; descriptionEn: string; packageName: string
  categoryId: string; applicationType: string; ageLimit: string
  bannerFile: { size: number; type: string } | null; backgroundFile: { size: number; type: string } | null
  iconFile: { size: number; type: string } | null; screenshotFiles: Array<{ size: number; type: string }>
  hasInAppPayment: boolean | null; paymentCommitmentAccepted: boolean; paymentChoice: string | null
  developedForAndroidTv: boolean | null; airMouseCompatible: boolean
  website: string; supportEmail: string
}

export function validateUploadFields(v: UploadFields): Record<number, Record<string, string>> {
  const errors: Record<number, Record<string, string>> = { 1: {}, 2: {}, 3: {}, 4: {} }
  if (!v.apkFile) errors[1].apkFile = 'فایل APK را انتخاب کنید.'
  else if (!v.apkFile.name.toLowerCase().endsWith('.apk') || v.apkFile.size === 0) errors[1].apkFile = 'یک فایل APK معتبر و غیرخالی انتخاب کنید.'
  else if (v.apkFile.size > 300 * 1024 * 1024) errors[1].apkFile = 'حجم فایل APK نباید بیشتر از ۳۰۰ مگابایت باشد.'
  if (!v.name.trim()) errors[2].name = 'عنوان فارسی اپلیکیشن را وارد کنید.'
  else if (v.name.trim().length > 255) errors[2].name = 'عنوان باید حداکثر ۲۵۵ نویسه باشد.'
  if (v.nameEn.trim().length > 255) errors[2].nameEn = 'عنوان انگلیسی باید حداکثر ۲۵۵ نویسه باشد.'
  if (!v.description.trim()) errors[2].longDescription = 'توضیحات فارسی اپلیکیشن را وارد کنید.'
  else if (appDescription(v.description, v.developedForAndroidTv === false && v.airMouseCompatible).length > 20000) errors[2].longDescription = 'توضیحات با احتساب متن ایرماوس باید حداکثر ۲۰۰۰۰ نویسه باشد.'
  if (v.descriptionEn.trim().length > 20000) errors[2].longDescriptionEn = 'توضیحات انگلیسی باید حداکثر ۲۰۰۰۰ نویسه باشد.'
  if (v.packageName.trim().length > 100 || !/^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/.test(v.packageName.trim())) errors[2].packageName = 'شناسه معتبر اپلیکیشن را وارد کنید؛ مانند com.company.app (حداکثر ۱۰۰ نویسه).'
  if (!/^[1-9]\d*$/.test(v.categoryId)) errors[2].categoryId = 'دسته‌بندی اپلیکیشن را انتخاب کنید.'
  if (!['1', '2'].includes(v.applicationType)) errors[2].applicationType = 'نوع اپلیکیشن را انتخاب کنید.'
  if (!/^\d+$/.test(v.ageLimit) || Number(v.ageLimit) > 99) errors[2].ageLimit = 'محدودیت سنی معتبر را انتخاب کنید.'
  for (const [key, file, required, max] of [
    ['banner', v.bannerFile, true, 5], ['backgroundImage', v.backgroundFile, true, 5], ['icon', v.iconFile, false, 2],
  ] as const) {
    if (!file && required) errors[2][key] = 'این تصویر الزامی است.'
    else if (file && (!['image/png', 'image/jpeg'].includes(file.type) || file.size <= 0 || file.size > max * 1024 * 1024)) errors[2][key] = `تصویر PNG یا JPEG غیرخالی با حجم حداکثر ${max} مگابایت انتخاب کنید.`
  }
  if (v.screenshotFiles.length > 10 || v.screenshotFiles.some(file => !['image/png', 'image/jpeg'].includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024)) errors[2].screenshots = 'حداکثر ۱۰ تصویر PNG یا JPEG غیرخالی، هرکدام تا ۵ مگابایت، مجاز است.'
  if (v.hasInAppPayment === null) errors[3].hasInAppPayment = 'وضعیت پرداخت درون‌برنامه‌ای را مشخص کنید.'
  if (v.hasInAppPayment && (!['implemented', 'commitment'].includes(v.paymentChoice || '') || !v.paymentCommitmentAccepted)) errors[3].paymentCommitmentAccepted = 'یکی از دو وضعیت پیاده‌سازی نت‌باکس پیمنت را انتخاب کنید.'
  if (v.developedForAndroidTv === null) errors[3].isAndroidTv = 'وضعیت سازگاری با Android TV را مشخص کنید.'
  if (v.developedForAndroidTv === false && !v.airMouseCompatible) errors[3].isAirMouseCompatible = 'سازگاری کامل با ماوس یا ایرماوس را تأیید کنید.'
  errors[4] = contactFieldErrors(v.website, v.supportEmail)
  return errors
}
