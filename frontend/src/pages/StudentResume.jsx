import { useState } from "react";
import { templates } from "../api";

const GOALS = [
  { id: "college", label: "College Admissions", icon: "🎓", desc: "Showcase academics, test scores & activities" },
  { id: "internship", label: "Internship", icon: "💼", desc: "Highlight skills, projects & relevant coursework" },
  { id: "first-job", label: "First Job", icon: "🚀", desc: "Emphasize experience, skills & education" },
  { id: "part-time", label: "Part-time Work", icon: "⚡", desc: "Focus on availability, reliability & people skills" },
  { id: "scholarship", label: "Scholarship Application", icon: "🏆", desc: "Spotlight awards, GPA & leadership" },
  { id: "leadership", label: "Extracurricular Leadership", icon: "🌟", desc: "Showcase clubs, sports & community impact" },
];

const SKILL_PRESETS = {
  "Technology": ["Python", "Java", "JavaScript", "HTML/CSS", "React", "SQL", "Git", "Excel", "Canva", "Photoshop", "Video Editing", "MS Office", "Google Suite", "Data Analysis", "Scratch"],
  "Languages": ["English", "Spanish", "French", "Mandarin", "Hindi", "Arabic", "German", "Japanese", "Korean", "Portuguese"],
  "Leadership": ["Team Leadership", "Public Speaking", "Event Planning", "Mentoring", "Fundraising", "Conflict Resolution", "Decision Making", "Project Management", "Volunteer Coordination"],
  "Arts & Creative": ["Creative Writing", "Graphic Design", "Photography", "Music", "Drawing/Painting", "Theater/Drama", "Debate", "Yearbook", "Journalism"],
  "Athletics": ["Soccer", "Basketball", "Swimming", "Track & Field", "Tennis", "Volleyball", "Baseball/Softball", "Dance", "Martial Arts", "Yoga"],
  "Academic": ["Research", "Lab Techniques", "Math Competitions", "Science Fair", "Robotics", "Debate", "Model UN", "National Honor Society", "Tutoring", "Critical Thinking"],
};

const STEPS = ["Goal", "Education", "Experience", "Skills", "Preview"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function StudentResume() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageFit, setPageFit] = useState({ score: 100, warnings: [] });
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    goal: "college",
    summary: "",
    education: [{ school: "", degree: "", field: "", gpa: "", grad_year: "", start_year: "", coursework: [], awards: [], activities: [] }],
    experience: [{ role: "", organization: "", location: "", start_date: "", end_date: "", bullets: [""] }],
    projects: [{ name: "", description: "", technologies: [], url: "" }],
    skills: [],
    extracurriculars: [{ name: "", role: "", start_date: "", end_date: "", description: "" }],
    awards: [],
    languages: [],
    interests: [],
  });
  const [skillSearch, setSkillSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Technology");

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const updateEducation = (idx, field, value) => {
    const edu = [...form.education];
    edu[idx] = { ...edu[idx], [field]: value };
    setField("education", edu);
  };

  const addEducation = () => {
    setField("education", [...form.education, { school: "", degree: "", field: "", gpa: "", grad_year: "", start_year: "", coursework: [], awards: [], activities: [] }]);
  };

  const removeEducation = (idx) => {
    if (form.education.length > 1) setField("education", form.education.filter((_, i) => i !== idx));
  };

  const updateExperience = (idx, field, value) => {
    const exp = [...form.experience];
    exp[idx] = { ...exp[idx], [field]: value };
    setField("experience", exp);
  };

  const updateBullet = (expIdx, bullIdx, value) => {
    const exp = [...form.experience];
    exp[expIdx].bullets[bullIdx] = value;
    setField("experience", exp);
  };

  const addBullet = (expIdx) => {
    const exp = [...form.experience];
    exp[expIdx].bullets.push("");
    setField("experience", exp);
  };

  const removeBullet = (expIdx, bullIdx) => {
    const exp = [...form.experience];
    if (exp[expIdx].bullets.length > 1) {
      exp[expIdx].bullets = exp[expIdx].bullets.filter((_, i) => i !== bullIdx);
      setField("experience", exp);
    }
  };

  const addExperience = () => {
    setField("experience", [...form.experience, { role: "", organization: "", location: "", start_date: "", end_date: "", bullets: [""] }]);
  };

  const removeExperience = (idx) => {
    if (form.experience.length > 1) setField("experience", form.experience.filter((_, i) => i !== idx));
  };

  const updateProject = (idx, field, value) => {
    const proj = [...form.projects];
    proj[idx] = { ...proj[idx], [field]: value };
    setField("projects", proj);
  };

  const addProject = () => {
    setField("projects", [...form.projects, { name: "", description: "", technologies: [], url: "" }]);
  };

  const removeProject = (idx) => {
    if (form.projects.length > 1) setField("projects", form.projects.filter((_, i) => i !== idx));
  };

  const updateExtra = (idx, field, value) => {
    const extra = [...form.extracurriculars];
    extra[idx] = { ...extra[idx], [field]: value };
    setField("extracurriculars", extra);
  };

  const addExtra = () => {
    setField("extracurriculars", [...form.extracurriculars, { name: "", role: "", start_date: "", end_date: "", description: "" }]);
  };

  const removeExtra = (idx) => {
    if (form.extracurriculars.length > 1) setField("extracurriculars", form.extracurriculars.filter((_, i) => i !== idx));
  };

  const toggleSkill = (skill) => {
    const current = form.skills;
    if (current.includes(skill)) {
      setField("skills", current.filter(s => s !== skill));
    } else if (current.length < 20) {
      setField("skills", [...current, skill]);
    }
  };

  const addAward = () => {
    setField("awards", [...form.awards, ""]);
  };

  const updateAward = (idx, value) => {
    const awards = [...form.awards];
    awards[idx] = value;
    setField("awards", awards);
  };

  const removeAward = (idx) => {
    setField("awards", form.awards.filter((_, i) => i !== idx));
  };

  const runPageFitCheck = () => {
    const warnings = [];
    let totalItems = 0;
    const hasEdu = form.education.some(e => e.school);
    const hasExp = form.experience.some(e => e.organization);
    const hasProj = form.projects.some(p => p.name);
    const hasExtra = form.extracurriculars.some(e => e.name);
    const skillCount = form.skills.length + form.languages.length;

    if (hasEdu) totalItems += form.education.filter(e => e.school).length;
    if (hasExp) totalItems += form.experience.filter(e => e.organization).length * 2;
    if (hasProj) totalItems += form.projects.filter(p => p.name).length;
    if (hasExtra) totalItems += form.extracurriculars.filter(e => e.name).length;
    if (skillCount > 15) totalItems += 2;
    if (form.awards.length > 3) totalItems += 1;
    if (form.interests.length > 5) totalItems += 1;

    if (totalItems > 10) warnings.push("Your resume may exceed one page. Consider trimming less relevant entries.");
    if (form.education.length > 2) warnings.push("List only your most recent school(s) to save space.");
    if (form.experience.some(e => e.bullets.length > 4)) warnings.push("Keep bullet points to 3-4 per role for one-page fit.");
    if (skillCount > 20) warnings.push("Limit skills to 15-20 for best readability.");
    if (!form.full_name) warnings.push("Add your full name at the top.");
    if (!form.summary) warnings.push("Adding a brief goal/summary helps employers understand you quickly.");

    const score = Math.max(0, 100 - warnings.length * 8 - (totalItems > 12 ? 15 : 0));
    setPageFit({ score, warnings });
  };

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        skills: form.skills,
        languages: form.languages,
        interests: form.interests,
        awards: form.awards.filter(a => a.trim()),
        education: form.education.map(e => ({
          ...e,
          coursework: e.coursework.filter(c => c.trim()),
          awards: e.awards.filter(a => a.trim()),
          activities: e.activities.filter(a => a.trim()),
        })),
        experience: form.experience.map(e => ({
          ...e,
          bullets: e.bullets.filter(b => b.trim()),
        })),
        projects: form.projects.map(p => ({
          ...p,
          technologies: p.technologies.filter(t => t.trim()),
        })),
        extracurriculars: form.extracurriculars.filter(e => e.name.trim()),
      };

      const response = await templates.studentPdf(payload);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${form.full_name.replace(/\s+/g, "_")}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = Object.entries(SKILL_PRESETS).reduce((acc, [cat, skills]) => {
    const filtered = skills.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()));
    if (filtered.length) acc[cat] = filtered;
    return acc;
  }, {});

  const now = new Date();
  const currentYear = now.getFullYear();

  return (
    <div className="student-resume-page">
      <style>{`
        .student-resume-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .sr-header { text-align: center; margin-bottom: 32px; }
        .sr-header h1 { font-size: 28px; font-weight: 800; margin: 0 0 8px; background: linear-gradient(135deg, #10b981, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sr-header p { color: #64748b; font-size: 14px; margin: 0; }

        .sr-steps { display: flex; justify-content: center; gap: 4px; margin-bottom: 32px; }
        .sr-step { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; color: #94a3b8; background: transparent; border: none; cursor: pointer; transition: all .2s; }
        .sr-step:hover { background: #f1f5f9; }
        .sr-step.active { background: #10b981; color: #fff; }
        .sr-step .num { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; background: currentColor; color: #fff; opacity: .5; }
        .sr-step.active .num { opacity: 1; background: #fff; color: #10b981; }
        .sr-step.completed .num { opacity: 1; }
        .sr-step-connector { width: 24px; height: 2px; background: #e2e8f0; align-self: center; }
        .sr-step-connector.completed { background: #10b981; }

        .sr-content { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        .sr-content.single { grid-template-columns: 1fr; max-width: 720px; margin: 0 auto; }

        .sr-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

        .sr-card-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; color: #0f172a; }
        .sr-card-sub { font-size: 13px; color: #64748b; margin: 0 0 20px; }

        .goal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .goal-card { border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px; cursor: pointer; transition: all .2s; background: #fafbfc; }
        .goal-card:hover { border-color: #10b981; background: #f0fdf4; }
        .goal-card.selected { border-color: #10b981; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
        .goal-card .icon { font-size: 28px; margin-bottom: 8px; }
        .goal-card .label { font-size: 14px; font-weight: 600; color: #0f172a; }
        .goal-card .desc { font-size: 12px; color: #64748b; margin-top: 4px; }

        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px; }
        .form-group .hint { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .sr-input, .sr-textarea, .sr-select { width: 100%; padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #0f172a; outline: none; transition: border-color .2s; box-sizing: border-box; background: #fff; font-family: inherit; }
        .sr-input:focus, .sr-textarea:focus, .sr-select:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
        .sr-textarea { resize: vertical; min-height: 70px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .entry-card { background: #f8fafc; border-radius: 10px; padding: 16px; margin-bottom: 12px; border: 1px solid #f1f5f9; position: relative; }
        .entry-card .remove-btn { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; border: none; background: #fee2e2; color: #dc2626; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .entry-card .entry-title { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 12px; }
        .add-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: transparent; border: 1.5px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-size: 12px; font-weight: 500; cursor: pointer; transition: all .2s; width: 100%; justify-content: center; }
        .add-btn:hover { border-color: #10b981; color: #10b981; background: #f0fdf4; }

        .bullet-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
        .bullet-row .bullet-input { flex: 1; padding: 8px 10px; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: 12px; outline: none; }
        .bullet-row .bullet-input:focus { border-color: #10b981; }
        .bullet-row .remove-bullet { width: 22px; height: 22px; border-radius: 50%; border: none; background: transparent; color: #94a3b8; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .bullet-row .remove-bullet:hover { color: #dc2626; }

        .skill-search { margin-bottom: 16px; }
        .skill-categories { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .skill-cat-btn { padding: 4px 12px; border-radius: 20px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 12px; color: #475569; cursor: pointer; transition: all .2s; font-weight: 500; }
        .skill-cat-btn:hover { border-color: #10b981; color: #10b981; }
        .skill-cat-btn.active { background: #10b981; border-color: #10b981; color: #fff; }
        .skill-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
        .skill-tag { padding: 6px 14px; border-radius: 20px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 500; color: #334155; cursor: pointer; transition: all .2s; user-select: none; }
        .skill-tag:hover { border-color: #10b981; background: #f0fdf4; }
        .skill-tag.selected { background: #10b981; border-color: #10b981; color: #fff; }
        .skill-tag.selected::after { content: " ✓"; }
        .selected-skills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 8px; min-height: 40px; border: 1px solid #d1fae5; }
        .selected-skills .skill-tag { background: #10b981; border-color: #10b981; color: #fff; padding-right: 8px; }
        .selected-skills .skill-tag .remove-x { margin-left: 4px; cursor: pointer; opacity: .7; }
        .selected-skills .skill-tag .remove-x:hover { opacity: 1; }
        .selected-skills-empty { font-size: 12px; color: #94a3b8; }

        .award-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
        .award-row input { flex: 1; }
        .award-row button { width: 24px; height: 24px; border-radius: 50%; border: none; background: #fee2e2; color: #dc2626; cursor: pointer; flex-shrink: 0; }

        .preview-section { }
        .preview-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .preview-header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
        .preview-header h2 { color: #fff; font-size: 18px; font-weight: 700; margin: 0; }
        .preview-header .goal-badge { background: #10b981; color: #fff; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .preview-body { padding: 20px; font-size: 13px; color: #334155; min-height: 400px; }
        .preview-body .p-name { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
        .preview-body .p-contact { font-size: 11px; color: #64748b; margin-bottom: 12px; }
        .preview-body .p-section { margin-bottom: 14px; }
        .preview-body .p-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1.5px solid #10b98133; }
        .preview-body .p-edu { background: #f8fafc; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; border-left: 3px solid #10b981; display: flex; justify-content: space-between; }
        .preview-body .p-edu .name { font-weight: 600; font-size: 13px; }
        .preview-body .p-edu .detail { font-size: 11px; color: #475569; }
        .preview-body .p-edu .gpa { font-weight: 700; color: #10b981; }
        .preview-body .p-edu .year { font-size: 11px; color: #94a3b8; }
        .preview-body .p-exp { margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
        .preview-body .p-exp .title { font-weight: 600; font-size: 13px; }
        .preview-body .p-exp .org { color: #10b981; font-size: 12px; }
        .preview-body .p-exp .date { font-size: 11px; color: #94a3b8; }
        .preview-body .p-exp ul { margin: 4px 0 0 16px; padding: 0; }
        .preview-body .p-exp ul li { font-size: 11px; color: #475569; }
        .preview-body .p-skills { display: flex; flex-wrap: wrap; gap: 4px; }
        .preview-body .p-skills span { background: #f1f5f9; padding: 2px 10px; border-radius: 4px; font-size: 11px; color: #334155; }
        .preview-body .p-skills span.lang { background: #10b981; color: #fff; }
        .preview-body .p-award { display: inline-block; background: #fef9c3; color: #92400e; padding: 1px 8px; border-radius: 3px; font-size: 11px; font-weight: 500; margin: 1px 2px; }

        .fit-meter { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .fit-score { font-size: 24px; font-weight: 800; }
        .fit-score.good { color: #10b981; }
        .fit-score.ok { color: #f59e0b; }
        .fit-score.bad { color: #ef4444; }
        .fit-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
        .fit-bar-fill { height: 100%; border-radius: 3px; transition: all .5s; }
        .fit-warnings { font-size: 12px; color: #64748b; }
        .fit-warnings li { margin-bottom: 2px; }

        .nav-btns { display: flex; justify-content: space-between; margin-top: 20px; gap: 12px; }
        .btn-secondary { padding: 10px 24px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: #fff; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; }
        .btn-secondary:hover { border-color: #cbd5e1; background: #f8fafc; }
        .btn-primary { padding: 10px 24px; border: none; border-radius: 8px; background: linear-gradient(135deg, #10b981, #34d399); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-download { padding: 12px 32px; border: none; border-radius: 10px; background: linear-gradient(135deg, #10b981, #34d399); color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 8px; margin: 0 auto; }
        .btn-download:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.35); }
        .btn-download:disabled { opacity: .6; cursor: not-allowed; transform: none; box-shadow: none; }
        .error-msg { padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 13px; margin-bottom: 12px; }

        .preview-right { position: sticky; top: 24px; }
        .preview-right .preview-card { max-height: 90vh; overflow-y: auto; }
      `}</style>

      <div className="sr-header">
        <h1>Student Resume Builder</h1>
        <p>Build a standout resume tailored for your next step — college, internships, jobs, and more.</p>
      </div>

      <div className="sr-steps">
        {STEPS.map((label, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div className={`sr-step-connector ${step >= i ? 'completed' : ''}`} />}
            <button
              className={`sr-step ${step === i ? 'active' : ''} ${step > i ? 'completed' : ''}`}
              onClick={() => setStep(i)}
            >
              <span className="num">{i + 1}</span>
              {label}
            </button>
          </span>
        ))}
      </div>

      <div className={`sr-content ${step !== 4 ? 'single' : ''}`}>
        {/* Step 0: Goal */}
        {step === 0 && (
          <div className="sr-card">
            <h2 className="sr-card-title">What's your goal?</h2>
            <p className="sr-card-sub">Pick the purpose of your resume — we'll tailor the sections and tips.</p>
            <div className="goal-grid">
              {GOALS.map(g => (
                <div
                  key={g.id}
                  className={`goal-card ${form.goal === g.id ? 'selected' : ''}`}
                  onClick={() => setField("goal", g.id)}
                >
                  <div className="icon">{g.icon}</div>
                  <div className="label">{g.label}</div>
                  <div className="desc">{g.desc}</div>
                </div>
              ))}
            </div>
            <div className="form-group" style={{ marginTop: 20 }}>
              <label>Full Name</label>
              <input className="sr-input" value={form.full_name} onChange={e => setField("full_name", e.target.value)} placeholder="e.g. Alex Rivera" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input className="sr-input" type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="alex@email.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="sr-input" value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <input className="sr-input" value={form.location} onChange={e => setField("location", e.target.value)} placeholder="City, State" />
              </div>
              <div className="form-group">
                <label>LinkedIn (optional)</label>
                <input className="sr-input" value={form.linkedin} onChange={e => setField("linkedin", e.target.value)} placeholder="linkedin.com/in/alex" />
              </div>
            </div>
            <div className="form-group">
              <label>Summary / Objective</label>
              <textarea className="sr-textarea" rows={3} value={form.summary} onChange={e => setField("summary", e.target.value)} placeholder={`Tell colleges/employers who you are and what you're looking for...`} />
              <div className="hint">A 1-3 sentence overview of your goals and strengths.</div>
            </div>
            <div className="nav-btns">
              <div />
              <button className="btn-primary" onClick={() => setStep(1)}>Next: Education →</button>
            </div>
          </div>
        )}

        {/* Step 1: Education */}
        {step === 1 && (
          <div className="sr-card">
            <h2 className="sr-card-title">Education</h2>
            <p className="sr-card-sub">Your school(s) go first — this is the most important section for students.</p>
            {form.education.map((edu, i) => (
              <div key={i} className="entry-card">
                {form.education.length > 1 && (
                  <button className="remove-btn" onClick={() => removeEducation(i)}>×</button>
                )}
                <div className="entry-title">{i === 0 ? 'Current / Most Recent School' : `Additional School ${i + 1}`}</div>
                <div className="form-group">
                  <label>School Name</label>
                  <input className="sr-input" value={edu.school} onChange={e => updateEducation(i, "school", e.target.value)} placeholder="e.g. Lincoln High School" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Degree / Diploma</label>
                    <input className="sr-input" value={edu.degree} onChange={e => updateEducation(i, "degree", e.target.value)} placeholder="e.g. High School Diploma" />
                  </div>
                  <div className="form-group">
                    <label>Field of Study</label>
                    <input className="sr-input" value={edu.field} onChange={e => updateEducation(i, "field", e.target.value)} placeholder="e.g. STEM, Arts" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>GPA (optional)</label>
                    <input className="sr-input" value={edu.gpa} onChange={e => updateEducation(i, "gpa", e.target.value)} placeholder="e.g. 3.8 / 4.0" />
                  </div>
                  <div className="form-group">
                    <label>Graduation Year</label>
                    <select className="sr-select" value={edu.grad_year} onChange={e => updateEducation(i, "grad_year", e.target.value)}>
                      <option value="">Select year</option>
                      {Array.from({ length: 8 }, (_, i) => currentYear + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Year</label>
                    <select className="sr-select" value={edu.start_year} onChange={e => updateEducation(i, "start_year", e.target.value)}>
                      <option value="">Select year</option>
                      {Array.from({ length: 8 }, (_, i) => currentYear - 4 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Relevant Coursework (comma-separated)</label>
                  <input className="sr-input" value={edu.coursework.join(", ")} onChange={e => updateEducation(i, "coursework", e.target.value.split(",").map(s => s.trim()))} placeholder="e.g. AP Biology, Calculus, English Literature" />
                </div>
                <div className="form-group">
                  <label>Awards / Honors (comma-separated)</label>
                  <input className="sr-input" value={edu.awards.join(", ")} onChange={e => updateEducation(i, "awards", e.target.value.split(",").map(s => s.trim()))} placeholder="e.g. Honor Roll, National Merit Scholar" />
                </div>
                <div className="form-group">
                  <label>Activities / Clubs (comma-separated)</label>
                  <input className="sr-input" value={edu.activities.join(", ")} onChange={e => updateEducation(i, "activities", e.target.value.split(",").map(s => s.trim()))} placeholder="e.g. Student Council, Science Club" />
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={addEducation}>+ Add Previous School</button>
            <div className="nav-btns">
              <button className="btn-secondary" onClick={() => setStep(0)}>← Back</button>
              <button className="btn-primary" onClick={() => setStep(2)}>Next: Experience →</button>
            </div>
          </div>
        )}

        {/* Step 2: Experience & Projects */}
        {step === 2 && (
          <div className="sr-card">
            <h2 className="sr-card-title">Experience & Projects</h2>
            <p className="sr-card-sub">Jobs, internships, volunteering, or personal projects — show what you've done.</p>

            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '16px 0 8px' }}>Work & Internships</h3>
            {form.experience.map((exp, i) => (
              <div key={i} className="entry-card">
                {form.experience.length > 1 && (
                  <button className="remove-btn" onClick={() => removeExperience(i)}>×</button>
                )}
                <div className="entry-title">Experience {i + 1}</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Role / Title</label>
                    <input className="sr-input" value={exp.role} onChange={e => updateExperience(i, "role", e.target.value)} placeholder="e.g. Summer Intern, Barista" />
                  </div>
                  <div className="form-group">
                    <label>Organization</label>
                    <input className="sr-input" value={exp.organization} onChange={e => updateExperience(i, "organization", e.target.value)} placeholder="Company or org name" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Location</label>
                    <input className="sr-input" value={exp.location} onChange={e => updateExperience(i, "location", e.target.value)} placeholder="City, State" />
                  </div>
                  <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div className="form-group">
                      <label>Start</label>
                      <input className="sr-input" value={exp.start_date} onChange={e => updateExperience(i, "start_date", e.target.value)} placeholder="e.g. Jun 2024" />
                    </div>
                    <div className="form-group">
                      <label>End</label>
                      <input className="sr-input" value={exp.end_date} onChange={e => updateExperience(i, "end_date", e.target.value)} placeholder="e.g. Aug 2024" />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Bullet Points</label>
                  {exp.bullets.map((b, bi) => (
                    <div key={bi} className="bullet-row">
                      <span style={{ color: '#10b981', fontSize: 10 }}>▸</span>
                      <input className="bullet-input" value={b} onChange={e => updateBullet(i, bi, e.target.value)} placeholder="Describe what you did, accomplished, or learned..." />
                      {exp.bullets.length > 1 && (
                        <button className="remove-bullet" onClick={() => removeBullet(i, bi)}>×</button>
                      )}
                    </div>
                  ))}
                  <button className="add-btn" style={{ marginTop: 4 }} onClick={() => addBullet(i)}>+ Add bullet point</button>
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={addExperience}>+ Add Another Experience</button>

            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '20px 0 8px' }}>Projects</h3>
            {form.projects.map((proj, i) => (
              <div key={i} className="entry-card">
                {form.projects.length > 1 && (
                  <button className="remove-btn" onClick={() => removeProject(i)}>×</button>
                )}
                <div className="entry-title">Project {i + 1}</div>
                <div className="form-group">
                  <label>Project Name</label>
                  <input className="sr-input" value={proj.name} onChange={e => updateProject(i, "name", e.target.value)} placeholder="e.g. Science Fair: Water Filtration" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="sr-textarea" rows={2} value={proj.description} onChange={e => updateProject(i, "description", e.target.value)} placeholder="What did you build or research?" />
                </div>
                <div className="form-group">
                  <label>Technologies Used (comma-separated)</label>
                  <input className="sr-input" value={proj.technologies.join(", ")} onChange={e => updateProject(i, "technologies", e.target.value.split(",").map(s => s.trim()))} placeholder="e.g. Python, Arduino, 3D Printing" />
                </div>
                <div className="form-group">
                  <label>URL (optional)</label>
                  <input className="sr-input" value={proj.url} onChange={e => updateProject(i, "url", e.target.value)} placeholder="e.g. github.com/alex/project" />
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={addProject}>+ Add Another Project</button>

            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '20px 0 8px' }}>Extracurriculars</h3>
            {form.extracurriculars.map((extra, i) => (
              <div key={i} className="entry-card">
                {form.extracurriculars.length > 1 && (
                  <button className="remove-btn" onClick={() => removeExtra(i)}>×</button>
                )}
                <div className="entry-title">Activity {i + 1}</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Activity/Club Name</label>
                    <input className="sr-input" value={extra.name} onChange={e => updateExtra(i, "name", e.target.value)} placeholder="e.g. Debate Club" />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <input className="sr-input" value={extra.role} onChange={e => updateExtra(i, "role", e.target.value)} placeholder="e.g. President, Member" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input className="sr-input" value={extra.start_date} onChange={e => updateExtra(i, "start_date", e.target.value)} placeholder="e.g. Sep 2023" />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input className="sr-input" value={extra.end_date} onChange={e => updateExtra(i, "end_date", e.target.value)} placeholder="e.g. Present" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <input className="sr-input" value={extra.description} onChange={e => updateExtra(i, "description", e.target.value)} placeholder="Briefly describe your involvement" />
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={addExtra}>+ Add Another Activity</button>

            <div className="nav-btns">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" onClick={() => setStep(3)}>Next: Skills →</button>
            </div>
          </div>
        )}

        {/* Step 3: Skills & Awards */}
        {step === 3 && (
          <div className="sr-card">
            <h2 className="sr-card-title">Skills, Awards & Interests</h2>
            <p className="sr-card-sub">Showcase what you're good at and what makes you stand out.</p>

            <div className="form-group">
              <label>Search Skills</label>
              <input className="sr-input skill-search" value={skillSearch} onChange={e => setSkillSearch(e.target.value)} placeholder="Search for skills..." />
            </div>
            <div className="skill-categories">
              {Object.keys(SKILL_PRESETS).map(cat => (
                <button key={cat} className={`skill-cat-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="skill-cloud">
              {(filteredSkills[activeCategory] || SKILL_PRESETS[activeCategory] || []).map(skill => (
                <span
                  key={skill}
                  className={`skill-tag ${form.skills.includes(skill) ? 'selected' : ''}`}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="selected-skills">
              {form.skills.length > 0 ? form.skills.map(s => (
                <span key={s} className="skill-tag">
                  {s}
                  <span className="remove-x" onClick={() => toggleSkill(s)}>×</span>
                </span>
              )) : <span className="selected-skills-empty">Click skills above to add them here (max 20)</span>}
            </div>
            <div className="hint" style={{ marginTop: 4 }}>{form.skills.length}/20 skills selected</div>

            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '20px 0 8px' }}>Languages</h3>
            <div className="skill-cloud" style={{ marginBottom: 16 }}>
              {["English","Spanish","French","Mandarin","Hindi","Arabic","German","Japanese","Korean","Portuguese"].map(lang => (
                <span
                  key={lang}
                  className={`skill-tag ${form.languages.includes(lang) ? 'selected' : ''}`}
                  onClick={() => {
                    const current = form.languages;
                    if (current.includes(lang)) {
                      setField("languages", current.filter(l => l !== lang));
                    } else {
                      setField("languages", [...current, lang]);
                    }
                  }}
                >
                  {lang}
                </span>
              ))}
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '16px 0 8px' }}>Awards & Honors</h3>
            {form.awards.map((award, i) => (
              <div key={i} className="award-row">
                <input className="sr-input" value={award} onChange={e => updateAward(i, e.target.value)} placeholder="e.g. AP Scholar Award, 1st Place Science Fair" />
                <button onClick={() => removeAward(i)}>×</button>
              </div>
            ))}
            <button className="add-btn" onClick={addAward}>+ Add Award</button>

            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '16px 0 8px' }}>Interests</h3>
            <div className="skill-cloud" style={{ marginBottom: 16 }}>
              {["Reading","Travel","Photography","Gaming","Cooking","Sports","Music","Art","Volunteering","Coding","Chess","Hiking","Fashion","Film","Gardening","Yoga"].map(interest => (
                <span
                  key={interest}
                  className={`skill-tag ${form.interests.includes(interest) ? 'selected' : ''}`}
                  onClick={() => {
                    const current = form.interests;
                    if (current.includes(interest)) {
                      setField("interests", current.filter(i => i !== interest));
                    } else if (current.length < 8) {
                      setField("interests", [...current, interest]);
                    }
                  }}
                >
                  {interest}
                </span>
              ))}
            </div>

            <div className="nav-btns">
              <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary" onClick={() => { runPageFitCheck(); setStep(4); }}>Next: Preview →</button>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Download */}
        {step === 4 && (
          <>
            <div className="sr-card">
              <h2 className="sr-card-title">Preview & Download</h2>
              <p className="sr-card-sub">Review your resume and check the one-page fit score before downloading.</p>

              <div className="fit-meter">
                <div className={`fit-score ${pageFit.score >= 80 ? 'good' : pageFit.score >= 50 ? 'ok' : 'bad'}`}>
                  {pageFit.score}%
                </div>
                <div style={{ flex: 1 }}>
                  <div className="fit-bar">
                    <div className="fit-bar-fill" style={{ width: `${pageFit.score}%`, background: pageFit.score >= 80 ? '#10b981' : pageFit.score >= 50 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {pageFit.score >= 80 ? 'Great fit for one page!' : pageFit.score >= 50 ? 'Might be tight — consider trimming.' : 'Likely exceeds one page.'}
                  </div>
                </div>
                <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={runPageFitCheck}>Recalculate</button>
              </div>

              {pageFit.warnings.length > 0 && (
                <ul className="fit-warnings">
                  {pageFit.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
                </ul>
              )}

              {error && <div className="error-msg">{error}</div>}

              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '16px 0 8px' }}>Preview</h3>
              <div className="preview-card">
                <div className="preview-header">
                  <h2>{form.full_name || "Your Name"}</h2>
                  {form.goal && <span className="goal-badge">{GOALS.find(g => g.id === form.goal)?.label}</span>}
                </div>
                <div className="preview-body">
                  <div className="p-name">{form.full_name || "Your Name"}</div>
                  <div className="p-contact">
                    {[form.email, form.phone, form.location, form.linkedin].filter(Boolean).join("  •  ") || "Add your contact info"}
                  </div>

                  {form.summary && (
                    <div className="p-section">
                      <div className="p-section-title">About Me</div>
                      <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, margin: 0 }}>{form.summary}</p>
                    </div>
                  )}

                  {form.education.some(e => e.school) && (
                    <div className="p-section">
                      <div className="p-section-title">Education</div>
                      {form.education.filter(e => e.school).map((edu, i) => (
                        <div key={i} className="p-edu">
                          <div>
                            <div className="name">{edu.school}</div>
                            <div className="detail">{edu.field && `${edu.field} — `}{edu.coursework.slice(0, 4).join(", ")}</div>
                            {edu.awards.length > 0 && <div style={{ marginTop: 4 }}>
                              {edu.awards.slice(0, 3).map((a, ai) => <span key={ai} className="p-award">★ {a}</span>)}
                            </div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {edu.gpa && <div className="gpa">{edu.gpa}</div>}
                            <div className="year">{edu.grad_year || edu.start_year}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.experience.some(e => e.organization) && (
                    <div className="p-section">
                      <div className="p-section-title">Experience</div>
                      {form.experience.filter(e => e.organization).map((exp, i) => (
                        <div key={i} className="p-exp">
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div><span className="title">{exp.role}</span>{exp.organization && <span className="org"> at {exp.organization}</span>}</div>
                            <div className="date">{exp.start_date}{exp.end_date && ` — ${exp.end_date}`}</div>
                          </div>
                          {exp.bullets.filter(b => b).length > 0 && (
                            <ul>{exp.bullets.filter(b => b).map((b, bi) => <li key={bi}>{b}</li>)}</ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {form.projects.some(p => p.name) && (
                    <div className="p-section">
                      <div className="p-section-title">Projects</div>
                      {form.projects.filter(p => p.name).map((proj, i) => (
                        <div key={i} style={{ marginBottom: 6, padding: 6, background: '#f8fafc', borderRadius: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{proj.name}</div>
                          {proj.description && <div style={{ fontSize: 11, color: '#475569' }}>{proj.description}</div>}
                          {proj.technologies.length > 0 && (
                            <div className="p-skills" style={{ marginTop: 4 }}>
                              {proj.technologies.map((t, ti) => <span key={ti}>{t}</span>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {form.skills.length > 0 && (
                    <div className="p-section">
                      <div className="p-section-title">Skills</div>
                      <div className="p-skills">
                        {form.skills.map((s, i) => <span key={i}>{s}</span>)}
                        {form.languages.map((l, i) => <span key={`l${i}`} className="lang">{l}</span>)}
                      </div>
                    </div>
                  )}

                  {form.extracurriculars.some(e => e.name) && (
                    <div className="p-section">
                      <div className="p-section-title">Extracurriculars</div>
                      {form.extracurriculars.filter(e => e.name).map((ex, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
                          <span style={{ fontWeight: 600 }}>{ex.name}</span>
                          {ex.role && <span style={{ color: '#64748b' }}>{ex.role}</span>}
                          <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 11 }}>{ex.start_date}{ex.end_date && ` — ${ex.end_date}`}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.awards.filter(a => a.trim()).length > 0 && (
                    <div className="p-section">
                      <div className="p-section-title">Awards</div>
                      <div>
                        {form.awards.filter(a => a.trim()).map((a, i) => (
                          <span key={i} className="p-award">★ {a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.interests.length > 0 && (
                    <div className="p-section">
                      <div className="p-section-title">Interests</div>
                      <div className="p-skills">
                        {form.interests.map((i, idx) => <span key={idx} style={{ borderRadius: 12 }}>{i}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="nav-btns" style={{ marginTop: 16 }}>
                <button className="btn-secondary" onClick={() => setStep(3)}>← Back</button>
                <button className="btn-download" onClick={handleDownload} disabled={loading}>
                  {loading ? "Generating PDF..." : "⬇ Download PDF"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
