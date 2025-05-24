import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { Suspense, lazy, useLayoutEffect } from "react";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";
import { loadUser } from "./redux/actions/userAction.js";
import { Toaster } from "react-hot-toast";
import { loadAdmin } from "./redux/actions/adminAction.js";
import "./App.css";
import ModernLoader from "./utils/util.jsx";
import { useAppDispatch, useAppSelector } from "./redux/hooks/index.js";
import OfficeEntryPage from "./pages/office/OfficeEntryPage.jsx";
import NotFound from "./pages/NotFound.jsx";

const EntryPage = lazy(() => import("./pages/EntryPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
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

const App = () => {
  const dispatch = useAppDispatch();
  const { isAdminAuthenticated } = useAppSelector((state) => state.admin);
  const { isAuthenticated } = useAppSelector((state) => state.user);

  useLayoutEffect(() => {
    if (!isAuthenticated && !isAdminAuthenticated) {
      dispatch(loadUser());
      dispatch(loadAdmin());
    } else if (isAuthenticated && !isAdminAuthenticated) {
      dispatch(loadUser());
    } else if (isAdminAuthenticated && !isAuthenticated) {
      dispatch(loadAdmin());
    }
  }, [dispatch, isAdminAuthenticated, isAuthenticated]);

  return (
    <Router>
      <Suspense fallback={<ModernLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Navbar />
                <Home />
              </>
            }
          />
          <Route
            path="/hotel"
            element={
              <ProtectedRoute>
                <Navbar />
                <EntryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant"
            element={
              <ProtectedRoute>
                <Navbar />
                <RestEntryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/office"
            element={
              <ProtectedRoute>
                <Navbar />
                <OfficeEntryPage />
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
            path="/dashboard/*"
            element={
              <ProtectedAdminRoute>
                <Navbar />
                <DashboardPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <>
                <Navbar />
                <SignupPage />
              </>
            }
          />
          <Route
            path="/login"
            element={
              <>
                <Navbar />
                <LoginPage />
              </>
            }
          />
          <Route
            path="/reset-password"
            element={
              <>
                <Navbar />
                <UserResetPasswordPage />
              </>
            }
          />
          {/* Admin */}
          <Route
            path="/admin-login"
            element={
              <>
                <Navbar />
                <AdminLoginPage />
              </>
            }
          />
          <Route
            path="/admin-signup"
            element={
              <>
                <Navbar />
                <AdminSignupPage />
              </>
            }
          />
          <Route
            path="/admin-reset-password"
            element={
              <>
                <Navbar />
                <AdminResetPasswordPage />
              </>
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
