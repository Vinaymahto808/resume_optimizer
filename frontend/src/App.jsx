import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import { PlanProvider } from "./contexts/PlanContext";
import { ResumeProvider } from "./contexts/ResumeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import DashboardLayout from "./components/DashboardLayout";
import GTMProvider from "./components/GTMProvider";
import ScrollManager from "./components/ScrollManager";
import UpgradeModal from "./components/career/UpgradeModal";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import Results from "./pages/Results";
import Pricing from "./pages/Pricing";
import Templates from "./pages/Templates";
import ProfileAnalyzer from "./pages/ProfileAnalyzer";
import AIAnalysis from "./pages/AIAnalysis";
import CareerRoadmap from "./pages/CareerRoadmap";
import PortfolioGenerator from "./pages/PortfolioGenerator";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import StudentResume from "./pages/StudentResume";
import LatexBuilder from "./pages/LatexBuilder";
import Account from "./pages/Account";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Jobs from "./pages/Jobs";
import ResumeEditor from "./pages/ResumeEditor";
import Tracker from "./pages/Tracker";
import Agent from "./pages/Agent";
import Orion from "./pages/Orion";
import Recruiter from "./pages/Recruiter";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Feature, { FeaturesIndex } from "./pages/Feature";

function PublicLayout() {
  return (
    <>
      <Navbar />
      <main className="app-main"><Outlet /></main>
      <Footer />
    </>
  );
}

/** Old URLs kept working: forward to the page that replaced them (query string preserved). */
function Redirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

function AuthPage({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <PlanProvider>
        <GTMProvider>
        <ResumeProvider>
          <UpgradeModal />
          <ScrollManager />
          <Routes>
            {/* Public pages with Navbar */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/about" element={<About />} />
              <Route path="/features" element={<FeaturesIndex />} />
              <Route path="/features/:slug" element={<Feature />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
            </Route>
            {/* Authenticated pages with Sidebar */}
            <Route path="/dashboard" element={<AuthPage><Dashboard /></AuthPage>} />
            <Route path="/scan" element={<AuthPage><Scan /></AuthPage>} />
            <Route path="/results/:id" element={<AuthPage><Results /></AuthPage>} />
            <Route path="/profile-analyzer" element={<AuthPage><ProfileAnalyzer /></AuthPage>} />
            <Route path="/jobs" element={<AuthPage><Jobs /></AuthPage>} />
            <Route path="/resume-editor" element={<AuthPage><ResumeEditor /></AuthPage>} />
            <Route path="/tracker" element={<AuthPage><Tracker /></AuthPage>} />
            <Route path="/agent" element={<AuthPage><Agent /></AuthPage>} />
            <Route path="/coach" element={<AuthPage><Orion /></AuthPage>} />
            <Route path="/orion" element={<Redirect to="/coach" />} />
            <Route path="/recruiter" element={<AuthPage><Recruiter /></AuthPage>} />
            {/* Admin console: its own password sign-in, separate from user accounts */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/payments" element={<Redirect to="/admin" />} />
            {/* Replaced pages */}
            <Route path="/job-recommender" element={<Redirect to="/jobs" />} />
            <Route path="/auto-apply" element={<Redirect to="/agent" />} />
            <Route path="/automation" element={<Redirect to="/agent" />} />
            <Route path="/ai-analysis" element={<AuthPage><AIAnalysis /></AuthPage>} />
            <Route path="/career-roadmap" element={<AuthPage><CareerRoadmap /></AuthPage>} />
            <Route path="/portfolio-generator" element={<AuthPage><PortfolioGenerator /></AuthPage>} />
            <Route path="/dashboard-analytics" element={<AuthPage><DashboardAnalytics /></AuthPage>} />
            <Route path="/student-resume" element={<AuthPage><StudentResume /></AuthPage>} />
            <Route path="/account" element={<AuthPage><Account /></AuthPage>} />
            <Route path="/latex-builder/:id" element={<AuthPage><LatexBuilder /></AuthPage>} />
          </Routes>
        </ResumeProvider>
        </GTMProvider>
        </PlanProvider>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
