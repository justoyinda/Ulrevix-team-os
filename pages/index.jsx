import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = "hello.ulrevix@gmail.com";
const INITIAL_MEMBER_EMAILS = ["oyindamolaagbaje.work@gmail.com"];
const INACTIVITY_LIMIT = 5 * 60 * 1000;
const GOLD = "#C8A96E";
const TEAL = "#7EB8A4";
const PURPLE = "#9B8EC4";
const RED = "#C47B7B";
const BG = "#0A0A0F";
const CARD = "rgba(255,255,255,0.02)";
const BORDER = "rgba(255,255,255,0.07)";

const KEYS = {
  launched: "ulx_launched",
  launchDate: "ulx_launch_date",
  users: "ulx_users",
  passwords: "ulx_passwords",
  pendingEmails: "ulx_pending_emails",
  pwResets: "ulx_pw_resets",
  profileRequests: "ulx_profile_requests",
  projects: "ulx_projects",
  activity: "ulx_activity",
  weeklyReports: "ulx_weekly",
  monthlyReports: "ulx_monthly",
  messages: "ulx_messages",
  groups: "ulx_groups",
  notifs: "ulx_notifs",
  leaveRequests: "ulx_leave_requests",
  blockedEmails: "ulx_blocked_emails",
  emailHistory: "ulx_email_history",
  pwResetHistory: "ulx_pw_reset_history",
  profileChangeHistory: "ulx_profile_change_history",
  meetings: "ulx_meetings",
  meetingDeleteRequests: "ulx_meeting_delete_requests",
  meetingHistory: "ulx_meeting_history",
  reportDeleteRequests: "ulx_report_delete_requests",
  aiReports: "ulx_ai_reports",
  issues: "ulx_issues",
  presence: "ulx_presence",
  weeklyRankings: "ulx_weekly_rankings",
  monthlyRankings: "ulx_monthly_rankings",
  weeklySpotlights: "ulx_weekly_spotlights",
  growth: "ulx_growth",
  taskUploads: "ulx_task_uploads",
  taskUploadReviews: "ulx_task_upload_reviews",
  workHours: "ulx_work_hours",
  performanceSnapshots: "ulx_performance_snapshots",
  performanceGrowthMetrics: "ulx_performance_growth_metrics",
  aboutSections: "ulx_about_sections",
  confidentialityAgreement: "ulx_confidentiality_agreement",
  confidentialitySigned: "ulx_confidentiality_signed",
};

const store = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
  patch: (key, patchFn) => {
    const cur = store.get(key);
    store.set(key, patchFn(cur));
  },
};

const hashPw = (pw) => {
  let h = 0;
  for (let i = 0; i < pw.length; i++)
    h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0;
  return h.toString(36) + pw.length.toString(36) + "ulx";
};

const getWeekNum = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7));
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = [GOLD, TEAL, PURPLE, RED, "#7BA8C4", "#A4C47B", "#C4A17B", "#7BC4B8"];

function addActivity(userId, action, target, projectId = null) {
  const acts = store.get(KEYS.activity) || [];
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = acts.filter((a) => new Date(a.time).getTime() > oneWeekAgo);
  filtered.unshift({ id: Date.now() + Math.random(), userId, action, target, projectId, time: new Date().toISOString() });
  store.set(KEYS.activity, filtered.slice(0, 200));
}

function updatePresence(email, online) {
  const presence = store.get(KEYS.presence) || {};
  const existing = presence[email] || {};
  presence[email] = {
    lastSeen: new Date().toISOString(),
    online,
    sessionStart: online ? (existing.sessionStart || new Date().toISOString()) : null,
    offlineSince: !online ? new Date().toISOString() : null,
  };
  store.set(KEYS.presence, presence);
}

function addNotif(forEmail, type, text) {
  const notifs = store.get(KEYS.notifs) || [];
  notifs.unshift({ id: Date.now() + Math.random(), forEmail, type, text, read: false, createdAt: new Date().toISOString() });
  store.set(KEYS.notifs, notifs);
}

const sbAuth = {
  async getPassword(email) {
    const { data } = await supabase.from("passwords").select("hashed_pw").eq("email", email).single();
    return data?.hashed_pw || null;
  },
  async setPassword(email, hashedPw) {
    await supabase.from("passwords").upsert({ email, hashed_pw: hashedPw });
  },
  async deletePassword(email) {
    await supabase.from("passwords").delete().eq("email", email);
  },
  async getUser(email) {
    const { data } = await supabase.from("users").select("*").eq("email", email).single();
    return data || null;
  },
  async getAllUsers() {
    const { data } = await supabase.from("users").select("*");
    if (!data) return {};
    return data.reduce((acc, u) => { acc[u.email] = u; return acc; }, {});
  },
  async setUser(email, userData) {
    await supabase.from("users").upsert({ email, ...userData });
  },
  async getPendingEmails() {
    const { data } = await supabase.from("pending_emails").select("*");
    return data || [];
  },
  async addPendingEmail(email, role = "member", addedBy = "") {
    await supabase.from("pending_emails").upsert({ email, role, added_by: addedBy });
  },
  async removePendingEmail(email) {
    await supabase.from("pending_emails").delete().eq("email", email);
  },
  async getBlockedEmails() {
    const { data } = await supabase.from("blocked_emails").select("email");
    return (data || []).map((r) => r.email);
  },
  async addBlockedEmail(email, blockedBy = "") {
    await supabase.from("blocked_emails").upsert({ email, blocked_by: blockedBy });
  },
  async removeBlockedEmail(email) {
    await supabase.from("blocked_emails").delete().eq("email", email);
  },
  async getPwResets() {
    const { data } = await supabase.from("pw_resets").select("*").eq("status", "pending");
    return data || [];
  },
  async addPwReset(email) {
    const id = Date.now().toString();
    await supabase.from("pw_resets").insert({ id, email, status: "pending", requested_at: new Date().toISOString() });
    return id;
  },
  async updatePwReset(id, status) {
    await supabase.from("pw_resets").update({ status }).eq("id", id);
  },
  async getPwResetById(id) {
    const { data } = await supabase.from("pw_resets").select("*").eq("id", id).single();
    return data || null;
  },
  async getEmailHistory() {
    const { data } = await supabase.from("email_history").select("*").order("at", { ascending: false });
    return data || [];
  },
  async addEmailHistory(email, action, role, byEmail) {
    await supabase.from("email_history").insert({ id: Date.now().toString() + Math.random(), email, action, role, by_email: byEmail, at: new Date().toISOString() });
  },
  async getConfidentialitySigned() {
    const { data } = await supabase.from("confidentiality_signed").select("*");
    if (!data) return {};
    return data.reduce((acc, r) => {
      acc[r.email] = { signedAt: r.signed_at, fullName: r.full_name, signDate: r.sign_date, agreedAt: r.signed_at };
      return acc;
    }, {});
  },
  async setConfidentialitySigned(email, fullName, signDate) {
    await supabase.from("confidentiality_signed").upsert({ email, full_name: fullName, sign_date: signDate, signed_at: new Date().toISOString() });
  },
};

const peerConnections = {};
const localStreamRef = { current: null };
const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

async function getLocalStream(callType) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(callType === "video" ? { audio: true, video: true } : { audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  } catch (err) { console.error("Could not get media stream:", err); return null; }
}

function stopLocalStream() {
  if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
}

function closePeerConnections() {
  Object.values(peerConnections).forEach(pc => pc.close());
  Object.keys(peerConnections).forEach(k => delete peerConnections[k]);
}

const SIG_KEY = "ulx_webrtc_signals";

function sendSignal(fromEmail, toEmail, callId, type, data) {
  const signals = store.get(SIG_KEY) || [];
  signals.push({ id: Date.now().toString() + Math.random(), fromEmail, toEmail, callId, type, data, createdAt: Date.now() });
  const cutoff = Date.now() - 5 * 60 * 1000;
  store.set(SIG_KEY, signals.filter(s => s.createdAt > cutoff));
}

function readSignals(forEmail, callId, afterTimestamp = 0) {
  const signals = store.get(SIG_KEY) || [];
  return signals.filter(s => s.toEmail === forEmail && s.callId === callId && s.createdAt > afterTimestamp);
}

function saveCallLog(callId, callerEmail, callType, isGroup, groupId, participants, startedAt, endedAt, allUsers, groups) {
  const logs = store.get("ulx_call_logs") || [];
  const durationMs = endedAt - startedAt;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  logs.unshift({ id: callId, callerEmail, callType, isGroup, groupId, groupName: isGroup ? (groups.find(g => g.id === groupId)?.name || groupId) : null, participants: [...new Set(participants)], startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(), duration: `${mins}m ${secs}s`, loggedAt: new Date().toISOString() });
  store.set("ulx_call_logs", logs.slice(0, 500));
}

async function saveTaskUpload(projectId, taskId, file, uploaderEmail) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const key = `${KEYS.taskUploads}_${projectId}_${taskId}`;
        let existing = store.get(key) || [];
        existing.push({ id: Date.now().toString() + Math.random().toString(36).slice(2), fileName: file.name, fileType: file.type, fileSize: file.size, uploadedBy: uploaderEmail, uploadedAt: new Date().toISOString(), data: reader.result });
        store.set(key, existing);
        resolve(existing);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getTaskUploads(projectId, taskId) {
  try { return store.get(`${KEYS.taskUploads}_${projectId}_${taskId}`) || []; } catch { return []; }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getGrowthData(email) {
  const all = store.get(KEYS.growth) || {};
  return all[email] || { goals: [], adminAssigned: [], monthly: [], yearly: [] };
}

function saveGrowthData(email, data) {
  const all = store.get(KEYS.growth) || {};
  all[email] = data;
  store.set(KEYS.growth, all);
}

const GOAL_CATEGORIES = ["Technical Skills","Communication","Leadership","Creativity","Productivity","Collaboration","Problem Solving","Industry Knowledge"];

const AUTO_GOALS_BY_ROLE = {
  default: ["Complete all assigned tasks on time this month","Submit weekly and monthly reports consistently","Participate actively in team communications","Attend all scheduled meetings","Document at least one process or learning this month"],
  admin: ["Review and respond to all team requests within 48 hours","Provide structured feedback to at least one team member","Identify one team bottleneck and propose a solution","Track team progress across all active projects","Lead or facilitate at least one team meeting"],
};

function getAutoGoals(userRole) {
  const base = AUTO_GOALS_BY_ROLE.default;
  const roleSpecific = AUTO_GOALS_BY_ROLE[userRole] || [];
  return [...base, ...roleSpecific].map((text, i) => ({ id: `auto_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`, text, category: GOAL_CATEGORIES[i % GOAL_CATEGORIES.length], source: "auto", status: "active" }));
}

function ensureMonthlyGoals(email, month, year, userRole) {
  const data = getGrowthData(email);
  const existing = data.goals.filter((g) => g.month === month && g.year === year);
  const launchDate = store.get(KEYS.launchDate);
  const launchMonth = launchDate ? new Date(launchDate).getMonth() : 0;
  const launchYear = launchDate ? new Date(launchDate).getFullYear() : year;
  const isBeforeLaunch = year < launchYear || (year === launchYear && month < launchMonth);
  if (existing.length < 3 && !isBeforeLaunch) {
    const autoGoals = getAutoGoals(userRole).slice(0, Math.max(0, 3 - existing.length)).map((g) => ({ ...g, month, year }));
    data.goals = [...data.goals, ...autoGoals];
    saveGrowthData(email, data);
  }
  return getGrowthData(email);
}

function calculateMemberScore(email, period = "weekly") {
  const projects = store.get(KEYS.projects) || [];
  const allTasks = projects.flatMap((p) => p.tasks || []);
  const activity = store.get(KEYS.activity) || [];
  const weeklyReports = store.get(KEYS.weeklyReports) || [];
  const monthlyReports = store.get(KEYS.monthlyReports) || [];
  const messages = store.get(KEYS.messages) || [];
  const now = new Date();
  const periodMs = period === "weekly" ? 7 * 86400000 : 30 * 86400000;
  const cutoff = new Date(now.getTime() - periodMs);
  const myTasks = allTasks.filter((t) => t.assignee === email);
  const periodTasks = myTasks.filter((t) => new Date(t.updatedAt || t.createdAt || 0) >= cutoff);
  const completedTotal = myTasks.filter((t) => t.status === "Completed").length;
  const completedPeriod = periodTasks.filter((t) => t.status === "Completed").length;
  const inProgressPeriod = periodTasks.filter((t) => t.status === "In Progress").length;
  const completionRate = myTasks.length ? (completedTotal / myTasks.length) : 0;
  const completionScore = Math.round(completionRate * 30);
  const periodActivity = activity.filter((a) => a.userId === email && new Date(a.time) >= cutoff).length;
  const activityScore = Math.min(25, Math.round(periodActivity * 2.5));
  const periodTaskScore = Math.min(20, completedPeriod * 4);
  const now2 = new Date();
  const week = getWeekNum(now2);
  const month = now2.getMonth();
  const year = now2.getFullYear();
  const hasWeeklyReport = weeklyReports.some((r) => r.email === email && r.week === week && r.year === year);
  const hasMonthlyReport = monthlyReports.some((r) => r.email === email && r.month === month && r.year === year);
  const reportScore = period === "weekly" ? (hasWeeklyReport ? 15 : 0) : (hasMonthlyReport ? 15 : 0);
  const periodMessages = messages.filter((m) => m.from === email && new Date(m.sentAt) >= cutoff).length;
  const msgScore = Math.min(10, Math.round(periodMessages * 1));
  const total = completionScore + activityScore + periodTaskScore + reportScore + msgScore;
  return { total, breakdown: { completion: completionScore, activity: activityScore, tasks: periodTaskScore, reports: reportScore, collaboration: msgScore }, stats: { completedTotal, completedPeriod, inProgressPeriod, totalTasks: myTasks.length, periodActivity, hasWeeklyReport, hasMonthlyReport } };
}

function savePerformanceSnapshot(email, month, year, snapshotData) {
  const snapshots = store.get(KEYS.performanceSnapshots) || [];
  const existingIdx = snapshots.findIndex((s) => s.email === email && s.month === month && s.year === year);
  const entry = { id: `${email}_${month}_${year}`, email, month, year, snapshot: snapshotData, savedAt: new Date().toISOString() };
  if (existingIdx >= 0) snapshots[existingIdx] = entry;
  else snapshots.unshift(entry);
  store.set(KEYS.performanceSnapshots, snapshots.slice(0, 2400));
}

function computeOverallInsight(score, uniqueHours, requiredHours) {
  const hoursOk = uniqueHours >= requiredHours * 0.8;
  const allTasksDone = score === 100;
  const excelling = [];
  const improving = [];
  const needsImprovement = [];
  if (score === 100 || score >= 75) excelling.push("Task completion rate");
  else if (score >= 45) improving.push("Task completion rate");
  else needsImprovement.push("Task completion rate");
  if (hoursOk) excelling.push("Platform engagement hours");
  else if (uniqueHours >= requiredHours * 0.5) improving.push("Platform engagement hours");
  else needsImprovement.push("Platform engagement hours");
  if (excelling.length === 0) excelling.push("Consistency and follow-through");
  if (improving.length === 0) improving.push("Output momentum");
  if (needsImprovement.length === 0) needsImprovement.push("Sustaining current performance level");
  let overallInsight = "";
  if (allTasksDone && hoursOk) overallInsight = `Outstanding performance — all tasks completed and platform hours fully met. Excelling in ${excelling.join(" and ")}. Keep sustaining this level of output and engagement.`;
  else if (allTasksDone && !hoursOk) overallInsight = `All assigned tasks have been completed — excellent delivery. Excelling in ${excelling.filter(e => e !== "Platform engagement hours").join(", ") || "task delivery"}. Platform engagement hours are still building; increasing active time will strengthen the overall performance picture.`;
  else if (hoursOk && score >= 60) overallInsight = `Meeting expectations on both hours and task delivery. Currently excelling in ${excelling.join(", ")}. Continue building momentum — ${improving.length > 0 ? improving.join(" and ") + " are areas to keep developing" : "sustain the current pace"}.`;
  else if (hoursOk && score < 60) overallInsight = `Platform engagement hours are solid. Task completion (${score}%) needs more focus — prioritise delivery on outstanding tasks. Currently improving: ${improving.join(", ") || "output consistency"}. Needs attention: ${needsImprovement.filter(e => e !== "Platform engagement hours").join(", ") || "task completion rate"}.`;
  else if (!hoursOk && score >= 60) overallInsight = `Good task output (${score}%) but active platform hours are below threshold. Excelling in ${excelling.filter(e => e !== "Platform engagement hours").join(", ") || "task delivery"}. Needs improvement: consistent platform presence.`;
  else overallInsight = `Below expectations on both hours and task completion (${score}%). Needs immediate focus on: ${needsImprovement.join(", ")}. Currently improving: ${improving.join(", ") || "general output"}. Excelling in: ${excelling.join(", ")}.`;
  return { overallInsight, excelling, improving, needsImprovement };
}

function generateGrowthMetrics(email) {
  const snapshots = (store.get(KEYS.performanceSnapshots) || []).filter((s) => s.email === email).sort((a, b) => { if (a.year !== b.year) return a.year - b.year; return a.month - b.month; });
  if (snapshots.length < 2) return [];
  const periods = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const periodDefs = [{ label: "3 Months", months: 3 }, { label: "6 Months", months: 6 }, { label: "9 Months", months: 9 }, { label: "1 Year", months: 12 }];
  periodDefs.forEach(({ label, months }) => {
    const cutoffDate = new Date(currentYear, currentMonth - months + 1, 1);
    const cutoffMonth = cutoffDate.getMonth();
    const cutoffYear = cutoffDate.getFullYear();
    const relevant = snapshots.filter((s) => { if (s.year > cutoffYear) return true; if (s.year === cutoffYear && s.month >= cutoffMonth) return true; return false; });
    if (relevant.length < 2) return;
    const avgScore = Math.round(relevant.reduce((sum, s) => sum + (s.snapshot.score || 0), 0) / relevant.length);
    const avgHoursPercent = Math.round(relevant.reduce((sum, s) => sum + (s.snapshot.hoursPercent || 0), 0) / relevant.length);
    const totalCompleted = relevant.reduce((sum, s) => sum + (s.snapshot.done || 0), 0);
    const totalActive = relevant.reduce((sum, s) => sum + (s.snapshot.active || 0), 0);
    const excellingCounts = {};
    const improvingCounts = {};
    const needsCounts = {};
    relevant.forEach((s) => {
      (s.snapshot.excelling || []).forEach((e) => { excellingCounts[e] = (excellingCounts[e] || 0) + 1; });
      (s.snapshot.improving || []).forEach((e) => { improvingCounts[e] = (improvingCounts[e] || 0) + 1; });
      (s.snapshot.needsImprovement || []).forEach((e) => { needsCounts[e] = (needsCounts[e] || 0) + 1; });
    });
    const topExcelling = Object.entries(excellingCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const topImproving = Object.entries(improvingCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const topNeeds = Object.entries(needsCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    if (topExcelling.length === 0) topExcelling.push("Consistency and follow-through");
    if (topImproving.length === 0) topImproving.push("Output momentum");
    if (topNeeds.length === 0) topNeeds.push("Sustaining current performance level");
    const firstSnap = relevant[0];
    const lastSnap = relevant[relevant.length - 1];
    periods.push({ periodLabel: label, months, startMonth: firstSnap.month, startYear: firstSnap.year, endMonth: lastSnap.month, endYear: lastSnap.year, avgScore, avgHoursPercent, totalCompleted, totalActive, excelling: topExcelling, improving: topImproving, needsImprovement: topNeeds, monthsCovered: relevant.length, generatedAt: new Date().toISOString() });
  });
  return periods;
}
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0A0A0F;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
  textarea,input{font-family:'Sora',sans-serif;}
  textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.2);}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
`;

const Inp = ({ label, value, onChange, type = "text", placeholder, style: s, autoComplete }) => (
  <div style={{ marginBottom: 16, ...s }}>
    {label && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 7, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>}
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete || "off"} style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }} />
  </div>
);

const Btn = ({ children, onClick, variant = "primary", disabled, style: s }) => {
  const styles = {
    primary: { background: GOLD, color: BG },
    secondary: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: `1px solid ${BORDER}` },
    danger: { background: RED + "22", color: RED, border: `1px solid ${RED}44` },
    ghost: { background: "transparent", color: "rgba(255,255,255,0.4)", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "10px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Mono',monospace", letterSpacing: "0.05em", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", ...styles[variant], ...s }}>
      {children}
    </button>
  );
};

const Badge = ({ text, color }) => (
  <span style={{ padding: "3px 10px", borderRadius: 20, background: color + "22", color, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 600, border: `1px solid ${color}44`, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{text}</span>
);

const Modal = ({ title, children, onClose, width = 480 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
    <div style={{ width, maxHeight: "85vh", overflowY: "auto", background: "#111118", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, animation: "fadeIn 0.2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{title}</h3>
        {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>}
      </div>
      {children}
    </div>
  </div>
);

const EmptyState = ({ icon, title, sub }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center" }}>
    <div style={{ fontSize: 40, opacity: 0.12, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>{title}</div>
    {sub && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.18)" }}>{sub}</div>}
  </div>
);

const Avatar = ({ name = "?", color = GOLD, size = 36 }) => {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 700, color: BG, fontFamily: "'DM Mono',monospace", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.08)" }}>
      {initials}
    </div>
  );
};

const ProgressBar = ({ pct, color = GOLD, height = 5 }) => (
  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: height, height, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: height, background: color, transition: "width 0.8s ease" }} />
  </div>
);

const statusColor = (s) => ({ "Not Started": "rgba(255,255,255,0.25)", "In Progress": GOLD, Completed: TEAL }[s] || BORDER);

const PresenceDot = ({ email, size = 10 }) => {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    const refresh = () => { const presence = store.get(KEYS.presence) || {}; setInfo(presence[email] || null); };
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [email]);
  if (!info) return null;
  const lastSeenMs = new Date(info.lastSeen).getTime();
  const stale = Date.now() - lastSeenMs > 2 * 60 * 1000;
  const isOnline = info.online && !stale;
  const offlineTimestamp = info.offlineSince || info.lastSeen;
  const color = isOnline ? "#4CAF50" : "rgba(255,255,255,0.25)";
  const label = isOnline ? `Active · since ${timeAgo(info.sessionStart || info.lastSeen)}` : `Offline · last seen ${timeAgo(offlineTimestamp)}`;
  return (
    <div title={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: isOnline ? `0 0 0 2px #4CAF5044` : "none" }} />
      <span style={{ fontSize: 10, color: isOnline ? "#4CAF50" : "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
};

const DEFAULT_CONFIDENTIALITY_BLOCKS = [
  { type: "text", content: `# ULREVIX CONFIDENTIALITY AND BUILD AGREEMENT\n\n^Effective upon digital signature below^\n\n## 1. PARTIES\n\nThis Confidentiality and Build Agreement ("Agreement") is entered into between Ulrevix ("the Company") and the individual identified by the signature below ("the Member").\n\n## 2. CONFIDENTIAL INFORMATION\n\nThe Member acknowledges that in the course of their engagement with Ulrevix, they will have access to confidential and proprietary information including but not limited to: business strategies, financial data, product development plans, creative works, platform operations, technical systems, client information, internal processes, team structures, and all communications conducted through the Ulrevix Team OS platform ("Confidential Information").\n\n## 3. OBLIGATIONS OF CONFIDENTIALITY\n\nThe Member agrees to:\n\n**3.1** Keep all Confidential Information strictly private and not disclose it to any third party without prior written consent from the Company.\n\n**3.2** Use Confidential Information solely for the purpose of fulfilling their role within Ulrevix.\n\n**3.3** Not copy, reproduce, distribute, or transmit any Confidential Information beyond what is necessary for their assigned duties.\n\n**3.4** Immediately notify the Company upon becoming aware of any actual or potential breach of confidentiality.\n\n## 4. BUILD AGREEMENT\n\nThe Member acknowledges and agrees that:\n\n**4.1** All work, deliverables, content, code, strategies, creative materials, and any other outputs produced during their engagement with Ulrevix are the sole intellectual property of Ulrevix.\n\n**4.2** The Member waives any claim to intellectual property rights over work produced in their capacity as a Ulrevix team member.\n\n**4.3** Upon termination of engagement, the Member will return or permanently delete all Confidential Information in their possession.\n\n## 5. NON-SOLICITATION\n\nThe Member agrees not to solicit, recruit, or engage any Ulrevix team member, partner, or collaborator for a competing venture for a period of twelve (12) months following the conclusion of their engagement.\n\n## 6. PLATFORM CONDUCT\n\nThe Member agrees that all activity conducted on the Ulrevix Team OS platform is monitored and logged for operational and accountability purposes, and consents to such monitoring as a condition of access.\n\n## 7. CONSEQUENCES OF BREACH\n\nThe Member understands that any breach of this Agreement may result in immediate termination of their engagement, legal action, and forfeiture of any compensation owed.\n\n## 8. GOVERNING AGREEMENT\n\nBy signing below, the Member confirms they have read, understood, and agree to be bound by all terms of this Agreement in full.` },
];

const ConfidentialityGate = ({ user, onSigned }) => {
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState("");
  const [signDate] = useState(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const agreementData = store.get(KEYS.confidentialityAgreement);
  const blocks = agreementData?.content || DEFAULT_CONFIDENTIALITY_BLOCKS;

  const parseInline = (text) => {
    const parts = [];
    const regex = /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]|\[hl=([^\]]+)\]([\s\S]*?)\[\/hl\]|\[size=(\d+)\]([\s\S]*?)\[\/size\]|\*\*([\s\S]*?)\*\*|_([\s\S]*?)_|__([\s\S]*?)__/g;
    let last = 0; let match; let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
      if (match[1] !== undefined) parts.push(<span key={key++} style={{ color: match[1] }}>{parseInline(match[2])}</span>);
      else if (match[3] !== undefined) parts.push(<span key={key++} style={{ background: match[3], padding: "1px 4px", borderRadius: 3 }}>{parseInline(match[4])}</span>);
      else if (match[5] !== undefined) parts.push(<span key={key++} style={{ fontSize: parseInt(match[5]) }}>{parseInline(match[6])}</span>);
      else if (match[7] !== undefined) parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[7]}</strong>);
      else if (match[8] !== undefined) parts.push(<em key={key++}>{match[8]}</em>);
      else if (match[9] !== undefined) parts.push(<span key={key++} style={{ textDecoration: "underline" }}>{match[9]}</span>);
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
    return parts.length ? parts : text;
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, li) => {
      if (line.startsWith("# ")) return <div key={li} style={{ fontSize: 20, fontWeight: 900, color: GOLD, letterSpacing: "-0.02em", marginBottom: 10, marginTop: 14 }}>{parseInline(line.slice(2))}</div>;
      if (line.startsWith("## ")) return <div key={li} style={{ fontSize: 15, fontWeight: 700, color: TEAL, marginBottom: 8, marginTop: 12 }}>{parseInline(line.slice(3))}</div>;
      if (line.startsWith("### ")) return <div key={li} style={{ fontSize: 13, fontWeight: 700, color: PURPLE, marginBottom: 6, marginTop: 10 }}>{parseInline(line.slice(4))}</div>;
      if (line.startsWith("^") && line.endsWith("^")) return <div key={li} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: 5, marginTop: 8 }}>{parseInline(line.slice(1, -1))}</div>;
      if (line.trim() === "") return <div key={li} style={{ height: 8 }} />;
      return <p key={li} style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.85, marginBottom: 8 }}>{parseInline(line)}</p>;
    });
  };

  const handleSign = async () => {
    setErr("");
    if (!agreed) { setErr("You must check the agreement box to proceed."); return; }
    if (!fullName.trim()) { setErr("Please enter your full name to sign."); return; }
    setSubmitting(true);
    await sbAuth.setConfidentialitySigned(user.email, fullName.trim(), signDate);
    addActivity(user.email, "signed the Confidentiality and Build Agreement", "", null);
    addNotif(ADMIN_EMAIL, "task", `${user.email} has signed the Confidentiality and Build Agreement.`);
    setSubmitting(false);
    onSigned();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 3000, display: "flex", flexDirection: "column", fontFamily: "'Sora',sans-serif", overflowY: "auto" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 28px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: `1px solid ${GOLD}44`, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: GOLD, letterSpacing: "0.1em" }}>ULREVIX TEAM OS · REQUIRED AGREEMENT</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>Confidentiality & Build Agreement</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Please read the entire agreement carefully before signing. You must sign this agreement to access the platform.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "28px 32px", marginBottom: 28 }}>
          {blocks.map((block, bi) => block.type === "text" ? (<div key={bi} style={{ marginBottom: 10 }}>{renderFormattedText(block.content)}</div>) : (
            <div key={bi} style={{ overflowX: "auto", marginBottom: 18 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                <tbody>{block.rows.map((row, ri) => (<tr key={ri} style={{ background: ri === 0 ? "rgba(200,169,110,0.08)" : ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>{row.map((cell, ci) => (<td key={ci} style={{ border: `1px solid ${BORDER}`, padding: "8px 12px", color: ri === 0 ? GOLD : "rgba(255,255,255,0.65)", fontWeight: ri === 0 ? 600 : 400, fontFamily: ri === 0 ? "'DM Mono',monospace" : "'Sora',sans-serif" }}>{cell}</td>))}</tr>))}</tbody>
              </table>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}33`, borderRadius: 14, padding: "28px 32px" }}>
          <div style={{ fontSize: 11, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 20 }}>DIGITAL SIGNATURE</div>
          <div onClick={() => setAgreed(!agreed)} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 24, cursor: "pointer" }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${agreed ? TEAL : GOLD}`, background: agreed ? TEAL + "33" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: TEAL, flexShrink: 0, marginTop: 1 }}>{agreed ? "✓" : ""}</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>I have read, understood, and agree to be fully bound by the terms of this Confidentiality and Build Agreement. I understand that this is a legally binding document and that my digital signature below constitutes my acceptance.</p>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 7 }}>FULL LEGAL NAME (Signature)</div>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Type your full name exactly as it appears on your ID" style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", fontFamily: "'Sora',sans-serif" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 7 }}>DATE</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8 }}>{signDate}</div>
          </div>
          {err && <div style={{ padding: "10px 14px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 8, color: RED, fontSize: 13, marginBottom: 16 }}>{err}</div>}
          <Btn onClick={handleSign} disabled={submitting} style={{ width: "100%", padding: "14px", fontSize: 14 }}>{submitting ? "Signing…" : "I Agree & Sign This Agreement →"}</Btn>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>By clicking above, your digital signature, name, and the timestamp will be permanently recorded on the Ulrevix platform.</p>
        </div>
      </div>
    </div>
  );
};

const PreLaunch = ({ onLaunch }) => {
  const [confirm, setConfirm] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora',sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(200,169,110,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(200,169,110,0.03) 1px,transparent 1px)`, backgroundSize: "60px 60px" }} />
      <div style={{ position: "absolute", top: "20%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle,rgba(200,169,110,0.07) 0%,transparent 70%)`, filter: "blur(60px)" }} />
      <div style={{ position: "relative", textAlign: "center", maxWidth: 560, padding: 40 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px", border: `1px solid ${GOLD}44`, borderRadius: 8, marginBottom: 40 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: GOLD, letterSpacing: "0.12em" }}>ULREVIX TEAM OS · READY TO LAUNCH</span>
        </div>
        <h1 style={{ fontSize: 54, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 20 }}>Day <span style={{ color: GOLD }}>One</span><br />Starts Now.</h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 48 }}>Your team intelligence platform is configured and ready.<br />Once launched, the clock starts — real-time tracking begins.</p>
        {!confirm ? (
          <button onClick={() => setConfirm(true)} style={{ padding: "18px 48px", background: GOLD, border: "none", borderRadius: 12, color: BG, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>LAUNCH PLATFORM →</button>
        ) : (
          <div style={{ background: "rgba(200,169,110,0.08)", border: `1px solid ${GOLD}44`, borderRadius: 14, padding: 28 }}>
            <p style={{ color: "#fff", marginBottom: 20, fontSize: 15, lineHeight: 1.6 }}>Confirm launch? This will start real-time tracking for your entire team from this moment.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn onClick={onLaunch} style={{ padding: "12px 28px" }}>CONFIRM LAUNCH</Btn>
              <Btn variant="secondary" onClick={() => setConfirm(false)}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState("choose");
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetId, setResetId] = useState(null);

  useEffect(() => {
    if (mode !== "resetWaiting" || !resetId) return;
    const interval = setInterval(async () => {
      const r = await sbAuth.getPwResetById(resetId);
      if (r?.status === "approved") setMode("resetNew");
      if (r?.status === "rejected") { setMode("login"); setErr("Password reset was rejected. Use your existing password."); }
    }, 3000);
    return () => clearInterval(interval);
  }, [mode, resetId]);

  const handleLoginOrRegister = async () => {
    setErr(""); setInfo(""); setLoading(true);
    const em = email.trim().toLowerCase();
    try {
      const blockedEmails = await sbAuth.getBlockedEmails();
      if (blockedEmails.includes(em)) { setErr("This email has been blocked. Contact your admin."); setLoading(false); return; }

      const pendingRows = await sbAuth.getPendingEmails();
      const pendingEmails = pendingRows.map(r => r.email);
      const emailHistory = await sbAuth.getEmailHistory();

      const adminRoleEmails = emailHistory.filter(h => h.action === "authorized" && h.role === "admin" && h.email !== ADMIN_EMAIL).map(h => h.email);
      const allAdminEmails = [...new Set([ADMIN_EMAIL, ...adminRoleEmails])];

      if (role === "member" && allAdminEmails.includes(em)) { setErr("This email is not authorized for this role."); setLoading(false); return; }
      if (role === "admin" && !allAdminEmails.includes(em)) { setErr("This email is not authorized for this role."); setLoading(false); return; }

      const allowedEmails = role === "admin" ? allAdminEmails : [...INITIAL_MEMBER_EMAILS, ...pendingEmails].filter(e => !allAdminEmails.includes(e));
      if (!allowedEmails.includes(em) && !(role === "admin" && em === ADMIN_EMAIL)) { setErr("This email is not authorized for this role."); setLoading(false); return; }

      const pendingReset = await sbAuth.getPwResets();
      const myReset = pendingReset.find(r => r.email === em && r.status === "pending");
      if (myReset) { setResetId(myReset.id); setMode("resetWaiting"); setLoading(false); return; }

      const existingPw = await sbAuth.getPassword(em);
      if (!existingPw) { setMode("register"); setLoading(false); return; }

      if (hashPw(pw) !== existingPw) { setErr("Incorrect password."); setLoading(false); return; }

      let userRecord = await sbAuth.getUser(em);
      if (!userRecord) {
        const allUsers = await sbAuth.getAllUsers();
        const colorIndex = Object.keys(allUsers).length % COLORS.length;
        userRecord = { email: em, name: em.split("@")[0], role: allAdminEmails.includes(em) ? "admin" : "member", color: COLORS[colorIndex] };
        await sbAuth.setUser(em, userRecord);
      }
      userRecord.email = em;
      onLogin(userRecord);
    } catch (e) { setErr("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const handleRegister = async () => {
    setErr(""); setLoading(true);
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); setLoading(false); return; }
    const em = email.trim().toLowerCase();
    try {
      await sbAuth.setPassword(em, hashPw(pw));
      let userRecord = await sbAuth.getUser(em);
      if (!userRecord) {
        const allUsers = await sbAuth.getAllUsers();
        const emailHistory = await sbAuth.getEmailHistory();
        const adminRoleEmails = emailHistory.filter(h => h.action === "authorized" && h.role === "admin").map(h => h.email);
        const allAdminEmails = [...new Set([ADMIN_EMAIL, ...adminRoleEmails])];
        const colorIndex = Object.keys(allUsers).length % COLORS.length;
        userRecord = { email: em, name: em.split("@")[0], role: allAdminEmails.includes(em) ? "admin" : "member", color: COLORS[colorIndex], dept: "", title: "", status: "", team: "", registered_at: new Date().toISOString() };
        await sbAuth.setUser(em, userRecord);
      }
      addActivity(em, "joined the platform", "", null);
      userRecord.email = em;
      onLogin(userRecord);
    } catch (e) { setErr("Registration failed. Please try again."); }
    setLoading(false);
  };

  const handleResetRequest = async () => {
    setErr(""); setLoading(true);
    const em = email.trim().toLowerCase();
    try {
      const pendingRows = await sbAuth.getPendingEmails();
      const pendingEmails = pendingRows.map(r => r.email);
      const allowedEmails = [...INITIAL_MEMBER_EMAILS, ...pendingEmails, ADMIN_EMAIL];
      if (!allowedEmails.includes(em)) { setErr("Email not recognized."); setLoading(false); return; }
      const existing = await sbAuth.getPwResets();
      const myReset = existing.find(r => r.email === em && r.status === "pending");
      if (myReset) { setResetId(myReset.id); setMode("resetWaiting"); setLoading(false); return; }
      const id = await sbAuth.addPwReset(em);
      addNotif(ADMIN_EMAIL, "pwReset", `Password reset requested by ${em}`);
      setResetId(id);
      setMode("resetWaiting");
    } catch (e) { setErr("Could not send reset request. Please try again."); }
    setLoading(false);
  };

  const handleSetNewPw = async () => {
    setErr(""); setLoading(true);
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); setLoading(false); return; }
    const em = email.trim().toLowerCase();
    try {
      await sbAuth.setPassword(em, hashPw(pw));
      await sbAuth.updatePwReset(resetId, "used");
      setInfo("Password updated! You can now sign in.");
      setMode("login");
    } catch (e) { setErr("Could not update password. Please try again."); }
    setLoading(false);
  };

  const BgGrid = () => (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(200,169,110,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(200,169,110,0.025) 1px,transparent 1px)`, backgroundSize: "60px 60px" }} />
      <div style={{ position: "absolute", top: "15%", right: "20%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle,rgba(126,184,164,0.05) 0%,transparent 70%)`, filter: "blur(60px)" }} />
    </>
  );

  if (mode === "choose") return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora',sans-serif", position: "relative", overflow: "hidden" }}>
      <BgGrid />
      <div style={{ position: "relative", width: 440, padding: "48px 40px", background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", border: `1px solid ${GOLD}44`, borderRadius: 8, marginBottom: 24 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: GOLD, letterSpacing: "0.1em" }}>ULREVIX TEAM OS</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>Welcome Back</h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Sign in as your role to continue</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[{ r: "admin", label: "Admin", icon: "◈", desc: "Full platform access" }, { r: "member", label: "Member", icon: "◎", desc: "Team member access" }].map(({ r, label, icon, desc }) => (
            <button key={r} onClick={() => { setRole(r); setMode("login"); }} style={{ padding: "24px 16px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 12, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = GOLD + "11"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}>
              <div style={{ fontSize: 24, color: GOLD, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const isLogin = mode === "login";
  const isRegister = mode === "register";

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora',sans-serif", position: "relative", overflow: "hidden" }}>
      <BgGrid />
      <div style={{ position: "relative", width: 440, padding: "40px 36px", background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 16, animation: "fadeIn 0.3s ease" }}>
        <button onClick={() => { setMode("choose"); setErr(""); setInfo(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 13, marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Badge text={role === "admin" ? "ADMIN" : "MEMBER"} color={role === "admin" ? GOLD : TEAL} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 14, marginBottom: 6 }}>
            {mode === "resetRequest" ? "Reset Password" : mode === "resetWaiting" ? "Awaiting Approval" : mode === "resetNew" ? "Set New Password" : isRegister ? "Create Password" : "Sign In"}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {isRegister ? "First time? Set your password to activate your account." : mode === "resetWaiting" ? "Your request has been sent to the admin." : "Enter your credentials to continue."}
          </p>
        </div>
        {err && <div style={{ padding: "10px 14px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 8, color: RED, fontSize: 13, marginBottom: 16 }}>{err}</div>}
        {info && <div style={{ padding: "10px 14px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 8, color: TEAL, fontSize: 13, marginBottom: 16 }}>{info}</div>}
        {mode === "resetWaiting" && (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${GOLD}44`, borderTop: `3px solid ${GOLD}`, animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7 }}>Waiting for admin to approve your password reset request.<br /><span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>You cannot log in until this is resolved.</span></p>
            <Btn variant="ghost" onClick={() => setMode("choose")} style={{ marginTop: 20, fontSize: 12 }}>← Back to login</Btn>
          </div>
        )}
        {(isLogin || isRegister || mode === "resetRequest" || mode === "resetNew") && (
          <>
            {(isLogin || isRegister || mode === "resetRequest") && <Inp label="Email Address" value={email} onChange={setEmail} type="email" placeholder={role === "admin" ? "admin@email.com" : "your@email.com"} />}
            {(isLogin || isRegister || mode === "resetNew") && <Inp label={isRegister || mode === "resetNew" ? "New Password" : "Password"} value={pw} onChange={setPw} type="password" placeholder="At least 6 characters" autoComplete="new-password" />}
            {(isRegister || mode === "resetNew") && <Inp label="Confirm Password" value={pw2} onChange={setPw2} type="password" placeholder="Repeat password" autoComplete="new-password" />}
            <Btn onClick={mode === "resetRequest" ? handleResetRequest : mode === "resetNew" ? handleSetNewPw : isRegister ? handleRegister : handleLoginOrRegister} disabled={loading} style={{ width: "100%", padding: "13px", marginBottom: 14 }}>
              {loading ? "Please wait…" : isRegister ? "CREATE PASSWORD & SIGN IN" : mode === "resetRequest" ? "SEND RESET REQUEST" : mode === "resetNew" ? "SAVE NEW PASSWORD" : "SIGN IN →"}
            </Btn>
            {isLogin && <div style={{ textAlign: "center" }}><button onClick={() => { setMode("resetRequest"); setErr(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer" }}>Forgot password? Request a reset</button></div>}
          </>
        )}
      </div>
    </div>
  );
};
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "projects", label: "Projects", icon: "◈" },
  { id: "tasks", label: "My Tasks", icon: "◻" },
  { id: "team", label: "Team", icon: "◎" },
  { id: "analytics", label: "Analytics", icon: "▲" },
  { id: "reports", label: "Reports", icon: "▣" },
  { id: "meetings", label: "Meetings", icon: "◷" },
  { id: "activity", label: "Activity & Chat", icon: "◌" },
  { id: "ai", label: "AI Insights", icon: "✦" },
  { id: "issues", label: "Issues", icon: "⚑" },
  { id: "performance", label: "Performance", icon: "◆" },
  { id: "spotlight", label: "Member Spotlight", icon: "🌟" },
  { id: "growth", label: "Growth", icon: "◑" },
  { id: "roleClarity", label: "Role Clarity", icon: "◑" },
  { id: "about", label: "About Ulrevix", icon: "◐" },
  { id: "profile", label: "My Profile", icon: "◉" },
  { id: "admin", label: "Admin Panel", icon: "⚙", adminOnly: true },
];

const Sidebar = ({ view, setView, user, unreadCount }) => (
  <div style={{ width: 216, minHeight: "100vh", background: "#0D0D14", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0 }}>
    <div style={{ padding: "0 18px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${GOLD},#9B7A42)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: BG }}>U</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em" }}>ULREVIX</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>TEAM OS</div>
        </div>
      </div>
    </div>
    <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
      {NAV_ITEMS.filter((n) => !n.adminOnly || user.role === "admin").map(({ id, label, icon }) => {
        const active = view === id;
        return (
          <button key={id} onClick={() => setView(id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 11px", marginBottom: 2, background: active ? GOLD + "18" : "transparent", border: active ? `1px solid ${GOLD}33` : "1px solid transparent", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
            <span style={{ fontSize: 13, color: active ? GOLD : "rgba(255,255,255,0.35)" }}>{icon}</span>
            <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? GOLD : "rgba(255,255,255,0.45)", flex: 1 }}>{label}</span>
            {id === "activity" && unreadCount > 0 && <span style={{ background: GOLD, color: BG, fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 5px" }}>{unreadCount}</span>}
          </button>
        );
      })}
    </nav>
    <div style={{ padding: "14px 18px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={user.name || user.email} color={user.color || GOLD} size={30} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(user.name || user.email).split(" ")[0]}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{user.role}</div>
        </div>
      </div>
    </div>
  </div>
);

const TopBar = ({ title, user, onSignOut, notifCount, onNotif, timer }) => {
  const [now, setNow] = useState(new Date());
  const launchDate = store.get(KEYS.launchDate);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const daysSinceLaunch = launchDate ? Math.floor((now - new Date(launchDate)) / 86400000) : 0;
  const week = launchDate ? Math.floor(daysSinceLaunch / 7) + 1 : getWeekNum(now);
  return (
    <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", borderBottom: `1px solid ${BORDER}`, background: BG, flexShrink: 0 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{title}</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>W{String(week).padStart(2, "0")} · {MONTHS[now.getMonth()].toUpperCase()} {now.getFullYear()}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>DAY {daysSinceLaunch + 1} · {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
        </div>
        {timer !== null && (
          <div style={{ padding: "4px 10px", background: timer < 60000 ? RED + "22" : "rgba(255,255,255,0.04)", border: `1px solid ${timer < 60000 ? RED + "44" : BORDER}`, borderRadius: 6 }}>
            <span style={{ fontSize: 11, color: timer < 60000 ? RED : "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>AUTO-LOGOUT {Math.ceil(timer / 60000)}m</span>
          </div>
        )}
        <button onClick={onNotif} style={{ position: "relative", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ◌
          {notifCount > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: GOLD }} />}
        </button>
        <Btn variant="secondary" onClick={onSignOut} style={{ padding: "6px 14px", fontSize: 11 }}>Sign Out</Btn>
      </div>
    </div>
  );
};

const NotifPanel = ({ user, onClose }) => {
  const [notifs, setNotifs] = useState([]);
  useEffect(() => {
    const all = store.get(KEYS.notifs) || [];
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const filtered = all.filter((n) => { if (n.forEmail !== user.email) return true; if (n.read && (now - new Date(n.createdAt).getTime()) > fortyEightHours) return false; return true; });
    if (filtered.length !== all.length) store.set(KEYS.notifs, filtered);
    setNotifs(filtered.filter((n) => n.forEmail === user.email).slice(0, 30));
  }, [user.email]);
  const markRead = (id) => {
    const all = store.get(KEYS.notifs) || [];
    const idx = all.findIndex((n) => n.id === id);
    if (idx >= 0) all[idx].read = true;
    store.set(KEYS.notifs, all);
    setNotifs(all.filter((n) => n.forEmail === user.email).slice(0, 30));
  };
  const typeColor = { deadline: GOLD, task: TEAL, report: PURPLE, alert: RED, pwReset: GOLD, profileChange: TEAL, message: "#7BA8C4" };
  return (
    <div style={{ position: "fixed", top: 60, right: 0, width: 320, maxHeight: "70vh", overflowY: "auto", background: "#111118", border: `1px solid ${BORDER}`, borderRadius: "0 0 0 14px", zIndex: 300, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111118" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>NOTIFICATIONS</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18 }}>×</button>
      </div>
      {notifs.length === 0 ? <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No notifications yet</div> : notifs.map((n) => (
        <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: "13px 18px", borderBottom: `1px solid rgba(255,255,255,0.04)`, display: "flex", gap: 10, alignItems: "flex-start", opacity: n.read ? 0.45 : 1, cursor: "pointer" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: typeColor[n.type] || GOLD, marginTop: 5, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{n.text}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3, fontFamily: "'DM Mono',monospace" }}>{timeAgo(n.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MemberSpotlight = ({ currentUser }) => {
  const [period, setPeriod] = useState("weekly");
  const [rankings, setRankings] = useState([]);
  const [spotlight, setSpotlight] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const allUsers = store.get(KEYS.users) || {};
    const scored = Object.entries(allUsers).map(([email, u]) => { const score = calculateMemberScore(email, period); return { email, user: u, ...score }; });
    scored.sort((a, b) => b.total - a.total);
    setRankings(scored);
    setSpotlight(scored[0] || null);
    const now = new Date();
    const week = getWeekNum(now);
    const year = now.getFullYear();
    const month = now.getMonth();
    const snapshot = scored.map(({ email, total, breakdown, stats }) => ({ email, total, breakdown, stats }));
    if (period === "weekly") {
      const saved = store.get(KEYS.weeklyRankings) || [];
      const exists = saved.findIndex(r => r.week === week && r.year === year);
      if (exists >= 0) saved[exists].rankings = snapshot; else saved.unshift({ week, year, rankings: snapshot });
      store.set(KEYS.weeklyRankings, saved.slice(0, 52));
      if (scored[0]) {
        const spots = store.get(KEYS.weeklySpotlights) || [];
        const spotExists = spots.findIndex(s => s.week === week && s.year === year);
        const spotEntry = { week, year, email: scored[0].email, name: scored[0].user?.name || scored[0].email, total: scored[0].total, stats: scored[0].stats };
        if (spotExists >= 0) spots[spotExists] = spotEntry; else spots.unshift(spotEntry);
        store.set(KEYS.weeklySpotlights, spots.slice(0, 52));
      }
    } else {
      const saved = store.get(KEYS.monthlyRankings) || [];
      const exists = saved.findIndex(r => r.month === month && r.year === year);
      if (exists >= 0) saved[exists].rankings = snapshot; else saved.unshift({ month, year, rankings: snapshot });
      store.set(KEYS.monthlyRankings, saved.slice(0, 24));
    }
  }, [period]);

  const rankColor = (i) => { if (i === 0) return GOLD; if (i === 1) return "#C0C0C0"; if (i === 2) return "#CD7F32"; return "rgba(255,255,255,0.25)"; };
  const rankLabel = (i) => { if (i === 0) return "🥇"; if (i === 1) return "🥈"; if (i === 2) return "🥉"; return `#${i + 1}`; };
  const breakdownLabels = { completion: "Completion Rate", activity: "Activity", tasks: "Tasks Done", reports: "Reports", collaboration: "Collaboration" };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[{ v: "weekly", label: "Weekly Rankings" }, { v: "monthly", label: "Monthly Rankings" }].map(({ v, label }) => (
          <button key={v} onClick={() => setPeriod(v)} style={{ padding: "7px 18px", borderRadius: 20, border: `1px solid ${period === v ? GOLD : BORDER}`, background: period === v ? GOLD + "22" : "transparent", color: period === v ? GOLD : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>{label}</button>
        ))}
      </div>
      {spotlight && (
        <div style={{ background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}06)`, border: `1px solid ${GOLD}44`, borderRadius: 16, padding: "28px 32px", marginBottom: 28, display: "flex", alignItems: "center", gap: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)` }} />
          <div style={{ fontSize: 48 }}>🌟</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em", marginBottom: 8 }}>{period === "weekly" ? "THIS WEEK'S" : "THIS MONTH'S"} MEMBER SPOTLIGHT</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
              <Avatar name={spotlight.user?.name || spotlight.email} color={spotlight.user?.color || GOLD} size={52} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{spotlight.user?.name || spotlight.email}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  {spotlight.user?.team && <Badge text={spotlight.user.team} color={TEAL} />}
                  {spotlight.user?.title && <Badge text={spotlight.user.title} color={PURPLE} />}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>Leading the team with a score of <span style={{ color: GOLD, fontWeight: 700 }}>{spotlight.total}/100</span> — completed <span style={{ color: TEAL }}>{spotlight.stats.completedPeriod} tasks</span> this {period === "weekly" ? "week" : "month"}.</div>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{spotlight.total}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>/ 100 PTS</div>
          </div>
        </div>
      )}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>{period === "weekly" ? "WEEKLY" : "MONTHLY"} PERFORMANCE RANKINGS</div>
      {rankings.length === 0 ? <EmptyState icon="◆" title="No members yet" sub="Rankings will appear once members register." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rankings.map((r, i) => {
            const isMe = r.email === currentUser.email;
            const isExpanded = expanded === r.email;
            return (
              <div key={r.email}>
                <div onClick={() => setExpanded(isExpanded ? null : r.email)} style={{ background: i === 0 ? GOLD + "10" : isMe ? TEAL + "08" : CARD, border: `1px solid ${i === 0 ? GOLD + "44" : isMe ? TEAL + "33" : BORDER}`, borderLeft: `4px solid ${rankColor(i)}`, borderRadius: 12, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all 0.15s" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: rankColor(i) + "22", border: `1px solid ${rankColor(i)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: i < 3 ? 18 : 13, color: rankColor(i), fontWeight: 800, flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>{rankLabel(i)}</div>
                  <Avatar name={r.user?.name || r.email} color={r.user?.color || GOLD} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.user?.name || r.email}</div>
                      {isMe && <Badge text="YOU" color={TEAL} />}
                      {i === 0 && <Badge text="🌟 Spotlight" color={GOLD} />}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.user?.team && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{r.user.team}</span>}
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>{r.stats.completedPeriod} tasks · {r.stats.periodActivity} actions</span>
                    </div>
                  </div>
                  <div style={{ width: 120, flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>SCORE</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: rankColor(i) }}>{r.total}</span>
                    </div>
                    <ProgressBar pct={r.total} color={rankColor(i)} height={5} />
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "16px 20px", animation: "fadeIn 0.2s ease" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 14, letterSpacing: "0.08em" }}>SCORE BREAKDOWN</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
                      {Object.entries(r.breakdown).map(([key, val]) => (
                        <div key={key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: rankColor(i), marginBottom: 3 }}>{val}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", lineHeight: 1.4 }}>{breakdownLabels[key].toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[{ label: "Total Tasks", val: r.stats.totalTasks }, { label: "Completed Total", val: r.stats.completedTotal }, { label: `Done This ${period === "weekly" ? "Week" : "Month"}`, val: r.stats.completedPeriod }].map(({ label, val }) => (
                        <div key={label} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                          <span>{label}</span><span style={{ color: "#fff", fontWeight: 600 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState({});
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    setProjects(store.get(KEYS.projects) || []);
    setUsers(store.get(KEYS.users) || {});
    setActivity((store.get(KEYS.activity) || []).slice(0, 8));
  }, []);

  const allTasks = projects.flatMap((p) => p.tasks || []);
  const myTasks = allTasks.filter((t) => t.assignee === user.email);
  const myProjects = projects.filter((p) => (p.members || []).includes(user.email));
  const now = new Date();

  function calcPct(tasks = []) {
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((t) => t.status === "Completed").length / tasks.length) * 100);
  }

  const inProgressProjects = projects.filter((p) => { const pct = calcPct(p.tasks); return pct > 0 && pct < 100; });
  const statCards = [
    { label: "Active Projects", value: inProgressProjects.length, sub: `${projects.length} total`, accent: GOLD },
    { label: "Team Members", value: Object.keys(users).length, sub: "registered", accent: TEAL },
    { label: "My Tasks", value: myTasks.filter((t) => t.status !== "Completed").length, sub: `${myTasks.filter((t) => t.status === "Completed").length} completed`, accent: PURPLE },
    { label: "Overall Progress", value: allTasks.length ? `${Math.round((allTasks.filter((t) => t.status === "Completed").length / allTasks.length) * 100)}%` : "–", sub: `${allTasks.filter((t) => t.status === "Completed").length}/${allTasks.length} tasks done`, accent: RED },
  ];

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ background: `linear-gradient(135deg,rgba(200,169,110,0.07),rgba(126,184,164,0.04))`, border: `1px solid ${GOLD}22`, borderRadius: 14, padding: "24px 28px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.1em", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 4 }}>Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, {(user.name || user.email).split(" ")[0]} 👋</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{projects.length === 0 ? "Welcome to Ulrevix Team OS. No projects yet — get started by creating one." : `You have ${myTasks.filter((t) => t.status !== "Completed").length} active tasks across ${myProjects.length} projects.`}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {statCards.map(({ label, value, sub, accent }) => (
          <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: `2px solid ${accent}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8, fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>ACTIVE PROJECTS</div>
          {projects.length === 0 ? <EmptyState icon="◈" title="No projects yet" sub={user.role === "admin" ? "Go to Projects to create your first project." : "Admin has not created any projects yet."} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.slice(0, 5).map((p) => {
                const pct = calcPct(p.tasks);
                return (
                  <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", borderLeft: `3px solid ${p.color || GOLD}`, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{p.name}</div>
                      <ProgressBar pct={pct} color={p.color || GOLD} />
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: p.color || GOLD }}>{pct}%</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>{(p.tasks || []).filter((t) => t.status === "Completed").length}/{(p.tasks || []).length} tasks</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>RECENT ACTIVITY</div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            {activity.length === 0 ? <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No activity yet</div> : activity.map((a, i) => {
              const u = users[a.userId] || { name: a.userId, color: GOLD };
              return (
                <div key={a.id} style={{ padding: "11px 16px", display: "flex", gap: 10, borderBottom: i < activity.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none" }}>
                  <Avatar name={u.name || a.userId} color={u.color || GOLD} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}><span style={{ color: "#fff", fontWeight: 600 }}>{(u.name || a.userId).split(" ")[0]}</span> {a.action} <span style={{ color: GOLD }}>{a.target}</span></div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>{timeAgo(a.time)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
const AdminPanel = ({ user, onLaunch }) => {
  const isLaunchedCheck = !!store.get(KEYS.launched);
  const [tab, setTab] = useState(isLaunchedCheck ? "members" : "launch");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailRole, setNewEmailRole] = useState("member");
  const [pwResets, setPwResets] = useState([]);
  const [profileReqs, setProfileReqs] = useState([]);
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [blockedEmails, setBlockedEmails] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const textAreaRefsConf = useRef({});
  const [confTab, setConfTab] = useState("view");
  const [editBlocks, setEditBlocks] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTextBlock, setActiveTextBlock] = useState(null);

  const load = async () => {
    setLoading(true);
    const pending = await sbAuth.getPendingEmails();
    const blocked = await sbAuth.getBlockedEmails();
    const hist = await sbAuth.getEmailHistory();
    setAllowedEmails([...INITIAL_MEMBER_EMAILS, ...pending.map(r => r.email)]);
    setBlockedEmails(blocked);
    setEmailHistory(hist);
    setPwResets(await sbAuth.getPwResets());
    setProfileReqs((store.get(KEYS.profileRequests) || []).filter(r => r.status === "pending"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addMember = async () => {
    if (!newEmail.trim()) return;
    const em = newEmail.trim().toLowerCase();
    await sbAuth.removeBlockedEmail(em);
    await sbAuth.addPendingEmail(em, newEmailRole, user.email);
    if (newEmailRole === "admin") {
      const existingUser = await sbAuth.getUser(em);
      if (existingUser) await sbAuth.setUser(em, { ...existingUser, role: "admin" });
    }
    await sbAuth.addEmailHistory(em, "authorized", newEmailRole, user.email);
    addNotif(em, "task", `You've been registered on this platform as part of Ulrevix Team OS as ${newEmailRole === "admin" ? "an Admin" : "a Member"}.`);
    addActivity(user.email, `added new ${newEmailRole}`, em, null);
    setNewEmail("");
    setNewEmailRole("member");
    await load();
  };

  const removeMember = async (em) => {
    if (em === ADMIN_EMAIL) return;
    await sbAuth.removePendingEmail(em);
    await sbAuth.addBlockedEmail(em, user.email);
    await sbAuth.addEmailHistory(em, "unauthorized", "", user.email);
    addActivity(user.email, "blocked member", em, null);
    addNotif(em, "alert", "Your access to Ulrevix Team OS has been revoked by the admin.");
    await load();
  };

  const unregisterMember = async (em) => {
    if (em === ADMIN_EMAIL) return;
    await sbAuth.deletePassword(em);
    await sbAuth.removePendingEmail(em);
    await sbAuth.addBlockedEmail(em, user.email);
    await sbAuth.addEmailHistory(em, "unauthorized", "", user.email);
    addActivity(user.email, "unregistered member (login blocked, account kept)", em, null);
    addNotif(em, "alert", "Your login access to Ulrevix Team OS has been revoked by the admin.");
    await load();
  };

  const deleteUserAccount = async (em) => {
    if (em === ADMIN_EMAIL) return;
    await sbAuth.deletePassword(em);
    await sbAuth.setUser(em, null);
    await sbAuth.removePendingEmail(em);
    await sbAuth.addBlockedEmail(em, user.email);
    await sbAuth.addEmailHistory(em, "unauthorized", "", user.email);
    addActivity(user.email, "permanently deleted account of", em, null);
    await load();
  };

  const handleReset = async (id, action) => {
    const resets = await sbAuth.getPwResets();
    const r = resets.find(x => x.id === id);
    if (!r) return;
    await sbAuth.updatePwReset(id, action);
    if (action === "approved") await sbAuth.deletePassword(r.email);
    addNotif(r.email, "pwReset", `Your password reset was ${action}.`);
    await load();
  };

  const handleProfile = (id, action) => {
    const reqs = store.get(KEYS.profileRequests) || [];
    const idx = reqs.findIndex((r) => r.id === id);
    if (idx >= 0) {
      reqs[idx].status = action;
      const { email, field, oldVal, newVal } = reqs[idx];
      if (action === "approved") {
        const users = store.get(KEYS.users) || {};
        if (users[email]) { users[email][field] = newVal; store.set(KEYS.users, users); }
        addNotif(email, "profileChange", `Your profile change (${field}) was approved.`);
      } else {
        addNotif(reqs[idx].email, "profileChange", `Your profile change (${field}) was rejected.`);
      }
      const hist = store.get(KEYS.profileChangeHistory) || [];
      hist.unshift({ id, email, field, oldVal, newVal, action, by: user.email, at: new Date().toISOString() });
      store.set(KEYS.profileChangeHistory, hist);
    }
    store.set(KEYS.profileRequests, reqs);
    load();
  };

  const isLaunched = !!store.get(KEYS.launched);
  const leaveReqs = (store.get(KEYS.leaveRequests) || []).filter(r => r.status === "pending");

  const TABS = [
    ...(!isLaunched ? [{ id: "launch", label: "🚀 Launch Platform" }] : []),
    { id: "members", label: "Members" },
    { id: "roleManagement", label: "Role Management" },
    { id: "pwResets", label: `Password Resets ${pwResets.length > 0 ? `(${pwResets.length})` : ""}` },
    { id: "profileReqs", label: `Profile Changes ${profileReqs.length > 0 ? `(${profileReqs.length})` : ""}` },
    { id: "leaveReqs", label: `Leave Requests ${leaveReqs.length > 0 ? `(${leaveReqs.length})` : ""}` },
    { id: "editProfiles", label: "Edit Profiles" },
    { id: "emailHistory", label: "Email History" },
    { id: "pwResetHistory", label: "Reset History" },
    { id: "profileHistory", label: "Profile History" },
    { id: "reportDeleteReqs", label: `Report Deletions ${((store.get(KEYS.reportDeleteRequests) || []).filter(r => r.status === "pending").length > 0) ? `(${(store.get(KEYS.reportDeleteRequests) || []).filter(r => r.status === "pending").length})` : ""}` },
    { id: "meetingDeleteReqs", label: `Meeting Deletions ${((store.get(KEYS.meetingDeleteRequests) || []).filter(r => r.status === "pending").length > 0) ? `(${(store.get(KEYS.meetingDeleteRequests) || []).filter(r => r.status === "pending").length})` : ""}` },
    { id: "meetingHistory", label: "Meeting History" },
    ...(user.email === ADMIN_EMAIL ? [{ id: "confidentiality", label: "Confidentiality Agreement" }] : []),
  ];

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${tab === t.id ? GOLD : BORDER}`, background: tab === t.id ? GOLD + "22" : "transparent", color: tab === t.id ? GOLD : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>{t.label}</button>
        ))}
      </div>

      {tab === "launch" && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: `linear-gradient(135deg,rgba(200,169,110,0.07),rgba(126,184,164,0.04))`, border: `1px solid ${GOLD}33`, borderRadius: 16, padding: "36px 32px", textAlign: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, animation: "pulse 2s infinite", margin: "0 auto 20px" }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Official Platform Launch</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 28 }}>Confirming launch will start the real-time clock from <strong style={{ color: GOLD }}>Week 1 / Day 1</strong>, and lock in today's date as the official start.</p>
            <Btn onClick={onLaunch} style={{ padding: "13px 32px" }}>LAUNCH PLATFORM →</Btn>
          </div>
        </div>
      )}

      {tab === "members" && (
        <div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>ADD NEW MEMBER EMAIL</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} placeholder="member@email.com" style={{ flex: 1, padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }} />
              <select value={newEmailRole} onChange={(e) => setNewEmailRole(e.target.value)} style={{ padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", cursor: "pointer" }}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Btn onClick={addMember}>Add</Btn>
            </div>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>AUTHORIZED EMAILS ({allowedEmails.length + 1})</div>
            {loading ? <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div> : (
              <>
                <div style={{ padding: "9px 12px", borderRadius: 8, background: GOLD + "12", border: `1px solid ${GOLD}33`, marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#fff" }}>{ADMIN_EMAIL}</span>
                  <Badge text="Admin" color={GOLD} />
                </div>
                {allowedEmails.filter(em => em !== ADMIN_EMAIL).map((em) => {
                  const users = store.get(KEYS.users) || {};
                  const isBlocked = blockedEmails.includes(em);
                  const registered = !!(store.get(KEYS.passwords) || {})[em];
                  return (
                    <div key={em} style={{ padding: "9px 12px", borderRadius: 8, background: isBlocked ? RED + "10" : "rgba(255,255,255,0.03)", border: `1px solid ${isBlocked ? RED + "33" : BORDER}`, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <div>
                        <span style={{ color: isBlocked ? "rgba(255,255,255,0.35)" : "#fff" }}>{em}</span>
                        {users[em]?.name && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginLeft: 8 }}>({users[em].name})</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge text={registered ? "Registered" : "Pending"} color={registered ? TEAL : GOLD} />
                        {em !== ADMIN_EMAIL && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn variant="danger" onClick={() => removeMember(em)} style={{ padding: "4px 10px", fontSize: 10 }}>Block</Btn>
                            {registered && <Btn variant="danger" onClick={() => { if (window.confirm(`Unregister ${em}?`)) unregisterMember(em); }} style={{ padding: "4px 10px", fontSize: 10 }}>Unregister</Btn>}
                            {registered && <Btn variant="danger" onClick={() => { if (window.confirm(`PERMANENTLY DELETE the account of ${em}?`)) deleteUserAccount(em); }} style={{ padding: "4px 10px", fontSize: 10, background: RED, color: "#fff", border: "none" }}>Delete Account</Btn>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {blockedEmails.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, color: RED, fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>BLOCKED EMAILS ({blockedEmails.length})</div>
                    {blockedEmails.map((em) => (
                      <div key={em} style={{ padding: "9px 12px", borderRadius: 8, background: RED + "10", border: `1px solid ${RED}33`, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>{em}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select defaultValue="member" id={`unblock-role-${em}`} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 11, outline: "none", cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Btn style={{ padding: "4px 12px", fontSize: 10, background: TEAL, color: BG }} onClick={async () => {
                            const roleSelect = document.getElementById(`unblock-role-${em}`);
                            const chosenRole = roleSelect ? roleSelect.value : "member";
                            await sbAuth.removeBlockedEmail(em);
                            await sbAuth.addPendingEmail(em, chosenRole, user.email);
                            if (chosenRole === "admin") {
                              const existingUser = await sbAuth.getUser(em);
                              if (existingUser) await sbAuth.setUser(em, { ...existingUser, role: "admin" });
                            }
                            await sbAuth.addEmailHistory(em, "authorized", chosenRole, user.email);
                            addNotif(em, "task", `Your access to Ulrevix Team OS has been restored as ${chosenRole === "admin" ? "an Admin" : "a Member"}.`);
                            addActivity(user.email, `unblocked and re-added as ${chosenRole}`, em, null);
                            await load();
                          }}>Unblock & Add</Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "pwResets" && (
        <div>
          {pwResets.length === 0 ? <EmptyState icon="◌" title="No pending password resets" sub="All clear." /> : pwResets.map((r) => (
            <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{r.email}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Requested {timeAgo(r.requested_at)}</div>
              </div>
              <Btn onClick={() => handleReset(r.id, "approved")} style={{ padding: "7px 16px", fontSize: 12, background: TEAL, color: BG }}>Approve</Btn>
              <Btn variant="danger" onClick={() => handleReset(r.id, "rejected")} style={{ padding: "7px 16px", fontSize: 12 }}>Reject</Btn>
            </div>
          ))}
        </div>
      )}

      {tab === "profileReqs" && (
        <div>
          {profileReqs.length === 0 ? <EmptyState icon="◉" title="No pending profile changes" sub="All clear." /> : profileReqs.map((r) => (
            <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{r.email}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Wants to change <span style={{ color: GOLD }}>{r.field}</span> from <span style={{ textDecoration: "line-through", opacity: 0.5 }}>"{r.oldVal}"</span> to <span style={{ color: TEAL }}>"{r.newVal}"</span></div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Requested {timeAgo(r.requestedAt)}</div>
              </div>
              <Btn onClick={() => handleProfile(r.id, "approved")} style={{ padding: "7px 16px", fontSize: 12, background: TEAL, color: BG }}>Approve</Btn>
              <Btn variant="danger" onClick={() => handleProfile(r.id, "rejected")} style={{ padding: "7px 16px", fontSize: 12 }}>Reject</Btn>
            </div>
          ))}
        </div>
      )}

      {tab === "leaveReqs" && (
        <div>
          {leaveReqs.length === 0 ? <EmptyState icon="◌" title="No pending leave requests" sub="All clear." /> : leaveReqs.map((r) => {
            const allGroups = store.get(KEYS.groups) || [];
            const g = allGroups.find((x) => x.id === r.groupId);
            const u = (store.get(KEYS.users) || {})[r.email] || { name: r.email };
            const approve = () => {
              const reqs = store.get(KEYS.leaveRequests) || [];
              const idx = reqs.findIndex((x) => x.id === r.id);
              if (idx >= 0) reqs[idx].status = "approved";
              store.set(KEYS.leaveRequests, reqs);
              const gs = store.get(KEYS.groups) || [];
              const gi = gs.findIndex((x) => x.id === r.groupId);
              if (gi >= 0) { gs[gi].members = gs[gi].members.filter((m) => m !== r.email); gs[gi].admins = (gs[gi].admins || []).filter((m) => m !== r.email); store.set(KEYS.groups, gs); }
              addNotif(r.email, "alert", `Your request to leave "${g?.name}" was approved.`);
              load();
            };
            const reject = () => {
              const reqs = store.get(KEYS.leaveRequests) || [];
              const idx = reqs.findIndex((x) => x.id === r.id);
              if (idx >= 0) reqs[idx].status = "rejected";
              store.set(KEYS.leaveRequests, reqs);
              addNotif(r.email, "alert", `Your request to leave "${g?.name}" was rejected.`);
              load();
            };
            return (
              <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{u.name || r.email}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Wants to leave group: <span style={{ color: GOLD }}>{g?.name || r.groupId}</span></div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Requested {timeAgo(r.requestedAt)}</div>
                </div>
                <Btn onClick={approve} style={{ padding: "7px 16px", fontSize: 12, background: TEAL, color: BG }}>Approve</Btn>
                <Btn variant="danger" onClick={reject} style={{ padding: "7px 16px", fontSize: 12 }}>Reject</Btn>
              </div>
            );
          })}
        </div>
      )}

      {tab === "editProfiles" && <EditProfilesPanel adminEmail={user.email} />}

      {tab === "emailHistory" && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>EMAIL AUTHORIZATION HISTORY</div>
          {emailHistory.length === 0 ? <EmptyState icon="◌" title="No history yet" sub="Email authorization events will appear here." /> : emailHistory.map((h, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${h.action === "authorized" ? TEAL : RED}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#fff", marginBottom: 3 }}>{h.email}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{h.action === "authorized" ? `Authorized as ${h.role || "member"}` : "Blocked"} · by {h.by_email} · {timeAgo(h.at)}</div>
              </div>
              <Badge text={h.action === "authorized" ? "Authorized" : "Blocked"} color={h.action === "authorized" ? TEAL : RED} />
            </div>
          ))}
        </div>
      )}

      {tab === "pwResetHistory" && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>PASSWORD RESET HISTORY</div>
          {(store.get(KEYS.pwResetHistory) || []).length === 0 ? <EmptyState icon="◌" title="No history yet" sub="Password reset decisions will appear here." /> : (store.get(KEYS.pwResetHistory) || []).map((h, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${h.action === "approved" ? TEAL : RED}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#fff", marginBottom: 3 }}>{h.email}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{h.action} · by {h.by} · {timeAgo(h.at)}</div>
              </div>
              <Badge text={h.action} color={h.action === "approved" ? TEAL : RED} />
            </div>
          ))}
        </div>
      )}

      {tab === "profileHistory" && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>PROFILE CHANGE HISTORY</div>
          {(store.get(KEYS.profileChangeHistory) || []).length === 0 ? <EmptyState icon="◌" title="No history yet" sub="Profile change decisions will appear here." /> : (store.get(KEYS.profileChangeHistory) || []).map((h, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${h.action === "approved" ? TEAL : RED}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#fff", marginBottom: 3 }}>{h.email}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>Field: <span style={{ color: GOLD }}>{h.field}</span> · <span style={{ textDecoration: "line-through", opacity: 0.5 }}>"{h.oldVal}"</span> → <span style={{ color: TEAL }}>"{h.newVal}"</span></div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{h.action} · by {h.by} · {timeAgo(h.at)}</div>
                </div>
                <Badge text={h.action} color={h.action === "approved" ? TEAL : RED} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reportDeleteReqs" && (() => {
        const allReportDeleteReqs = (store.get(KEYS.reportDeleteRequests) || []).filter(r => r.status === "pending");
        const approveReportDeletion = (req) => {
          const reqs = store.get(KEYS.reportDeleteRequests) || [];
          const idx = reqs.findIndex(r => r.id === req.id);
          if (idx >= 0) { reqs[idx].status = "approved"; reqs[idx].resolvedBy = user.email; reqs[idx].resolvedAt = new Date().toISOString(); }
          store.set(KEYS.reportDeleteRequests, reqs);
          const key = req.reportType === "weekly" ? KEYS.weeklyReports : KEYS.monthlyReports;
          store.set(key, (store.get(key) || []).filter(r => r.id !== req.reportId));
          addNotif(req.requestedBy, "report", `Your deletion request for your ${req.reportType} report "${req.reportLabel}" was approved.`);
          load();
        };
        const rejectReportDeletion = (req) => {
          const reqs = store.get(KEYS.reportDeleteRequests) || [];
          const idx = reqs.findIndex(r => r.id === req.id);
          if (idx >= 0) { reqs[idx].status = "rejected"; reqs[idx].resolvedBy = user.email; reqs[idx].resolvedAt = new Date().toISOString(); }
          store.set(KEYS.reportDeleteRequests, reqs);
          addNotif(req.requestedBy, "report", `Your deletion request was rejected.`);
          load();
        };
        return (
          <div>
            {allReportDeleteReqs.length === 0 ? <EmptyState icon="▣" title="No pending report deletion requests" sub="All clear." /> : allReportDeleteReqs.map((req) => {
              const reqUser = (store.get(KEYS.users) || {})[req.requestedBy] || { name: req.requestedBy, color: GOLD };
              return (
                <div key={req.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <Avatar name={reqUser.name || req.requestedBy} color={reqUser.color || GOLD} size={28} />
                      <div>
                        <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{reqUser.name || req.requestedBy}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Wants to delete their <span style={{ color: GOLD, textTransform: "capitalize" }}>{req.reportType}</span> report: <span style={{ color: "#fff" }}>{req.reportLabel}</span> · {timeAgo(req.requestedAt)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 6, borderLeft: `3px solid ${RED}` }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'DM Mono',monospace", display: "block", marginBottom: 3 }}>REASON</span>
                      {req.reason}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={() => approveReportDeletion(req)} style={{ padding: "7px 16px", fontSize: 12, background: TEAL, color: BG }}>Approve & Delete</Btn>
                    <Btn variant="danger" onClick={() => rejectReportDeletion(req)} style={{ padding: "7px 16px", fontSize: 12 }}>Reject</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {tab === "meetingDeleteReqs" && (() => {
        const allMeetingDeleteReqs = (store.get(KEYS.meetingDeleteRequests) || []).filter(r => r.status === "pending");
        const approveDeletion = (req) => {
          const reqs = store.get(KEYS.meetingDeleteRequests) || [];
          const idx = reqs.findIndex(r => r.id === req.id);
          if (idx >= 0) { reqs[idx].status = "approved"; reqs[idx].resolvedBy = user.email; reqs[idx].resolvedAt = new Date().toISOString(); }
          store.set(KEYS.meetingDeleteRequests, reqs);
          store.set(KEYS.meetings, (store.get(KEYS.meetings) || []).filter(m => m.id !== req.meetingId));
          const mHist = store.get(KEYS.meetingHistory) || [];
          mHist.unshift({ id: Date.now().toString(), meetingTitle: req.meetingTitle, action: "deleted", by_email: user.email, reason: req.reason, at: new Date().toISOString() });
          store.set(KEYS.meetingHistory, mHist);
          addNotif(req.requestedBy, "alert", `Your deletion request for "${req.meetingTitle}" was approved.`);
          load();
        };
        const rejectDeletion = (req) => {
          const reqs = store.get(KEYS.meetingDeleteRequests) || [];
          const idx = reqs.findIndex(r => r.id === req.id);
          if (idx >= 0) { reqs[idx].status = "rejected"; reqs[idx].resolvedBy = user.email; reqs[idx].resolvedAt = new Date().toISOString(); }
          store.set(KEYS.meetingDeleteRequests, reqs);
          addNotif(req.requestedBy, "alert", `Your deletion request for "${req.meetingTitle}" was rejected.`);
          load();
        };
        return (
          <div>
            {allMeetingDeleteReqs.length === 0 ? <EmptyState icon="◷" title="No pending deletion requests" sub="All clear." /> : allMeetingDeleteReqs.map((req) => {
              const reqUser = (store.get(KEYS.users) || {})[req.requestedBy] || { name: req.requestedBy, color: GOLD };
              return (
                <div key={req.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{req.meetingTitle}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Requested by <span style={{ color: GOLD }}>{reqUser.name || req.requestedBy}</span> · {timeAgo(req.requestedAt)}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 6, borderLeft: `3px solid ${RED}` }}>
                        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'DM Mono',monospace", display: "block", marginBottom: 3 }}>REASON</span>
                        {req.reason}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={() => approveDeletion(req)} style={{ padding: "7px 16px", fontSize: 12, background: TEAL, color: BG }}>Approve & Delete</Btn>
                    <Btn variant="danger" onClick={() => rejectDeletion(req)} style={{ padding: "7px 16px", fontSize: 12 }}>Reject</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {tab === "meetingHistory" && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>MEETING HISTORY</div>
          {(store.get(KEYS.meetingHistory) || []).length === 0 ? <EmptyState icon="◷" title="No meeting history yet" sub="Meeting events will appear here." /> : (store.get(KEYS.meetingHistory) || []).map((h, i) => {
            const actionColor = { created: TEAL, deleted: RED, delete_requested: GOLD, delete_rejected: RED }[h.action] || GOLD;
            const actionLabel = { created: "Created", deleted: "Deleted", delete_requested: "Deletion Requested", delete_rejected: "Deletion Rejected" }[h.action] || h.action;
            return (
              <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${actionColor}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#fff", marginBottom: 3 }}>{h.meetingTitle}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{actionLabel} · by {h.by_email || h.by} · {timeAgo(h.at)}</div>
                    {h.reason && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, fontStyle: "italic" }}>Reason: {h.reason}</div>}
                  </div>
                  <Badge text={actionLabel} color={actionColor} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "roleManagement" && (() => {
        const allUsers = store.get(KEYS.users) || {};
        const allPasswords = store.get(KEYS.passwords) || {};
        const changeRole = async (targetEmail, newRole) => {
          if (targetEmail === ADMIN_EMAIL) { alert("The primary admin account cannot have its role changed."); return; }
          const existingUser = await sbAuth.getUser(targetEmail);
          if (existingUser) await sbAuth.setUser(targetEmail, { ...existingUser, role: newRole });
          await sbAuth.addPendingEmail(targetEmail, newRole, user.email);
          await sbAuth.addEmailHistory(targetEmail, "authorized", newRole, user.email);
          addNotif(targetEmail, "alert", `Your account role has been changed to ${newRole} by the admin. Please sign out and sign back in.`);
          addActivity(user.email, `changed role of ${targetEmail} to`, newRole, null);
          await load();
          alert(`${targetEmail} has been changed to ${newRole}. They will need to sign out and sign back in.`);
        };
        const registeredUsers = Object.entries(allUsers).filter(([em]) => em !== ADMIN_EMAIL && allPasswords[em]);
        return (
          <div>
            <div style={{ padding: "12px 18px", background: GOLD + "10", border: `1px solid ${GOLD}33`, borderRadius: 10, marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>⚠️ Changing a user's role will immediately update their access. They must sign out and sign back in under the new role.</div>
            {registeredUsers.length === 0 ? <EmptyState icon="◉" title="No registered users" sub="Only registered non-admin users will appear here." /> : registeredUsers.map(([em, u]) => {
              const currentRole = u.role || "member";
              const isCurrentlyAdmin = currentRole === "admin";
              return (
                <div key={em} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${isCurrentlyAdmin ? GOLD : TEAL}`, borderRadius: 12, padding: "16px 20px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                  <Avatar name={u.name || em} color={u.color || GOLD} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{u.name || em}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>{em}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge text={`Current: ${isCurrentlyAdmin ? "Admin" : "Member"}`} color={isCurrentlyAdmin ? GOLD : TEAL} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {isCurrentlyAdmin ? (
                      <Btn variant="secondary" onClick={() => { if (window.confirm(`Change ${u.name || em} from Admin to Member?`)) changeRole(em, "member"); }} style={{ fontSize: 11, padding: "7px 16px", border: `1px solid ${TEAL}44`, color: TEAL, background: TEAL + "15" }}>Downgrade to Member</Btn>
                    ) : (
                      <Btn onClick={() => { if (window.confirm(`Change ${u.name || em} from Member to Admin?`)) changeRole(em, "admin"); }} style={{ fontSize: 11, padding: "7px 16px" }}>Upgrade to Admin</Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};

const Profile = ({ user, onUserUpdate }) => {
  const [profile, setProfile] = useState({});
  const [pending, setPending] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [showAgreementText, setShowAgreementText] = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  const load = async () => {
    const users = store.get(KEYS.users) || {};
    const me = users[user.email] || {};
    setProfile(me);
    setForm({ name: me.name || "", team: me.team || "", dept: me.dept || "", title: me.title || "", status: me.status || "" });
    const reqs = store.get(KEYS.profileRequests) || [];
    const myPending = reqs.filter((r) => r.email === user.email && r.status === "pending");
    setPending(myPending.length > 0 ? myPending : null);
    const allSigned = await sbAuth.getConfidentialitySigned();
    setSignatureData(allSigned[user.email] || null);
  };

  useEffect(() => { load(); }, [user.email]);

  const submitChanges = () => {
    const reqs = store.get(KEYS.profileRequests) || [];
    const changes = Object.entries(form).filter(([k, v]) => v !== (profile[k] || ""));
    if (changes.length === 0) { setEditMode(false); return; }
    changes.forEach(([field, newVal]) => {
      reqs.push({ id: Date.now().toString() + field, email: user.email, field, oldVal: profile[field] || "", newVal, requestedAt: new Date().toISOString(), status: "pending" });
    });
    store.set(KEYS.profileRequests, reqs);
    addNotif(ADMIN_EMAIL, "profileChange", `${user.email} requested profile changes`);
    setEditMode(false);
    load();
  };

  const parseInline = (text) => {
    const parts = [];
    const regex = /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]|\[hl=([^\]]+)\]([\s\S]*?)\[\/hl\]|\[size=(\d+)\]([\s\S]*?)\[\/size\]|\*\*([\s\S]*?)\*\*|_([\s\S]*?)_|__([\s\S]*?)__/g;
    let last = 0; let match; let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
      if (match[1] !== undefined) parts.push(<span key={key++} style={{ color: match[1] }}>{parseInline(match[2])}</span>);
      else if (match[3] !== undefined) parts.push(<span key={key++} style={{ background: match[3], padding: "1px 4px", borderRadius: 3 }}>{parseInline(match[4])}</span>);
      else if (match[5] !== undefined) parts.push(<span key={key++} style={{ fontSize: parseInt(match[5]) }}>{parseInline(match[6])}</span>);
      else if (match[7] !== undefined) parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[7]}</strong>);
      else if (match[8] !== undefined) parts.push(<em key={key++}>{match[8]}</em>);
      else if (match[9] !== undefined) parts.push(<span key={key++} style={{ textDecoration: "underline" }}>{match[9]}</span>);
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
    return parts.length ? parts : text;
  };

  const renderAgrText = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, li) => {
      if (line.startsWith("# ")) return <div key={li} style={{ fontSize: 18, fontWeight: 900, color: GOLD, marginBottom: 8, marginTop: 12 }}>{parseInline(line.slice(2))}</div>;
      if (line.startsWith("## ")) return <div key={li} style={{ fontSize: 14, fontWeight: 700, color: TEAL, marginBottom: 6, marginTop: 10 }}>{parseInline(line.slice(3))}</div>;
      if (line.startsWith("### ")) return <div key={li} style={{ fontSize: 12, fontWeight: 700, color: PURPLE, marginBottom: 5, marginTop: 8 }}>{parseInline(line.slice(4))}</div>;
      if (line.startsWith("^") && line.endsWith("^")) return <div key={li} style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 4, marginTop: 6 }}>{parseInline(line.slice(1, -1))}</div>;
      if (line.trim() === "") return <div key={li} style={{ height: 6 }} />;
      return <p key={li} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginBottom: 6 }}>{parseInline(line)}</p>;
    });
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1, maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
        <Avatar name={profile.name || user.email} color={profile.color || GOLD} size={64} />
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{profile.name || user.email}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge text={user.role === "admin" ? "Admin" : "Member"} color={user.role === "admin" ? GOLD : TEAL} />
            {profile.team && <Badge text={profile.team} color={PURPLE} />}
            {profile.title && <Badge text={profile.title} color="rgba(255,255,255,0.3)" />}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          {!editMode ? <Btn onClick={() => setEditMode(true)}>Edit Profile</Btn> : <Btn variant="secondary" onClick={() => setEditMode(false)}>Cancel</Btn>}
        </div>
      </div>
      {pending && pending.length > 0 && (
        <div style={{ padding: "14px 18px", background: GOLD + "12", border: `1px solid ${GOLD}33`, borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, marginBottom: 4 }}>⏳ Awaiting Admin Approval</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{pending.map((r) => `${r.field}: "${r.newVal}"`).join(" · ")}</div>
        </div>
      )}
      {signatureData && (
        <div style={{ background: TEAL + "08", border: `1px solid ${TEAL}33`, borderRadius: 14, padding: "20px 22px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 22 }}>✍️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 3 }}>CONFIDENTIALITY & BUILD AGREEMENT</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Signed & Agreed</div>
            </div>
            <Badge text="✓ Signed" color={TEAL} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            {[["Signed Name", signatureData.fullName], ["Signed Date", signatureData.signDate || new Date(signatureData.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })], ["Timestamp", timeAgo(signatureData.signedAt)]].map(([label, val]) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 4 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowAgreementText(!showAgreementText)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: `1px solid ${TEAL}44`, borderRadius: 8, color: TEAL, fontSize: 11, cursor: "pointer", padding: "6px 14px", fontFamily: "'DM Mono',monospace" }}>
            {showAgreementText ? "▲ Hide Agreement Text" : "▼ View Full Agreement Text"}
          </button>
          {showAgreementText && (
            <div style={{ marginTop: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 22px", maxHeight: 400, overflowY: "auto", animation: "fadeIn 0.2s ease" }}>
              {(store.get(KEYS.confidentialityAgreement)?.content || DEFAULT_CONFIDENTIALITY_BLOCKS).map((block, bi) =>
                block.type === "text" ? <div key={bi} style={{ marginBottom: 8 }}>{renderAgrText(block.content)}</div> : (
                  <div key={bi} style={{ overflowX: "auto", marginBottom: 16 }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
                      <tbody>{block.rows.map((row, ri) => (<tr key={ri} style={{ background: ri === 0 ? "rgba(200,169,110,0.08)" : ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>{row.map((cell, ci) => (<td key={ci} style={{ border: `1px solid ${BORDER}`, padding: "7px 10px", color: ri === 0 ? GOLD : "rgba(255,255,255,0.65)", fontWeight: ri === 0 ? 600 : 400 }}>{cell}</td>))}</tr>))}</tbody>
                    </table>
                  </div>
                )
              )}
              {signatureData && (
                <div style={{ marginTop: 16, padding: "14px 16px", background: TEAL + "10", border: `1px solid ${TEAL}33`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 8 }}>YOUR DIGITAL SIGNATURE</div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>FULL NAME</div><div style={{ fontSize: 13, color: "#fff", fontStyle: "italic", fontWeight: 600 }}>{signatureData.fullName}</div></div>
                    <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>DATE</div><div style={{ fontSize: 13, color: "#fff" }}>{signatureData.signDate}</div></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {!editMode ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22 }}>
          {[["Name", profile.name || "—"], ["Email", user.email], ["Department", profile.dept || "—"], ["Team", profile.team || "—"], ["Title / Role", profile.title || "—"], ["Status", profile.status || "—"], ["Member Since", profile.registered_at ? new Date(profile.registered_at).toLocaleDateString() : profile.registeredAt ? new Date(profile.registeredAt).toLocaleDateString() : "—"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{k}</span>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 18, lineHeight: 1.5 }}>Changes require admin approval before taking effect.</div>
          <Inp label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Your name" />
          <Inp label="Department" value={form.dept} onChange={(v) => setForm((f) => ({ ...f, dept: v }))} placeholder="e.g. Engineering" />
          <Inp label="Team" value={form.team} onChange={(v) => setForm((f) => ({ ...f, team: v }))} placeholder="e.g. Core, Design" />
          <Inp label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Writer, Developer" />
          <Inp label="Status" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} placeholder="e.g. Lead, Senior, Junior" />
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>AVATAR COLOR</div>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map((c) => (
                <div key={c} onClick={() => { const users = store.get(KEYS.users) || {}; if (users[user.email]) { users[user.email].color = c; store.set(KEYS.users, users); onUserUpdate({ ...user, color: c }); load(); } }} style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", border: (profile.color || GOLD) === c ? "3px solid #fff" : "3px solid transparent" }} />
              ))}
            </div>
          </div>
          <Btn onClick={submitChanges}>Submit for Approval</Btn>
        </div>
      )}
    </div>
  );
};

const LaunchConfirmButton = ({ onLaunch }) => {
  const [confirm, setConfirm] = useState(false);
  return !confirm ? (
    <Btn onClick={() => setConfirm(true)} style={{ padding: "13px 32px" }}>LAUNCH PLATFORM →</Btn>
  ) : (
    <div style={{ background: "rgba(200,169,110,0.08)", border: `1px solid ${GOLD}44`, borderRadius: 12, padding: 24 }}>
      <p style={{ color: "#fff", marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>Are you absolutely sure? The clock starts now.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Btn onClick={onLaunch} style={{ padding: "11px 24px" }}>CONFIRM LAUNCH</Btn>
        <Btn variant="secondary" onClick={() => setConfirm(false)}>Cancel</Btn>
      </div>
    </div>
  );
};

export default function Home() {
  const [launched, setLaunched] = useState(true);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [showNotif, setShowNotif] = useState(false);
  const [globalCall, setGlobalCall] = useState(null);
  const [timer, setTimer] = useState(INACTIVITY_LIMIT);
  const inactivityRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const pollGlobalCalls = () => {
      const calls = store.get("ulx_calls") || {};
      const myCall = calls[user.email];
      if (myCall && myCall.status === "ringing" && myCall.callerEmail !== user.email) {
        setGlobalCall(prev => { if (prev && prev.callId === myCall.callId) return prev; return { type: "incoming", ...myCall }; });
      } else {
        setGlobalCall(prev => { if (!prev) return prev; if (!myCall || myCall.callId !== prev.callId) return null; if (myCall.status === "cancelled" || myCall.status === "declined") return null; return prev; });
      }
    };
    pollGlobalCalls();
    const t = setInterval(pollGlobalCalls, 1500);
    return () => clearInterval(t);
  }, [user]);

  const handleGlobalAcceptCall = () => {
    if (!globalCall) return;
    const calls = store.get("ulx_calls") || {};
    if (calls[user.email]) calls[user.email].status = "active";
    store.set("ulx_calls", calls);
    setGlobalCall(prev => ({ ...prev, type: "active" }));
  };

  const handleGlobalEndCall = () => {
    const calls = store.get("ulx_calls") || {};
    const callerEmail = globalCall?.callerEmail;
    if (calls[user.email]) { calls[user.email].status = "declined"; store.set("ulx_calls", calls); }
    if (callerEmail && calls[`outgoing_${callerEmail}`]) { calls[`outgoing_${callerEmail}`].status = "declined"; store.set("ulx_calls", calls); }
    setTimeout(() => { const c2 = store.get("ulx_calls") || {}; delete c2[user.email]; if (callerEmail) delete c2[`outgoing_${callerEmail}`]; store.set("ulx_calls", c2); }, 2000);
    setGlobalCall(null);
  };

  const resetInactivity = useCallback(() => {
    setTimer(INACTIVITY_LIMIT);
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => { if (user) updatePresence(user.email, false); setUser(null); }, INACTIVITY_LIMIT);
  }, []);

  useEffect(() => {
    if (!user) return;
    resetInactivity();
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetInactivity));
    timerRef.current = setInterval(() => setTimer((t) => Math.max(0, t - 1000)), 1000);
    const heartbeat = setInterval(() => { updatePresence(user.email, true); }, 60000);
    const handleUnload = () => { updatePresence(user.email, false); };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivity));
      clearInterval(timerRef.current);
      clearTimeout(inactivityRef.current);
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user, resetInactivity]);

  const unreadNotifs = user ? (store.get(KEYS.notifs) || []).filter((n) => n.forEmail === user.email && !n.read).length : 0;
  const unreadMsgs = user ? (store.get(KEYS.messages) || []).filter((m) => m.to === user.email && !(m.readBy || []).includes(user.email)).length : 0;

  const doLaunch = () => {
    if (store.get(KEYS.launched)) return;
    store.set(KEYS.launched, true);
    store.set(KEYS.launchDate, new Date().toISOString());
    setLaunched(true);
  };

  const signOut = () => {
    if (user) updatePresence(user.email, false);
    clearTimeout(inactivityRef.current);
    clearInterval(timerRef.current);
    setUser(null);
  };

  const viewTitles = { dashboard: "Dashboard", projects: "Projects", tasks: "My Tasks", team: "Team", analytics: "Analytics", reports: "Reports", meetings: "Meetings", activity: "Activity & Chat", ai: "AI Insights", issues: "Issues", performance: "Performance", spotlight: "Member Spotlight", growth: "Growth & Development", roleClarity: "Role Clarity", about: "About Ulrevix", profile: "My Profile", admin: "Admin Panel" };

  const renderView = () => {
    switch (view) {
      case "dashboard": return <Dashboard user={user} />;
      case "projects": return <Projects user={user} />;
      case "tasks": return <MyTasks user={user} />;
      case "team": return <Team user={user} />;
      case "analytics": return <Analytics />;
      case "reports": return <Reports user={user} />;
      case "meetings": return <Meetings user={user} />;
      case "activity": return <ActivityChat user={user} />;
      case "ai": return <AIInsights user={user} />;
      case "issues": return <Issues user={user} />;
      case "performance": return <Performance user={user} />;
      case "roleClarity": return <RoleClarity user={user} />;
      case "about": return <AboutUlrevix user={user} />;
      case "profile": return <Profile user={user} onUserUpdate={setUser} />;
      case "admin": return user.role === "admin" ? <AdminPanel user={user} onLaunch={() => { doLaunch(); setView("dashboard"); }} /> : null;
      case "spotlight": return <MemberSpotlight currentUser={user} />;
      case "growth": return <Growth user={user} />;
      default: return null;
    }
  };

  if (!user) return (
    <>
      <style>{css}</style>
      <Auth onLogin={async (u) => {
        // Sync all users from Supabase into localStorage
        const allUsers = await sbAuth.getAllUsers();
        store.set(KEYS.users, allUsers);
        // Also sync pending emails into localStorage
        const pendingRows = await sbAuth.getPendingEmails();
        store.set(KEYS.pendingEmails, pendingRows.map(r => r.email));
        // Sync blocked emails
        const blocked = await sbAuth.getBlockedEmails();
        store.set(KEYS.blockedEmails, blocked);
        setUser(u);
        updatePresence(u.email, true);
        resetInactivity();
        const allSigned = await sbAuth.getConfidentialitySigned();
        setAgreementSigned(!!allSigned[u.email]);
      }} />
    </>
  );

  if (user && !agreementSigned && user.role !== "admin") return (
    <>
      <style>{css}</style>
      <ConfidentialityGate user={user} onSigned={() => setAgreementSigned(true)} />
    </>
  );

  return (
    <div style={{ display: "flex", background: BG, minHeight: "100vh", fontFamily: "'Sora',sans-serif", color: "#fff" }}>
      <style>{css}</style>
      <Sidebar view={view} setView={setView} user={user} unreadCount={unreadNotifs + unreadMsgs} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "100vh" }}>
        <TopBar title={viewTitles[view]} user={user} onSignOut={signOut} notifCount={unreadNotifs} onNotif={() => setShowNotif(!showNotif)} timer={timer} />
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>{renderView()}</div>
      </div>
      {showNotif && <NotifPanel user={user} onClose={() => setShowNotif(false)} />}
      {globalCall && view !== "activity" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
          <div style={{ width: 340, background: "#111118", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "36px 28px", textAlign: "center", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
            {globalCall.type === "incoming" ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 1s infinite" }}>{globalCall.callType === "video" ? "🎥" : "📞"}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>INCOMING {globalCall.callType?.toUpperCase()} CALL</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 24 }}>{globalCall.callerName || globalCall.callerEmail}{globalCall.isGroup && <div style={{ fontSize: 13, color: PURPLE, fontWeight: 400, marginTop: 4 }}>Group: {globalCall.groupName}</div>}</div>
                <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
                  <button onClick={handleGlobalEndCall} style={{ width: 56, height: 56, borderRadius: "50%", background: RED, border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
                  <button onClick={handleGlobalAcceptCall} style={{ width: 56, height: 56, borderRadius: "50%", background: TEAL, border: "none", fontSize: 22, cursor: "pointer" }}>✓</button>
                </div>
                <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace" }}>TAP ✓ TO ACCEPT · ✕ TO DECLINE</div>
              </>
            ) : globalCall.type === "active" ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{globalCall.callType === "video" ? "🎥" : "📞"}</div>
                <div style={{ fontSize: 13, color: TEAL, marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>{globalCall.callType?.toUpperCase()} CALL CONNECTED</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 20 }}>{globalCall.callerName || globalCall.callerEmail}</div>
                <Btn variant="danger" onClick={handleGlobalEndCall} style={{ width: "100%", padding: "11px" }}>End Call</Btn>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
