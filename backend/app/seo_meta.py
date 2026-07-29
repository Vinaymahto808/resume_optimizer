SITE_NAME = "ProfileOptimizer"
DEFAULT_OG_IMAGE = "/og-image.png"
DEFAULT_DESCRIPTION = "Scan your resume against 27 ATS checkpoints. Get a detailed score, keyword analysis, and actionable suggestions to beat applicant tracking systems."

PAGE_META = {
    "/": {
        "title": "ATS Resume Checker — Free Resume Score & Analysis | ProfileOptimizer",
        "description": DEFAULT_DESCRIPTION,
        "canonical": "https://profileoptimizer.com/",
    },
    "/login": {
        "title": "Log In — ProfileOptimizer",
        "description": "Sign in to your ProfileOptimizer account to access your resume scans, AI analysis, and career tools.",
        "canonical": "https://profileoptimizer.com/login",
    },
    "/signup": {
        "title": "Create a Free Account — ProfileOptimizer",
        "description": "Sign up for free to scan your resume, get AI-powered suggestions, and unlock career opportunities.",
        "canonical": "https://profileoptimizer.com/signup",
    },
    "/forgot-password": {
        "title": "Reset Password — ProfileOptimizer",
        "description": "Reset your ProfileOptimizer account password.",
        "canonical": "https://profileoptimizer.com/forgot-password",
    },
    "/reset-password": {
        "title": "Set New Password — ProfileOptimizer",
        "description": "Set a new password for your ProfileOptimizer account.",
        "canonical": "https://profileoptimizer.com/reset-password",
    },
    "/pricing": {
        "title": "Pricing Plans — ProfileOptimizer",
        "description": "Choose the perfect plan for your job search. Free, Pro, and Enterprise plans with unlimited scans, AI analysis, and more.",
        "canonical": "https://profileoptimizer.com/pricing",
    },
    "/templates": {
        "title": "ATS-Friendly Resume Templates — ProfileOptimizer",
        "description": "Browse 100+ ATS-optimized resume templates. Built for modern job seekers who want to pass applicant tracking systems.",
        "canonical": "https://profileoptimizer.com/templates",
    },
    "/about": {
        "title": "About Us — ProfileOptimizer",
        "description": "ProfileOptimizer helps job seekers optimize their resumes for ATS. 50K+ resumes scanned, 19 checkpoints, 9 job portals.",
        "canonical": "https://profileoptimizer.com/about",
    },
    "/privacy": {
        "title": "Privacy Policy — ProfileOptimizer",
        "description": "ProfileOptimizer privacy policy. Learn how we collect, use, and protect your personal data.",
        "canonical": "https://profileoptimizer.com/privacy",
    },
    "/terms": {
        "title": "Terms of Service — ProfileOptimizer",
        "description": "ProfileOptimizer terms of service. Read the rules and guidelines for using our platform.",
        "canonical": "https://profileoptimizer.com/terms",
    },
    "/dashboard": {
        "title": "Dashboard — ProfileOptimizer",
        "description": "View your scanned resumes, ATS scores, and subscription details on your ProfileOptimizer dashboard.",
        "canonical": "https://profileoptimizer.com/dashboard",
    },
    "/scan": {
        "title": "Resume Scanner — ProfileOptimizer",
        "description": "Upload your resume to get an ATS compatibility score, detailed breakdown, and browse ATS-optimized templates.",
        "canonical": "https://profileoptimizer.com/scan",
    },
    "/results": {
        "title": "Resume Analysis Results — ProfileOptimizer",
        "description": "View your ATS resume score, keyword analysis, skill breakdown, and actionable suggestions to improve your resume.",
        "canonical": "https://profileoptimizer.com/results",
    },
    "/profile-analyzer": {
        "title": "LinkedIn Profile Analyzer — ProfileOptimizer",
        "description": "Paste your LinkedIn profile or resume text to get actionable suggestions, keyword analysis, and optimized content.",
        "canonical": "https://profileoptimizer.com/profile-analyzer",
    },
    "/job-recommender": {
        "title": "Job Recommendations — ProfileOptimizer",
        "description": "Find your next role with AI-powered job matching. Paste your resume to see matched roles from 25+ job portals.",
        "canonical": "https://profileoptimizer.com/job-recommender",
    },
    "/ai-analysis": {
        "title": "AI Deep Analysis — ProfileOptimizer",
        "description": "Get an expert-level AI critique of your resume or LinkedIn profile using Google Gemini.",
        "canonical": "https://profileoptimizer.com/ai-analysis",
    },
    "/career-roadmap": {
        "title": "Career Roadmap Generator — ProfileOptimizer",
        "description": "Get a personalized career roadmap with skills, projects, certifications, and interview prep tailored to your target role.",
        "canonical": "https://profileoptimizer.com/career-roadmap",
    },
    "/portfolio-generator": {
        "title": "Portfolio Website Generator — ProfileOptimizer",
        "description": "Generate a complete, ready-to-use portfolio HTML page with Tailwind CSS from your resume content.",
        "canonical": "https://profileoptimizer.com/portfolio-generator",
    },
    "/dashboard-analytics": {
        "title": "Profile Analytics Dashboard — ProfileOptimizer",
        "description": "Analyze your profile strength, prioritize improvements, and benchmark against industry standards.",
        "canonical": "https://profileoptimizer.com/dashboard-analytics",
    },
    "/student-resume": {
        "title": "Student Resume Builder — ProfileOptimizer",
        "description": "Create ATS-optimized resumes for college admissions, internships, scholarships, and first jobs.",
        "canonical": "https://profileoptimizer.com/student-resume",
    },
    "/account": {
        "title": "Account Settings — ProfileOptimizer",
        "description": "Manage your ProfileOptimizer account profile, security, and account preferences.",
        "canonical": "https://profileoptimizer.com/account",
    },
    "/latex-builder": {
        "title": "LaTeX Resume Builder — ProfileOptimizer",
        "description": "Build and customize ATS-optimized LaTeX resumes with real-time preview and multiple templates.",
        "canonical": "https://profileoptimizer.com/latex-builder",
    },
    "/auto-apply": {
        "title": "Auto Apply — ProfileOptimizer",
        "description": "Automate your job applications with AI-powered resume tailoring and one-click applications.",
        "canonical": "https://profileoptimizer.com/auto-apply",
    },
    "/automation": {
        "title": "Automation Hub — ProfileOptimizer",
        "description": "Manage LLM, job applications, browser automation, credentials, and analytics in one place.",
        "canonical": "https://profileoptimizer.com/automation",
    },
}


def get_meta_for_path(path: str) -> dict:
    path = path.rstrip("/") or "/"
    exact = PAGE_META.get(path)
    if exact:
        return exact
    if path.startswith("/results/"):
        return PAGE_META["/results"]
    if path.startswith("/latex-builder/"):
        return PAGE_META["/latex-builder"]
    return PAGE_META["/"]
