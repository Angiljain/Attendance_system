"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

interface AttendanceRecord {
  id: string;
  timestamp: string;
  status: string;
  lat: number;
  lng: number;
  txHash: string | null;
  nftTokenId: string | null;
  session: {
    id: string;
    name: string;
    startTime: string;
  };
}

export default function HistoryPage() {
  const { user, loadFromStorage } = useAuthStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/attendance/student/${user!.id}`);
      setRecords(res.data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { class: string; label: string }> = {
      PRESENT: { class: "badge-success", label: "✅ Present" },
      INVALID_QR: { class: "badge-error", label: "❌ Invalid QR" },
      OUTSIDE_GEOFENCE: { class: "badge-warning", label: "📍 Outside Zone" },
      EXPIRED_QR: { class: "badge-error", label: "⏱ Expired" },
      DUPLICATE: { class: "badge-info", label: "🔄 Duplicate" },
    };
    return map[status] || { class: "badge-info", label: status };
  };

  return (
    <>
      <Navbar />

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "8px" }}>
          Attendance History
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
          Your complete attendance record
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : records.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-state-icon">📜</div>
            <p>No attendance records yet</p>
            <p style={{ fontSize: "0.85rem", marginTop: "8px" }}>
              Scan a QR code to mark your first attendance
            </p>
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Blockchain</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const badge = getStatusBadge(record.status);
                  return (
                    <tr key={record.id}>
                      <td style={{ fontWeight: 600 }}>
                        {record.session.name}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td>
                        {record.txHash ? (
                          <a
                            href={`https://mumbai.polygonscan.com/tx/${record.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--accent-primary)",
                              fontSize: "0.85rem",
                              textDecoration: "none",
                            }}
                          >
                            🔗 {record.txHash.slice(0, 10)}...
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
