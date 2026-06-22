import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import LoginCallback from './pages/LoginCallback';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import DoseHistory from './pages/patient/DoseHistory';
import AIPredictions from './pages/patient/AIPredictions';
import MedicinesPage from './pages/patient/MedicinesPage';
import OnboardingPage from './pages/patient/OnboardingPage';
import EscalationLogs from './pages/patient/EscalationLogs';
import PatientSettings from './pages/patient/PatientSettings';
import WhatsAppLog from './pages/patient/WhatsAppLog';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminEscalations from './pages/admin/AdminEscalations';
import AdminPatientProfile from './pages/admin/AdminPatientProfile';
import AdminWhatsAppLog from './pages/admin/AdminWhatsAppLog';

// Caretaker Pages
import CaretakerDashboard from './pages/caretaker/CaretakerDashboard';
import CaretakerPatients from './pages/caretaker/CaretakerPatients';
import CaretakerEscalations from './pages/caretaker/CaretakerEscalations';
import CaretakerPatientProfile from './pages/caretaker/CaretakerPatientProfile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginCallback />} />

          {/* Onboarding */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute role="patient">
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Patient Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="patient">
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/history"
            element={
              <ProtectedRoute role="patient">
                <DoseHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/predictions"
            element={
              <ProtectedRoute role="patient">
                <AIPredictions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/medicines"
            element={
              <ProtectedRoute role="patient">
                <MedicinesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/whatsapp"
            element={
              <ProtectedRoute role="patient">
                <WhatsAppLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/escalations"
            element={
              <ProtectedRoute role="patient">
                <EscalationLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute role="patient">
                <PatientSettings />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <AdminUserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/escalations"
            element={
              <ProtectedRoute role="admin">
                <AdminEscalations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/whatsapp"
            element={
              <ProtectedRoute role="admin">
                <AdminWhatsAppLog />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/patient/:patientId"
            element={
              <ProtectedRoute role="admin">
                <AdminPatientProfile />
              </ProtectedRoute>
            }
          />

          {/* Caretaker Routes */}
          <Route
            path="/caretaker"
            element={
              <ProtectedRoute role="caretaker">
                <CaretakerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/patients"
            element={
              <ProtectedRoute role="caretaker">
                <CaretakerPatients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/escalations"
            element={
              <ProtectedRoute role="caretaker">
                <CaretakerEscalations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/patient/:patientId"
            element={
              <ProtectedRoute role="caretaker">
                <CaretakerPatientProfile />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
