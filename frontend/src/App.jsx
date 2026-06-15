import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import Results from "./pages/Results";
import Pricing from "./pages/Pricing";
import Templates from "./pages/Templates";
import ProfileAnalyzer from "./pages/ProfileAnalyzer";
import JobRecommender from "./pages/JobRecommender";
import AIAnalysis from "./pages/AIAnalysis";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/profile-analyzer" element={<ProfileAnalyzer />} />
          <Route path="/job-recommender" element={<JobRecommender />} />
          <Route path="/ai-analysis" element={<AIAnalysis />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
