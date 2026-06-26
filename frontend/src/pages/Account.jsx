import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../api";

export default function Account() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.full_name || "");
  const [nameMsg, setNameMsg] = useState(null);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleNameSave = async (e) => {
    e.preventDefault();
    setNameMsg(null);
    if (!name.trim()) { setNameMsg({ type: "error", text: "Name cannot be empty" }); return; }
    setSaving(true);
    try {
      const updated = await auth.updateProfile({ full_name: name.trim() });
      localStorage.setItem("user", JSON.stringify({ ...user, ...updated }));
      setNameMsg({ type: "success", text: "Name updated successfully" });
    } catch (err) {
      setNameMsg({ type: "error", text: err.response?.data?.detail || "Failed to update name" });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (pwForm.newPw.length < 12) {
      setPwMsg({ type: "error", text: "Password must be at least 12 characters" });
      return;
    }
    setSaving(true);
    try {
      await auth.changePassword({ current_password: pwForm.current, new_password: pwForm.newPw });
      setPwMsg({ type: "success", text: "Password changed successfully" });
      setPwForm({ current: "", newPw: "", confirm: "" });
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.detail || "Failed to change password" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.wrap}>
      <h1 style={s.heading}>Account Settings</h1>
      <p style={s.sub}>Manage your profile, security, and account preferences.</p>

      <div style={s.grid}>
        {/* Profile info */}
        <form onSubmit={handleNameSave} style={s.card}>
          <h2 style={s.cardTitle}>Profile</h2>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={{ ...s.input, opacity: 0.6 }} value={user?.email || ""} disabled />
          </div>
          <div style={s.field}>
            <label style={s.label}>Full name</label>
            <input
              style={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {nameMsg && (
            <p style={{ ...s.msg, color: nameMsg.type === "success" ? "var(--success)" : "var(--danger)" }}>
              {nameMsg.text}
            </p>
          )}
          <button type="submit" style={s.btn} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>

        {/* Security */}
        <form onSubmit={handlePasswordChange} style={s.card}>
          <h2 style={s.cardTitle}>Security</h2>
          <div style={s.field}>
            <label style={s.label}>Current password</label>
            <input
              style={s.input}
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>New password</label>
            <input
              style={s.input}
              type="password"
              value={pwForm.newPw}
              onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
              required
              minLength={12}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirm new password</label>
            <input
              style={s.input}
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              required
            />
          </div>
          {pwMsg && (
            <p style={{ ...s.msg, color: pwMsg.type === "success" ? "var(--success)" : "var(--danger)" }}>
              {pwMsg.text}
            </p>
          )}
          <button type="submit" style={s.btn} disabled={saving}>
            {saving ? "Saving…" : "Change Password"}
          </button>
        </form>

        {/* Danger zone */}
        <div style={s.cardDanger}>
          <h2 style={s.cardTitle}>Danger Zone</h2>
          <p style={s.dangerText}>
            Once you sign out, you'll need to log in again to access your scans and data.
          </p>
          <button onClick={() => { logout(); }} style={s.dangerBtn}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    maxWidth: 800, margin: "0 auto",
  },
  heading: {
    fontSize: 28, fontWeight: 800, marginBottom: 4,
    fontFamily: "var(--font-display)", color: "var(--text)",
  },
  sub: {
    fontSize: 14, color: "var(--text-secondary)", marginBottom: 32,
  },
  grid: {
    display: "flex", flexDirection: "column", gap: 24,
  },
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 16, padding: 28,
  },
  cardDanger: {
    background: "var(--bg-card)", border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 16, padding: 28,
  },
  cardTitle: {
    fontSize: 18, fontWeight: 700, color: "var(--text)",
    marginBottom: 20, fontFamily: "var(--font-display)",
  },
  field: { marginBottom: 16 },
  label: {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "var(--text-secondary)", marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "0.04em",
  },
  input: {
    width: "100%", padding: "10px 14px", fontSize: 14,
    background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: 10, color: "var(--text)", outline: "none",
    boxSizing: "border-box",
  },
  btn: {
    marginTop: 4, padding: "10px 24px",
    background: "var(--accent)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer",
  },
  msg: { fontSize: 13, marginBottom: 8 },
  dangerText: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 },
  dangerBtn: {
    padding: "10px 24px",
    background: "rgba(239,68,68,0.12)", color: "var(--danger)",
    border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
};
