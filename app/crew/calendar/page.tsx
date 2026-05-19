"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppMode } from "../../context/AppModeContext";
import { supabase } from "../../../lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
  email?: string;
  phone?: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color?: string;
  team_id?: string;
}

interface ShiftAssignment {
  id: string;
  team_id: string;
  member_id: string;
  shift_id?: string | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
}

interface Job {
  id: string;
  title: string;
  scheduled_date: string;
  assigned_to?: string;
  status?: string;
}

interface Availability {
  id: string;
  team_member_id: string;
  date: string;
  available: boolean;
  note?: string;
}

interface DayCell {
  date: Date;
  dateStr: string;
  assignments: ShiftAssignment[];
  jobs: Job[];
  available: boolean | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatTimeStr(t: string | null | undefined): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatHeader(date: Date): { weekday: string; day: string } {
  return {
    weekday: date.toLocaleDateString([], { weekday: "short" }),
    day: date.toLocaleDateString([], { month: "short", day: "numeric" }),
  };
}

function hexToRgb(hex: string): string {
  const clean = (hex || "#888888").replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 136;
  const g = parseInt(clean.substring(2, 4), 16) || 136;
  const b = parseInt(clean.substring(4, 6), 16) || 136;
  return `${r}, ${g}, ${b}`;
}

function isToday(date: Date): boolean {
  return toDateStr(date) === toDateStr(new Date());
}

// Parse "HH:MM:SS" or "HH:MM" to fractional hours (e.g. "13:30" → 13.5)
function timeStrToHours(t: string | null | undefined): number | null {
  if (!t) return null;
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (isNaN(h)) return null;
  return h + m / 60;
}

// ---------------------------------------------------------------------------
// DayTimelineModal  — rows = members, columns = hours
// ---------------------------------------------------------------------------
interface DayTimelineModalProps {
  open: boolean;
  date: Date | null;
  members: TeamMember[];
  assignments: ShiftAssignment[];
  shifts: ShiftTemplate[];
  jobs: Job[];
  onClose: () => void;
}

const TIMELINE_START = 5;  // 5 AM
const TIMELINE_END = 23;   // 11 PM
const TOTAL_HOURS = TIMELINE_END - TIMELINE_START;

function DayTimelineModal({
  open,
  date,
  members,
  assignments,
  shifts,
  jobs,
  onClose,
}: DayTimelineModalProps) {
  if (!date) return null;

  const dateStr = toDateStr(date);
  const dateLabel = date.toLocaleDateString([], {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const activeMemberIds = new Set([
    ...assignments.filter((a) => a.date === dateStr).map((a) => String(a.member_id)),
    ...jobs.filter((j) => j.scheduled_date === dateStr).map((j) => String(j.assigned_to)),
  ]);

  // Active members only, sorted by name
  const activeMembers = members
    .filter((m) => activeMemberIds.has(String(m.id)))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Hour columns: 5 AM … 10 PM
  const hourCols = Array.from({ length: TOTAL_HOURS }, (_, i) => {
    const h = TIMELINE_START + i;
    if (h < 12) return `${h}AM`;
    if (h === 12) return "12PM";
    return `${h - 12}PM`;
  });

  const now = new Date();
  const currentHours = now.getHours() + now.getMinutes() / 60;
  const showNowCol = isToday(date) && currentHours >= TIMELINE_START && currentHours < TIMELINE_END;
  const nowColIndex = Math.floor(currentHours - TIMELINE_START);

  // Is a member working during a given hour?
  function isWorking(memberId: string, hourIndex: number): { active: boolean; isStart: boolean; assignment?: ShiftAssignment } {
    const h = TIMELINE_START + hourIndex;
    for (const a of assignments) {
      if (a.date !== dateStr || String(a.member_id) !== String(memberId)) continue;
      const tmpl = shifts.find((s) => s.id === String(a.shift_id));
      const startH = timeStrToHours(a.start_time || tmpl?.start_time);
      const endH = timeStrToHours(a.end_time || tmpl?.end_time);
      if (startH === null || endH === null) continue;
      if (startH < h + 1 && endH > h) {
        const isStart = Math.floor(startH) === h || (startH >= h && startH < h + 1);
        return { active: true, isStart, assignment: a };
      }
    }
    return { active: false, isStart: false };
  }

  // Print this single day
  const handlePrint = () => {
    const colW = Math.max(28, Math.floor(680 / TOTAL_HOURS));
    const rows = activeMembers.map((member) => {
      const cells = Array.from({ length: TOTAL_HOURS }, (_, i) => {
        const w = isWorking(member.id, i);
        if (!w.active) return `<td style="border:1px solid #ddd;width:${colW}px;"></td>`;
        if (w.isStart && w.assignment) {
          const tmpl = shifts.find((s) => s.id === String(w.assignment!.shift_id));
          const name = tmpl?.name || "Shift";
          const st = formatTimeStr(w.assignment.start_time || tmpl?.start_time);
          const et = formatTimeStr(w.assignment.end_time || tmpl?.end_time);
          return `<td style="border:1px solid #ddd;width:${colW}px;background:#e8f4fd;padding:2px 3px;font-size:8px;font-weight:700;vertical-align:top;line-height:1.2">${name}<br/><span style="font-weight:400;font-size:7px">${st}–${et}</span></td>`;
        }
        return `<td style="border:1px solid #ddd;width:${colW}px;background:#e8f4fd;"></td>`;
      }).join("");
      const rgb = hexToRgb(member.color);
      return `<tr><td style="border:1px solid #ddd;padding:4px 6px;font-weight:600;font-size:10px;white-space:nowrap;background:#fafafa;min-width:110px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${member.color};margin-right:4px;vertical-align:middle"></span>${member.name}</td>${cells}</tr>`;
    }).join("");

    const headerCells = hourCols.map((h) =>
      `<th style="border:1px solid #ddd;padding:3px 2px;font-size:8px;font-weight:600;text-align:center;background:#f0f0f0;white-space:nowrap">${h}</th>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><title>Schedule – ${dateLabel}</title>
    <style>body{font-family:Arial,sans-serif;margin:16px;color:#111}@page{size:landscape;margin:10mm}table{border-collapse:collapse}h2{font-size:13px;margin:0 0 8px}p{font-size:9px;color:#666;margin:0 0 8px}</style>
    </head><body>
    <h2>Crew Schedule — ${dateLabel}</h2>
    <p>${activeMembers.length} member${activeMembers.length !== 1 ? "s" : ""} scheduled · ${TIMELINE_START}:00 AM – ${TIMELINE_END - 12}:00 PM</p>
    <table><thead><tr><th style="border:1px solid #ddd;padding:3px 6px;font-size:9px;font-weight:600;background:#f0f0f0;text-align:left">Name</th>${headerCells}</tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  const COL_W = Math.max(32, Math.floor(760 / TOTAL_HOURS));

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 pointer-events-none ${open ? "opacity-100" : "opacity-0"}`}>
        <div
          className={`pointer-events-auto flex flex-col rounded-2xl shadow-2xl transition-all duration-300 ${open ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}
          style={{
            background: "var(--card-bg, #161b27)",
            border: "1px solid rgba(255,255,255,0.09)",
            width: "min(96vw, 1200px)",
            maxHeight: "90vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)", border: "1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base">{dateLabel}</div>
              <div className="text-xs opacity-40 mt-0.5">
                {activeMembers.length} member{activeMembers.length !== 1 ? "s" : ""} scheduled · hourly coverage
              </div>
            </div>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition hover:bg-white/10 border border-white/10"
              title="Print this day's schedule">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Day
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Table: rows = members, cols = hours */}
          <div className="flex-1 overflow-auto">
            {activeMembers.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm opacity-30">No one scheduled for this day.</div>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed",
                minWidth: `${150 + TOTAL_HOURS * COL_W}px` }}>
                <colgroup>
                  <col style={{ width: "150px", minWidth: "150px" }} />
                  {hourCols.map((_, i) => <col key={i} style={{ width: `${COL_W}px` }} />)}
                </colgroup>
                <thead>
                  <tr>
                    {/* Name col header */}
                    <th className="sticky left-0 z-30 text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ background: "var(--card-bg,#161b27)", borderBottom: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                      Crew Member
                    </th>
                    {hourCols.map((label, i) => {
                      const isNow = showNowCol && i === nowColIndex;
                      return (
                        <th key={i}
                          className="text-center text-[9px] font-semibold py-2"
                          style={{
                            background: isNow
                              ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)"
                              : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "var(--card-bg,#161b27)",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                            borderRight: "1px solid rgba(255,255,255,0.05)",
                            color: isNow ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)" : "rgba(255,255,255,0.35)",
                            whiteSpace: "nowrap",
                          }}>
                          {label}
                          {isNow && <div className="w-1 h-1 rounded-full mx-auto mt-0.5" style={{ background: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)" }} />}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {activeMembers.map((member, rowIdx) => {
                    const rgb = hexToRgb(member.color);
                    const memberJobs = jobs.filter((j) => j.scheduled_date === dateStr && String(j.assigned_to) === String(member.id));
                    const isEven = rowIdx % 2 === 0;
                    return (
                      <tr key={member.id}>
                        {/* Name cell */}
                        <td className="sticky left-0 z-10 px-3 py-2"
                          style={{
                            background: isEven ? "rgba(10,12,18,0.98)" : "rgba(10,12,18,0.95)",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            borderRight: "1px solid rgba(255,255,255,0.1)",
                          }}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: `rgba(${rgb},0.2)`, border: `1.5px solid rgba(${rgb},0.6)`, color: member.color }}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold truncate">{member.name}</div>
                              {member.role && <div className="text-[9px] opacity-40 truncate">{member.role}</div>}
                              {memberJobs.length > 0 && (
                                <div className="text-[8px] mt-0.5" style={{ color: "#f59e0b" }}>
                                  {memberJobs.length} job{memberJobs.length !== 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Hour cells */}
                        {hourCols.map((_, i) => {
                          const w = isWorking(member.id, i);
                          const isNow = showNowCol && i === nowColIndex;
                          return (
                            <td key={i}
                              style={{
                                borderBottom: "1px solid rgba(255,255,255,0.05)",
                                borderRight: "1px solid rgba(255,255,255,0.04)",
                                background: w.active
                                  ? isNow
                                    ? `rgba(${rgb},0.28)`
                                    : `rgba(${rgb},0.18)`
                                  : isNow
                                  ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)"
                                  : "transparent",
                                padding: "2px 3px",
                                verticalAlign: "top",
                                height: "36px",
                              }}>
                              {w.active && w.isStart && w.assignment && (() => {
                                const tmpl = shifts.find((s) => s.id === String(w.assignment!.shift_id));
                                const name = tmpl?.name || "Shift";
                                const st = formatTimeStr(w.assignment.start_time || tmpl?.start_time);
                                const et = formatTimeStr(w.assignment.end_time || tmpl?.end_time);
                                return (
                                  <div>
                                    <div className="text-[8px] font-bold leading-tight truncate" style={{ color: member.color }}>{name}</div>
                                    <div className="text-[7px] opacity-50 leading-tight truncate">{st}–{et}</div>
                                  </div>
                                );
                              })()}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer legend */}
          <div className="flex items-center gap-4 px-6 py-3 border-t text-xs shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-3 rounded-sm" style={{ background: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.18)" }} />
              <span className="opacity-40">Working that hour</span>
            </div>
            {showNowCol && (
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full" style={{ background: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)" }} />
                <span className="opacity-40">Current hour</span>
              </div>
            )}
            <div className="ml-auto opacity-30 text-[10px]">Rows = crew · Columns = hours · {TIMELINE_START}AM–{TIMELINE_END - 12}PM</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// ShiftChip
// ---------------------------------------------------------------------------
function ShiftChip({
  assignment,
  template,
  memberColor,
}: {
  assignment: ShiftAssignment;
  template?: ShiftTemplate;
  memberColor: string;
}) {
  const startTime = assignment.start_time || template?.start_time || "";
  const endTime = assignment.end_time || template?.end_time || "";
  const name = template?.name || "Custom Shift";
  const color = template?.color || memberColor;
  const rgb = hexToRgb(color);

  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl px-2 py-1.5 text-xs transition-all duration-150 hover:scale-[1.02]"
      style={{
        background: `rgba(${rgb}, 0.18)`,
        border: `1px solid rgba(${rgb}, 0.45)`,
      }}
      title={`${name}\n${formatTimeStr(startTime)} – ${formatTimeStr(endTime)}${
        assignment.notes ? `\n${assignment.notes}` : ""
      }`}
    >
      <span className="font-semibold truncate leading-tight" style={{ color }}>
        {name}
      </span>
      <span className="text-[10px] opacity-60 leading-tight">
        {formatTimeStr(startTime)}–{formatTimeStr(endTime)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JobChip
// ---------------------------------------------------------------------------
function JobChip({ job, memberColor }: { job: Job; memberColor: string }) {
  const statusColors: Record<string, string> = {
    completed: "#22c55e",
    in_progress: "#f59e0b",
    "in-progress": "#f59e0b",
    cancelled: "#ef4444",
    scheduled: memberColor,
  };
  const statusColor = statusColors[job.status ?? "scheduled"] ?? memberColor;
  return (
    <div
      className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs cursor-default transition-all duration-150 hover:scale-[1.02]"
      style={{
        background: `rgba(${hexToRgb(statusColor)}, 0.13)`,
        border: `1px solid rgba(${hexToRgb(statusColor)}, 0.4)`,
      }}
      title={`Job: ${job.title}${job.status ? ` (${job.status})` : ""}`}
    >
      <svg
        width="10" height="10" viewBox="0 0 24 24" fill="none"
        stroke={statusColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="shrink-0 opacity-80"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
      <span className="font-medium truncate leading-tight" style={{ color: statusColor }}>
        {job.title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AvailabilityDot
// ---------------------------------------------------------------------------
function AvailabilityDot({ available }: { available: boolean | null }) {
  if (available === null) return null;
  return (
    <span
      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full z-10"
      style={{
        background: available
          ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)"
          : "#ef4444",
        boxShadow: available
          ? "0 0 5px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6)"
          : "0 0 5px rgba(239,68,68,0.6)",
      }}
      title={available ? "Available" : "Unavailable / time-off"}
    />
  );
}

// ---------------------------------------------------------------------------
// Assignment Panel
// ---------------------------------------------------------------------------
interface AssignmentPanelProps {
  open: boolean;
  member: TeamMember | null;
  date: Date | null;
  shiftTemplates: ShiftTemplate[];
  dayAssignments: ShiftAssignment[];
  teamId: string;
  onClose: () => void;
  onSaved: () => void;
}

function AssignmentPanel({
  open,
  member,
  date,
  shiftTemplates,
  dayAssignments,
  teamId,
  onClose,
  onSaved,
}: AssignmentPanelProps) {
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedShiftId) {
      const tmpl = shiftTemplates.find((s) => s.id === selectedShiftId);
      if (tmpl) {
        setStartTime(tmpl.start_time.slice(0, 5));
        setEndTime(tmpl.end_time.slice(0, 5));
      }
    }
  }, [selectedShiftId, shiftTemplates]);

  useEffect(() => {
    if (open) {
      setSelectedShiftId("");
      setStartTime("09:00");
      setEndTime("17:00");
      setNotes("");
      setError(null);
    }
  }, [open, member?.id, date?.toISOString()]);

  const handleSave = async () => {
    if (!member || !date || !teamId) return;
    if (!startTime || !endTime) {
      setError("Start and end times are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from("shift_assignments")
        .insert({
          team_id: Number(teamId),
          member_id: Number(member.id),
          shift_id: selectedShiftId ? Number(selectedShiftId) : null,
          date: toDateStr(date),
          start_time: startTime + ":00",
          end_time: endTime + ":00",
          notes: notes.trim() || null,
        });
      if (insertError) throw insertError;
      setSelectedShiftId("");
      setStartTime("09:00");
      setEndTime("17:00");
      setNotes("");
      onSaved();
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save assignment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    setDeletingId(assignmentId);
    try {
      await supabase.from("shift_assignments").delete().eq("id", assignmentId);
      onSaved();
    } finally {
      setDeletingId(null);
    }
  };

  if (!member || !date) return null;

  const rgb = hexToRgb(member.color || "#888888");
  const dateLabel = date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{
          width: "min(420px, 100vw)",
          background: "var(--card-bg, #161b27)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
            style={{
              background: `rgba(${rgb}, 0.2)`,
              border: `2px solid rgba(${rgb}, 0.6)`,
              color: member.color,
            }}
          >
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{member.name}</div>
            <div className="text-xs opacity-50 truncate">{dateLabel}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition shrink-0"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {dayAssignments.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest opacity-40 mb-2.5">
                Assigned Today
              </div>
              <div className="flex flex-col gap-2">
                {dayAssignments.map((a) => {
                  const tmpl = shiftTemplates.find((s) => s.id === String(a.shift_id));
                  const chipColor = tmpl?.color || member.color;
                  const aRgb = hexToRgb(chipColor);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{
                        background: `rgba(${aRgb}, 0.1)`,
                        border: `1px solid rgba(${aRgb}, 0.25)`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: chipColor }}>
                          {tmpl?.name || "Custom Shift"}
                        </div>
                        <div className="text-[11px] opacity-50 leading-snug">
                          {formatTimeStr(a.start_time)} – {formatTimeStr(a.end_time)}
                          {a.notes && (
                            <span className="ml-2 italic opacity-70">"{a.notes}"</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition shrink-0"
                        style={{ color: "#f87171" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(239,68,68,0.15)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                        }
                        title="Remove assignment"
                      >
                        {deletingId === a.id ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dayAssignments.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
          )}

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest opacity-40 mb-3">
              {dayAssignments.length > 0 ? "Add Another" : "Add Shift"}
            </div>

            {shiftTemplates.length > 0 && (
              <div className="mb-4">
                <label className="text-xs opacity-50 mb-2 block font-medium">
                  Shift Template
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setSelectedShiftId("")}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all text-left"
                    style={
                      selectedShiftId === ""
                        ? {
                            background:
                              "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.18)",
                            border:
                              "1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)",
                            color:
                              "rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.45)",
                          }
                    }
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                    </svg>
                    Custom
                  </button>

                  {shiftTemplates.map((tmpl) => {
                    const tRgb = hexToRgb(tmpl.color || member.color);
                    const isSelected = selectedShiftId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => setSelectedShiftId(tmpl.id)}
                        className="flex flex-col rounded-xl px-3 py-2 text-xs font-medium transition-all text-left"
                        style={
                          isSelected
                            ? {
                                background: `rgba(${tRgb}, 0.2)`,
                                border: `1px solid rgba(${tRgb}, 0.6)`,
                                color: tmpl.color || member.color,
                              }
                            : {
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.45)",
                              }
                        }
                      >
                        <span className="font-semibold truncate">{tmpl.name}</span>
                        <span className="text-[10px] opacity-60 mt-0.5">
                          {formatTimeStr(tmpl.start_time)}–{formatTimeStr(tmpl.end_time)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs opacity-50 mb-1.5 block font-medium">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "inherit",
                    colorScheme: "dark",
                  }}
                />
              </div>
              <div>
                <label className="text-xs opacity-50 mb-1.5 block font-medium">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "inherit",
                    colorScheme: "dark",
                  }}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs opacity-50 mb-1.5 block font-medium">
                Notes <span className="opacity-50">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes for this shift…"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none transition placeholder:opacity-25"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "inherit",
                }}
              />
            </div>

            {error && (
              <div
                className="mb-3 text-xs px-3 py-2 rounded-xl"
                style={{
                  color: "#f87171",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2"
              style={{
                background: saving
                  ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.35)"
                  : "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)",
                color: "#fff",
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Assign Shift
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function CrewCalendarView() {
  const { teamId } = useAppMode();

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<string>("all");

  // Slide-over panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMember, setPanelMember] = useState<TeamMember | null>(null);
  const [panelDate, setPanelDate] = useState<Date | null>(null);

  // Day timeline modal state
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineDate, setTimelineDate] = useState<Date | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);

  // ---- Data fetching ----
  const fetchAll = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const weekStartStr = toDateStr(weekStart);
      const weekEndStr = toDateStr(weekEnd);

      const { data: membersData } = await supabase
        .from("team_members")
        .select("id, name, role, color, email, phone")
        .eq("team_id", teamId)
        .order("name");
      setMembers(membersData ?? []);

      const memberIds = (membersData ?? []).map((m) => m.id);

      const { data: shiftsData } = await supabase
        .from("shifts")
        .select("*")
        .eq("team_id", teamId);
      setShifts(shiftsData ?? []);

      const { data: assignData } = await supabase
        .from("shift_assignments")
        .select("*")
        .eq("team_id", teamId)
        .gte("date", weekStartStr)
        .lte("date", weekEndStr);
      setAssignments(assignData ?? []);

      if (memberIds.length > 0) {
        const { data: jobsData } = await supabase
          .from("jobs")
          .select("id, title, scheduled_date, assigned_to, status")
          .in("assigned_to", memberIds)
          .gte("scheduled_date", weekStartStr)
          .lte("scheduled_date", weekEndStr);
        setJobs(jobsData ?? []);
      } else {
        setJobs([]);
      }

      if (memberIds.length > 0) {
        const { data: availData } = await supabase
          .from("availability")
          .select("*")
          .in("team_member_id", memberIds)
          .gte("date", weekStartStr)
          .lte("date", weekEndStr);
        setAvailability(availData ?? []);
      } else {
        setAvailability([]);
      }
    } catch (err) {
      console.error("CrewCalendar fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ---- Navigation ----
  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  // ---- Panel ----
  const openPanel = (member: TeamMember, date: Date) => {
    setPanelMember(member);
    setPanelDate(date);
    setPanelOpen(true);
  };

  const closePanel = () => setPanelOpen(false);

  // ---- Timeline modal ----
  const openTimeline = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimelineDate(date);
    setTimelineOpen(true);
  };

  const closeTimeline = () => setTimelineOpen(false);

  const getPanelAssignments = (): ShiftAssignment[] => {
    if (!panelMember || !panelDate) return [];
    const dateStr = toDateStr(panelDate);
    return assignments.filter(
      (a) => String(a.member_id) === String(panelMember.id) && a.date === dateStr
    );
  };

  function getMemberDayCell(memberId: string, date: Date): DayCell {
    const dateStr = toDateStr(date);
    const dayAssignments = assignments.filter(
      (a) => String(a.member_id) === String(memberId) && a.date === dateStr
    );
    const dayJobs = jobs.filter(
      (j) => j.assigned_to === memberId && j.scheduled_date === dateStr
    );
    const avail = availability.find(
      (a) => a.team_member_id === memberId && a.date === dateStr
    );
    return {
      date,
      dateStr,
      assignments: dayAssignments,
      jobs: dayJobs,
      available: avail != null ? avail.available : null,
    };
  }

  function getWeekSummary(memberId: string): { shifts: number; jobs: number } {
    return {
      shifts: assignments.filter((a) => String(a.member_id) === String(memberId)).length,
      jobs: jobs.filter((j) => j.assigned_to === memberId).length,
    };
  }

  // ---- Week print ----
  function printWeekSchedule() {
    const weekDaysLocal = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const dayHeaders = weekDaysLocal.map((d) =>
      d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
    );

    const rows = members.map((member) => {
      const cells = weekDaysLocal.map((day) => {
        const dateStr = toDateStr(day);
        const dayAssigns = assignments.filter(
          (a) => a.date === dateStr && String(a.member_id) === String(member.id)
        );
        const dayJobs = jobs.filter(
          (j) => j.scheduled_date === dateStr && String(j.assigned_to) === String(member.id)
        );
        const avail = availability.find(
          (a) => a.team_member_id === member.id && a.date === dateStr
        );
        const isUnavail = avail?.available === false;

        if (dayAssigns.length === 0 && dayJobs.length === 0) {
          return `<td style="border:1px solid #e0e0e0;padding:4px 6px;background:${isUnavail ? "#fff0f0" : "#fff"};min-width:80px;vertical-align:top;font-size:9px;color:#bbb">${isUnavail ? "Off" : ""}</td>`;
        }

        const shiftLines = dayAssigns.map((a) => {
          const tmpl = shifts.find((s) => s.id === String(a.shift_id));
          const name = tmpl?.name || "Shift";
          const st = formatTimeStr(a.start_time || tmpl?.start_time);
          const et = formatTimeStr(a.end_time || tmpl?.end_time);
          return `<div style="font-weight:700;font-size:9px;color:#1a1a2e">${name}</div><div style="font-size:8px;color:#555">${st}–${et}</div>`;
        }).join("");

        const jobLines = dayJobs.map((j) =>
          `<div style="font-size:8px;color:#b45309;margin-top:1px">📋 ${j.title}</div>`
        ).join("");

        return `<td style="border:1px solid #e0e0e0;padding:4px 6px;background:#f0f7ff;min-width:80px;vertical-align:top">${shiftLines}${jobLines}</td>`;
      }).join("");

      return `<tr>
        <td style="border:1px solid #e0e0e0;padding:4px 8px;background:#fafafa;white-space:nowrap;vertical-align:middle">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${member.color};margin-right:5px;vertical-align:middle"></span>
          <strong style="font-size:10px">${member.name}</strong>
          ${member.role ? `<div style="font-size:8px;color:#888;margin-left:13px">${member.role}</div>` : ""}
        </td>
        ${cells}
      </tr>`;
    }).join("");

    const headerCells = dayHeaders.map((d, i) => {
      const isT = isToday(weekDaysLocal[i]);
      return `<th style="border:1px solid #e0e0e0;padding:5px 6px;text-align:center;font-size:9px;background:${isT ? "#e8f4fd" : "#f5f5f5"};font-weight:700;white-space:nowrap">${d}${isT ? " ●" : ""}</th>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Crew Schedule – ${weekLabel}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 12px; color: #111; }
      @page { size: landscape; margin: 8mm; }
      h2 { font-size: 14px; margin: 0 0 4px; }
      p { font-size: 9px; color: #666; margin: 0 0 8px; }
      table { border-collapse: collapse; width: 100%; }
    </style></head><body>
    <h2>Crew Schedule — ${weekLabel}</h2>
    <p>Printed ${new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · ${members.length} crew members</p>
    <table>
      <thead><tr>
        <th style="border:1px solid #e0e0e0;padding:5px 8px;text-align:left;font-size:9px;background:#f5f5f5;font-weight:700">Crew Member</th>
        ${headerCells}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  // Count how many members are scheduled for a given day (for the header badge)
  function getDayScheduledCount(date: Date): number {
    const dateStr = toDateStr(date);
    const memberIds = new Set([
      ...assignments.filter((a) => a.date === dateStr).map((a) => String(a.member_id)),
      ...jobs.filter((j) => j.scheduled_date === dateStr).map((j) => String(j.assigned_to)),
    ]);
    return memberIds.size;
  }

  const roles = [
    "all",
    ...Array.from(new Set(members.map((m) => m.role).filter(Boolean))),
  ];
  const filteredMembers =
    filterRole === "all"
      ? members
      : members.filter((m) => m.role === filterRole);

  const toggleRow = (id: string) => {
    setCollapsedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const weekLabel = `${weekStart.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} – ${weekEnd.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "var(--background, #0f1117)",
        color: "var(--foreground, #e8e8f0)",
      }}
    >
      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-30 flex flex-wrap items-center gap-3 px-5 py-3 border-b border-white/[0.07]"
        style={{ background: "var(--background, #0f1117)" }}
      >
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/10 transition"
          title="Back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mr-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="font-bold text-base tracking-tight">Crew Schedule</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className="px-3 py-1 rounded-xl text-xs font-medium transition-all duration-150"
              style={
                filterRole === r
                  ? {
                      background: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)",
                      border: "1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6)",
                      color: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.5)",
                    }
              }
            >
              {r === "all" ? "All roles" : r}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-white/10 transition hover:bg-white/10"
          >
            Today
          </button>
          <button
            onClick={prevWeek}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/10 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={nextWeek}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/10 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <button
          onClick={printWeekSchedule}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-white/10 hover:bg-white/10 transition"
          title="Print this week's schedule"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Week
        </button>

        <button
          onClick={fetchAll}
          className={`w-8 h-8 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/10 transition ${
            loading ? "animate-spin" : ""
          }`}
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {!teamId ? (
        <div className="flex items-center justify-center py-24 text-sm opacity-40">
          Loading team…
        </div>
      ) : (
        <>
          {/* ── Grid ── */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: "900px" }}>
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-20 text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest border-b border-r border-white/[0.07]"
                    style={{
                      background: "var(--background, #0f1117)",
                      width: "180px",
                      minWidth: "180px",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    {filteredMembers.length} member
                    {filteredMembers.length !== 1 ? "s" : ""}
                  </th>
                  {weekDays.map((day) => {
                    const { weekday, day: dayLabel } = formatHeader(day);
                    const today = isToday(day);
                    const scheduledCount = getDayScheduledCount(day);

                    return (
                      <th
                        key={toDateStr(day)}
                        className="text-center py-3 px-2 border-b border-r border-white/[0.07] last:border-r-0"
                        style={{
                          background: today
                            ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.06)"
                            : "transparent",
                          minWidth: "120px",
                        }}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className="text-[11px] font-semibold uppercase tracking-widest"
                            style={{
                              color: today
                                ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)"
                                : "rgba(255,255,255,0.35)",
                            }}
                          >
                            {weekday}
                          </span>
                          <span
                            className="text-sm font-bold"
                            style={{
                              color: today
                                ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)"
                                : "rgba(255,255,255,0.75)",
                            }}
                          >
                            {dayLabel}
                          </span>
                          {today && (
                            <span
                              className="w-1.5 h-1.5 rounded-full mt-0.5"
                              style={{
                                background: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)",
                              }}
                            />
                          )}
                          {/* Timeline button */}
                          <button
                            onClick={(e) => openTimeline(day, e)}
                            className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all duration-150 group/tbtn"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.35)",
                            }}
                            onMouseEnter={(e) => {
                              const btn = e.currentTarget;
                              btn.style.background = today
                                ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)"
                                : "rgba(255,255,255,0.08)";
                              btn.style.borderColor = today
                                ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)"
                                : "rgba(255,255,255,0.2)";
                              btn.style.color = today
                                ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),1)"
                                : "rgba(255,255,255,0.7)";
                            }}
                            onMouseLeave={(e) => {
                              const btn = e.currentTarget;
                              btn.style.background = "rgba(255,255,255,0.04)";
                              btn.style.borderColor = "rgba(255,255,255,0.08)";
                              btn.style.color = "rgba(255,255,255,0.35)";
                            }}
                            title={`View hourly coverage for ${dayLabel}`}
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.5"
                              strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {scheduledCount > 0 ? `${scheduledCount} on` : "view"}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-sm opacity-40">
                      Loading crew schedule…
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-sm opacity-40">
                      No crew members found.{" "}
                      <a href="/crew" className="underline opacity-70">
                        Add members
                      </a>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const collapsed = collapsedRows.has(member.id);
                    const summary = getWeekSummary(member.id);
                    const rgb = hexToRgb(member.color || "#888888");

                    return (
                      <tr
                        key={member.id}
                        className="group border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors"
                      >
                        {/* Member info cell */}
                        <td
                          className="sticky left-0 z-10 border-r border-white/[0.07] px-3 py-3 align-top"
                          style={{
                            background: "var(--background, #0f1117)",
                            width: "180px",
                            minWidth: "180px",
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs mt-0.5"
                              style={{
                                background: `rgba(${rgb}, 0.2)`,
                                border: `2px solid rgba(${rgb}, 0.6)`,
                                color: member.color,
                              }}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-sm leading-tight truncate">
                                  {member.name}
                                </span>
                                <button
                                  onClick={() => toggleRow(member.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                                  title={collapsed ? "Expand row" : "Collapse row"}
                                >
                                  <svg
                                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
                                  >
                                    <polyline points="18 15 12 9 6 15" />
                                  </svg>
                                </button>
                              </div>
                              <div
                                className="text-[11px] font-medium rounded-md px-1.5 py-0.5 inline-block mt-0.5"
                                style={{
                                  background: `rgba(${rgb}, 0.15)`,
                                  color: member.color,
                                }}
                              >
                                {member.role || "Crew"}
                              </div>
                              {!collapsed && (summary.shifts > 0 || summary.jobs > 0) && (
                                <div className="text-[10px] opacity-40 mt-1">
                                  {summary.shifts > 0 &&
                                    `${summary.shifts} shift${summary.shifts !== 1 ? "s" : ""}`}
                                  {summary.shifts > 0 && summary.jobs > 0 && " · "}
                                  {summary.jobs > 0 &&
                                    `${summary.jobs} job${summary.jobs !== 1 ? "s" : ""}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Day cells */}
                        {weekDays.map((day) => {
                          const cell = getMemberDayCell(member.id, day);
                          const today = isToday(day);
                          const isEmpty =
                            cell.assignments.length === 0 && cell.jobs.length === 0;
                          const isUnavailable = cell.available === false;

                          return (
                            <td
                              key={cell.dateStr}
                              onClick={() => openPanel(member, day)}
                              className="border-r border-white/[0.06] last:border-r-0 px-2 py-2 align-top relative transition-colors cursor-pointer"
                              style={{
                                minWidth: "120px",
                                background: today
                                  ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.03)"
                                  : isUnavailable
                                  ? "rgba(239,68,68,0.04)"
                                  : "transparent",
                                verticalAlign: collapsed ? "middle" : "top",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLTableCellElement).style.background =
                                  today
                                    ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.07)"
                                    : "rgba(255,255,255,0.04)";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLTableCellElement).style.background =
                                  today
                                    ? "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.03)"
                                    : isUnavailable
                                    ? "rgba(239,68,68,0.04)"
                                    : "transparent";
                              }}
                            >
                              <AvailabilityDot available={cell.available} />

                              {isUnavailable && (
                                <div
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    backgroundImage:
                                      "repeating-linear-gradient(-45deg, rgba(239,68,68,0.05) 0px, rgba(239,68,68,0.05) 1px, transparent 1px, transparent 8px)",
                                  }}
                                />
                              )}

                              {!collapsed && (
                                <div className="flex flex-col gap-1 relative z-10">
                                  {cell.assignments.map((a) => {
                                    const tmpl = shifts.find((s) => s.id === String(a.shift_id));
                                    return (
                                      <ShiftChip
                                        key={a.id}
                                        assignment={a}
                                        template={tmpl}
                                        memberColor={member.color}
                                      />
                                    );
                                  })}
                                  {cell.jobs.map((j) => (
                                    <JobChip key={j.id} job={j} memberColor={member.color} />
                                  ))}
                                  {isEmpty && (
                                    <div className="h-8 flex items-center justify-center">
                                      <svg
                                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round"
                                        className="opacity-0 group-hover:opacity-20 transition-opacity"
                                      >
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              )}

                              {collapsed && (
                                <div className="flex justify-center items-center gap-1">
                                  {cell.assignments.length > 0 && (
                                    <span
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg"
                                      style={{
                                        background: `rgba(${rgb}, 0.2)`,
                                        color: member.color,
                                      }}
                                    >
                                      {cell.assignments.length}S
                                    </span>
                                  )}
                                  {cell.jobs.length > 0 && (
                                    <span
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg"
                                      style={{
                                        background: `rgba(${rgb}, 0.15)`,
                                        color: member.color,
                                      }}
                                    >
                                      {cell.jobs.length}J
                                    </span>
                                  )}
                                  {cell.assignments.length === 0 && cell.jobs.length === 0 && (
                                    <svg
                                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                                      stroke="currentColor" strokeWidth="2"
                                      strokeLinecap="round" strokeLinejoin="round"
                                      className="opacity-0 group-hover:opacity-20 transition-opacity"
                                    >
                                      <line x1="12" y1="5" x2="12" y2="19" />
                                      <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Legend ── */}
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-white/[0.06] mt-2">
            <span className="text-xs opacity-30 uppercase tracking-widest">Legend</span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm border border-white/30"
                style={{ background: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)" }}
              />
              <span className="text-xs opacity-50">Shift</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm border border-white/30"
                style={{ background: "rgba(245,158,11,0.15)" }}
              />
              <span className="text-xs opacity-50">Job</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)" }}
              />
              <span className="text-xs opacity-50">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs opacity-50">Unavailable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(-45deg, rgba(239,68,68,0.3) 0px, rgba(239,68,68,0.3) 1px, transparent 1px, transparent 5px)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              />
              <span className="text-xs opacity-50">Time off</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-xs opacity-30">Click any cell to assign · Click clock icon for hourly view</span>
            </div>
          </div>
        </>
      )}

      {/* ── Slide-over assignment panel ── */}
      <AssignmentPanel
        open={panelOpen}
        member={panelMember}
        date={panelDate}
        shiftTemplates={shifts}
        dayAssignments={getPanelAssignments()}
        teamId={String(teamId ?? "")}
        onClose={closePanel}
        onSaved={fetchAll}
      />

      {/* ── Day timeline modal ── */}
      <DayTimelineModal
        open={timelineOpen}
        date={timelineDate}
        members={members}
        assignments={assignments}
        shifts={shifts}
        jobs={jobs}
        onClose={closeTimeline}
      />
    </div>
  );
}