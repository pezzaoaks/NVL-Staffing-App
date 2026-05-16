
<h1>TESTING CHANGES</h1>

import { useState, useEffect } from "react";

export default function App() {
  const DEV_MODE = true;

  const initialStaff = [
    { name: "Sarah" },
    { name: "Amir" },
    { name: "Leah" },
  ];

  const learners = [
    { name: "Aamir", ratio: 2 },
    { name: "Ben", ratio: 1 },
  ];

  const slots = ["9:00", "10:30"];

  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    if (DEV_MODE && !user) {
      setUser({ name: "Dev User" });
    }
  }, []);

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
    };
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>NVL SEND Staffing</h1>

      {slots.map((slot) => (
        <div key={slot}>
          <h2>{slot}</h2>

          {learners.map((l) => {
            const coverage = getCoverage(slot, l);

            return (
              <div key={l.name}>
                {l.name} — {coverage.assigned}/{coverage.required}

                <button
                  onClick={() => assign(slot, l.name, initialStaff[0])}
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
