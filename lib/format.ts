const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export function toFa(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
}

export function formatDownloads(n: number): string {
  if (n >= 1000000) return toFa((n / 1000000).toFixed(1)) + 'م'
  if (n >= 1000) return toFa(Math.round(n / 1000)) + 'هزار'
  return toFa(n)
}

export function formatPrice(price: number): string {
  if (price === 0) return 'رایگان'
  return toFa(price.toLocaleString('en-US')) + ' تومان'
}
