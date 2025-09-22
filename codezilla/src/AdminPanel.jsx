import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const AdminPanel = ({ onLogout }) => {
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("studentRequests");
  const [questions, setQuestions] = useState([
    { title: "", description: "", openTestCase: { input: "", output: "" }, hiddenTestCases: [{ input: "", output: "" }, { input: "", output: "" }] },
    { title: "", description: "", openTestCase: { input: "", output: "" }, hiddenTestCases: [{ input: "", output: "" }, { input: "", output: "" }] },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activePage !== "studentRequests") return;
    setLoadingStudents(true);
    const q = query(collection(db, "students"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
        setStudents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingStudents(false);
    }, (err) => {
        setError("Failed to load students.");
        setLoadingStudents(false);
    });
    return () => unsub();
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "leaderboard") return;
    setLoadingSubs(true);
    const q = query(collection(db, "examSubmissions"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
        setSubmissions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingSubs(false);
    }, (err) => {
        setError("Failed to load submissions.");
        setLoadingSubs(false);
    });
    return () => unsub();
  }, [activePage]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "students", id), { status: newStatus });
    } catch (err) {
      alert("Failed to update status. See console.");
    }
  };

  const handleSaveQuestions = async () => {
    for (let q of questions) {
        if (!q.title.trim() || !q.description.trim() || !q.openTestCase.input.trim() || !q.openTestCase.output.trim()) {
            alert("Please fill out Title, Description, and Open Test Case for all questions.");
            return;
        }
    }
    setSaving(true);
    try {
      for (let q of questions) {
        await addDoc(collection(db, "questions"), { ...q, createdAt: serverTimestamp() });
      }
      alert("Questions saved successfully!");
    } catch (err) {
      alert("Failed to save questions. See console.");
    } finally {
        setSaving(false);
    }
  };

  const cardStyle = { padding: "30px", borderRadius: "16px", color: "white", fontWeight: "bold", fontSize: "1.2rem", textAlign: "center", cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease", boxShadow: "0 6px 20px rgba(0,0,0,0.1)" };
  const hoverEffect = (e, enter) => {
    e.currentTarget.style.transform = enter ? "translateY(-5px)" : "translateY(0)";
    e.currentTarget.style.boxShadow = enter ? "0 10px 25px rgba(0,0,0,0.15)" : "0 6px 20px rgba(0,0,0,0.1)";
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 20, maxWidth: '1100px', margin: 'auto' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{ color: "#1a237e" }}>Admin Dashboard</h1>
        {onLogout && <button onClick={onLogout} style={{padding: '8px 16px', border: 'none', background: '#666', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}>Logout</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "30px", marginBottom: "40px" }}>
        <div onClick={() => setActivePage("studentRequests")} style={{ ...cardStyle, background: activePage === "studentRequests" ? "linear-gradient(135deg, #1976d2, #42a5f5)" : "linear-gradient(135deg, #2196f3, #21cbf3)" }} onMouseOver={(e) => hoverEffect(e, true)} onMouseOut={(e) => hoverEffect(e, false)}>Student Requests</div>
        <div onClick={() => setActivePage("leaderboard")} style={{ ...cardStyle, background: activePage === "leaderboard" ? "linear-gradient(135deg, #d81b60, #f06292)" : "linear-gradient(135deg, #f06292, #f48fb1)" }} onMouseOver={(e) => hoverEffect(e, true)} onMouseOut={(e) => hoverEffect(e, false)}>Leaderboard</div>
        <div onClick={() => setActivePage("setQuestions")} style={{ ...cardStyle, background: activePage === "setQuestions" ? "linear-gradient(135deg, #6a1b9a, #ab47bc)" : "linear-gradient(135deg, #7b1fa2, #ba68c8)" }} onMouseOver={(e) => hoverEffect(e, true)} onMouseOut={(e) => hoverEffect(e, false)}>Set Questions</div>
      </div>
      {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
      {activePage === "studentRequests" && (
        <>
          <h2>Student Approvals</h2>
          {loadingStudents ? <p>Loading...</p> : students.length === 0 ? <p>No new student requests.</p> : (
            <div style={{ display: "grid", gap: 12 }}>
              {students.map((student) => (
                <div key={student.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: "1px solid #eef2f7" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>{student.name}</p>
                    <p style={{ margin: "6px 0 0", color: "#555" }}>Reg No: {student.registerNumber}</p>
                    <p style={{ margin: "6px 0 0" }}>Status: <span style={{ color: student.status === "approved" ? "green" : student.status === "rejected" ? "red" : "orange", fontWeight: 700 }}>{student.status || "pending"}</span></p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => handleStatusChange(student.id, "approved")} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#2e7d32", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Approve</button>
                    <button onClick={() => { if (window.confirm("Set status to pending?")) handleStatusChange(student.id, "pending"); }} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#f0ad4e", color: "#111", cursor: "pointer", fontWeight: 700 }}>Pending</button>
                    <button onClick={() => { if (window.confirm("Reject this student?")) handleStatusChange(student.id, "rejected"); }} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#c62828", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {activePage === "leaderboard" && (
         <>
          <h2>Leaderboard</h2>
          {loadingSubs ? <p>Loading...</p> : submissions.length === 0 ? <p>No submissions yet.</p> : (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {submissions.map((sub) => (
                <div key={sub.id} style={{ padding: 16, background: "#fce4ec", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: "1px solid #f8bbd0" }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#ad1457' }}>{sub.studentName}</p>
                  <p style={{ margin: "4px 0 0", color: "#555" }}>Reg No: {sub.studentRegNo}</p>
                  <p style={{ margin: "4px 0 0" }}><b>Marks:</b> {sub.studentMark}</p>
                  <p style={{ margin: "4px 0 0" }}><b>Time Taken:</b> {sub.studentTimeTaken}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {activePage === "setQuestions" && (
        <>
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>Set Exam Questions</h2>
          {questions.map((q, idx) => (
            <div key={idx} style={{ background: "#f3e5f5", padding: 20, borderRadius: 12, marginBottom: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <h3>Question {idx + 1}</h3>
              <label>Title:</label>
              <input type="text" value={q.title} onChange={(e) => { const newQ = [...questions]; newQ[idx].title = e.target.value; setQuestions(newQ); }} placeholder="e.g., Sum of two numbers" style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc' }}/>
              <label>Description:</label>
              <textarea value={q.description} onChange={(e) => { const newQ = [...questions]; newQ[idx].description = e.target.value; setQuestions(newQ); }} placeholder="Enter question description" rows={3} style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc' }}/>
              <h4>Open Test Case</h4>
              <input type="text" value={q.openTestCase.input} onChange={(e) => { const newQ = [...questions]; newQ[idx].openTestCase.input = e.target.value; setQuestions(newQ); }} placeholder="Input (e.g., 2 3)" style={{ width: "100%", padding: 8, marginBottom: 6, borderRadius: 6, border: '1px solid #ccc' }}/>
              <input type="text" value={q.openTestCase.output} onChange={(e) => { const newQ = [...questions]; newQ[idx].openTestCase.output = e.target.value; setQuestions(newQ); }} placeholder="Expected Output (e.g., 5)" style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc' }}/>
              <h4>Hidden Test Cases</h4>
              {q.hiddenTestCases.map((htc, hIdx) => (
                <div key={hIdx} style={{ marginBottom: 8, borderLeft: '3px solid #ab47bc', paddingLeft: '10px' }}>
                  <p style={{margin: '0 0 4px 0', fontWeight: '500'}}>Hidden Case {hIdx+1}</p>
                  <input type="text" value={htc.input} onChange={(e) => { const newQ = [...questions]; newQ[idx].hiddenTestCases[hIdx].input = e.target.value; setQuestions(newQ); }} placeholder={`Hidden Test Case ${hIdx + 1} Input`} style={{ width: "100%", padding: 8, marginBottom: 4, borderRadius: 6, border: '1px solid #ccc' }}/>
                  <input type="text" value={htc.output} onChange={(e) => { const newQ = [...questions]; newQ[idx].hiddenTestCases[hIdx].output = e.target.value; setQuestions(newQ); }} placeholder={`Hidden Test Case ${hIdx + 1} Output`} style={{ width: "100%", padding: 8, marginBottom: 6, borderRadius: 6, border: '1px solid #ccc' }}/>
                </div>
              ))}
            </div>
          ))}
          <button onClick={handleSaveQuestions} disabled={saving} style={{ padding: "12px 20px", borderRadius: 8, background: saving ? '#d1c4e9' : "#6a1b9a", color: "#fff", border: "none", fontWeight: 700, cursor: saving ? "default" : "pointer", width: '100%', fontSize: '1rem' }}>
            {saving ? "Saving..." : "Save All Questions"}
          </button>
        </>
      )}
    </div>
  );
};

export default AdminPanel;