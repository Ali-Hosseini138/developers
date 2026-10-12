import type { ReactNode } from 'react'
import { DeveloperSidebar } from '@/components/developer-sidebar'

export default function IntegrationsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DeveloperSidebar />
      <div className="lg:pr-32">
        {children}
      </div>
    </>
  )
}
