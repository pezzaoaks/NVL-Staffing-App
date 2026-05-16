
import { useState } from "react";

const learners = [
  { name: "Aamir", class: "Class A", risk: "high", ratio: 2 },
  { name: "Ben", class: "Class B", risk: "medium", ratio: 1 },
  { name: "Chloe", class: "Class A", risk: "low", ratio: 1 },
];

const staffList = ["Sarah", "Amir", "Leah"];
const slots = ["9:00", "10:30"];

const riskColors = {
  high: "#fecaca",
  medium: "#fde68a",
  low: "#bbf7d0",
};

export default function App() {
  const [assignments, setAssignments] = useState({});
  const [selectedStaff, setSelectedStaff] = useState("Sarah");

  const getCoverage = (slot, learner) => {
    const key = `${slot}-${learner.name}`;
    const assigned = assignments[key] || [];

    return {
      assigned: assigned.length,
      required: learner.ratio,
      gap: learner.ratio - assigned.length,
    };
  };

  // ✅ GROUP BY CLASS
  const grouped = learners.reduce((acc, l) => {
    if (!acc[l.class]) acc[l.class] = [];
    acc[l.class].push(l);
    return acc;
  }, {});

  // ✅ NORMAL ASSIGN
  const assign = (slot, learner, staff) => {
    const key = `${slot}-${learner}`;
    const current = assignments[key] || [];

    setAssignments({
      ...assignments,
      [key]: [...current, staff],
    });
  };

  // ✅ SMART ASSIGN
  const smartAssign = (slot) => {
    let candidates = [];

    learners.forEach((l) => {
      const coverage = getCoverage(slot, l);
      if (coverage.gap > 0) {
        candidates.push({ ...l, gap: coverage.gap });
      }
    });

    const riskOrder = { high: 3, medium: 2, low: 1 };

    candidates.sort((a, b) => {
      if (riskOrder[b.risk] !== riskOrder[a.risk]) {
        return riskOrder[b.risk] - riskOrder[a.risk];
      }
      return b.gap - a.gap;
    });

    if (candidates.length === 0) return;

    const target = candidates[0];

    assign(slot, target.name, selectedStaff);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>NVL SEND Staffing 🚀 Version 4</h1>

      {/* ✅ STAFF PANEL */}
      <div style={{ marginBottom: 20 }}>
        <strong>Select Staff: </strong>
        {staffList.map((staff) => (
          <button
            key={staff}
            onClick={() => setSelectedStaff(staff)}
            style={{
              marginRight: 10,
              background: selectedStaff === staff ? "black" : "#ddd",
              color: selectedStaff === staff ? "white" : "black",
              padding: "5px 10px",
            }}
          >
            {staff}
          </button>
        ))}
      </div>

      {slots.map((slot) => (
        <div key={slot} style={{ marginBottom: 30 }}>
          <h2>{slot}</h2>

          {/* ✅ SMART BUTTON */}
          <button
            onClick={() => smartAssign(slot)}
            style={{
              marginBottom: 10,
              background: "#2563eb",
              color: "white",
              padding: "6px 10px",
            }}
          >
            ⚡ Smart Assign
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
              <div key={className} style={{ marginBottom: 15 }}>
                <h3>
                  {className} — Required: {totalRequired} | Assigned: {totalAssigned}
                </h3>

                {highRiskGap && (
                  <div style={{ color: "red", fontWeight: "bold" }}>
                    🚨 HIGH RISK GAP
                  </div>
                )}

                {classLearners.map((l) => {
                  const coverage = getCoverage(slot, l);

                  return (
                    <div
                      key={l.name}
                      style={{
                        background: riskColors[l.risk],
                        padding: 10,
                        marginTop: 5,
                      }}
                    >
                      <strong>{l.name}</strong> ({l.risk})

                      <div>
                        {coverage.assigned}/{coverage.required}
                      </div>

                      {coverage.gap > 0 && (
                        <div style={{ color: "red" }}>
                          ⚠️ Short by {coverage.gap}
                        </div>
                      )}

                      {coverage.gap <= 0 && (
                        <div>✅ Covered</div>
                      )}

                      <button
                        onClick={() =>
                          assign(slot, l.name, selectedStaff)
                        }
                      >
                        Assign {selectedStaff}
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
