
import { useState, useEffect } from "react";

// ✅ Learners
const learners = [
  { name: "Aamir", class: "Class A", risk: "high", ratio: 2 },
  { name: "Ben", class: "Class B", risk: "medium", ratio: 1 },
  { name: "Chloe", class: "Class A", risk: "low", ratio: 1 },
];

// ✅ Staff
const staffList = ["Sarah", "Amir", "Leah"];
const slots = ["9:00", "10:30"];

// ✅ Risk colours
const riskColors = {
  high: "#fecaca",
  medium: "#fde68a",
  low: "#bbf7d0",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    setUser({ name: "Dev User" });
  }, []);

  // ✅ SMART ASSIGN
  const smartAssign = (slot) => {
    let candidates = [];

    learners.forEach((l) => {
      const coverage = getCoverage(slot, l);
      if (coverage.gap > 0) {
        candidates.push({ ...l, gap: coverage.gap });
      }
    });

    // prioritise risk + gap
    const riskOrder = { high: 3, medium: 2, low: 1 };

    candidates.sort((a, b) => {
      if (riskOrder[b.risk] !== riskOrder[a.risk]) {
        return riskOrder[b.risk] - riskOrder[a.risk];
      }
      return b.gap - a.gap;
    });

    if (candidates.length === 0) return;

    const target = candidates[0];

    const key = `${slot}-${target.name}`;
    const current = assignments[key] || [];

    setAssignments({
      ...assignments,
      [key]: [...current, staffList[0]],
    });
  };

  const assign = (slot, learner, staff) => {
    const key = `${slot}-${learner}`;
    const current = assignments[key] || [];

    setAssignments({
      ...assignments,
      [key]: [...current, staff],
    });
  };

  const getCoverage = (slot, learner) => {
    const key = `${slot}-${learner.name}`;
    const assigned = assignments[key] || [];

    return {
      assigned: assigned.length,
      required: learner.ratio,
      gap: learner.ratio - assigned.length,
    };
  };

  const grouped = learners.reduce((acc, l) => {
    if (!acc[l.class]) acc[l.class] = [];
    acc[l.class].push(l);
    return acc;
  }, {});

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>NVL SEND Staffing 🚀</h1>

      {/* STAFF PANEL */}
      <div style={{ marginBottom: 20 }}>
        <strong>Staff Available:</strong>{" "}
        {staffList.map((s) => (
          <span key={s} style={{ marginRight: 10 }}>
            {s}
          </span>
        ))}
      </div>

      {slots.map((slot) => (
        <div key={slot} style={{ marginBottom: 30 }}>
          <h2>{slot}</h2>

          {/* SMART BUTTON */}
          <button
            onClick={() => smartAssign(slot)}
            style={{
              marginBottom: 10,
              padding: "6px 10px",
              background: "#2563eb",
              color: "white",
              borderRadius: 4,
            }}
          >
            ⚡ Auto Assign (Safe)
          </button>

          {Object.entries(grouped).map(([className, classLearners]) => {
            let totalRequired = 0;
            let totalAssigned = 0;
            let highRiskGap = false;

            classLearners.forEach((l) => {
              const c = getCoverage(slot, l);
              totalRequired += c.required;
              totalAssigned += c.assigned;
              if (l.risk === "high" && c.gap > 0) {
                highRiskGap = true;
              }
            });

            return (
              <div
                key={className}
                style={{
                  border: "1px solid #ddd",
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                <h3>
                  {className} — Required: {totalRequired} | Assigned:{" "}
