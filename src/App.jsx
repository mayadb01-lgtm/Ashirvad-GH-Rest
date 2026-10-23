import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import DashLockGate from "./components/DashLockGate.jsx";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";
import { HomeGate, LegacyGate } from "./routes/StaffGate.jsx";
import { loadUser } from "./redux/actions/userAction.js";
import { Toaster } from "react-hot-toast";
import { loadAdmin } from "./redux/actions/adminAction.js";
import "./App.css";
import ModernLoader from "./utils/util.jsx";
import { useAppDispatch, useAppSelector } from "./redux/hooks/index.js";
import NotFound from "./pages/NotFound.jsx";
import SecretGate from "./components/SecretGate.jsx";

const EntryPage = lazy(() => import("./pages/EntryPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const RasoiPage = lazy(() => import("./pages/RasoiPage"));
const JobApplyPage = lazy(() => import("./pages/JobApplyPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage.jsx"));
const AdminSignupPage = lazy(() => import("./pages/AdminSignupPage.jsx"));
const AdminResetPasswordPage = lazy(
  () => import("./pages/AdminResetPasswordPage.jsx")
);
const UserResetPasswordPage = lazy(
  () => import("./pages/UserResetPasswordPage.jsx")
);
const Home = lazy(() => import("./pages/Home.jsx"));
const RestEntryPage = lazy(
  () => import("./pages/restaurant/RestEntryPage.jsx")
);
const OfficeEntryPage = lazy(
  () => import("./pages/office/OfficeEntryPage.jsx")
);
const QuickEntryPage = lazy(() => import("./pages/quick/QuickEntryPage.jsx"));
const MyReportsPage = lazy(() => import("./pages/quick/MyReportsPage.jsx"));
const InvoicePage = lazy(() => import("./pages/invoice/InvoicePage.jsx"));
const StaffSalaryEntryPage = lazy(
  () => import("./pages/staffSalary/StaffSalaryEntryPage.jsx")
);

const App = () => {
  const dispatch = useAppDispatch();
  const { admin } = useAppSelector((state) => state.admin);
  const { user } = useAppSelector((state) => state.user);
  const isSuperUserOrAdmin = admin?.isSuperAdmin || admin?.viewOnly === true || user?.isSuperUser || false;

  useEffect(() => {
    dispatch(loadUser());
    dispatch(loadAdmin());
  }, [dispatch]);

  return (
    <Router>
      <Suspense fallback={<ModernLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <HomeGate>
                <Navbar />
                <Home />
              </HomeGate>
            }
          />
          {/* Nayi PC + mobile entry (staff ya admin, login khud check karta hai) */}
          <Route path="/entry" element={<QuickEntryPage />} />
          <Route path="/my-reports" element={<MyReportsPage />} />
          {/* Manager (kitchen board): sirf jise access hai — server khud check karta hai */}
          <Route path="/manager" element={<RasoiPage />} />
          <Route path="/rasoi" element={<Navigate to="/manager" replace />} />
          {/* Staff bharti: khula form (bina login) */}
          <Route path="/apply" element={<JobApplyPage />} />
          {/* Invoice dekho / PDF (login API khud check karta hai) */}
          <Route path="/invoice/:id" element={<InvoicePage />} />
          <Route
            path="/hotel"
            element={
              <ProtectedRoute>
                <LegacyGate>
                  <Navbar />
                  <EntryPage />
                </LegacyGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant"
            element={
              <ProtectedRoute>
                <LegacyGate>
                  <Navbar />
                  <RestEntryPage />
                </LegacyGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/office"
            element={
              <ProtectedRoute>
                <LegacyGate>
                  <Navbar />
                  <OfficeEntryPage />
                </LegacyGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-salary"
            element={
              <ProtectedRoute>
                <LegacyGate>
                  <Navbar />
                  <StaffSalaryEntryPage />
                </LegacyGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/hotel"
            element={
              <ProtectedAdminRoute>
                <Navbar />
                <EntryPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/restaurant"
            element={
              <ProtectedAdminRoute>
                <Navbar />
                <RestEntryPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/office"
            element={
              <ProtectedAdminRoute>
                <Navbar />
                <OfficeEntryPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/staff-salary"
            element={
              <ProtectedAdminRoute>
                <Navbar />
                <StaffSalaryEntryPage />
              </ProtectedAdminRoute>
            }
          />
          {isSuperUserOrAdmin && (
            <Route
              path="/dashboard/*"
              element={
                <ProtectedAdminRoute>
                  <DashLockGate>
                    <DashboardPage />
                  </DashLockGate>
                </ProtectedAdminRoute>
              }
            />
          )}
          <Route
            path="/signup"
            element={
              <SecretGate>
                <SignupPage />
              </SecretGate>
            }
          />
          <Route
            path="/login"
            element={
              <SecretGate>
                <LoginPage />
              </SecretGate>
            }
          />
          <Route
            path="/reset-password"
            element={
              <SecretGate>
                <UserResetPasswordPage />
              </SecretGate>
            }
          />
          {/* Admin */}
          <Route
            path="/admin-login"
            element={
              <SecretGate>
                <AdminLoginPage />
              </SecretGate>
            }
          />
          <Route
            path="/admin-signup"
            element={
              <SecretGate>
                <AdminSignupPage />
              </SecretGate>
            }
          />
          <Route
            path="/admin-reset-password"
            element={
              <SecretGate>
                <AdminResetPasswordPage />
              </SecretGate>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Navbar />
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {/* If None of the above */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" reverseOrder={true} />
    </Router>
  );
};

export default App;
