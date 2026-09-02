import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { ToastProvider } from '../components/ui/Toast'
import { AdminLayout } from '../layouts/AdminLayout'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { DashboardPage } from '../pages/DashboardPage'
import { SetupPage } from '../pages/SetupPage'
import { NoAccessPage } from '../pages/NoAccessPage'
import { FirstAccessPage } from '../pages/FirstAccessPage'
import { SchoolsPage } from '../pages/schools/SchoolsPage'
import { SchoolFormPage } from '../pages/schools/SchoolFormPage'
import { SchoolDetailPage } from '../pages/schools/SchoolDetailPage'
import { UsersPage } from '../pages/users/UsersPage'
import { UserFormPage } from '../pages/users/UserFormPage'
import { UserDetailPage } from '../pages/users/UserDetailPage'
import { GuardiansPage } from '../pages/guardians/GuardiansPage'
import { GuardianFormPage } from '../pages/guardians/GuardianFormPage'
import { GuardianDetailPage } from '../pages/guardians/GuardianDetailPage'
import { GuardianHomePage } from '../pages/GuardianHomePage'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
            <Route path="/primeiro-acesso" element={<FirstAccessPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/sem-acesso" element={<NoAccessPage />} />

              <Route path="/app" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="responsavel" element={<GuardianHomePage />} />

                <Route path="escolas" element={<SchoolsPage />} />
                <Route path="escolas/nova" element={<SchoolFormPage />} />
                <Route path="escolas/:id" element={<SchoolDetailPage />} />
                <Route path="escolas/:id/editar" element={<SchoolFormPage />} />

                <Route path="usuarios" element={<UsersPage />} />
                <Route path="usuarios/novo" element={<UserFormPage />} />
                <Route path="usuarios/:id" element={<UserDetailPage />} />
                <Route path="usuarios/:id/editar" element={<UserFormPage />} />

                <Route path="responsaveis" element={<GuardiansPage />} />
                <Route path="responsaveis/novo" element={<GuardianFormPage />} />
                <Route path="responsaveis/:id" element={<GuardianDetailPage />} />
                <Route path="responsaveis/:id/editar" element={<GuardianFormPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
