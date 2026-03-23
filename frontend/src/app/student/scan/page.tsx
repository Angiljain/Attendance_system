"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

type ScanResult = {
  status: "success" | "error";
  message: string;
  details?: string;
  distance?: number;
} | null;

export default function ScanPage() {
  const { user, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (user && user.role !== "STUDENT") {
      router.push("/admin/dashboard");
    }
  }, [user, router]);

  const startScanner = async () => {
    setResult(null);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
        },
        async (decodedText) => {
          // Stop scanning immediately
          await scanner.stop();
          setScanning(false);
          await handleScan(decodedText);
        },
        () => {} // ignore errors during scanning
      );

      setScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      setResult({
        status: "error",
        message: "Camera Access Denied",
        details: "Please allow camera access to scan QR codes.",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (payload: string) => {
    setLoading(true);

    try {
      // Get GPS location
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );

      const { latitude: lat, longitude: lng } = position.coords;

      // Send to backend
      const res = await api.post("/attendance", {
        payload,
        lat,
        lng,
      });

      setResult({
        status: "success",
        message: "Attendance Marked! ✅",
        details: `Distance: ${res.data.distance}m from classroom`,
        distance: res.data.distance,
      });
    } catch (err: any) {
      const errorData = err.response?.data;

      if (err.code === "PERMISSION_DENIED" || err.message?.includes("geolocation")) {
        setResult({
          status: "error",
          message: "Location Access Required",
          details: "Please enable GPS to verify your presence.",
        });
      } else {
        setResult({
          status: "error",
          message: errorData?.status || "Attendance Failed",
          details: errorData?.error || "Something went wrong. Please try again.",
          distance: errorData?.distance,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "32px 20px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "8px" }}>
            Scan Attendance QR
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Point your camera at the QR code displayed by your instructor
          </p>
        </div>

        {/* Scanner Area */}
        <div
          className="glass-card"
          style={{
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {!scanning ? (
            <>
              <div
                style={{
                  width: "280px",
                  height: "280px",
                  borderRadius: "20px",
                  border: "2px dashed var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "16px",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ fontSize: "4rem" }}>📷</span>
                <span style={{ fontSize: "0.9rem" }}>Camera preview</span>
              </div>

              <button className="btn-primary" onClick={startScanner} style={{ width: "100%" }}>
                🔍 Start Scanning
              </button>
            </>
          ) : (
            <>
              <div className="scanner-wrapper">
                <div id="qr-reader" style={{ width: "100%", height: "100%" }} />
                <div className="scanner-line" />
              </div>

              <button
                className="btn-danger"
                onClick={stopScanner}
                style={{ width: "100%" }}
              >
                ⏹ Stop Scanner
              </button>
            </>
          )}

          {/* Hidden div for scanner */}
          {!scanning && <div id="qr-reader" style={{ display: "none" }} />}
        </div>

        {/* Loading */}
        {loading && (
          <div className="result-overlay">
            <div className="result-card">
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <p style={{ color: "var(--text-secondary)" }}>
                Verifying attendance...
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="result-overlay" onClick={() => setResult(null)}>
            <div
              className="result-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="result-icon">
                {result.status === "success" ? "🎉" : "❌"}
              </div>
              <div
                className="result-title"
                style={{
                  color:
                    result.status === "success"
                      ? "var(--accent-secondary)"
                      : "var(--accent-warning)",
                }}
              >
                {result.message}
              </div>
              {result.details && (
                <p className="result-desc">{result.details}</p>
              )}
              <button
                className="btn-primary"
                onClick={() => setResult(null)}
                style={{ marginTop: "24px" }}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Info cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <div className="glass-card" style={{ padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>⏱</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              QR Valid For
            </div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--accent-primary)",
              }}
            >
              20 seconds
            </div>
          </div>

          <div className="glass-card" style={{ padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>📍</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Max Distance
            </div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--accent-secondary)",
              }}
            >
              70 meters
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
