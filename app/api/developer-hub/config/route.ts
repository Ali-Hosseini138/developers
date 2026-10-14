import { NextResponse } from 'next/server'

type CategoryOption = { id: number; name: string }

export async function GET() {
  let categories: CategoryOption[] = []

  try {
    const raw = process.env.DEVELOPER_HUB_CATEGORIES_JSON || ''
    const parsed = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) {
      categories = parsed
        .map((item) => ({
          id: Number(item?.id),
          name: String(item?.name || '').trim(),
        }))
        .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.name)
    }
  } catch {
    categories = []
  }

  return NextResponse.json({ categories })
}
