import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '../components/layout/AdminSidebar'
import { AdminTopbar } from '../components/layout/AdminTopbar'

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-surface-muted print:bg-white">
      <div className="print:hidden">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
