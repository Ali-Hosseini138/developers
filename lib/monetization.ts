export type BannerSlot = {
  id: string
  title: string
  description: string
  monthlyPriceToman: number | null
}

export const INSTALL_CAMPAIGN_CONFIG = {
  pricePerInstallToman: null as number | null,
  minInstalls: 100,
  maxInstalls: 100000,
  step: 100,
}

export const BANNER_SLOTS: BannerSlot[] = [
  {
    id: 'home-hero',
    title: 'بنر اصلی صفحه خانه',
    description: 'جایگاه اصلی تبلیغاتی در صفحه خانه نت‌استور',
    monthlyPriceToman: null,
  },
  {
    id: 'apps-top',
    title: 'بنر بالای صفحه اپ‌ها',
    description: 'نمایش بنر در بالای صفحه فهرست اپلیکیشن‌ها',
    monthlyPriceToman: null,
  },
  {
    id: 'search-top',
    title: 'بنر بالای صفحه جستجو',
    description: 'نمایش بنر در بالای نتایج جستجو',
    monthlyPriceToman: null,
  },
]
