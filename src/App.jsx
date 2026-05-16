<h1>NVL SEND Staffing 🚀 FIXED VERSION</h1>
import { useState, useEffect } from "react";

// 🧠 Sample data (expand later)
const learners = [
  { name: "Aamir", class: "Class A", risk: "high", ratio: 2 },
  { name: "Ben", class: "Class B", risk: "medium", ratio: 1 },
  { name: "Chloe", class: "Class A", risk: "low", ratio: 1 },
];

const staffList = ["Sarah", "Amir", "Leah"];
const slots = ["9:00", "10:30"];

// 🎨 Risk colours
const riskColors = {
  high: "#fecaca",
  medium: "#fde68a",
  low: "#bbf7d0",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState({});

  // ✅ DEV auto login (safe for Vercel)
  useEffect(() => {
    setUser({ name: "Dev User" });
  }, []);

  // ✅ Assign staff
  const assign = (slot, learner, staff) => {
    const key = `${slot}-${learner}`;
    const current = assignments[key] || [];

    setAssignments({
      ...assignments,
      [key]: [...current, staff],
    });
  };

  // ✅ Coverage check
  const getCoverage = (slot, learner) => {
    const key = `${slot}-${learner.name}`;
    const assigned = assignments[key] || [];

    return {
      assigned: assigned.length,
      required: learner.ratio,
      gap: learner.ratio - assigned.length,
    };
  };

  // ✅ Group by class
  const grouped = learners.reduce((acc, l) => {
    if (!acc[l.class]) acc[l.class] = [];
    acc[l.class].push(l);
    return acc;
  }, {});

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        NVL SEND Staffing
      </h1>

      {slots.map((slot) => (
        <div key={slot} style={{ marginBottom: 30 }}>
          <h2 style={{ marginBottom: 10 }}>{slot}</h2>

          {Object.keys(grouped).map((className) => {
            const classLearners = grouped[className];

            let totalRequired = 0;
            let totalAssigned = 0;

            return (
              <div
                key={className}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                {/* ✅ Class header */}
                <h3>
                  {className} — Required: {totalRequired} | Assigned:{" "}
                  {totalAssigned}
                </h3>

                {classLearners.map((l) => {
                  const coverage = getCoverage(slot, l);
                  totalRequired += coverage.required;
                  totalAssigned += coverage.assigned;

                  return (
                    <div
                      key={l.name}
                      style={{
                        background: riskColors[l.risk],
                        padding: 10,
                        borderRadius: 6,
                        marginTop: 8,
                      }}
                    >
                      <strong>{l.name}</strong> ({l.risk})

                      <div>
                        {coverage.assigned}/{coverage.required}
                      </div>

                      {coverage.gap > 0 && (
                        <div style={{ color: "red", fontWeight: "bold" }}>
                          ⚠️ Gap: {coverage.gap}
                        </div>
                      )}

                      <button
                        onClick={() =>
                          assign(slot, l.name, staffList[0])
                        }
                        style={{
                          marginTop: 5,
                          padding: "5px 10px",
                          background: "black",
                          color: "white",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        Assign
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
