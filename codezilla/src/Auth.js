import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

const Auth = ({ onLogin }) => {
  const [loginType, setLoginType] = useState("student"); // "student" or "admin"

  // admin fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // student fields
  const [studentName, setStudentName] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [busy, setBusy] = useState(false);

  // admin creds
  const ADMIN_USER = "admin@smvec.ac.in";
  const ADMIN_PASS = "admin@123";

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      onLogin("admin");
    } else {
      alert("Invalid admin credentials");
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !registerNumber.trim()) {
      alert("Fill name and register number");
      return;
    }

    setBusy(true);
    try {
      const q = query(
        collection(db, "students"),
        where("name", "==", studentName.trim()),
        where("registerNumber", "==", registerNumber.trim())
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        await addDoc(collection(db, "students"), {
          name: studentName.trim(),
          registerNumber: registerNumber.trim(),
          status: "pending",
          createdAt: new Date(),
        });
        alert("Submitted — please wait for admin approval.");
      } else {
        alert("Record found — checking status.");
      }

      // Notify parent (App) to enter student flow and check status
      onLogin("student", studentName.trim(), registerNumber.trim());
    } catch (err) {
      console.error("Error submitting student:", err);
      alert("Failed to submit. Check console.");
    } finally {
      setBusy(false);
    }
  };

  // --- Styles including the logo area ---
  const styles = {
    outer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      minHeight: "100vh",
      background: "#f7fafc",
      paddingTop: 40,
      fontFamily: "Arial, sans-serif",
    },
    card: {
      width: 420,
      background: "#fff",
      padding: 22,
      borderRadius: 10,
      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    },
    topLogo: { display: "flex", justifyContent: "center", marginBottom: 12 },
    middleLogo: { height: 80, objectFit: "contain" },
    smallLogosRow: { display: "flex", justifyContent: "center", gap: 12, marginBottom: 16 },
    smallLogo: { width: 48, height: 48, objectFit: "contain" },
    toggleRow: { display: "flex", justifyContent: "center", marginBottom: 12 },
    toggleBtn: (active) => ({
      padding: "8px 14px",
      borderRadius: 6,
      border: "none",
      marginRight: 8,
      background: active ? "#1a73e8" : "#e6eefc",
      color: active ? "#fff" : "#1a73e8",
      cursor: "pointer",
      fontWeight: 600,
    }),
    formGroupLabel: { fontSize: 13, color: "#444", marginTop: 6 },
    input: { padding: 10, borderRadius: 6, border: "1px solid #ddd", outline: "none", width: '100%', boxSizing: 'border-box' },
    submitBtn: (busy) => ({
      marginTop: 8,
      padding: 10,
      borderRadius: 6,
      border: "none",
      background: busy ? "#9bb7ff" : "#0066ff",
      color: "#fff",
      fontWeight: 700,
      cursor: busy ? "default" : "pointer",
    }),
  };

  return (
    <div style={styles.outer}>
      <div style={styles.card}>
        {/* ====== Logo block ====== */}
        <div style={styles.topLogo}>
          {/* main middle logo */}
          <img src="/logo1.png" alt="Main Logo" style={styles.middleLogo} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x80/e6eefc/1a73e8?text=Main+Logo'; }} />
        </div>

        <div style={styles.smallLogosRow}>
          <img src="/logo2.png" alt="Logo 2" style={styles.smallLogo} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/48x48/e6eefc/1a73e8?text=L2'; }} />
          <img src="/logo3.png" alt="Logo 3" style={styles.smallLogo} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/48x48/e6eefc/1a73e8?text=L3'; }} />
        </div>

        {/* ====== Toggle (Student / Admin) ====== */}
        <div style={styles.toggleRow}>
          <button onClick={() => setLoginType("student")} style={styles.toggleBtn(loginType === "student")}>
            STUDENT
          </button>
          <button onClick={() => setLoginType("admin")} style={styles.toggleBtn(loginType === "admin")}>
            ADMIN
          </button>
        </div>

        {/* ====== Form area ====== */}
        {loginType === "admin" ? (
          <form onSubmit={handleAdminSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={{ textAlign: "center", margin: "6px 0 8px" }}>Admin Login</h2>

            <label style={styles.formGroupLabel}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin@smvec.ac.in" style={styles.input} required />

            <label style={styles.formGroupLabel}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="admin password" style={styles.input} required />

            <button type="submit" style={{ ...styles.submitBtn(false) }}>
              Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleStudentSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={{ textAlign: "center", margin: "6px 0 6px" }}>Student Sign-up / Check</h2>

            <label style={styles.formGroupLabel}>Student Name</label>
            <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student Name" style={styles.input} required />

            <label style={styles.formGroupLabel}>Register Number</label>
            <input value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} placeholder="Register Number" style={styles.input} required />

            <button type="submit" disabled={busy} style={styles.submitBtn(busy)}>
              {busy ? "Submitting..." : "Submit / Check Status"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;