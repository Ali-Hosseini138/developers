import type { User } from '@/lib/types'

export function mapDeveloperProfile(row: Record<string, any>): User {
  return {
    id: String(row.id), email: row.email,
    name: [row.firstName, row.lastName].filter(Boolean).join(' ') || row.companyName || row.email,
    accountType: row.accountType, firstName: row.firstName || '', lastName: row.lastName || '',
    phone: row.mobile || '', nationalId: row.identityNumber || '', organization: row.companyName || '',
    termsAcceptedAt: row.termsAcceptedAt || undefined,
  }
}
