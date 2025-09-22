// src/App.js

import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import AdminPanel from "./AdminPanel";
import ExamCompiler from './ExamCompiler';
import { db } from "./firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

// A simple loading component
const LoadingIndicator = () => (
  <div style={{ textAlign: "center", padding: 50, fontFamily: "Arial, sans-serif" }}>
    {/* ✅ CHANGE: The text is now more descriptive */}
    <h2>Checking your status...</h2>
  </div>
);

const App = () => {
  const [userType, setUserType] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [studentStatus, setStudentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [studentId, setStudentId] = useState(null);

  const handleLogin = (type, name = "", regNo = "") => {
    setUserType(type);
    if (type === "student") {
      setStudentName(name);
      setRegisterNumber(regNo);
      setIsLoading(true);
    }
  };

  const handleLogout = () => {
    setUserType(null);
    setStudentName("");
    setRegisterNumber("");
    setStudentStatus(null);
    setStudentId(null);
  };

  useEffect(() => {
    if (userType === "student" && studentName && registerNumber) {
      const q = query(
        collection(db, "students"),
        where("name", "==", studentName),
        where("registerNumber", "==", registerNumber)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const studentDoc = snapshot.docs[0];
          const data = studentDoc.data();
          setStudentStatus(data.status || "pending");
          setStudentId(studentDoc.id);
        } else {
          setStudentStatus("pending");
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, [userType, studentName, registerNumber]);

  if (userType === "admin") {
    return <AdminPanel onLogout={handleLogout} />;
  }

  if (userType === "student") {
    if (isLoading) {
        return <LoadingIndicator />;
    }

    if (studentStatus === "approved") {
      return <ExamCompiler 
                studentName={studentName} 
                registerNumber={registerNumber} 
                studentId={studentId} 
             />;
    } else if (studentStatus === "completed") {
      return (
        <div style={{ textAlign: "center", padding: 50, fontFamily: "Arial, sans-serif", color: "blue" }}>
          <h2>You have completed the exam.</h2>
          <p>Please contact the administrator if you believe this is a mistake.</p>
        </div>
      );
    } else if (studentStatus === "rejected") {
      return (
        <div style={{ textAlign: "center", padding: 50, fontFamily: "Arial, sans-serif", color: "red" }}>
          <h2>Access Denied. Your request was rejected by the admin.</h2>
        </div>
      );
    } else { // This handles 'pending'
      return (
        <div style={{ textAlign: "center", padding: 50, fontFamily: "Arial, sans-serif" }}>
          <h2>Please wait for admin approval...</h2>
          <p style={{ marginTop: 12 }}>
            {studentName && <span><b>Name:</b> {studentName} &nbsp;</span>}
            {registerNumber && <span><b>Reg No:</b> {registerNumber}</span>}
          </p>
        </div>
      );
    }
  }

  return <Auth onLogin={handleLogin} />;
};

export default App;