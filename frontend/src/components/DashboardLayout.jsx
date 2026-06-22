import { useAuth } from "../contexts/AuthContext";

export default function DashboardLayout({ children }) {
  const { user } = useAuth();

  return (
    <div style={s.layout}>
      {user && (
        <div style={s.topBar}>
          <div style={s.userBadge}>
            <span style={s.userDot} />
            {user.email}
          </div>
        </div>
      )}
      <div style={s.content}>{children}</div>
    </div>
  );
}

const s = {
  layout: {
    minHeight: "100vh",
    background: "var(--bg)",
  },
  topBar: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "12px 32px",
  },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "var(--success)",
    padding: "6px 14px",
    borderRadius: 20,
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.2)",
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--success)",
  },
  content: {
    padding: "24px 32px 48px",
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
};
