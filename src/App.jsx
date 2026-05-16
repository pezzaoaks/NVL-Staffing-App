import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const sessions = ["AM Session","PM Session"];

const getStatus = (assigned, required) => {
  if (assigned >= required) return "SAFE";
  if (assigned === 0) return "HIGH RISK";
  return "UNDERSTAFFED";
};

const getHeat = (status) => {
  if (status === "HIGH RISK") return { background: "#7f1d1d", color: "white" };
  if (status === "UNDERSTAFFED") return { background: "#f59e0b", color: "white" };
  return { background: "#16a34a", color: "white" };
};

const score = (status) =>
  status === "HIGH RISK" ? 3 : status === "UNDERSTAFFED" ? 2 : 1;

export default function App() {
  const [day, setDay] = useState("Monday");
  const [classesData, setClassesData] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [dragged, setDragged] = useState(null);

  const [staff] = useState(["Sarah", "Amir", "Leah"]);
  const [absentLearners, setAbsentLearners] = useState([]);
  const [absentStaff, setAbsentStaff] = useState([]);

  const [audit, setAudit] = useState([]);
  const [view, setView] = useState("dashboard");
  const [savedWeek, setSavedWeek] = useState(false);

  const log = (text) => {
    const time = new Date().toLocaleTimeString();
    setAudit((prev) => [`[${time}] ${text}`, ...prev]);
  };

  useEffect(() => {
    const saved = localStorage.getItem("nvl-week");
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      setClassesData(data.classesData || []);
      setAssignments(data.assignments || {});
      setAbsentLearners(data.absentLearners || []);
      setAbsentStaff(data.absentStaff || []);
      setDay(data.day || "Monday");
      setView(data.view || "dashboard");
      setAudit(data.audit || []);
    } catch (err) {
      console.error("Failed to load saved week:", err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "nvl-week",
      JSON.stringify({
        classesData,
        assignments,
        absentLearners,
        absentStaff,
        day,
        view,
        audit,
      })
    );
  }, [classesData, assignments, absentLearners, absentStaff, day, view, audit]);

  const saveWeek = () => {
    localStorage.setItem(
      "nvl-week",
      JSON.stringify({
        classesData,
        assignments,
        absentLearners,
        absentStaff,
        day,
        view,
        audit,
      })
    );
    setSavedWeek(true);
    log("Weekly save complete");
    window.setTimeout(() => setSavedWeek(false), 2000);
  };

  const exportPDF = () => {
    log("Export PDF requested");
    window.print();
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isExcel = file.name.endsWith(".xlsx");
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let parsed = [];

        if (isExcel) {
          const data = new Uint8Array(event.target.result);
          const wb = XLSX.read(data, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);

          parsed = json.map((row) => ({
            day: row.Day,
            session: row.Session,
            name: row.Class,
            subject: row.Subject,
            lecturer: row.Lecturer,
            room: row.Room,
            supportNeeded: Number(row.Support) || 0,
            learners: row.Students ? row.Students.split("|") : [],
          }));
        } else {
          parsed = event.target.result
            .split("\n")
            .slice(1)
            .map((row) => {
              const cols = row.split(",");
              if (cols.length < 7) return null;

              return {
                day: cols[0]?.trim(),
                session: cols[1]?.trim(),
                name: cols[2]?.trim(),
                subject: cols[3]?.trim(),
                lecturer: cols[4]?.trim(),
                room: cols[5]?.trim(),
                supportNeeded: Number(cols[6]) || 0,
                learners: (cols[7] || "").split("|").filter(Boolean),
              };
            })
            .filter(Boolean);
        }

        setClassesData(parsed);
        log("📁 Timetable uploaded");
      } catch (err) {
        console.error(err);
        alert("Upload error — check file format");
      }
    };

    isExcel ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
  };

  const assign = (sessionName, className, staffName = "Manual") => {
    const key = `${day}-${sessionName}-${className}`;
    setAssignments((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
    log(`${staffName} → ${className}`);
  };

  const drop = (sessionName, className) => {
    if (!dragged) return;
    assign(sessionName, className, dragged);
  };

  const topRisks = () => {
    return classesData
      .map((cls) => {
        const key = `${cls.day}-${cls.session}-${cls.name}`;
        const assigned = assignments[key] || 0;
        const adjusted =
          cls.supportNeeded -
          (cls.learners || []).filter((l) => absentLearners.includes(l)).length;
        return { ...cls, assigned, adjusted, status: getStatus(assigned, adjusted) };
      })
      .sort((a, b) => score(b.status) - score(a.status))
      .slice(0, 3);
  };

  const dayStatus = (d) => {
    const statuses = classesData
      .filter((c) => c.day === d)
      .map((c) => {
        const key = `${d}-${c.session}-${c.name}`;
        return getStatus(assignments[key] || 0, c.supportNeeded);
      });

    if (statuses.includes("HIGH RISK")) return "HIGH RISK";
    if (statuses.includes("UNDERSTAFFED")) return "UNDERSTAFFED";
    return "SAFE";
  };

  if (view === "slt") {
    return (
      <div style={{ padding: 40 }}>
        <button onClick={() => setView("dashboard")}>⬅ Back</button>
        <h1>SLT Priority View</h1>
        {topRisks().map((r) => (
          <div key={r.name} style={{ padding: 20, marginTop: 10, ...getHeat(r.status) }}>
            {r.name} — {r.status}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: 15,
          background: "#111827",
          color: "white",
        }}
      >
        <h2>NVL SEND Staffing</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="no-print" type="file" accept=".csv,.xlsx" onChange={handleUpload} />
          <button className="no-print" onClick={() => setView("slt")}>SLT</button>
          <button className="no-print" onClick={saveWeek}>Save week</button>
          <button className="no-print" onClick={exportPDF}>Export PDF</button>
          {savedWeek && <span style={{ marginLeft: 8 }}>Saved!</span>}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div>🟢 Safe | 🟠 Understaffed | 🔴 High Risk</div>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {days.map((d) => {
            const s = dayStatus(d);
            return (
              <div
                key={d}
                style={{
                  flex: 1,
                  padding: 10,
                  textAlign: "center",
                  borderRadius: 6,
                  ...getHeat(s),
                }}
              >
                {d}
              </div>
            );
          })}
        </div>

        <h3 style={{ marginTop: 20 }}>⚠ Top Risks</h3>
        {topRisks().map((r) => (
          <div key={r.name}>
            {r.name} - {r.status}
          </div>
        ))}

        <div style={{ display: "flex", gap: 20, marginTop: 20, justifyContent: "center", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <h4>Learners Absent</h4>
            {classesData.flatMap((c) => c.learners || []).map((l) => (
              <label key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={absentLearners.includes(l)}
                  onChange={() =>
                    setAbsentLearners((prev) =>
                      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
                    )
                  }
                />
                {l}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <h4>Staff Absent</h4>
            {staff.map((s) => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={absentStaff.includes(s)}
                  onChange={() =>
                    setAbsentStaff((prev) =>
                      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                    )
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <h3 style={{ marginTop: 20 }}>Staff</h3>
        <div style={{ display: "flex", gap: 10 }}>
          {staff
            .filter((s) => !absentStaff.includes(s))
            .map((s) => (
              <div
                key={s}
                draggable
                onDragStart={() => setDragged(s)}
                style={{ padding: 10, background: "#ddd" }}
              >
                {s}
              </div>
            ))}
        </div>

        <div style={{ marginTop: 20 }}>
          {days.map((d) => (
            <button key={d} onClick={() => setDay(d)}>
              {d}
            </button>
          ))}
        </div>

        {sessions.map((session) => (
          <div key={session} style={{ marginTop: 20 }}>
            <h3>{session}</h3>
            <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
              {classesData
                .filter((c) => c.day === day && c.session === session)
                .map((cls) => {
                  const key = `${day}-${session}-${cls.name}`;
                  const assigned = assignments[key] || 0;
                  const adjusted =
                    cls.supportNeeded -
                    (cls.learners || []).filter((l) => absentLearners.includes(l)).length;
                  const status = getStatus(assigned, adjusted);
                  return { ...cls, assigned, adjusted, status };
                })
                .sort((a, b) => score(b.status) - score(a.status))
                .map((cls) => (
                  <div
                    key={cls.name}
                    className={cls.status === "HIGH RISK" ? "flash" : ""}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => drop(session, cls.name)}
                    style={{
                      padding: 15,
                      borderRadius: 8,
                      width: cls.status === "HIGH RISK" ? 260 : 220,
                      ...getHeat(cls.status),
                    }}
                  >
                    <strong>{cls.name}</strong>
                    <div>{cls.subject}</div>
                    <div>
                      {cls.assigned}/{cls.adjusted}
                    </div>
                    <button onClick={() => assign(session, cls.name)}>
                      Assign
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 20 }}>
          <h3>Unallocated Staff</h3>
          <div>No unallocated staff currently.</div>
        </div>

        <div style={{ marginTop: 20 }}>
          <h3>Audit</h3>
          {audit.map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes flash {
          0%{transform:scale(1);}
          50%{transform:scale(1.05);}
          100%{transform:scale(1);}
        }
        .flash{animation:flash 1.2s infinite;}
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
