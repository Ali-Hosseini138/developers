export type BannerPlacement = {
  id: string
  title: string
  description: string
  surfaces: string[]
  contactPhone: string
}

export const INSTALL_CAMPAIGN_CONFIG = {
  pricePerInstallToman: 40000,
  minInstalls: 100,
  maxInstalls: 100000,
  step: 100,
}

export const BANNER_PLACEMENT: BannerPlacement = {
  id: 'netbox-featured-row',
  title: 'ردیف بنر ویژه نت‌استور',
  description: 'یک جایگاه بنری مشترک که در سه سطح اصلی نت‌باکس و نت‌استور نمایش داده می‌شود.',
  surfaces: [
    'لانچر نت‌باکس — تب برنامه‌ها',
    'نت‌استور نت‌باکس — ردیف اول',
    'نت‌استور پابلیک — ردیف اول',
  ],
  contactPhone: '09338548315',
}
