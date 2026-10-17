import { NextResponse } from 'next/server'

// Retired file URLs must not reconnect to the old storage or expose private data.
export async function GET() {
  return NextResponse.json({ detail: 'فایل یافت نشد.' }, { status: 404 })
}
