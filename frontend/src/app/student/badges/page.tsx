"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

interface AttendanceRecord {
  id: string;
  timestamp: string;
  nftTokenId: string | null;
  session: {
    name: string;
    startTime: string;
  };
}

export default function BadgesPage() {
  const { user, loadFromStorage } = useAuthStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (user?.id) fetchBadges();
  }, [user]);

  const fetchBadges = async () => {
    try {
      const res = await api.get(`/attendance/student/${user!.id}`);
      // Only show records marked as PRESENT
      setRecords(res.data.filter((r: any) => r.status === "PRESENT"));
    } catch (err) {
      console.error("Failed to load badges:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate a deterministic gradient for each badge
  const getBadgeColor = (index: number) => {
    const colors = [
      "linear-gradient(135deg, #6c63ff, #00d4aa)",
      "linear-gradient(135deg, #ff6b6b, #ffd93d)",
      "linear-gradient(135deg, #00d4aa, #0099ff)",
      "linear-gradient(135deg, #a855f7, #ec4899)",
      "linear-gradient(135deg, #f59e0b, #ef4444)",
      "linear-gradient(135deg, #06b6d4, #6366f1)",
    ];
    return colors[index % colors.length];
  };

  return (
    <>
      <Navbar />

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "8px" }}>
          🏆 POAP Badges
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
          Your soulbound proof-of-attendance NFTs
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : records.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-state-icon">🏅</div>
            <p>No badges earned yet</p>
            <p style={{ fontSize: "0.85rem", marginTop: "8px" }}>
              Attend a session to earn your first POAP badge
            </p>
          </div>
        ) : (
          <div className="badge-grid">
            {records.map((record, index) => (
              <div key={record.id} className="glass-card nft-badge">
                <div
                  className="nft-icon"
                  style={{ background: getBadgeColor(index) }}
                >
                  🏅
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  {record.session.name}
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    marginBottom: "12px",
                  }}
                >
                  {new Date(record.timestamp).toLocaleDateString()}
                </p>

                <span className="badge badge-success">✓ Soulbound</span>

                {record.nftTokenId && (
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      marginTop: "8px",
                    }}
                  >
                    Token #{record.nftTokenId}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
