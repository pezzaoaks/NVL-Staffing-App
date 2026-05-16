
import { useState } from "react";

const sitesData = {
  Lambeth: [
    { name: "Aamir", class: "Class A", risk: "high", ratio: 2 },
    { name: "Ben", class: "Class B", risk: "medium", ratio: 1 },
  ],
  Bromley: [
    { name: "Chloe", class: "Class C", risk: "low", ratio: 1 },
  ],
  Bexley: [
    { name: "Daniel", class: "Class D", risk: "high", ratio: 2 },
  ],
};

const staffList = ["Sarah", "Amir", "Leah"];
const slots = ["9:00", "10:30"];

const riskWeight = { low: 1, medium: 2, high: 3 };

export default function App() {
  const [site, setSite] = useState("Lambeth");
  const [assignments, setAssignments] = useState({});

  const learners = sitesData[site];

  // ✅ Coverage
  const getCoverage = (slot, learner) => {
    const key = `${site}-${slot}-${learner.name}`;
    const assigned = assignments[key] || [];

    return {
      assigned: assigned.length,
      required: learner.ratio,
      gap: learner.ratio - assigned.length,
    };
  };

  // ✅ Assign
  const assign = (slot, learner) => {
    const key = `${site}-${slot}-${learner}`;
    const current = assignments[key] || [];

    setAssignments({
      ...assignments,
      [key]: [...current, staffList[0]],
    });
  };

  // ✅ AUTO RISK SCORE
  const getRiskScore = (slot, learner) => {
    const c = getCoverage(slot, learner);

    if (c.gap <= 0) return "LOW";

    const score = c.gap * riskWeight[learner.risk];

    if (score >= 4) return "CRITICAL";
    if (score >= 2) return "HIGH";
    return "MEDIUM";
  };

  // ✅ SLT DASHBOARD CALC
  let totalRequired = 0;
  let totalAssigned = 0;
  let criticalCount = 0;

  learners.forEach((l) => {
    const c = getCoverage(slots[0], l);
    totalRequired += c.required;
    totalAssigned += c.assigned;

    if (getRiskScore(slots[0], l) === "CRITICAL") {
      criticalCount++;
    }
  });

  const overallStatus =
    criticalCount > 0
      ? "🔴 HIGH RISK"
      : totalAssigned < totalRequired
      ? "🟠 UNDERSTAFFED"
      : "🟢 SAFE";

  return (
    <div style={{ padding: 20 }}>
      <h1>SEND Staffing System 🚀 V7</h1>

      {/* ✅ SITE SELECTOR */}
      <div style={{ marginBottom: 20 }}>
        <strong>Site: </strong>
        {Object.keys(sitesData).map((s) => (
          <button
            key={s}
            onClick={() => setSite(s)}
            style={{
              marginRight: 10,
              background: site === s ? "black" : "#ddd",
              color: site === s ? "white" : "black",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ✅ SLT DASHBOARD */}
      <div
        style={{
          background: "#e5e7eb",
          padding: 15,
          marginBottom: 20,
        }}
      >
        <h2>SLT Dashboard</h2>
        <div>Total Required: {totalRequired}</div>
        <div>Total Assigned: {totalAssigned}</div>
        <div>Status: {overallStatus}</div>
        <div>Critical Learners: {criticalCount}</div>
      </div>

      {/* ✅ TIMETABLE */}
      {slots.map((slot) => (
        <div key={slot} style={{ marginBottom: 20 }}>
          <h3>{slot}</h3>

          {learners.map((l) => {
            const c = getCoverage(slot, l);
            const riskScore = getRiskScore(slot, l);

            return (
              <div
                key={l.name}
                style={{
                  border: "1px solid #ccc",
                  padding: 10,
                  marginTop: 5,
                }}
              >
                <strong>{l.name}</strong> ({l.risk})

                <div>
                  {c.assigned}/{c.required}
                </div>

                <div>
                  Risk Level: <strong>{riskScore}</strong>
                </div>

                {c.gap > 0 && (
                  <div style={{ color: "red" }}>
                    ⚠️ Short by {c.gap}
                  </div>
                )}

                <button
                  onClick={() => assign(slot, l.name)}
                >
                  Assign
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
