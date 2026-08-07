"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "../AdminSidebar";
import { useAdminToast } from "@/lib/adminToast";

interface Subscriber {
  id: string;
  email: string;
  status: string;
  subscribed_at: string;
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { addToast } = useAdminToast();

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscribers");
      if (res.ok) setSubscribers(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSendEmail = async () => {
    if (!subject || !message) {
      addToast("error", "Please provide both a subject and a message.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", data.message || "Email sent successfully!");
        setSubject("");
        setMessage("");
      } else {
        addToast("error", data.error || "Failed to send email.");
      }
    } catch {
      addToast("error", "Network error while sending.");
    }
    setSending(false);
  };

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  const handleSendTest = async () => {
    if (!subject || !message) {
      addToast("error", "Please provide both a subject and a message.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, test: true }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", data.message || "Test email sent!");
      } else {
        addToast("error", data.error || "Failed to send test email.");
      }
    } catch {
      addToast("error", "Network error while sending.");
    }
    setSending(false);
  };

  const handleUnsubscribe = async (email: string) => {
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", `Unsubscribed ${email}`);
        fetchSubscribers();
      } else {
        addToast("error", data.error || "Failed to unsubscribe.");
      }
    } catch {
      addToast("error", "Network error.");
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Delete ${email} permanently?`)) return;
    try {
      const res = await fetch(`/api/admin/subscribers?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", `Deleted ${email}`);
        fetchSubscribers();
      } else {
        addToast("error", data.error || "Failed to delete.");
      }
    } catch {
      addToast("error", "Network error.");
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Subscribers & Mailing</h1>
            <p className="admin-page-subtitle">
              Manage your newsletter subscribers and send them updates.
            </p>
          </div>
        </div>

        <div className="form-row">
          <div className="admin-card">
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Mailing List</h3>
            <p className="text-muted text-small" style={{ marginBottom: "16px" }}>
              {loading ? "Loading..." : `${activeCount} active subscribers`}
            </p>
            <div className="table-responsive" style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                        No subscribers yet.
                      </td>
                    </tr>
                  )}
                  {subscribers.map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{sub.email}</td>
                      <td>
                        <span className={`badge ${sub.status === "active" ? "badge-published" : "badge-draft"}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="text-muted text-small">
                        {new Date(sub.subscribed_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {sub.status === "active" ? (
                            <button
                              className="btn btn-ghost"
                              onClick={() => handleUnsubscribe(sub.email)}
                              style={{ fontSize: "12px", padding: "4px 8px" }}
                            >
                              Unsubscribe
                            </button>
                          ) : (
                            <span className="badge badge-draft">unsubscribed</span>
                          )}
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleDelete(sub.email)}
                            style={{ fontSize: "12px", padding: "4px 8px", color: "#ff5f57" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card">
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Send Email Broadcast</h3>
            <p className="text-muted text-small" style={{ marginBottom: "16px" }}>
              Draft an email to all active subscribers.
            </p>

            <div className="admin-form">
              <div className="form-field">
                <label className="form-label">Subject</label>
                <input
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. New Blog Post Published!"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Message (HTML supported)</label>
                <textarea
                  className="form-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="<p>Hello world!</p>"
                  rows={10}
                  style={{ fontFamily: "monospace" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  className="btn btn-ghost"
                  onClick={handleSendTest}
                  disabled={sending}
                >
                  {sending ? "Sending..." : "📤 Send Test Email"}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendEmail}
                  disabled={sending || activeCount === 0}
                >
                  {sending ? "Sending..." : `Send to ${activeCount} subscribers`}
                </button>
              </div>
              <p className="text-muted text-small" style={{ marginTop: "10px" }}>
                Test sends a preview to your sender address (configured under Settings → Email) so you can
                verify the template and API key before a real broadcast.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
