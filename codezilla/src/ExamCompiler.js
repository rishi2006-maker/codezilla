import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "./firebase";
// ✅ CHANGE: Import serverTimestamp
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";

// --- Default Code Templates ---
const defaultTemplates = {
  c: `#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}`,
  python: `def main():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    main()`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}`,
};

const ExamCompiler = ({ studentName, registerNumber, studentId }) => {
  const [examQuestions, setExamQuestions] = useState([]);
  const [isExamLoading, setIsExamLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [language, setLanguage] = useState("c");
  const [code, setCode] = useState(defaultTemplates.c);
  const [output, setOutput] = useState("Output will be displayed here...");
  const [isLoading, setIsLoading] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [allCodes, setAllCodes] = useState({});
  const [submittedQuestions, setSubmittedQuestions] = useState({});
  const [viewMode, setViewMode] = useState("compiler");
  const [hiddenTestResult, setHiddenTestResult] = useState("");

  const stateRef = useRef();
  stateRef.current = { viewMode, timeLeft, examQuestions, allCodes, totalScore, studentName, registerNumber, studentId };

  const handleSubmit = useCallback(async () => {
    const currentState = stateRef.current;
    if (currentState.viewMode === 'submitted') return;
    setViewMode('submitted');
    const timeTaken = 30 * 60 - currentState.timeLeft;
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    const formattedCodes = {};
    currentState.examQuestions.forEach(q => {
        formattedCodes[`Q: ${q.title}`] = currentState.allCodes[q.id] || "Not Attempted";
    });
    try {
      await addDoc(collection(db, "examSubmissions"), {
        studentName: currentState.studentName,
        studentRegNo: currentState.registerNumber,
        studentMark: `${currentState.totalScore.toFixed(1)} out of 20`,
        studentTimeTaken: `${minutes}m ${seconds}s`,
        studentCodes: formattedCodes,
        // ✅ CHANGE: Add the server timestamp for sorting the leaderboard
        submittedAt: serverTimestamp(),
      });
      if (currentState.studentId) {
        await updateDoc(doc(db, "students", currentState.studentId), { status: "completed" });
      }
      setOutput(`Exam Submitted Successfully!\nFinal Score: ${currentState.totalScore.toFixed(1)} / 20`);
    } catch (error) {
      alert("There was an error submitting your results.");
    }
  }, []);

  // --- Effects ---
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const q = query(collection(db, "questions"), orderBy("createdAt"));
        const snapshot = await getDocs(q);
        const fetchedQuestions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                description: data.description,
                open: { input: data.openTestCase?.input, expected: data.openTestCase?.output },
                hidden: Array.isArray(data.hiddenTestCases) ? data.hiddenTestCases.map(tc => ({ input: tc?.input, expected: tc?.output })) : [],
            };
        });
        setExamQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Failed to fetch questions:", error);
      } finally {
        setIsExamLoading(false);
      }
    };
    fetchQuestions();
  }, []); 
  
  useEffect(() => {
    if (examQuestions.length > 0) {
      const currentQuestionId = examQuestions[currentIdx].id;
      setCode(allCodes[currentQuestionId] || defaultTemplates[language]);
      setHiddenTestResult("");
    }
  }, [currentIdx, language, examQuestions, allCodes]);

  useEffect(() => {
    if (viewMode !== 'compiler' || timeLeft <= 0) {
        if (timeLeft <= 0) handleSubmit();
        return;
    };
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, viewMode, handleSubmit]);

  /* TAB-SWITCHING FEATURE DISABLED FOR TESTING
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden || stateRef.current.viewMode !== 'compiler') return;
      alert(`Violation Detected...`);
      handleSubmit();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleSubmit]);
  */

  const handleCodeChange = (newCode) => {
    const currentQuestionId = examQuestions[currentIdx].id;
    setCode(newCode);
    setAllCodes(prev => ({ ...prev, [currentQuestionId]: newCode }));
  };

  const executeCode = async (stdin) => {
    const languageMap = { c: { lang: "c", versionIndex: "4" }, python: { lang: "python3", versionIndex: "4" }, java: { lang: "java", versionIndex: "4" } };
    try {
      const { data } = await axios.post("http://localhost:5000/execute", { script: code, language: languageMap[language].lang, versionIndex: languageMap[language].versionIndex, stdin });
      return data.output ? data.output.trim() : "Execution failed or produced no output.";
    } catch (error) {
      return "Error: Could not connect to the execution server.";
    }
  };

  const handleRunCode = async () => {
    setIsLoading(true);
    const currentQuestion = examQuestions[currentIdx];
    setOutput("Executing open test case...");
    const openTestOutput = await executeCode(currentQuestion.open.input);
    setOutput(openTestOutput);
    setHiddenTestResult("Checking hidden test cases...");
    let passedCount = 0;
    for (const test of currentQuestion.hidden) {
        const actualOutput = await executeCode(test.input);
        if (actualOutput === test.expected) {
          passedCount++;
        }
    }
    const allPassed = passedCount === currentQuestion.hidden.length;
    setHiddenTestResult(allPassed ? "✅ All hidden test cases passed!" : "❌ Some hidden test cases failed.");
    if (allPassed && !submittedQuestions[currentQuestion.id]) {
      const marksPerQuestion = 20 / examQuestions.length;
      setTotalScore(prev => prev + marksPerQuestion);
    }
    setIsLoading(false);
  };
  
  const handleCodeSubmit = () => {
    const currentQuestionId = examQuestions[currentIdx].id;
    setSubmittedQuestions(prev => ({ ...prev, [currentQuestionId]: true }));
    alert(`Code for "${examQuestions[currentIdx].title}" has been submitted and locked.`);
    if (Object.keys(submittedQuestions).length + 1 === examQuestions.length) {
      setViewMode('summary');
    }
  };

  if (isExamLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading Exam Questions...</div>;
  }
  
  if (!examQuestions || examQuestions.length === 0) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>No exam questions available.</div>;
  }

  if (viewMode !== 'compiler') {
    return (
        <div style={styles.summaryContainer}>
            <div style={styles.summaryBox}>
                <h1 style={styles.summaryTitle}>Exam Finished</h1>
                <p style={styles.summaryScore}>Your Final Score: {totalScore.toFixed(1)} / 20</p>
                {viewMode === 'summary' ? (
                    <button onClick={handleSubmit} style={{...styles.actionButton, ...styles.finalSubmitButton, width: '100%'}}>Submit Exam</button>
                ) : (
                    <p style={styles.summaryScore}>Your results have been submitted.</p>
                )}
            </div>
        </div>
    );
  }

  const currentQuestion = examQuestions[currentIdx];
  const isCurrentQuestionSubmitted = !!submittedQuestions[currentQuestion.id];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Exam System - Compiler</h1>
        <div style={styles.headerInfo}>
          <span>Time Left: {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}</span>
          <span style={{ marginLeft: '2rem' }}>Score: {totalScore.toFixed(1)}</span>
        </div>
      </header>
      <div style={styles.body}>
        <aside style={styles.leftPanel}>
            <h2 style={styles.questionTitle}>{`Q${currentIdx + 1}: ${currentQuestion.title}`}</h2>
            <p style={styles.questionDescription}>{currentQuestion.description}</p>
            <div style={styles.testCaseGroup}>
                <h3 style={styles.testCaseHeader}>Open Test Case</h3>
                <div style={styles.testCaseBox}>
                  <div style={styles.ioLabel}>Input:</div>
                  <pre style={styles.ioValue}>{currentQuestion.open.input}</pre>
                  <div style={{...styles.ioLabel, marginTop: '10px'}}>Expected Output:</div>
                  <pre style={styles.ioValue}>{currentQuestion.open.expected}</pre>
                </div>
            </div>
            {hiddenTestResult && (
              <div style={styles.hiddenResultBox(hiddenTestResult.includes("✅"))}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{hiddenTestResult}</p>
              </div>
            )}
            <div style={styles.navigation}>
                <button style={currentIdx === 0 ? styles.navButtonDisabled : styles.navButton} onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>← Back</button>
                <button style={currentIdx === examQuestions.length - 1 ? styles.navButtonDisabled : styles.primaryButton} onClick={() => setCurrentIdx(i => Math.min(examQuestions.length - 1, i + 1))} disabled={currentIdx === examQuestions.length - 1}>Next →</button>
            </div>
        </aside>
        <main style={styles.rightPanel}>
          <select value={language} onChange={e => setLanguage(e.target.value)} disabled={isCurrentQuestionSubmitted} style={styles.languageSelector}>
            <option value="c">C</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
          </select>
          <textarea value={code} onChange={e => handleCodeChange(e.target.value)} disabled={isLoading || isCurrentQuestionSubmitted} style={styles.editor} />
          <div style={styles.buttonGroup}>
            <button onClick={handleRunCode} disabled={isLoading || isCurrentQuestionSubmitted} style={{ ...styles.actionButton, ...styles.runButton }}>Run Code</button>
            <button onClick={handleCodeSubmit} disabled={isLoading || isCurrentQuestionSubmitted} style={{ ...styles.actionButton, ...styles.submitButton }}>Submit</button>
          </div>
          <pre style={styles.outputArea}>{isLoading ? "Executing..." : output}</pre>
        </main>
      </div>
    </div>
  );
};

const styles = { 
    container: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif' }, 
    header: { background: '#1e293b', color: 'white', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', flexShrink: 0 }, 
    headerTitle: { fontSize: '1.2rem', fontWeight: '600' }, 
    headerInfo: { fontSize: '1rem' }, 
    body: { display: 'flex', flexGrow: 1, overflow: 'hidden' }, 
    leftPanel: { width: '40%', padding: '1.5rem', background: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }, 
    questionTitle: { margin: 0, color: '#1e293b' }, 
    questionDescription: { color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 },
    testCaseGroup: { marginTop: '1.5rem' }, 
    testCaseHeader: { fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#475569' }, 
    testCaseBox: { background: '#f1f5f9', padding: '1rem', borderRadius: '8px' }, 
    ioLabel: { color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }, 
    ioValue: { margin: '0.25rem 0 0 0', background: 'white', padding: '0.5rem', borderRadius: '4px', fontFamily: 'monospace', color: '#1e293b' }, 
    navigation: { marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }, 
    navButton: { background: '#e2e8f0', color: '#334155', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }, 
    navButtonDisabled: { background: '#f1f5f9', color: '#94a3b8', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'not-allowed', fontWeight: '600' }, 
    primaryButton: { background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }, 
    rightPanel: { width: '60%', padding: '1.5rem', display: 'flex', flexDirection: 'column', background: '#f8fafc' }, 
    languageSelector: { marginBottom: '1rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', alignSelf: 'flex-start' }, 
    editor: { flexGrow: 1, fontFamily: 'monospace', fontSize: '16px', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'none' }, 
    buttonGroup: { marginTop: '1rem', display: 'flex', gap: '1rem' }, 
    actionButton: { color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }, 
    runButton: { background: '#3b82f6' }, 
    submitButton: { background: '#22c55e' }, 
    finalSubmitButton: { background: '#ef4444' },
    outputArea: { flexBasis: '250px', flexShrink: 0, background: '#0f172a', color: '#e2e8f0', padding: '1rem', borderRadius: '8px', marginTop: '1rem', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' },
    summaryContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' },
    summaryBox: { background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', width: '400px' },
    summaryTitle: { margin: '0 0 1rem 0', color: '#1e293b' },
    summaryScore: { fontSize: '1.2rem', color: '#475569', marginBottom: '2rem' },
    hiddenResultBox: (isSuccess) => ({
      marginTop: '1.5rem',
      padding: '1rem',
      borderRadius: '8px',
      border: `2px solid ${isSuccess ? '#22c55e' : '#ef4444'}`,
      background: isSuccess ? '#f0fdf4' : '#fef2f2',
      color: isSuccess ? '#166534' : '#991b1b',
    }),
};

export default ExamCompiler;