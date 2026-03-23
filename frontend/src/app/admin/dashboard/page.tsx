"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";
import { getSocket } from "@/lib/socket";
import api from "@/lib/api";

interface Session {
  id: string;
  name: string;
  active: boolean;
  startTime: string;
  locationLat: number;
  locationLng: number;
}

interface Stats {
  totalStudents: number;
  presentStudents: number;
  percentage: number;
}

interface AttendanceEntry {
  id: string;
  timestamp: string;
  student: { id: string; name: string; email: string };
  status: string;
}

export default function AdminDashboard() {
  const { user, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [qrData, setQrData] = useState<{ dataUrl: string; expiresAt: number } | null>(null);
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, presentStudents: 0, percentage: 0 });
  const [feed, setFeed] = useState<AttendanceEntry[]>([]);
  const [timer, setTimer] = useState(20);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({ name: "", locationLat: "", locationLng: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.push("/student/scan");
  }, [user, router]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get("/sessions");
      setSessions(res.data);
      const active = res.data.find((s: Session) => s.active);
      if (active) setActiveSession(active);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Socket.IO for live updates
  useEffect(() => {
    if (!activeSession) return;

    const socket = getSocket();
    socket.emit("session:join", activeSession.id);

    // QR auto-refresh
    socket.emit("qr:start", activeSession.id);

    socket.on("qr:refreshed", (data) => {
      setQrData(data);
      setTimer(20);
    });

    socket.on("attendance:marked", (data) => {
      setFeed((prev) => [data.attendance, ...prev].slice(0, 50));
      setStats(data.stats);
    });

    // Fetch initial stats
    api.get(`/attendance/stats/${activeSession.id}`).then((res) => {
      setStats(res.data);
    });

    // Fetch existing attendance
    api.get(`/attendance/session/${activeSession.id}`).then((res) => {
      setFeed(res.data.records || []);
    });

    return () => {
      socket.emit("qr:stop", activeSession.id);
      socket.emit("session:leave", activeSession.id);
      socket.off("qr:refreshed");
      socket.off("attendance:marked");
    };
  }, [activeSession]);

  // Countdown timer
  useEffect(() => {
    if (!activeSession || !qrData) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, qrData]);

  const createSession = async () => {
    setCreating(true);
    try {
      const res = await api.post("/sessions", {
        name: newSession.name,
        locationLat: parseFloat(newSession.locationLat),
        locationLng: parseFloat(newSession.locationLng),
      });
      setActiveSession(res.data);
      setShowCreateModal(false);
      setNewSession({ name: "", locationLat: "", locationLng: "" });
      fetchSessions();
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setCreating(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    try {
      await api.patch(`/sessions/${activeSession.id}/end`);
      const socket = getSocket();
      socket.emit("qr:stop", activeSession.id);
      setActiveSession(null);
      setQrData(null);
      setFeed([]);
      setStats({ totalStudents: 0, presentStudents: 0, percentage: 0 });
      fetchSessions();
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewSession({
          ...newSession,
          locationLat: pos.coords.latitude.toString(),
          locationLng: pos.coords.longitude.toString(),
        });
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true }
    );
  };

  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - timer / 20);

  return (
    <>
      <Navbar />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "4px" }}>
              Admin Dashboard
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {activeSession ? `Active: ${activeSession.name}` : "No active session"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            {activeSession ? (
              <button className="btn-danger" onClick={endSession}>
                ⏹ End Session
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                ➕ Start Session
              </button>
            )}
          </div>
        </div>

        {activeSession ? (
          <>
            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
              <div className="glass-card stat-card">
                <div className="stat-value">{stats.totalStudents}</div>
                <div className="stat-label">Total Students</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-value">{stats.presentStudents}</div>
                <div className="stat-label">Present</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-value">{stats.percentage}%</div>
                <div className="stat-label">Attendance Rate</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="glass-card" style={{ padding: "20px", marginBottom: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Attendance Progress
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-secondary)" }}>
                  {stats.presentStudents}/{stats.totalStudents}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${stats.percentage}%` }} />
              </div>
            </div>

            {/* QR + Feed Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* QR Code */}
              <div className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    Live QR Code
                  </h2>
                  {/* Timer */}
                  <div className="timer-ring">
                    <svg width="60" height="60">
                      <circle className="bg-ring" cx="30" cy="30" r="26" />
                      <circle
                        className="fg-ring"
                        cx="30"
                        cy="30"
                        r="26"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{
                          stroke: timer <= 5 ? "var(--accent-warning)" : "var(--accent-primary)",
                        }}
                      />
                    </svg>
                    <div className="timer-text" style={{ color: timer <= 5 ? "var(--accent-warning)" : "var(--accent-primary)" }}>
                      {timer}s
                    </div>
                  </div>
                </div>

                {qrData ? (
                  <div className="qr-container" style={{ marginBottom: "16px" }}>
                    <img
                      src={qrData.dataUrl}
                      alt="Attendance QR Code"
                      style={{ width: "280px", height: "280px" }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: "40px", color: "var(--text-muted)" }}>
                    <div className="spinner" style={{ margin: "0 auto 12px" }} />
                    Generating QR...
                  </div>
                )}

                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  QR auto-refreshes every 20 seconds
                </p>
              </div>

              {/* Live Feed */}
              <div className="glass-card" style={{ padding: "24px", maxHeight: "500px", overflowY: "auto" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px" }}>
                  📡 Live Attendance Feed
                </h2>

                {feed.length === 0 ? (
                  <div className="empty-state" style={{ padding: "40px 0" }}>
                    <div className="empty-state-icon">🕐</div>
                    <p>Waiting for students...</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {feed.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          background: "rgba(0, 212, 170, 0.05)",
                          borderRadius: "10px",
                          border: "1px solid rgba(0, 212, 170, 0.1)",
                          animation: "fadeIn 0.3s ease",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                            {entry.student?.name || "Student"}
                          </div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            {entry.student?.email}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="badge badge-success">✅ Present</span>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "4px" }}>
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* No Active Session */
          <div className="glass-card empty-state">
            <div className="empty-state-icon">📋</div>
            <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>No Active Session</p>
            <p style={{ marginTop: "8px", maxWidth: "400px", margin: "8px auto 24px" }}>
              Start a new session to display QR codes and begin tracking attendance.
            </p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              ➕ Start New Session
            </button>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div style={{ marginTop: "40px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>
              Recent Sessions
            </h2>
            <div className="glass-card" style={{ overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Started</th>
                    <th>Status</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 10).map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {new Date(s.startTime).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${s.active ? "badge-success" : "badge-info"}`}>
                          {s.active ? "🟢 Active" : "Ended"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {(s as any)._count?.attendance ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="result-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="result-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: "left", maxWidth: "480px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "24px" }}>
              Start New Session
            </h2>

            <div style={{ marginBottom: "18px" }}>
              <label className="input-label">Session Name</label>
              <input
                className="input-field"
                placeholder="e.g., Math 101 — Lecture 5"
                value={newSession.name}
                onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
              <div>
                <label className="input-label">Latitude</label>
                <input
                  className="input-field"
                  type="number"
                  step="any"
                  placeholder="28.6139"
                  value={newSession.locationLat}
                  onChange={(e) => setNewSession({ ...newSession, locationLat: e.target.value })}
                />
              </div>
              <div>
                <label className="input-label">Longitude</label>
                <input
                  className="input-field"
                  type="number"
                  step="any"
                  placeholder="77.2090"
                  value={newSession.locationLng}
                  onChange={(e) => setNewSession({ ...newSession, locationLng: e.target.value })}
                />
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={useCurrentLocation}
              style={{ width: "100%", marginBottom: "20px", fontSize: "0.85rem" }}
            >
              📍 Use My Current Location
            </button>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={createSession}
                disabled={creating || !newSession.name || !newSession.locationLat || !newSession.locationLng}
                style={{
                  flex: 1,
                  opacity: creating || !newSession.name ? 0.6 : 1,
                }}
              >
                {creating ? "Creating..." : "Start Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
