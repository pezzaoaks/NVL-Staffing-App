
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
  const [draggedStaff, setDraggedStaff] = useState(null);

  const getCoverage = (slot, learner) => {
    const key = `${slot}-${learner.name}`;
    const assigned = assignments[key] || [];

    return {
      assigned: assigned.length,
      required: learner.ratio,
      gap: learner.ratio - assigned.length,
    };
  };

  const assign = (slot, learner, staff) => {
    const key = `${slot}-${learner}`;
    const current = assignments[key] || [];

    setAssignments({
      ...assignments,
      [key]: [...current, staff],
    });
  };

  // ✅ SMART ASSIGN (priority)
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
    assign(slot, target.name, staffList[0]);
  };

  // ✅ GROUPING
  const grouped = learners.reduce((acc, l) => {
    if (!acc[l.class]) acc[l.class] = [];
    acc[l.class].push(l);
    return acc;
  }, {});

  // ✅ DASHBOARD CALCULATION
  let totalRequired = 0;
  let totalAssigned = 0;
  let highRiskGaps = 0;

  learners.forEach((l) => {
    const c = getCoverage(slots[0], l); // using first slot for summary
    totalRequired += c.required;
    totalAssigned += c.assigned;
    if (l.risk === "high" && c.gap > 0) highRiskGaps++;
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>NVL SEND Staffing 🚀</h1>

      {/* ✅ DASHBOARD */}
      <div
        style={{
          background: "#e5e7eb",
          padding: 10,
          marginBottom: 20,
        }}
      >
        <strong>Daily Summary</strong>
        <div>Required: {totalRequired}</div>
        <div>Assigned: {totalAssigned}</div>
        <div style={{ color: "red" }}>
          High Risk Gaps: {highRiskGaps}
        </div>
      </div>

      {/* ✅ STAFF (DRAG ENABLED) */}
      <div style={{ marginBottom: 20 }}>
        <strong>Staff:</strong>{" "}
        {staffList.map((s) => (
          <span
            key={s}
            draggable
            onDragStart={() => setDraggedStaff(s)}
            style={{
              marginRight: 10,
              padding: "5px",
              background: "#ddd",
              cursor: "grab",
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {slots.map((slot) => (
        <div key={slot} style={{ marginBottom: 30 }}>
          <h2>{slot}</h2>

          <button onClick={() => smartAssign(slot)}>
            ⚡ Smart Assign
          </button>

          {Object.entries(grouped).map(([className, classLearners]) => (
            <div key={className}>
              <h3>{className}</h3>

              {classLearners.map((l) => {
                const coverage = getCoverage(slot, l);

                return (
                  <div
                    key={l.name}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() =>
                      assign(slot, l.name, draggedStaff)
                    }
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

                    <button
                      onClick={() =>
                        assign(slot, l.name, staffList[0])
                      }
                    >
                      Assign
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
