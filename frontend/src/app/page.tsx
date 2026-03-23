"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
    walletAddress: "",
  });
  const [error, setError] = useState("");

  const { user, login, register, loadFromStorage, isLoading } = useAuthStore();
  const router = useRouter();

  // Load saved session
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(user.role === "ADMIN" ? "/admin/dashboard" : "/student/scan");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          walletAddress: form.walletAddress || undefined,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{ maxWidth: "460px", width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📍</div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 900,
              background: "linear-gradient(135deg, #6c63ff, #00d4aa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "8px",
            }}
          >
            Proof of Presence
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Decentralized attendance — QR + GPS + Blockchain
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card" style={{ padding: "36px" }}>
          {/* Tab Toggle */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              marginBottom: "28px",
              background: "rgba(10, 10, 15, 0.4)",
              borderRadius: "10px",
              padding: "4px",
            }}
          >
            <button
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                background: isLogin
                  ? "linear-gradient(135deg, #6c63ff, #00d4aa)"
                  : "transparent",
                color: isLogin ? "white" : "var(--text-muted)",
                transition: "all 0.3s ease",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                background: !isLogin
                  ? "linear-gradient(135deg, #6c63ff, #00d4aa)"
                  : "transparent",
                color: !isLogin ? "white" : "var(--text-muted)",
                transition: "all 0.3s ease",
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(255, 107, 107, 0.1)",
                border: "1px solid rgba(255, 107, 107, 0.3)",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "20px",
                color: "#ff6b6b",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={{ marginBottom: "18px" }}>
                <label className="input-label">Full Name</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required={!isLogin}
                />
              </div>
            )}

            <div style={{ marginBottom: "18px" }}>
              <label className="input-label">Email Address</label>
              <input
                className="input-field"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                required
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label className="input-label">Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
                minLength={6}
              />
            </div>

            {!isLogin && (
              <>
                <div style={{ marginBottom: "18px" }}>
                  <label className="input-label">Role</label>
                  <select
                    className="input-field"
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value })
                    }
                  >
                    <option value="STUDENT">Student</option>
                    <option value="ADMIN">Admin / Instructor</option>
                  </select>
                </div>

                <div style={{ marginBottom: "18px" }}>
                  <label className="input-label">
                    Wallet Address{" "}
                    <span style={{ color: "var(--text-muted)" }}>
                      (optional, for NFTs)
                    </span>
                  </label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="0x..."
                    value={form.walletAddress}
                    onChange={(e) =>
                      setForm({ ...form, walletAddress: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                marginTop: "8px",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span className="spinner" style={{ width: "18px", height: "18px", borderWidth: "2px" }} />
                  Processing...
                </span>
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
          }}
        >
          🔒 Secured with HMAC-SHA256 • GPS Geofencing • Blockchain Proof
        </p>
      </div>
    </div>
  );
}
