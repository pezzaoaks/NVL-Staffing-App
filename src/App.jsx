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

const parseAssignedStaff = (value) => {
  if (!value && value !== 0) return [];
  const text = Array.isArray(value) ? value.join("|") : String(value);
  return text
    .split(/\s*[|,]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseStaffSheet = (sheet) => {
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet);
  return rows.flatMap((row) =>
    parseAssignedStaff(
      row.Name || row.Staff || row["Staff Name"] || row["Staff Member"] || row["Staff"]
    )
  );
};

export default function App() {
  const [day, setDay] = useState("Monday");
  const [classesData, setClassesData] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [dragged, setDragged] = useState(null);

  const [staff, setStaff] = useState([]);
  const [absentLearners, setAbsentLearners] = useState({});
  const [absentStaff, setAbsentStaff] = useState({});

  const [audit, setAudit] = useState([]);
  const [view, setView] = useState("dashboard");
  const [mobileView, setMobileView] = useState(false);
  const [savedWeek, setSavedWeek] = useState(false);

  const log = (text) => {
    const time = new Date().toLocaleTimeString();
    setAudit((prev) => [`[${time}] ${text}`, ...prev]);
  };

  const getAbsentLearnersForDay = (d) => absentLearners[d] || [];
  const getAbsentStaffForDay = (d) => absentStaff[d] || [];

  const getActiveAssignedStaff = (key, targetDay) => {
    const assignedNames = Array.isArray(assignments[key]) ? assignments[key] : [];
    const absent = getAbsentStaffForDay(targetDay ?? day);
    return assignedNames.filter((name) => !absent.includes(name));
  };

  const toggleAbsentLearner = (learner) => {
    setAbsentLearners((prev) => {
      const current = prev[day] || [];
      const next = current.includes(learner)
        ? current.filter((x) => x !== learner)
        : [...current, learner];
      return { ...prev, [day]: next };
    });
  };

  const toggleAbsentStaff = (staffName) => {
    setAbsentStaff((prev) => {
      const current = prev[day] || [];
      const next = current.includes(staffName)
        ? current.filter((x) => x !== staffName)
        : [...current, staffName];
      return { ...prev, [day]: next };
    });
  };

  const setAbsentLearnersForDay = (learners) => {
    setAbsentLearners((prev) => ({ ...prev, [day]: learners }));
  };

  const setAbsentStaffForDay = (staffNames) => {
    setAbsentStaff((prev) => ({ ...prev, [day]: staffNames }));
  };

  useEffect(() => {
    const saved = localStorage.getItem("nvl-week");
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      setClassesData(data.classesData || []);
      setAssignments(normalizeAssignments(data.assignments || {}));
      setAbsentLearners(
        Array.isArray(data.absentLearners)
          ? { [data.day || "Monday"]: data.absentLearners }
          : data.absentLearners || {}
      );
      setAbsentStaff(
        Array.isArray(data.absentStaff)
          ? { [data.day || "Monday"]: data.absentStaff }
          : data.absentStaff || {}
      );
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

  const normalizeAssignments = (raw) => {
    return Object.entries(raw || {}).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) acc[key] = value;
      else if (typeof value === "number") acc[key] = Array.from({ length: value }, () => "Manual");
      else acc[key] = parseAssignedStaff(value);
      return acc;
    }, {});
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isExcel = file.name.endsWith(".xlsx");
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let parsed = [];
        let sheetStaff = [];

        if (isExcel) {
          const data = new Uint8Array(event.target.result);
          const wb = XLSX.read(data, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          const staffSheetName = wb.SheetNames.find((name) => /^staff(?:s| list)?$/i.test(name));
          sheetStaff = parseStaffSheet(staffSheetName ? wb.Sheets[staffSheetName] : null);

          parsed = json.map((row) => ({
            day: row.Day,
            session: row.Session,
            name: row.Name || row.Class || row.Subject,
            subject: row.Subject,
            lecturer: row.Lecturer,
            room: row.Room,
            supportNeeded: Number(row.Support) || 0,
            learners: (row.Learners || row.Students || "").split("|").filter(Boolean),
            assignedStaff: parseAssignedStaff(
              row.Assigned || row.Staff || row["Assigned Staff"] || row["Staff Assigned"]
            ),
          }));
        } else {
          const lines = event.target.result
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

          const headers = (lines[0] || "").split(",").map((h) => h.trim());

          parsed = lines
            .slice(1)
            .map((row) => {
              const cols = row.split(",");
              if (cols.length < 7) return null;

              const rowData = headers.reduce((acc, header, index) => {
                acc[header] = cols[index]?.trim() || "";
                return acc;
              }, {});

              return {
                day: rowData.Day,
                session: rowData.Session,
                name: rowData.Name || rowData.Class || rowData.Subject,
                subject: rowData.Subject,
                lecturer: rowData.Lecturer,
                room: rowData.Room,
                supportNeeded: Number(rowData.Support) || 0,
                learners: (rowData.Learners || rowData.Students || "").split("|").filter(Boolean),
                assignedStaff: parseAssignedStaff(
                  rowData.Assigned || rowData.Staff || rowData["Assigned Staff"] || rowData["Staff Assigned"]
                ),
              };
            })
            .filter(Boolean);
        }

        setClassesData(parsed);
        setAssignments(
          parsed.reduce((acc, cls) => {
            const key = `${cls.day}-${cls.session}-${cls.name}`;
            if (cls.assignedStaff?.length) acc[key] = cls.assignedStaff;
            return acc;
          }, {})
        );

        setStaff((prevStaff) => [
          ...new Set([
            ...prevStaff,
            ...parsed.flatMap((cls) => cls.assignedStaff || []),
            ...sheetStaff,
          ]),
        ]);

        log("📁 Timetable uploaded");
      } catch (err) {
        console.error(err);
        alert("Upload error — check file format");
      }
    };

    isExcel ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
  };

  const assign = (sessionName, className, staffName) => {
    let selectedStaff = staffName;
    if (!selectedStaff) {
      const available = staff.filter((s) => !getAbsentStaffForDay(day).includes(s));
      const input = prompt(
        `Assign staff to ${className}. Available: ${available.join(", ")}`
      );
      if (!input) return;
      selectedStaff = input.trim();
    }

    if (!staff.includes(selectedStaff)) {
      alert(`Staff member not found: ${selectedStaff}`);
      return;
    }
    if (getAbsentStaffForDay(day).includes(selectedStaff)) {
      alert(`${selectedStaff} is marked absent`);
      return;
    }

    const key = `${day}-${sessionName}-${className}`;
    setAssignments((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      if (current.includes(selectedStaff)) {
        alert(`${selectedStaff} is already assigned to ${className}`);
        return prev;
      }
      return {
        ...prev,
        [key]: [...current, selectedStaff],
      };
    });
    log(`${selectedStaff} → ${className}`);
  };

  const drop = (sessionName, className) => {
    if (!dragged) return;
    assign(sessionName, className, dragged);
  };

  const topRisks = () => {
    return classesData
      .map((cls) => {
        const key = `${cls.day}-${cls.session}-${cls.name}`;
        const assignedNames = getActiveAssignedStaff(key, cls.day);
        const assigned = assignedNames.length;
        const adjusted =
          cls.supportNeeded -
          (cls.learners || []).filter((l) => getAbsentLearnersForDay(cls.day).includes(l)).length;
        return { ...cls, assigned, assignedStaff: assignedNames, adjusted, status: getStatus(assigned, adjusted) };
      })
      .sort((a, b) => score(b.status) - score(a.status))
      .slice(0, 3);
  };

  const dayStatus = (d) => {
    const statuses = classesData
      .filter((c) => c.day === d)
      .map((c) => {
        const key = `${d}-${c.session}-${c.name}`;
        const assignedNames = Array.isArray(assignments[key]) ? assignments[key] : [];
        const activeAssigned = assignedNames.filter((name) => !getAbsentStaffForDay(d).includes(name));
        return getStatus(activeAssigned.length, c.supportNeeded);
      });

    if (statuses.includes("HIGH RISK")) return "HIGH RISK";
    if (statuses.includes("UNDERSTAFFED")) return "UNDERSTAFFED";
    return "SAFE";
  };

  const mobileHeaderStyle = {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  };

  const absentSectionStyle = {
    display: "flex",
    gap: 20,
    marginTop: 20,
    justifyContent: "center",
    alignItems: "flex-start",
    flexDirection: mobileView ? "column" : "row",
  };

  const sessionRowStyle = {
    display: "flex",
    gap: 15,
    flexWrap: "wrap",
    flexDirection: mobileView ? "column" : "row",
  };

  const classCardWidth = (status) => (mobileView ? "100%" : status === "HIGH RISK" ? 260 : 220);

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
        <div style={mobileHeaderStyle}>
          <input className="no-print" type="file" accept=".csv,.xlsx" onChange={handleUpload} />
          <button className="no-print" onClick={() => setView("slt")}>SLT</button>
          <button className="no-print" onClick={saveWeek}>Save week</button>
          <button className="no-print" onClick={exportPDF}>Export PDF</button>
          <button className="no-print" onClick={() => setMobileView((prev) => !prev)}>
            {mobileView ? "Desktop View" : "Mobile View"}
          </button>
          {savedWeek && <span style={{ marginLeft: 8 }}>Saved!</span>}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div>🟢 Safe | 🟠 Understaffed | 🔴 High Risk</div>

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexDirection: mobileView ? "column" : "row" }}>
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

        <div style={absentSectionStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch", minWidth: 240 }}>
            <h4>Learners Absent</h4>
            <select
              multiple
              size={Math.min(8, Math.max(4, Array.from(new Set(classesData.filter((c) => c.day === day).flatMap((c) => c.learners || []))).length))}
              value={getAbsentLearnersForDay(day)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setAbsentLearnersForDay(selected);
              }}
              style={{ minWidth: 220, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
            >
              {Array.from(new Set(classesData.filter((c) => c.day === day).flatMap((c) => c.learners || []))).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <div style={{ minHeight: 32 }}>
              {getAbsentLearnersForDay(day).length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {getAbsentLearnersForDay(day).map((l) => (
                    <span key={l} style={{ padding: "4px 8px", background: "#e5e7eb", borderRadius: 999 }}>
                      {l}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#4b5563" }}>No absent learners selected</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch", minWidth: 240 }}>
            <h4>Staff Absent</h4>
            <select
              multiple
              size={Math.min(8, Math.max(4, staff.length))}
              value={getAbsentStaffForDay(day)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setAbsentStaffForDay(selected);
              }}
              style={{ minWidth: 220, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
            >
              {staff.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div style={{ minHeight: 32 }}>
              {getAbsentStaffForDay(day).length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {getAbsentStaffForDay(day).map((s) => (
                    <span key={s} style={{ padding: "4px 8px", background: "#e5e7eb", borderRadius: 999 }}>
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#4b5563" }}>No absent staff selected</div>
              )}
            </div>
          </div>
        </div>

        <h3 style={{ marginTop: 20 }}>Staff</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {staff
            .filter((s) => !getAbsentStaffForDay(day).includes(s))
            .map((s) => (
              <div
                key={s}
                draggable
                onDragStart={() => setDragged(s)}
                style={{ padding: 10, background: "#ddd", whiteSpace: "normal" }}
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
            <div style={sessionRowStyle}>
              {classesData
                .filter((c) => c.day === day && c.session === session)
                .map((cls) => {
                  const key = `${day}-${session}-${cls.name}`;
                  const assignedNames = getActiveAssignedStaff(key, cls.day);
                  const assigned = assignedNames.length;
                  const adjusted =
                    cls.supportNeeded -
                    (cls.learners || []).filter((l) => getAbsentLearnersForDay(cls.day).includes(l)).length;
                  const status = getStatus(assigned, adjusted);
                  return { ...cls, assigned, assignedStaff: assignedNames, adjusted, status };
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
                      width: classCardWidth(cls.status),
                      ...getHeat(cls.status),
                    }}
                  >
                    <strong>{cls.name}</strong>
                    <div>{cls.subject}</div>
                    <div>
                      {cls.assigned}/{cls.adjusted}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      Learners:
                      <div style={{ marginTop: 4, padding: 8, background: "rgba(255,255,255,0.15)", borderRadius: 6 }}>
                        {cls.learners?.length ? cls.learners.join(", ") : "None"}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      Staff:
                      <div style={{ marginTop: 4, padding: 8, background: "rgba(255,255,255,0.15)", borderRadius: 6 }}>
                        {cls.assignedStaff?.length ? cls.assignedStaff.join(", ") : "None"}
                      </div>
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
          <div>
            {staff
              .filter(
                (s) =>
                  !getAbsentStaffForDay(day).includes(s) &&
                  !Object.values(assignments).flat().includes(s)
              )
              .join(", ") || "No unallocated staff currently."
            }
          </div>
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
