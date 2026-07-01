import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PlanProvider } from "./contexts/PlanContext";
import { ResumeProvider } from "./contexts/ResumeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import DashboardLayout from "./components/DashboardLayout";
import GTMProvider from "./components/GTMProvider";
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
import JobRecommender from "./pages/JobRecommender";
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

function PublicLayout() {
  return (
    <>
      <Navbar />
      <main className="app-main"><Outlet /></main>
      <Footer />
    </>
  );
}

function AuthPage({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlanProvider>
        <GTMProvider>
        <ResumeProvider>
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
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
            </Route>
            {/* Authenticated pages with Sidebar */}
            <Route path="/dashboard" element={<AuthPage><Dashboard /></AuthPage>} />
            <Route path="/scan" element={<AuthPage><Scan /></AuthPage>} />
            <Route path="/results/:id" element={<AuthPage><Results /></AuthPage>} />
            <Route path="/profile-analyzer" element={<AuthPage><ProfileAnalyzer /></AuthPage>} />
            <Route path="/job-recommender" element={<AuthPage><JobRecommender /></AuthPage>} />
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
  );
}
