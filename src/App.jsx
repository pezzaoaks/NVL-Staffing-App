
import { useState } from "react";

const learners = [
  { name: "Aamir", class: "Class A", risk: "high", ratio: 2 },
  { name: "Ben", class: "Class B", risk: "medium", ratio: 1 },
  { name: "Chloe", class: "Class A", risk: "low", ratio: 1 },
];

const slots = ["9:00", "10:30"];

const riskColors = {
  high: "#fecaca",
  medium: "#fde68a",
  low: "#bbf7d0",
};

export default function App() {
  const [assignments, setAssignments] = useState({});

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

  return (
    <div>
      <h1>NVL SEND Staffing ✅ VERSION 4</h1>

      {slots.map((slot) => (
        <div key={slot}>
          <h2>{slot}</h2>

          {Object.entries(grouped).map(([className, classLearners]) => {
            let totalRequired = 0;
            let totalAssigned = 0;

            return (
              <div key={className}>
                <h3>
                  {className} — Required: {totalRequired} | Assigned: {totalAssigned}
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
                        marginBottom: 5,
                      }}
                    >
                      <strong>{l.name}</strong> ({l.risk})

                      <div>
                        {coverage.assigned}/{coverage.required}
                      </div>

                      {coverage.gap > 0 && (
                        <div style={{ color: "red" }}>
                          ⚠️ Gap: {coverage.gap}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          const key = `${slot}-${l.name}`;
                          const current = assignments[key] || [];

                          setAssignments({
                            ...assignments,
                            [key]: [...current, "Staff"],
                          });
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
