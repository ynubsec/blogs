"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(from);
      router.refresh();
    } else {
      let message = "Invalid password. Access denied.";
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch {
        // keep the default message
      }
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrap" suppressHydrationWarning>
      <div className="admin-login-card" suppressHydrationWarning>
        <div className="admin-login-logo">
          <div className="admin-login-icon">⚡</div>
          <h1>Admin Panel</h1>
          <p>Secure access required to continue</p>
        </div>
        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="form-field">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              required
            />
          </div>
          {error && <div className="admin-error">⚠ {error}</div>}
          <button type="submit" className="admin-login-submit" disabled={loading}>
            {loading ? "Authenticating..." : "Access Dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="admin-login-wrap"><div className="admin-login-card"><p style={{color:"#64748b",textAlign:"center"}}>Loading...</p></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
