"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

interface Session {
  id: string;
  name: string;
  active: boolean;
  startTime: string;
  endTime: string | null;
  locationLat: number;
  locationLng: number;
  _count?: { attendance: number };
}

interface AttendanceEntry {
  id: string;
  timestamp: string;
  status: string;
  lat: number;
  lng: number;
  txHash: string | null;
  student: { id: string; name: string; email: string };
}

export default function SessionsPage() {
  const { user, loadFromStorage } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get("/sessions");
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const viewSession = async (session: Session) => {
    setSelectedSession(session);
    setDetailLoading(true);
    try {
      const res = await api.get(`/attendance/session/${session.id}`);
      setAttendance(res.data.records || []);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "8px" }}>
          Session History
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
          View past sessions and their attendance records
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: selectedSession ? "1fr 1fr" : "1fr", gap: "24px" }}>
            {/* Sessions List */}
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
                All Sessions ({sessions.length})
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="glass-card"
                    onClick={() => viewSession(session)}
                    style={{
                      padding: "20px",
                      cursor: "pointer",
                      borderColor: selectedSession?.id === session.id
                        ? "var(--accent-primary)"
                        : undefined,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <h3 style={{ fontWeight: 700, marginBottom: "6px" }}>
                          {session.name}
                        </h3>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          📅 {new Date(session.startTime).toLocaleString()}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "4px" }}>
                          📍 {session.locationLat.toFixed(4)}, {session.locationLng.toFixed(4)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className={`badge ${session.active ? "badge-success" : "badge-info"}`}>
                          {session.active ? "🟢 Active" : "Ended"}
                        </span>
                        {session._count && (
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "8px" }}>
                            {session._count.attendance} students
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Detail */}
            {selectedSession && (
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
                  {selectedSession.name} — Attendance
                </h2>

                {detailLoading ? (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <div className="spinner" style={{ margin: "0 auto" }} />
                  </div>
                ) : attendance.length === 0 ? (
                  <div className="glass-card empty-state">
                    <div className="empty-state-icon">📋</div>
                    <p>No attendance records</p>
                  </div>
                ) : (
                  <div className="glass-card" style={{ overflow: "hidden" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((entry) => (
                          <tr key={entry.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{entry.student.name}</div>
                              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                {entry.student.email}
                              </div>
                            </td>
                            <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </td>
                            <td>
                              <span className="badge badge-success">✅ Present</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
