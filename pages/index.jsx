"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "hello.ulrevix@gmail.com";
const INITIAL_MEMBER_EMAILS = ["oyindamolaagbaje.work@gmail.com"];
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
const GOLD = "#C8A96E";
const TEAL = "#7EB8A4";
const PURPLE = "#9B8EC4";
const RED = "#C47B7B";
const BG = "#0A0A0F";
const CARD = "rgba(255,255,255,0.02)";
const BORDER = "rgba(255,255,255,0.07)";

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────
const KEYS = {
  launched: "ulx_launched",
  launchDate: "ulx_launch_date",
  users: "ulx_users", // { email: { name, role, team, title, status, dept, color, avatar, registeredAt } }
  passwords: "ulx_passwords", // { email: hashedPw }
  pendingEmails: "ulx_pending_emails", // [email] — allowed to register
  pwResets: "ulx_pw_resets", // [{ id, email, requestedAt, status:'pending'|'approved'|'rejected' }]
  profileRequests: "ulx_profile_requests", // [{ id, email, field, newVal, requestedAt, status }]
  projects: "ulx_projects", // [{ id, name, desc, team, deadline, color, members[], tasks[], flow[], createdAt }]
  activity: "ulx_activity", // [{ id, userId, action, target, projectId, time }]
  weeklyReports: "ulx_weekly", // [{ id, email, week, year, tasks, blockers, goals, submittedAt }]
  monthlyReports: "ulx_monthly", // [{ id, email, month, year, summary, achievements, goals, submittedAt }]
  messages: "ulx_messages", // [{ id, from, to, body, sentAt, readBy[], editedAt?, replyTo?, forwarded?, pinned?, deletedForGroup? }]
  groups: "ulx_groups", // [{ id, name, members[], createdAt }]
  notifs: "ulx_notifs", // [{ id, forEmail, type, text, read, createdAt }]
  leaveRequests: "ulx_leave_requests", // [{ id, email, groupId, requestedAt, status:'pending'|'approved'|'rejected' }]
  blockedEmails: "ulx_blocked_emails", // [email] — explicitly blocked from logging in
  emailHistory: "ulx_email_history", // [{ email, action:'authorized'|'unauthorized', by, at }]
  pwResetHistory: "ulx_pw_reset_history", // [{ id, email, action:'approved'|'rejected', at }]
  profileChangeHistory: "ulx_profile_change_history", // [{ id, email, field, oldVal, newVal, action:'approved'|'rejected', at }]
  meetings: "ulx_meetings", // [{ id, title, description, date, time, gmeetLink, fileLinks, hostEmail, scheduledBy, collaborators[], createdAt, summary?, summaryAt? }]
  meetingDeleteRequests: "ulx_meeting_delete_requests", // [{ id, meetingId, meetingTitle, requestedBy, reason, requestedAt, status:'pending'|'approved'|'rejected', resolvedBy?, resolvedAt? }]
  meetingHistory: "ulx_meeting_history", // [{ id, meetingTitle, action:'created'|'deleted'|'delete_requested', by, at, reason? }]
  reportDeleteRequests: "ulx_report_delete_requests", // [{ id, reportId, reportType:'weekly'|'monthly', reportLabel, requestedBy, reason, requestedAt, status:'pending'|'approved'|'rejected', resolvedBy?, resolvedAt? }]
  aiReports: "ulx_ai_reports", // [{ id, generatedBy, scope:'team'|'member', targetEmail?, timePeriod, generatedAt, headline, metrics?, period, memberName? }]
  issues: "ulx_issues", // [{ id, category:'website'|'team'|'collaboration'|'member', title, body, submittedBy, submittedAt, status:'submitted'|'seen'|'reviewing'|'worked_on' }]
  presence: "ulx_presence", // { email: { lastSeen: iso, online: bool } }
  weeklyRankings: "ulx_weekly_rankings",   // [{ week, year, rankings: [{email, total, breakdown, stats}] }]
monthlyRankings: "ulx_monthly_rankings", // [{ month, year, rankings: [{email, total, breakdown, stats}] }]
weeklySpotlights: "ulx_weekly_spotlights", // [{ week, year, email, name, total, stats }]
  growth: "ulx_growth", // { email: { goals: [{id, month, year, text, category, source:'user'|'admin'|'auto', status:'active'|'completed'|'missed', completedAt?}], adminAssigned: [{id, email, month, year, text, category, note, assignedAt, assignedBy, status:'active'|'completed'|'missed'}], monthly: [{month, year, selfRating, reflection, completedGoalIds, suggestionsGenerated, suggestionsAt}], yearly: [{year, summary, skillsLearned[], contributions[], roleQualification, savedAt}] } }
  taskUploads: "ulx_task_uploads", // { "projectId_taskId": [{ id, fileName, fileType, fileSize, uploadedBy, uploadedAt, data }] }
  taskUploadReviews: "ulx_task_upload_reviews", // { "projectId_taskId_uploadId": { status:'pending'|'approved'|'rejected', reviewedBy?, reviewedAt?, feedback? } }
  workHours: "ulx_work_hours", // { email: { type: 'part-time'|'full-time', hoursRequired: number } }
  performanceSnapshots: "ulx_performance_snapshots", // [{ id, email, month, year, snapshot: { score, uniqueHours, hoursPercent, done, active, myTasks, userWorkHours, overallInsight, strengths, improvements, excelling }, savedAt }]
performanceGrowthMetrics: "ulx_performance_growth_metrics", // { email: [{ periodLabel, periodType, months, startMonth, startYear, endMonth, endYear, avgScore, avgHoursPercent, totalCompleted, totalActive, avgDone, excelling: [], improving: [], needsImprovement: [], generatedAt }] }
  aboutSections: "ulx_about_sections",
  confidentialityAgreement: "ulx_confidentiality_agreement", // { content: blocks[], lastEditedAt, lastEditedBy }
confidentialitySigned: "ulx_confidentiality_signed", // { email: { signedAt, fullName, agreedAt } }
};

const store = {
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  },
  patch: (key, patchFn) => {
    const cur = store.get(key);
    store.set(key, patchFn(cur));
  },
};

// Simple hash (not cryptographic — for demo purposes)
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
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const COLORS = [
  GOLD,
  TEAL,
  PURPLE,
  RED,
  "#7BA8C4",
  "#A4C47B",
  "#C4A17B",
  "#7BC4B8",
];

function addActivity(userId, action, target, projectId = null) {
  const acts = store.get(KEYS.activity) || [];
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = acts.filter((a) => new Date(a.time).getTime() > oneWeekAgo);
  filtered.unshift({
    id: Date.now() + Math.random(),
    userId,
    action,
    target,
    projectId,
    time: new Date().toISOString(),
  });
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
  notifs.unshift({
    id: Date.now() + Math.random(),
    forEmail,
    type,
    text,
    read: false,
    createdAt: new Date().toISOString(),
  });
  store.set(KEYS.notifs, notifs);
}
// ─── WEBRTC CALL MANAGER ─────────────────────────────────────────────────────
const peerConnections = {};
const localStreamRef = { current: null };

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

async function getLocalStream(callType) {
  try {
    const constraints = callType === "video"
      ? { audio: true, video: true }
      : { audio: true, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    return stream;
  } catch (err) {
    console.error("Could not get media stream:", err);
    return null;
  }
}

function stopLocalStream() {
  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }
}

function closePeerConnections() {
  Object.values(peerConnections).forEach(pc => pc.close());
  Object.keys(peerConnections).forEach(k => delete peerConnections[k]);
}

const SIG_KEY = "ulx_webrtc_signals";

function sendSignal(fromEmail, toEmail, callId, type, data) {
  const signals = store.get(SIG_KEY) || [];
  signals.push({
    id: Date.now().toString() + Math.random(),
    fromEmail, toEmail, callId, type, data,
    createdAt: Date.now(),
  });
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
  logs.unshift({
    id: callId,
    callerEmail,
    callType,
    isGroup,
    groupId,
    groupName: isGroup ? (groups.find(g => g.id === groupId)?.name || groupId) : null,
    participants: [...new Set(participants)],
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    duration: `${mins}m ${secs}s`,
    loggedAt: new Date().toISOString(),
  });
  store.set("ulx_call_logs", logs.slice(0, 500));
}

async function saveTaskUpload(projectId, taskId, file, uploaderEmail) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const key = `${KEYS.taskUploads}_${projectId}_${taskId}`;
        let existing = store.get(key) || [];
        existing.push({
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadedBy: uploaderEmail,
          uploadedAt: new Date().toISOString(),
          data: reader.result,
        });
        store.set(key, existing);
        resolve(existing);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getTaskUploads(projectId, taskId) {
  try {
    const key = `${KEYS.taskUploads}_${projectId}_${taskId}`;
    return store.get(key) || [];
  } catch { return []; }
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

const GOAL_CATEGORIES = [
  "Technical Skills", "Communication", "Leadership", "Creativity",
  "Productivity", "Collaboration", "Problem Solving", "Industry Knowledge",
];

const AUTO_GOALS_BY_ROLE = {
  default: [
    "Complete all assigned tasks on time this month",
    "Submit weekly and monthly reports consistently",
    "Participate actively in team communications",
    "Attend all scheduled meetings",
    "Document at least one process or learning this month",
  ],
  admin: [
    "Review and respond to all team requests within 48 hours",
    "Provide structured feedback to at least one team member",
    "Identify one team bottleneck and propose a solution",
    "Track team progress across all active projects",
    "Lead or facilitate at least one team meeting",
  ],
};

function getAutoGoals(userRole) {
  const base = AUTO_GOALS_BY_ROLE.default;
  const roleSpecific = AUTO_GOALS_BY_ROLE[userRole] || [];
  return [...base, ...roleSpecific].map((text, i) => ({
    id: `auto_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
    text,
    category: GOAL_CATEGORIES[i % GOAL_CATEGORIES.length],
    source: "auto",
    status: "active",
  }));
}

function ensureMonthlyGoals(email, month, year, userRole) {
  const data = getGrowthData(email);
  const existing = data.goals.filter((g) => g.month === month && g.year === year);
  const launchDate = store.get(KEYS.launchDate);
const launchMonth = launchDate ? new Date(launchDate).getMonth() : 0;
const launchYear = launchDate ? new Date(launchDate).getFullYear() : year;
const isBeforeLaunch = year < launchYear || (year === launchYear && month < launchMonth);
if (existing.length < 3 && !isBeforeLaunch) {
    const autoGoals = getAutoGoals(userRole).slice(0, Math.max(0, 3 - existing.length)).map((g) => ({
      ...g,
      month,
      year,
    }));
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

  // Completion rate score (0-30)
  const completionRate = myTasks.length ? (completedTotal / myTasks.length) : 0;
  const completionScore = Math.round(completionRate * 30);

  // Period activity score (0-25)
  const periodActivity = activity.filter(
    (a) => a.userId === email && new Date(a.time) >= cutoff
  ).length;
  const activityScore = Math.min(25, Math.round(periodActivity * 2.5));

  // Tasks completed this period (0-20)
  const periodTaskScore = Math.min(20, completedPeriod * 4);

  // Report submission score (0-15)
  const now2 = new Date();
  const week = getWeekNum(now2);
  const month = now2.getMonth();
  const year = now2.getFullYear();
  const hasWeeklyReport = weeklyReports.some(
    (r) => r.email === email && r.week === week && r.year === year
  );
  const hasMonthlyReport = monthlyReports.some(
    (r) => r.email === email && r.month === month && r.year === year
  );
  const reportScore = period === "weekly"
    ? (hasWeeklyReport ? 15 : 0)
    : (hasMonthlyReport ? 15 : 0);

  // Messaging/collaboration score (0-10)
  const periodMessages = messages.filter(
    (m) => m.from === email && new Date(m.sentAt) >= cutoff
  ).length;
  const msgScore = Math.min(10, Math.round(periodMessages * 1));

  const total = completionScore + activityScore + periodTaskScore + reportScore + msgScore;

  return {
    total,
    breakdown: {
      completion: completionScore,
      activity: activityScore,
      tasks: periodTaskScore,
      reports: reportScore,
      collaboration: msgScore,
    },
    stats: {
      completedTotal,
      completedPeriod,
      inProgressPeriod,
      totalTasks: myTasks.length,
      periodActivity,
      hasWeeklyReport,
      hasMonthlyReport,
    },
  };
}

function savePerformanceSnapshot(email, month, year, snapshotData) {
  const snapshots = store.get(KEYS.performanceSnapshots) || [];
  const existingIdx = snapshots.findIndex(
    (s) => s.email === email && s.month === month && s.year === year
  );
  const entry = {
    id: `${email}_${month}_${year}`,
    email,
    month,
    year,
    snapshot: snapshotData,
    savedAt: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    snapshots[existingIdx] = entry;
  } else {
    snapshots.unshift(entry);
  }
  store.set(KEYS.performanceSnapshots, snapshots.slice(0, 2400)); // cap at 200 users * 12 months
}

function computeOverallInsight(score, uniqueHours, requiredHours) {
  const hoursOk = uniqueHours >= requiredHours * 0.8;
  const allTasksDone = score === 100;

  const excelling = [];
  const improving = [];
  const needsImprovement = [];

  // Task completion categorization
  if (score === 100) {
    excelling.push("Task completion rate");
  } else if (score >= 75) {
    excelling.push("Task completion rate");
  } else if (score >= 45) {
    improving.push("Task completion rate");
  } else {
    needsImprovement.push("Task completion rate");
  }

  // Hours categorization
  if (hoursOk) {
    excelling.push("Platform engagement hours");
  } else if (uniqueHours >= requiredHours * 0.5) {
    improving.push("Platform engagement hours");
  } else {
    needsImprovement.push("Platform engagement hours");
  }

  // Always ensure all three arrays have at least one entry for the monthly snapshot
  // so growth metrics can surface something in every category
  if (excelling.length === 0) excelling.push("Consistency and follow-through");
  if (improving.length === 0) improving.push("Output momentum");
  if (needsImprovement.length === 0) needsImprovement.push("Sustaining current performance level");

  let overallInsight = "";

  if (allTasksDone && hoursOk) {
    overallInsight = `Outstanding performance — all tasks completed and platform hours fully met. Excelling in ${excelling.join(" and ")}. Keep sustaining this level of output and engagement.`;
  } else if (allTasksDone && !hoursOk) {
    overallInsight = `All assigned tasks have been completed — excellent delivery. Excelling in ${excelling.filter(e => e !== "Platform engagement hours").join(", ") || "task delivery"}. Platform engagement hours are still building; increasing active time will strengthen the overall performance picture.`;
  } else if (hoursOk && score >= 60) {
    overallInsight = `Meeting expectations on both hours and task delivery. Currently excelling in ${excelling.join(", ")}. Continue building momentum — ${improving.length > 0 ? improving.join(" and ") + " are areas to keep developing" : "sustain the current pace"}.`;
  } else if (hoursOk && score < 60) {
    overallInsight = `Platform engagement hours are solid. Task completion (${score}%) needs more focus — prioritise delivery on outstanding tasks. Currently improving: ${improving.join(", ") || "output consistency"}. Needs attention: ${needsImprovement.filter(e => e !== "Platform engagement hours").join(", ") || "task completion rate"}.`;
  } else if (!hoursOk && score >= 60) {
    overallInsight = `Good task output (${score}%) but active platform hours are below threshold. Excelling in ${excelling.filter(e => e !== "Platform engagement hours").join(", ") || "task delivery"}. Needs improvement: consistent platform presence. Currently improving: ${improving.join(", ") || "overall engagement"}.`;
  } else {
    overallInsight = `Below expectations on both hours and task completion (${score}%). Needs immediate focus on: ${needsImprovement.join(", ")}. Currently improving: ${improving.join(", ") || "general output"}. Excelling in: ${excelling.join(", ")}.`;
  }

  return { overallInsight, excelling, improving, needsImprovement };
}

function generateGrowthMetrics(email) {
  const snapshots = (store.get(KEYS.performanceSnapshots) || [])
    .filter((s) => s.email === email)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

  if (snapshots.length < 2) return [];

  const periods = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const periodDefs = [
    { label: "3 Months", months: 3 },
    { label: "6 Months", months: 6 },
    { label: "9 Months", months: 9 },
    { label: "1 Year", months: 12 },
  ];

  periodDefs.forEach(({ label, months }) => {
    const cutoffDate = new Date(currentYear, currentMonth - months + 1, 1);
    const cutoffMonth = cutoffDate.getMonth();
    const cutoffYear = cutoffDate.getFullYear();

    const relevant = snapshots.filter((s) => {
      if (s.year > cutoffYear) return true;
      if (s.year === cutoffYear && s.month >= cutoffMonth) return true;
      return false;
    });

    if (relevant.length < 2) return;

    const avgScore = Math.round(
      relevant.reduce((sum, s) => sum + (s.snapshot.score || 0), 0) / relevant.length
    );
    const avgHoursPercent = Math.round(
      relevant.reduce((sum, s) => sum + (s.snapshot.hoursPercent || 0), 0) / relevant.length
    );
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

    periods.push({
      periodLabel: label,
      months,
      startMonth: firstSnap.month,
      startYear: firstSnap.year,
      endMonth: lastSnap.month,
      endYear: lastSnap.year,
      avgScore,
      avgHoursPercent,
      totalCompleted,
      totalActive,
      excelling: topExcelling,
      improving: topImproving,
      needsImprovement: topNeeds,
      monthsCovered: relevant.length,
      generatedAt: new Date().toISOString(),
    });
  });

  // Year-over-year periods for data older than 12 months
  const years = [...new Set(snapshots.map((s) => s.year))].sort();
  if (years.length >= 2) {
    years.forEach((yr) => {
      const yearSnaps = snapshots.filter((s) => s.year === yr);
      if (yearSnaps.length < 2) return;
      const alreadyInPeriods = yr === currentYear;
      if (alreadyInPeriods) return;
      const avgScore = Math.round(yearSnaps.reduce((sum, s) => sum + (s.snapshot.score || 0), 0) / yearSnaps.length);
      const avgHoursPercent = Math.round(yearSnaps.reduce((sum, s) => sum + (s.snapshot.hoursPercent || 0), 0) / yearSnaps.length);
      const totalCompleted = yearSnaps.reduce((sum, s) => sum + (s.snapshot.done || 0), 0);

      const excellingCounts = {};
      const improvingCounts = {};
      const needsCounts = {};
      yearSnaps.forEach((s) => {
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

      periods.push({
        periodLabel: `Year ${yr}`,
        months: 12,
        startMonth: yearSnaps[0].month,
        startYear: yr,
        endMonth: yearSnaps[yearSnaps.length - 1].month,
        endYear: yr,
        avgScore,
        avgHoursPercent,
        totalCompleted,
        totalActive: yearSnaps.reduce((sum, s) => sum + (s.snapshot.active || 0), 0),
        excelling: Object.entries(excellingCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k),
        improving: Object.entries(improvingCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k),
        needsImprovement: Object.entries(needsCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k),
        monthsCovered: yearSnaps.length,
        generatedAt: new Date().toISOString(),
      });
    });
  }

  return periods;
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
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

const Inp = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  style: s,
  autoComplete,
}) => (
  <div style={{ marginBottom: 16, ...s }}>
    {label && (
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
          marginBottom: 7,
          fontFamily: "'DM Mono',monospace",
          letterSpacing: "0.08em",
        }}
      >
        {label.toUpperCase()}
      </div>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete || "off"}
      style={{
        width: "100%",
        padding: "11px 14px",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        color: "#fff",
        fontSize: 14,
        outline: "none",
      }}
    />
  </div>
);

const Btn = ({
  children,
  onClick,
  variant = "primary",
  disabled,
  style: s,
}) => {
  const styles = {
    primary: { background: GOLD, color: BG },
    secondary: {
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.7)",
      border: `1px solid ${BORDER}`,
    },
    danger: {
      background: RED + "22",
      color: RED,
      border: `1px solid ${RED}44`,
    },
    ghost: {
      background: "transparent",
      color: "rgba(255,255,255,0.4)",
      border: "none",
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 20px",
        borderRadius: 8,
        border: "none",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'DM Mono',monospace",
        letterSpacing: "0.05em",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        ...styles[variant],
        ...s,
      }}
    >
      {children}
    </button>
  );
};

const Badge = ({ text, color }) => (
  <span
    style={{
      padding: "3px 10px",
      borderRadius: 20,
      background: color + "22",
      color,
      fontSize: 11,
      fontFamily: "'DM Mono',monospace",
      fontWeight: 600,
      border: `1px solid ${color}44`,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </span>
);

const Modal = ({ title, children, onClose, width = 480 }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(4px)",
    }}
  >
    <div
      style={{
        width,
        maxHeight: "85vh",
        overflowY: "auto",
        background: "#111118",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 28,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>
          {title}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
      {children}
    </div>
  </div>
);

const EmptyState = ({ icon, title, sub }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 40px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 40, opacity: 0.12, marginBottom: 16 }}>{icon}</div>
    <div
      style={{
        fontSize: 15,
        fontWeight: 600,
        color: "rgba(255,255,255,0.3)",
        marginBottom: 6,
      }}
    >
      {title}
    </div>
    {sub && (
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.18)" }}>{sub}</div>
    )}
  </div>
);

const Avatar = ({ name = "?", color = GOLD, size = 36 }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: 700,
        color: BG,
        fontFamily: "'DM Mono',monospace",
        flexShrink: 0,
        border: "1.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {initials}
    </div>
  );
};

const ProgressBar = ({ pct, color = GOLD, height = 5 }) => (
  <div
    style={{
      background: "rgba(255,255,255,0.06)",
      borderRadius: height,
      height,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${Math.min(pct, 100)}%`,
        height: "100%",
        borderRadius: height,
        background: color,
        transition: "width 0.8s ease",
      }}
    />
  </div>
);

const statusColor = (s) =>
  ({
    "Not Started": "rgba(255,255,255,0.25)",
    "In Progress": GOLD,
    Completed: TEAL,
  }[s] || BORDER);

  // ─── PRESENCE DOT ─────────────────────────────────────────────────────────────
  const PresenceDot = ({ email, size = 10 }) => {
    const [info, setInfo] = useState(null);
    useEffect(() => {
      const refresh = () => {
        const presence = store.get(KEYS.presence) || {};
        setInfo(presence[email] || null);
      };
      refresh();
      const t = setInterval(refresh, 30000);
      return () => clearInterval(t);
    }, [email]);
  
    if (!info) return null;
  
    // Treat as offline if the heartbeat hasn't fired in more than 2 minutes,
    // even if online flag is still true (handles tab-close without beforeunload firing)
    const lastSeenMs = new Date(info.lastSeen).getTime();
    const stale = Date.now() - lastSeenMs > 2 * 60 * 1000;
    const isOnline = info.online && !stale;
  
    const offlineTimestamp = info.offlineSince || info.lastSeen;
    const color = isOnline ? "#4CAF50" : "rgba(255,255,255,0.25)";
    const label = isOnline
  ? `Active · since ${timeAgo(info.sessionStart || info.lastSeen)}`
  : `Offline · last seen ${timeAgo(offlineTimestamp)}`;
  
    return (
      <div title={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: isOnline ? `0 0 0 2px #4CAF5044` : "none" }} />
        <span style={{ fontSize: 10, color: isOnline ? "#4CAF50" : "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>
          {label}
        </span>
      </div>
    );
  };

// ─── CONFIDENTIALITY AGREEMENT GATE ──────────────────────────────────────────
const DEFAULT_CONFIDENTIALITY_BLOCKS = [
  {
    type: "text",
    content: `# ULREVIX CONFIDENTIALITY AND BUILD AGREEMENT

^Effective upon digital signature below^

## 1. PARTIES

This Confidentiality and Build Agreement ("Agreement") is entered into between Ulrevix ("the Company") and the individual identified by the signature below ("the Member").

## 2. CONFIDENTIAL INFORMATION

The Member acknowledges that in the course of their engagement with Ulrevix, they will have access to confidential and proprietary information including but not limited to: business strategies, financial data, product development plans, creative works, platform operations, technical systems, client information, internal processes, team structures, and all communications conducted through the Ulrevix Team OS platform ("Confidential Information").

## 3. OBLIGATIONS OF CONFIDENTIALITY

The Member agrees to:

**3.1** Keep all Confidential Information strictly private and not disclose it to any third party without prior written consent from the Company.

**3.2** Use Confidential Information solely for the purpose of fulfilling their role within Ulrevix.

**3.3** Not copy, reproduce, distribute, or transmit any Confidential Information beyond what is necessary for their assigned duties.

**3.4** Immediately notify the Company upon becoming aware of any actual or potential breach of confidentiality.

## 4. BUILD AGREEMENT

The Member acknowledges and agrees that:

**4.1** All work, deliverables, content, code, strategies, creative materials, and any other outputs produced during their engagement with Ulrevix are the sole intellectual property of Ulrevix.

**4.2** The Member waives any claim to intellectual property rights over work produced in their capacity as a Ulrevix team member.

**4.3** Upon termination of engagement, the Member will return or permanently delete all Confidential Information in their possession.

## 5. NON-SOLICITATION

The Member agrees not to solicit, recruit, or engage any Ulrevix team member, partner, or collaborator for a competing venture for a period of twelve (12) months following the conclusion of their engagement.

## 6. PLATFORM CONDUCT

The Member agrees that all activity conducted on the Ulrevix Team OS platform is monitored and logged for operational and accountability purposes, and consents to such monitoring as a condition of access.

## 7. CONSEQUENCES OF BREACH

The Member understands that any breach of this Agreement may result in immediate termination of their engagement, legal action, and forfeiture of any compensation owed.

## 8. GOVERNING AGREEMENT

By signing below, the Member confirms they have read, understood, and agree to be bound by all terms of this Agreement in full.`,
  },
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

  const handleSign = () => {
    setErr("");
    if (!agreed) { setErr("You must check the agreement box to proceed."); return; }
    if (!fullName.trim()) { setErr("Please enter your full name to sign."); return; }
    setSubmitting(true);
    const allSigned = store.get(KEYS.confidentialitySigned) || {};
    allSigned[user.email] = {
      signedAt: new Date().toISOString(),
      fullName: fullName.trim(),
      agreedAt: new Date().toISOString(),
      signDate,
    };
    store.set(KEYS.confidentialitySigned, allSigned);
    addActivity(user.email, "signed the Confidentiality and Build Agreement", "", null);
    addNotif(ADMIN_EMAIL, "task", `${user.email} has signed the Confidentiality and Build Agreement.`);
    setSubmitting(false);
    onSigned();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: BG, zIndex: 3000,
      display: "flex", flexDirection: "column", fontFamily: "'Sora',sans-serif",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 28px 100px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", border: `1px solid ${GOLD}44`, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: GOLD, letterSpacing: "0.1em" }}>ULREVIX TEAM OS · REQUIRED AGREEMENT</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
            Confidentiality & Build Agreement
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            Please read the entire agreement carefully before signing. You must sign this agreement to access the platform.
          </p>
        </div>

        {/* Agreement content */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "28px 32px", marginBottom: 28 }}>
          {blocks.map((block, bi) =>
            block.type === "text" ? (
              <div key={bi} style={{ marginBottom: 10 }}>{renderFormattedText(block.content)}</div>
            ) : (
              <div key={bi} style={{ overflowX: "auto", marginBottom: 18 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri === 0 ? "rgba(200,169,110,0.08)" : ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ border: `1px solid ${BORDER}`, padding: "8px 12px", color: ri === 0 ? GOLD : "rgba(255,255,255,0.65)", fontWeight: ri === 0 ? 600 : 400, fontFamily: ri === 0 ? "'DM Mono',monospace" : "'Sora',sans-serif" }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Signature section */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}33`, borderRadius: 14, padding: "28px 32px" }}>
          <div style={{ fontSize: 11, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 20 }}>DIGITAL SIGNATURE</div>

          {/* Checkbox */}
          <div
            onClick={() => setAgreed(!agreed)}
            style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 24, cursor: "pointer" }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 5, border: `2px solid ${agreed ? TEAL : GOLD}`,
              background: agreed ? TEAL + "33" : "transparent", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, color: TEAL, flexShrink: 0, marginTop: 1,
            }}>
              {agreed ? "✓" : ""}
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
              I have read, understood, and agree to be fully bound by the terms of this Confidentiality and Build Agreement. I understand that this is a legally binding document and that my digital signature below constitutes my acceptance.
            </p>
          </div>

          {/* Full name */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 7 }}>FULL LEGAL NAME (Signature)</div>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Type your full name exactly as it appears on your ID"
              style={{
                width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.04)",
                border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14,
                outline: "none", fontFamily: "'Sora',sans-serif",
              }}
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 7 }}>DATE</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              {signDate}
            </div>
          </div>

          {err && (
            <div style={{ padding: "10px 14px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 8, color: RED, fontSize: 13, marginBottom: 16 }}>
              {err}
            </div>
          )}

          <Btn onClick={handleSign} disabled={submitting} style={{ width: "100%", padding: "14px", fontSize: 14 }}>
            {submitting ? "Signing…" : "I Agree & Sign This Agreement →"}
          </Btn>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
            By clicking above, your digital signature, name, and the timestamp will be permanently recorded on the Ulrevix platform.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── PRE-LAUNCH SCREEN ────────────────────────────────────────────────────────
const PreLaunch = ({ onLaunch }) => {
  const [confirm, setConfirm] = useState(false);
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Sora',sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(200,169,110,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(200,169,110,0.03) 1px,transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "20%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle,rgba(200,169,110,0.07) 0%,transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "relative",
          textAlign: "center",
          maxWidth: 560,
          padding: 40,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            border: `1px solid ${GOLD}44`,
            borderRadius: 8,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: GOLD,
              animation: "pulse 2s infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 12,
              color: GOLD,
              letterSpacing: "0.12em",
            }}
          >
            ULREVIX TEAM OS · READY TO LAUNCH
          </span>
        </div>
        <h1
          style={{
            fontSize: 54,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          Day <span style={{ color: GOLD }}>One</span>
          <br />
          Starts Now.
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.7,
            marginBottom: 48,
          }}
        >
          Your team intelligence platform is configured and ready.
          <br />
          Once launched, the clock starts — real-time tracking begins.
        </p>
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            style={{
              padding: "18px 48px",
              background: GOLD,
              border: "none",
              borderRadius: 12,
              color: BG,
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.08em",
            }}
          >
            LAUNCH PLATFORM →
          </button>
        ) : (
          <div
            style={{
              background: "rgba(200,169,110,0.08)",
              border: `1px solid ${GOLD}44`,
              borderRadius: 14,
              padding: 28,
            }}
          >
            <p
              style={{
                color: "#fff",
                marginBottom: 20,
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              Confirm launch? This will start real-time tracking for your entire
              team from this moment.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn onClick={onLaunch} style={{ padding: "12px 28px" }}>
                CONFIRM LAUNCH
              </Btn>
              <Btn variant="secondary" onClick={() => setConfirm(false)}>
                Cancel
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState("choose"); // choose | login | register | resetRequest | resetWaiting | resetNew
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetId, setResetId] = useState(null);

  const allUsers = store.get(KEYS.users) || {};
  const passwords = store.get(KEYS.passwords) || {};
  const pendingEmails = store.get(KEYS.pendingEmails) || [];
  const pwResets = store.get(KEYS.pwResets) || [];

  // Build list of emails that have been granted admin role
const users = store.get(KEYS.users) || {};
const adminRoleEmails = Object.entries(users)
  .filter(([em, u]) => u.role === "admin" && em !== ADMIN_EMAIL)
  .map(([em]) => em);

// Only include emails from history whose MOST RECENT authorized entry has role === "admin"
// This ensures a downgraded admin is no longer treated as admin
const pendingAdminEmails = (() => {
  const hist = store.get(KEYS.emailHistory) || [];
  const emailLatestRole = {};
  // Process history oldest-first so latest entry wins
  [...hist].reverse().forEach(h => {
    if (h.action === "authorized" && h.email !== ADMIN_EMAIL) {
      emailLatestRole[h.email] = h.role;
    }
  });
  return Object.entries(emailLatestRole)
    .filter(([, role]) => role === "admin")
    .map(([em]) => em);
})();

const allAdminEmails = [...new Set([ADMIN_EMAIL, ...adminRoleEmails, ...pendingAdminEmails])];

const allowedEmails =
  role === "admin"
    ? allAdminEmails
    : [...INITIAL_MEMBER_EMAILS, ...pendingEmails].filter(
        em => !allAdminEmails.includes(em)
      );

  const isRegistered = (em) => !!passwords[em];

  const handleLoginOrRegister = () => {
    setErr("");
    setInfo("");

    const em = email.trim().toLowerCase();

// Prevent admin-role emails from logging in as Member
if (role === "member" && allAdminEmails.includes(em)) {
  setErr("This email is not authorized for this role.");
  return;
}

// Prevent member emails from logging in as Admin
if (role === "admin" && !allAdminEmails.includes(em)) {
  setErr("This email is not authorized for this role.");
  return;
}
    const blockedEmails = store.get(KEYS.blockedEmails) || [];
    if (blockedEmails.includes(em)) {
      setErr("This email has been blocked. Contact your admin.");
      return;
    }
    if (
      !allowedEmails.includes(em) &&
      !(role === "admin" && em === ADMIN_EMAIL)
    ) {
      setErr("This email is not authorized for this role.");
      return;
    }
    // Check if pw reset is pending — block login
    const pendingReset = pwResets.find(
      (r) => r.email === em && r.status === "pending"
    );
    if (pendingReset) {
      setResetId(pendingReset.id);
      setMode("resetWaiting");
      return;
    }

    if (!isRegistered(em)) {
      setMode("register");
      return;
    }
    // login
    if (hashPw(pw) !== passwords[em]) {
      setErr("Incorrect password.");
      return;
    }
    
    const users = store.get(KEYS.users) || {};
const user = users[em] || {
  name: em.split("@")[0],
  email: em,
  role: em === ADMIN_EMAIL ? "admin" : "member",
  color: COLORS[Object.keys(users).length % COLORS.length],
};
user.email = em;
// Always use the role stored in the users object (most authoritative source)
// Fall back to allAdminEmails check only if user record doesn't exist yet
if (users[em]) {
  user.role = users[em].role || (allAdminEmails.includes(em) ? "admin" : "member");
} else {
  user.role = allAdminEmails.includes(em) ? "admin" : "member";
}
onLogin(user);
  };

  const handleRegister = () => {
    setErr("");
    if (pw.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    const em = email.trim().toLowerCase();
    const pws = store.get(KEYS.passwords) || {};
    pws[em] = hashPw(pw);
    store.set(KEYS.passwords, pws);
    const users = store.get(KEYS.users) || {};
    if (!users[em]) {
      users[em] = {
        name: em.split("@")[0],
        email: em,
        role: em === ADMIN_EMAIL || (store.get(KEYS.emailHistory) || []).some(h => h.email === em && h.action === "authorized" && h.role === "admin") ? "admin" : "member",
        color: COLORS[Object.keys(users).length % COLORS.length],
        dept: "",
        title: "",
        status: "Member",
        team: "",
        registeredAt: new Date().toISOString(),
      };
    }
    store.set(KEYS.users, users);
    addActivity(em, "joined the platform", "", null);
    const u = users[em];
    u.email = em;
    onLogin(u);
  };

  const handleResetRequest = () => {
    setErr("");
    const em = email.trim().toLowerCase();
    if (!allowedEmails.includes(em)) {
      setErr("Email not recognized.");
      return;
    }
    
    // Create new request
    const existing = pwResets.find(
      (r) => r.email === em && r.status === "pending"
    );
    if (existing) {
      setResetId(existing.id);
      setMode("resetWaiting");
      return;
    }
    const id = Date.now().toString();
    const resets = store.get(KEYS.pwResets) || [];
    resets.push({
      id,
      email: em,
      requestedAt: new Date().toISOString(),
      status: "pending",
    });
    store.set(KEYS.pwResets, resets);
    addNotif(ADMIN_EMAIL, "pwReset", `Password reset requested by ${em}`);
    setResetId(id);
    setMode("resetWaiting");
  };

  const handleSetNewPw = () => {
    setErr("");
    if (pw.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    const em = email.trim().toLowerCase();
    const pws = store.get(KEYS.passwords) || {};
    pws[em] = hashPw(pw);
    store.set(KEYS.passwords, pws);
    // Mark reset as used
    const resets = store.get(KEYS.pwResets) || [];
    const idx = resets.findIndex((r) => r.id === resetId);
    if (idx >= 0) resets[idx].status = "used";
    store.set(KEYS.pwResets, resets);
    setInfo("Password updated! You can now sign in.");
    setMode("login");
  };

  // Check if waiting reset got resolved
  useEffect(() => {
    if (mode !== "resetWaiting" || !resetId) return;
    const interval = setInterval(() => {
      const resets = store.get(KEYS.pwResets) || [];
      const r = resets.find((x) => x.id === resetId);
      if (r?.status === "approved") setMode("resetNew");
      if (r?.status === "rejected") {
        setMode("login");
        setErr("Password reset was rejected. Use your existing password.");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [mode, resetId]);

  const BgGrid = () => (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(200,169,110,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(200,169,110,0.025) 1px,transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "15%",
          right: "20%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle,rgba(126,184,164,0.05) 0%,transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
    </>
  );

  if (mode === "choose")
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Sora',sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <BgGrid />
        <div
          style={{
            position: "relative",
            width: 440,
            padding: "48px 40px",
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                border: `1px solid ${GOLD}44`,
                borderRadius: 8,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: GOLD,
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 12,
                  color: GOLD,
                  letterSpacing: "0.1em",
                }}
              >
                ULREVIX TEAM OS
              </span>
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.03em",
                marginBottom: 8,
              }}
            >
              Welcome Back
            </h1>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
              Sign in as your role to continue
            </p>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            {[
              {
                r: "admin",
                label: "Admin",
                icon: "◈",
                desc: "Full platform access",
              },
              {
                r: "member",
                label: "Member",
                icon: "◎",
                desc: "Team member access",
              },
            ].map(({ r, label, icon, desc }) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  setMode("login");
                }}
                style={{
                  padding: "24px 16px",
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = GOLD;
                  e.currentTarget.style.background = GOLD + "11";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = BORDER;
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
              >
                <div style={{ fontSize: 24, color: GOLD, marginBottom: 10 }}>
                  {icon}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

  const isLogin = mode === "login";
  const isRegister = mode === "register";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Sora',sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <BgGrid />
      <div
        style={{
          position: "relative",
          width: 440,
          padding: "40px 36px",
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          animation: "fadeIn 0.3s ease",
        }}
      >
        <button
          onClick={() => {
            setMode("choose");
            setErr("");
            setInfo("");
          }}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
            fontSize: 13,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back
        </button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
         
          <Badge
            text={role === "admin" ? "ADMIN" : "MEMBER"}
            color={role === "admin" ? GOLD : TEAL}
          />
          
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              marginTop: 14,
              marginBottom: 6,
            }}
          >
            {mode === "resetRequest"
              ? "Reset Password"
              : mode === "resetWaiting"
              ? "Awaiting Approval"
              : mode === "resetNew"
              ? "Set New Password"
              : isRegister
              ? "Create Password"
              : "Sign In"}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {isRegister
              ? "First time? Set your password to activate your account."
              : mode === "resetWaiting"
              ? "Your request has been sent to the admin."
              : "Enter your credentials to continue."}
          </p>
        </div>

        {err && (
          <div
            style={{
              padding: "10px 14px",
              background: RED + "22",
              border: `1px solid ${RED}44`,
              borderRadius: 8,
              color: RED,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {err}
          </div>
        )}
        {info && (
          <div
            style={{
              padding: "10px 14px",
              background: TEAL + "22",
              border: `1px solid ${TEAL}44`,
              borderRadius: 8,
              color: TEAL,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {info}
          </div>
        )}

        {mode === "resetWaiting" && (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: `3px solid ${GOLD}44`,
                borderTop: `3px solid ${GOLD}`,
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px",
              }}
            />
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Waiting for admin to approve your password reset request.
              <br />
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                You cannot log in until this is resolved.
              </span>
            </p>
            <Btn
              variant="ghost"
              onClick={() => {
                setMode("choose");
              }}
              style={{ marginTop: 20, fontSize: 12 }}
            >
              ← Back to login
            </Btn>
          </div>
        )}

        {(isLogin ||
          isRegister ||
          mode === "resetRequest" ||
          mode === "resetNew") && (
          <>
            {(isLogin || isRegister || mode === "resetRequest") && (
              <Inp
                label="Email Address"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder={
                  role === "admin" ? "admin@email.com" : "your@email.com"
                }
              />
            )}
            {(isLogin || isRegister || mode === "resetNew") && (
              <Inp
                label={
                  isRegister || mode === "resetNew"
                    ? "New Password"
                    : "Password"
                }
                value={pw}
                onChange={setPw}
                type="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            )}
            {(isRegister || mode === "resetNew") && (
              <Inp
                label="Confirm Password"
                value={pw2}
                onChange={setPw2}
                type="password"
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            )}

            <Btn
              onClick={
                mode === "resetRequest"
                  ? handleResetRequest
                  : mode === "resetNew"
                  ? handleSetNewPw
                  : isRegister
                  ? handleRegister
                  : handleLoginOrRegister
              }
              style={{ width: "100%", padding: "13px", marginBottom: 14 }}
            >
              {isRegister
                ? "CREATE PASSWORD & SIGN IN"
                : mode === "resetRequest"
                ? "SEND RESET REQUEST"
                : mode === "resetNew"
                ? "SAVE NEW PASSWORD"
                : "SIGN IN →"}
            </Btn>

            {isLogin && (
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => {
                    setMode("resetRequest");
                    setErr("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Forgot password? Request a reset
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
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
  <div
    style={{
      width: 216,
      minHeight: "100vh",
      background: "#0D0D14",
      borderRight: `1px solid ${BORDER}`,
      display: "flex",
      flexDirection: "column",
      padding: "20px 0",
      flexShrink: 0,
    }}
  >
    <div style={{ padding: "0 18px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: `linear-gradient(135deg,${GOLD},#9B7A42)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 800,
            color: BG,
          }}
        >
          U
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.06em",
            }}
          >
            ULREVIX
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.08em",
            }}
          >
            TEAM OS
          </div>
        </div>
      </div>
    </div>
    <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
      {NAV_ITEMS.filter((n) => !n.adminOnly || user.role === "admin").map(
        ({ id, label, icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 11px",
                marginBottom: 2,
                background: active ? GOLD + "18" : "transparent",
                border: active
                  ? `1px solid ${GOLD}33`
                  : "1px solid transparent",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: active ? GOLD : "rgba(255,255,255,0.35)",
                }}
              >
                {icon}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? GOLD : "rgba(255,255,255,0.45)",
                  flex: 1,
                }}
              >
                {label}
              </span>
              {id === "activity" && unreadCount > 0 && (
                <span
                  style={{
                    background: GOLD,
                    color: BG,
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 10,
                    padding: "1px 5px",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        }
      )}
    </nav>
    <div style={{ padding: "14px 18px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar
          name={user.name || user.email}
          color={user.color || GOLD}
          size={30}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {(user.name || user.email).split(" ")[0]}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
            {user.role}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
const TopBar = ({ title, user, onSignOut, notifCount, onNotif, timer }) => {
  const [now, setNow] = useState(new Date());
  const launchDate = store.get(KEYS.launchDate);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const daysSinceLaunch = launchDate
    ? Math.floor((now - new Date(launchDate)) / 86400000)
    : 0;
  const week = launchDate
    ? Math.floor(daysSinceLaunch / 7) + 1
    : getWeekNum(now);

  return (
    <div
      style={{
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        borderBottom: `1px solid ${BORDER}`,
        background: BG,
        flexShrink: 0,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            W{String(week).padStart(2, "0")} ·{" "}
            {MONTHS[now.getMonth()].toUpperCase()} {now.getFullYear()}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            DAY {daysSinceLaunch + 1} ·{" "}
            {now.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>
        {timer !== null && (
          <div
            style={{
              padding: "4px 10px",
              background: timer < 60000 ? RED + "22" : "rgba(255,255,255,0.04)",
              border: `1px solid ${timer < 60000 ? RED + "44" : BORDER}`,
              borderRadius: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: timer < 60000 ? RED : "rgba(255,255,255,0.3)",
                fontFamily: "'DM Mono',monospace",
              }}
            >
              AUTO-LOGOUT {Math.ceil(timer / 60000)}m
            </span>
          </div>
        )}
        <button
          onClick={onNotif}
          style={{
            position: "relative",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            width: 34,
            height: 34,
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ◌
          {notifCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: GOLD,
              }}
            />
          )}
        </button>
        <Btn
          variant="secondary"
          onClick={onSignOut}
          style={{ padding: "6px 14px", fontSize: 11 }}
        >
          Sign Out
        </Btn>
      </div>
    </div>
  );
};

// ─── NOTIFICATIONS PANEL ──────────────────────────────────────────────────────
const NotifPanel = ({ user, onClose }) => {
  const [notifs, setNotifs] = useState([]);
  useEffect(() => {
    const all = store.get(KEYS.notifs) || [];
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const filtered = all.filter((n) => {
      if (n.forEmail !== user.email) return true;
      if (n.read && (now - new Date(n.createdAt).getTime()) > fortyEightHours) return false;
      return true;
    });
    if (filtered.length !== all.length) {
      store.set(KEYS.notifs, filtered);
    }
    setNotifs(filtered.filter((n) => n.forEmail === user.email).slice(0, 30));
  }, [user.email]);

  const markRead = (id) => {
    const all = store.get(KEYS.notifs) || [];
    const idx = all.findIndex((n) => n.id === id);
    if (idx >= 0) all[idx].read = true;
    store.set(KEYS.notifs, all);
    setNotifs(all.filter((n) => n.forEmail === user.email).slice(0, 30));
  };

  const typeColor = {
    deadline: GOLD,
    task: TEAL,
    report: PURPLE,
    alert: RED,
    pwReset: GOLD,
    profileChange: TEAL,
    message: "#7BA8C4",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 0,
        width: 320,
        maxHeight: "70vh",
        overflowY: "auto",
        background: "#111118",
        border: `1px solid ${BORDER}`,
        borderRadius: "0 0 0 14px",
        zIndex: 300,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "#111118",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "0.08em",
          }}
        >
          NOTIFICATIONS
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          ×
        </button>
      </div>
      {notifs.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "rgba(255,255,255,0.2)",
            fontSize: 13,
          }}
        >
          No notifications yet
        </div>
      ) : (
        notifs.map((n) => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            style={{
              padding: "13px 18px",
              borderBottom: `1px solid rgba(255,255,255,0.04)`,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              opacity: n.read ? 0.45 : 1,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: typeColor[n.type] || GOLD,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.5,
                }}
              >
                {n.text}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.2)",
                  marginTop: 3,
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {timeAgo(n.createdAt)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ─── MEMBER SPOTLIGHT ────────────────────────────────────────────────────────
const MemberSpotlight = ({ currentUser }) => {
  const [period, setPeriod] = useState("weekly");
  const [rankings, setRankings] = useState([]);
  const [spotlight, setSpotlight] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const allUsers = store.get(KEYS.users) || {};
    const scored = Object.entries(allUsers).map(([email, u]) => {
      const score = calculateMemberScore(email, period);
      return { email, user: u, ...score };
    });
    scored.sort((a, b) => b.total - a.total);
    setRankings(scored);
    setSpotlight(scored[0] || null);

    // Save rankings snapshot
    const now = new Date();
    const week = getWeekNum(now);
    const year = now.getFullYear();
    const month = now.getMonth();
    const snapshot = scored.map(({ email, total, breakdown, stats }) => ({ email, total, breakdown, stats }));

    if (period === "weekly") {
      const saved = store.get(KEYS.weeklyRankings) || [];
      const exists = saved.findIndex(r => r.week === week && r.year === year);
      if (exists >= 0) saved[exists].rankings = snapshot;
      else saved.unshift({ week, year, rankings: snapshot });
      store.set(KEYS.weeklyRankings, saved.slice(0, 52));

      // Save spotlight
      if (scored[0]) {
        const spots = store.get(KEYS.weeklySpotlights) || [];
        const spotExists = spots.findIndex(s => s.week === week && s.year === year);
        const spotEntry = { week, year, email: scored[0].email, name: scored[0].user?.name || scored[0].email, total: scored[0].total, stats: scored[0].stats };
        if (spotExists >= 0) spots[spotExists] = spotEntry;
        else spots.unshift(spotEntry);
        store.set(KEYS.weeklySpotlights, spots.slice(0, 52));
      }
    } else {
      const saved = store.get(KEYS.monthlyRankings) || [];
      const exists = saved.findIndex(r => r.month === month && r.year === year);
      if (exists >= 0) saved[exists].rankings = snapshot;
      else saved.unshift({ month, year, rankings: snapshot });
      store.set(KEYS.monthlyRankings, saved.slice(0, 24));
    }
  }, [period]);

  const rankColor = (i) => {
    if (i === 0) return GOLD;
    if (i === 1) return "#C0C0C0";
    if (i === 2) return "#CD7F32";
    return "rgba(255,255,255,0.25)";
  };

  const rankLabel = (i) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `#${i + 1}`;
  };

  const breakdownLabels = {
    completion: "Completion Rate",
    activity: "Activity",
    tasks: "Tasks Done",
    reports: "Reports",
    collaboration: "Collaboration",
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      {/* Period toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[{ v: "weekly", label: "Weekly Rankings" }, { v: "monthly", label: "Monthly Rankings" }].map(({ v, label }) => (
          <button
            key={v}
            onClick={() => setPeriod(v)}
            style={{
              padding: "7px 18px",
              borderRadius: 20,
              border: `1px solid ${period === v ? GOLD : BORDER}`,
              background: period === v ? GOLD + "22" : "transparent",
              color: period === v ? GOLD : "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {label}
          </button>
        ))}
        {/* ── SAVED HISTORY ── */}
{(() => {
  const now = new Date();
  const week = getWeekNum(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  const allUsers = store.get(KEYS.users) || {};

  if (period === "weekly") {
    const savedSpots = (store.get(KEYS.weeklySpotlights) || []).filter(s => !(s.week === week && s.year === year));
    const savedRanks = (store.get(KEYS.weeklyRankings) || []).filter(r => !(r.week === week && r.year === year));
    if (savedSpots.length === 0 && savedRanks.length === 0) return null;
    return (
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>PAST WEEKLY SPOTLIGHTS & RANKINGS</div>
        {savedSpots.map((s, i) => {
          const u = allUsers[s.email] || {};
          const rankSnap = savedRanks.find(r => r.week === s.week && r.year === s.year);
          return (
            <div key={i} style={{ background: CARD, border: `1px solid ${GOLD}33`, borderRadius: 12, padding: "16px 20px", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>W{s.week} {s.year} — SPOTLIGHT</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: rankSnap ? 14 : 0 }}>
                <div style={{ fontSize: 24 }}>🌟</div>
                <Avatar name={s.name} color={u.color || GOLD} size={36} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{s.stats?.completedPeriod || 0} tasks completed · Score: <span style={{ color: GOLD }}>{s.total}</span></div>
                </div>
              </div>
              {rankSnap && (
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>FULL RANKINGS</div>
                  {rankSnap.rankings.map((r, ri) => {
                    const ru = allUsers[r.email] || {};
                    return (
                      <div key={r.email} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <span style={{ fontSize: 11, color: ri === 0 ? GOLD : "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", width: 20 }}>#{ri+1}</span>
                        <Avatar name={ru.name || r.email} color={ru.color || GOLD} size={22} />
                        <span style={{ flex: 1, fontSize: 12, color: "#fff" }}>{ru.name || r.email}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ri === 0 ? GOLD : "rgba(255,255,255,0.5)" }}>{r.total}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  } else {
    const savedRanks = (store.get(KEYS.monthlyRankings) || []).filter(r => !(r.month === month && r.year === year));
    if (savedRanks.length === 0) return null;
    return (
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 16 }}>PAST MONTHLY RANKINGS</div>
        {savedRanks.map((snap, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>{MONTHS[snap.month]} {snap.year}</div>
            {snap.rankings.map((r, ri) => {
              const ru = allUsers[r.email] || {};
              return (
                <div key={r.email} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <span style={{ fontSize: 11, color: ri === 0 ? GOLD : "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", width: 20 }}>#{ri+1}</span>
                  <Avatar name={ru.name || r.email} color={ru.color || GOLD} size={22} />
                  <span style={{ flex: 1, fontSize: 12, color: "#fff" }}>{ru.name || r.email}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ri === 0 ? GOLD : "rgba(255,255,255,0.5)" }}>{r.total}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
})()}
      </div>

      {/* Spotlight Banner */}
      {spotlight && (
        <div style={{
          background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}06)`,
          border: `1px solid ${GOLD}44`,
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 24,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 180, height: 180, borderRadius: "50%",
            background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`,
          }} />
          <div style={{ fontSize: 48 }}>🌟</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em", marginBottom: 8 }}>
              {period === "weekly" ? "THIS WEEK'S" : "THIS MONTH'S"} MEMBER SPOTLIGHT
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
              <Avatar name={spotlight.user?.name || spotlight.email} color={spotlight.user?.color || GOLD} size={52} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
                  {spotlight.user?.name || spotlight.email}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  {spotlight.user?.team && <Badge text={spotlight.user.team} color={TEAL} />}
                  {spotlight.user?.title && <Badge text={spotlight.user.title} color={PURPLE} />}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Leading the team with a score of <span style={{ color: GOLD, fontWeight: 700 }}>{spotlight.total}/100</span> — 
              completed <span style={{ color: TEAL }}>{spotlight.stats.completedPeriod} tasks</span> this {period === "weekly" ? "week" : "month"} with 
              outstanding dedication and collaboration.
            </div>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{spotlight.total}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>/ 100 PTS</div>
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
        {period === "weekly" ? "WEEKLY" : "MONTHLY"} PERFORMANCE RANKINGS
      </div>

      {rankings.length === 0 ? (
        <EmptyState icon="◆" title="No members yet" sub="Rankings will appear once members register." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rankings.map((r, i) => {
            const isMe = r.email === currentUser.email;
            const isExpanded = expanded === r.email;
            return (
              <div key={r.email}>
                <div
                  onClick={() => setExpanded(isExpanded ? null : r.email)}
                  style={{
                    background: i === 0 ? GOLD + "10" : isMe ? TEAL + "08" : CARD,
                    border: `1px solid ${i === 0 ? GOLD + "44" : isMe ? TEAL + "33" : BORDER}`,
                    borderLeft: `4px solid ${rankColor(i)}`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    transition: "all 0.15s",
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: rankColor(i) + "22",
                    border: `1px solid ${rankColor(i)}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: i < 3 ? 18 : 13,
                    color: rankColor(i),
                    fontWeight: 800,
                    flexShrink: 0,
                    fontFamily: "'DM Mono',monospace",
                  }}>
                    {rankLabel(i)}
                  </div>

                  {/* Avatar + Name */}
                  <Avatar name={r.user?.name || r.email} color={r.user?.color || GOLD} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.user?.name || r.email}
                      </div>
                      {isMe && <Badge text="YOU" color={TEAL} />}
                      {i === 0 && <Badge text="🌟 Spotlight" color={GOLD} />}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.user?.team && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{r.user.team}</span>}
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>
                        {r.stats.completedPeriod} tasks · {r.stats.periodActivity} actions
                      </span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ width: 120, flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>SCORE</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: rankColor(i) }}>{r.total}</span>
                    </div>
                    <ProgressBar pct={r.total} color={rankColor(i)} height={5} />
                  </div>

                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded breakdown */}
                {isExpanded && (
                  <div style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${BORDER}`,
                    borderTop: "none",
                    borderRadius: "0 0 12px 12px",
                    padding: "16px 20px",
                    animation: "fadeIn 0.2s ease",
                  }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 14, letterSpacing: "0.08em" }}>
                      SCORE BREAKDOWN
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
                      {Object.entries(r.breakdown).map(([key, val]) => (
                        <div key={key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: rankColor(i), marginBottom: 3 }}>{val}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", lineHeight: 1.4 }}>
                            {breakdownLabels[key].toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        { label: "Total Tasks", val: r.stats.totalTasks },
                        { label: "Completed Total", val: r.stats.completedTotal },
                        { label: `Done This ${period === "weekly" ? "Week" : "Month"}`, val: r.stats.completedPeriod },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                          <span>{label}</span>
                          <span style={{ color: "#fff", fontWeight: 600 }}>{val}</span>
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

// ─── GROWTH ──────────────────────────────────────────────────────────────────
const Growth = ({ user }) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [tab, setTab] = useState("mygoals");
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [newGoalText, setNewGoalText] = useState("");
  const [newGoalCat, setNewGoalCat] = useState(GOAL_CATEGORIES[0]);
  const [reflection, setReflection] = useState("");
  const [selfRating, setSelfRating] = useState(3);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [adminGoalText, setAdminGoalText] = useState("");
  const [adminGoalCat, setAdminGoalCat] = useState(GOAL_CATEGORIES[0]);
  const [adminGoalNote, setAdminGoalNote] = useState("");
  const [yearView, setYearView] = useState(currentYear);
  const [yearlyReport, setYearlyReport] = useState(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  const allUsers = store.get(KEYS.users) || {};
  const isAdmin = user.role === "admin";

  const load = () => {
    const freshData = ensureMonthlyGoals(user.email, currentMonth, currentYear, user.role);
    setData(freshData);
    const monthly = freshData.monthly.find((m) => m.month === viewMonth && m.year === viewYear);
    if (monthly) {
      setReflection(monthly.reflection || "");
      setSelfRating(monthly.selfRating || 3);
      if (monthly.suggestionsGenerated) setAiSuggestions(monthly.suggestionsGenerated);
    } else {
      setReflection("");
      setSelfRating(3);
      setAiSuggestions(null);
    }
  };

  useEffect(() => { load(); }, [viewMonth, viewYear]);

  const monthGoals = data ? data.goals.filter((g) => g.month === viewMonth && g.year === viewYear) : [];
  const adminGoals = data ? (data.adminAssigned || []).filter((g) => g.month === viewMonth && g.year === viewYear) : [];

  const addUserGoal = () => {
    if (!newGoalText.trim()) return;
    const fresh = getGrowthData(user.email);
    fresh.goals.push({
      id: Date.now().toString(),
      month: viewMonth,
      year: viewYear,
      text: newGoalText.trim(),
      category: newGoalCat,
      source: "user",
      status: "active",
    });
    saveGrowthData(user.email, fresh);
    setNewGoalText("");
    load();
  };

  const toggleGoalStatus = (goalId, currentStatus) => {
    const fresh = getGrowthData(user.email);
    const idx = fresh.goals.findIndex((g) => g.id === goalId);
    if (idx >= 0) {
      fresh.goals[idx].status = currentStatus === "completed" ? "active" : "completed";
      if (fresh.goals[idx].status === "completed") fresh.goals[idx].completedAt = new Date().toISOString();
      else delete fresh.goals[idx].completedAt;
    }
    saveGrowthData(user.email, fresh);
    load();
  };

  const toggleAdminGoalStatus = (goalId, currentStatus, targetEmail) => {
    const fresh = getGrowthData(targetEmail || user.email);
    const idx = (fresh.adminAssigned || []).findIndex((g) => g.id === goalId);
    if (idx >= 0) {
      fresh.adminAssigned[idx].status = currentStatus === "completed" ? "active" : "completed";
    }
    saveGrowthData(targetEmail || user.email, fresh);
    load();
  };

  const saveMonthlyReflection = () => {
    const fresh = getGrowthData(user.email);
    const mIdx = fresh.monthly.findIndex((m) => m.month === viewMonth && m.year === viewYear);
    const completedIds = monthGoals.filter((g) => g.status === "completed").map((g) => g.id);
    const entry = { month: viewMonth, year: viewYear, selfRating, reflection, completedGoalIds: completedIds };
    if (mIdx >= 0) fresh.monthly[mIdx] = { ...fresh.monthly[mIdx], ...entry };
    else fresh.monthly.push(entry);
    saveGrowthData(user.email, fresh);
    addActivity(user.email, "saved monthly growth reflection", `${MONTHS[viewMonth]} ${viewYear}`, null);
    load();
  };

  const assignAdminGoal = () => {
    if (!selectedMember || !adminGoalText.trim()) return;
    const fresh = getGrowthData(selectedMember);
    if (!fresh.adminAssigned) fresh.adminAssigned = [];
    fresh.adminAssigned.push({
      id: Date.now().toString(),
      email: selectedMember,
      month: viewMonth,
      year: viewYear,
      text: adminGoalText.trim(),
      category: adminGoalCat,
      note: adminGoalNote.trim(),
      assignedAt: new Date().toISOString(),
      assignedBy: user.email,
      status: "active",
    });
    saveGrowthData(selectedMember, fresh);
    addNotif(selectedMember, "task", `Admin assigned you a growth goal for ${MONTHS[viewMonth]} ${viewYear}: "${adminGoalText.trim()}"`);
    setAdminGoalText("");
    setAdminGoalNote("");
    load();
  };

  const generateSuggestions = async () => {
    setAiLoading(true);
    setAiErr("");
    const completedGoals = monthGoals.filter((g) => g.status === "completed");
    const activeGoals = monthGoals.filter((g) => g.status === "active");
    const allGoalsSummary = monthGoals.map((g) => `[${g.status.toUpperCase()}] ${g.text} (${g.category})`).join("\n");
    const adminGoalsSummary = adminGoals.map((g) => `[${g.status.toUpperCase()}] ${g.text} (${g.category})`).join("\n");
    const prompt = `You are a professional growth and career coach for Ulrevix, a digital media company. Generate personalized monthly improvement suggestions for a team member. Return JSON only, no backticks.

Member role: ${user.role}
Month: ${MONTHS[viewMonth]} ${viewYear}
Self-rating: ${selfRating}/5
Reflection: "${reflection || "Not provided"}"

Their goals this month:
${allGoalsSummary || "None set"}

Admin-assigned goals:
${adminGoalsSummary || "None assigned"}

Completed: ${completedGoals.length}/${monthGoals.length + adminGoals.length} goals

Return JSON: {
  "overallAssessment": "2-3 sentence honest assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvementAreas": [{"area":"...","suggestion":"...","actionStep":"..."}x3],
  "nextMonthGoals": ["suggested goal 1", "suggested goal 2", "suggested goal 3", "suggested goal 4"],
  "skillFocus": "One specific skill to focus on next month with reason",
  "motivationalNote": "Short personal encouragement"
}`;

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const responseData = await resp.json();
      const text = (responseData.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setAiSuggestions(parsed);
      const fresh = getGrowthData(user.email);
      const mIdx = fresh.monthly.findIndex((m) => m.month === viewMonth && m.year === viewYear);
      if (mIdx >= 0) { fresh.monthly[mIdx].suggestionsGenerated = parsed; fresh.monthly[mIdx].suggestionsAt = new Date().toISOString(); }
      else fresh.monthly.push({ month: viewMonth, year: viewYear, selfRating, reflection, suggestionsGenerated: parsed, suggestionsAt: new Date().toISOString() });
      saveGrowthData(user.email, fresh);
    } catch { setAiErr("Could not generate suggestions. Try again."); }
    setAiLoading(false);
  };

  const generateYearlyReport = async (targetEmail) => {
    setYearlyLoading(true);
    const targetData = getGrowthData(targetEmail);
    const yearGoals = (targetData.goals || []).filter((g) => g.year === yearView);
    const yearAdminGoals = (targetData.adminAssigned || []).filter((g) => g.year === yearView);
    const yearMonthly = (targetData.monthly || []).filter((m) => m.year === yearView);
    const completedCount = yearGoals.filter((g) => g.status === "completed").length + yearAdminGoals.filter((g) => g.status === "completed").length;
    const totalCount = yearGoals.length + yearAdminGoals.length;
    const targetUser = allUsers[targetEmail] || {};
    const prompt = `You are a senior career development analyst. Generate a comprehensive yearly growth report. Return JSON only, no backticks.

Member: ${targetUser.name || targetEmail}
Role: ${targetUser.role || "member"}
Year: ${yearView}

Goals completed: ${completedCount}/${totalCount}
Monthly reflections: ${yearMonthly.length}/12 months tracked

Goal breakdown by category: ${JSON.stringify(
  GOAL_CATEGORIES.map((cat) => ({
    category: cat,
    total: [...yearGoals, ...yearAdminGoals].filter((g) => g.category === cat).length,
    completed: [...yearGoals, ...yearAdminGoals].filter((g) => g.category === cat && g.status === "completed").length,
  })).filter((c) => c.total > 0)
)}

Monthly self-ratings: ${yearMonthly.map((m) => `${MONTHS[m.month]}: ${m.selfRating}/5`).join(", ") || "Not available"}

Return JSON: {
  "yearSummary": "3-4 sentence honest summary of the year",
  "growthScore": <number 0-100>,
  "skillsLearned": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "contributions": ["contribution 1", "contribution 2", "contribution 3"],
  "roleQualification": "Based on this year's growth, this member qualifies for: [specific role title and why]",
  "biggestWin": "Their most notable achievement this year",
  "areasToImprove": ["area 1", "area 2"],
  "nextYearFocus": "Strategic focus recommendation for next year",
  "careerTrajectory": "Short-term (6mo) and long-term (2yr) career path suggestion"
}`;

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const responseData = await resp.json();
      const text = (responseData.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setYearlyReport(parsed);
      const fresh = getGrowthData(targetEmail);
      const yIdx = (fresh.yearly || []).findIndex((y) => y.year === yearView);
      const yEntry = { year: yearView, summary: parsed.yearSummary, skillsLearned: parsed.skillsLearned, contributions: parsed.contributions, roleQualification: parsed.roleQualification, growthScore: parsed.growthScore, savedAt: new Date().toISOString(), fullReport: parsed };
      if (yIdx >= 0) fresh.yearly[yIdx] = yEntry;
      else { if (!fresh.yearly) fresh.yearly = []; fresh.yearly.push(yEntry); }
      saveGrowthData(targetEmail, fresh);
    } catch { setAiErr("Could not generate yearly report. Try again."); }
    setYearlyLoading(false);
  };

  const monthOptions = MONTHS.map((m, i) => ({ label: m, value: i }));

  const memberViewData = selectedMember ? getGrowthData(selectedMember) : null;
  const memberMonthGoals = memberViewData ? (memberViewData.goals || []).filter((g) => g.month === viewMonth && g.year === viewYear) : [];
  const memberAdminGoals = memberViewData ? (memberViewData.adminAssigned || []).filter((g) => g.month === viewMonth && g.year === viewYear) : [];

  if (!data) return <div style={{ padding: 28, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>;

  const completedThisMonth = monthGoals.filter((g) => g.status === "completed").length;
  const totalThisMonth = monthGoals.length + adminGoals.length;
  const completedAdminThisMonth = adminGoals.filter((g) => g.status === "completed").length;
  const monthPct = totalThisMonth > 0 ? Math.round(((completedThisMonth + completedAdminThisMonth) / totalThisMonth) * 100) : 0;

  const TABS = [
    { id: "mygoals", label: "My Goals" },
    { id: "suggestions", label: "Improvement Suggestions" },
    { id: "yearly", label: "Yearly Growth Report" },
    ...(isAdmin ? [{ id: "assign", label: "Assign Goals (Admin)" }, { id: "track", label: "Track Members" }] : []),
  ];

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${TEAL}12,${PURPLE}08)`, border: `1px solid ${TEAL}33`, borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em", marginBottom: 6 }}>GROWTH & DEVELOPMENT PORTAL</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Your Growth Curve</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Track your learning goals, get improvement suggestions, and see your year-over-year growth.</p>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 38, fontWeight: 900, color: TEAL, lineHeight: 1 }}>{monthPct}%</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{MONTHS[viewMonth]} PROGRESS</div>
          </div>
        </div>
      </div>

      {/* Month/Year navigator */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} style={{ padding: "7px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 12, outline: "none", fontFamily: "'DM Mono',monospace" }}>
          {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} style={{ padding: "7px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 12, outline: "none", fontFamily: "'DM Mono',monospace" }}>
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${tab === t.id ? TEAL : BORDER}`, background: tab === t.id ? TEAL + "22" : "transparent", color: tab === t.id ? TEAL : "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>{t.label}</button>
        ))}
      </div>

      {/* ── MY GOALS TAB ── */}
      {tab === "mygoals" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
          <div>
            {/* Admin-assigned goals */}
            {adminGoals.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 12 }}>ADMIN-ASSIGNED GROWTH GOALS</div>
                {adminGoals.map((g) => (
                  <div key={g.id} style={{ background: GOLD + "08", border: `1px solid ${GOLD}33`, borderLeft: `3px solid ${GOLD}`, borderRadius: 10, padding: "13px 16px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div onClick={() => toggleAdminGoalStatus(g.id, g.status, user.email)} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${g.status === "completed" ? TEAL : GOLD}`, background: g.status === "completed" ? TEAL + "33" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: TEAL, cursor: "pointer", flexShrink: 0, marginTop: 2 }}>{g.status === "completed" ? "✓" : ""}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: g.status === "completed" ? "rgba(255,255,255,0.35)" : "#fff", textDecoration: g.status === "completed" ? "line-through" : "none", marginBottom: 3 }}>{g.text}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge text={g.category} color={GOLD} />
                        <Badge text="Admin Assigned" color={PURPLE} />
                        {g.note && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>Note: {g.note}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* User goals */}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 12 }}>MY GOALS — {MONTHS[viewMonth].toUpperCase()} {viewYear}</div>
            {monthGoals.length === 0 ? (
              <div style={{ padding: "20px 0", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>No goals set. Auto-goals will be added below.</div>
            ) : (
              monthGoals.map((g) => (
                <div key={g.id} style={{ background: g.source === "auto" ? PURPLE + "06" : CARD, border: `1px solid ${g.source === "auto" ? PURPLE + "33" : BORDER}`, borderLeft: `3px solid ${g.status === "completed" ? TEAL : g.source === "auto" ? PURPLE : GOLD}`, borderRadius: 10, padding: "13px 16px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div onClick={() => toggleGoalStatus(g.id, g.status)} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${g.status === "completed" ? TEAL : GOLD}`, background: g.status === "completed" ? TEAL + "33" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: TEAL, cursor: "pointer", flexShrink: 0, marginTop: 2 }}>{g.status === "completed" ? "✓" : ""}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: g.status === "completed" ? "rgba(255,255,255,0.35)" : "#fff", textDecoration: g.status === "completed" ? "line-through" : "none", marginBottom: 3 }}>{g.text}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge text={g.category} color={g.source === "auto" ? PURPLE : TEAL} />
                      {g.source === "auto" && <Badge text="Auto-Added" color={PURPLE} />}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Add goal */}
            {(viewMonth === currentMonth && viewYear === currentYear) && (
              <div style={{ background: CARD, border: `1px dashed ${TEAL}44`, borderRadius: 10, padding: "14px 16px", marginTop: 12 }}>
                <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>ADD A GROWTH GOAL</div>
                <textarea value={newGoalText} onChange={(e) => setNewGoalText(e.target.value)} rows={2} placeholder="e.g. Learn the basics of TypeScript and apply it in one project..." style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, color: "#fff", fontSize: 13, resize: "vertical", marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select value={newGoalCat} onChange={(e) => setNewGoalCat(e.target.value)} style={{ padding: "7px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 7, color: "#fff", fontSize: 12, outline: "none" }}>
                    {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Btn onClick={addUserGoal} style={{ padding: "7px 18px", fontSize: 12 }}>Add Goal</Btn>
                </div>
              </div>
            )}
          </div>

          {/* Right: monthly check-in */}
          <div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 14, letterSpacing: "0.08em" }}>MONTHLY CHECK-IN</div>
              <ProgressBar pct={monthPct} color={TEAL} height={6} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{completedThisMonth + completedAdminThisMonth}/{totalThisMonth} completed</span>
                <span style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace" }}>{monthPct}%</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>SELF-RATING (1–5)</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setSelfRating(n)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${selfRating >= n ? GOLD : BORDER}`, background: selfRating >= n ? GOLD + "22" : "transparent", color: selfRating >= n ? GOLD : "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>★</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>MONTHLY REFLECTION</div>
              <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="How did this month go? What did you learn? What was hard?" style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, color: "#fff", fontSize: 12, resize: "vertical", marginBottom: 12 }} />
              <Btn onClick={saveMonthlyReflection} style={{ width: "100%", padding: "9px", fontSize: 12, background: TEAL, color: BG }}>Save Check-In</Btn>
            </div>

            {/* Past monthly summaries */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 12, letterSpacing: "0.08em" }}>THIS YEAR'S PROGRESS</div>
              {MONTHS.map((m, idx) => {
                const mData = (data.monthly || []).find((x) => x.month === idx && x.year === currentYear);
                const mGoals = (data.goals || []).filter((g) => g.month === idx && g.year === currentYear);
                const mCompleted = mGoals.filter((g) => g.status === "completed").length;
                const mPct = mGoals.length > 0 ? Math.round((mCompleted / mGoals.length) * 100) : 0;
                const launchDate = store.get(KEYS.launchDate);
const launchMonth = launchDate ? new Date(launchDate).getMonth() : 0;
const launchYear = launchDate ? new Date(launchDate).getFullYear() : currentYear;
const isBeforeLaunch = currentYear < launchYear || (currentYear === launchYear && idx < launchMonth);
const isFuture = idx > currentMonth;
                return (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid rgba(255,255,255,0.03)`, opacity: (isFuture || isBeforeLaunch) ? 0.2 : 1 }}>
                    <span style={{ fontSize: 11, color: idx === currentMonth ? TEAL : "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace", width: 28, flexShrink: 0 }}>{m.slice(0, 3)}</span>
                    <div style={{ flex: 1 }}><ProgressBar pct={mPct} color={mData ? TEAL : "rgba(255,255,255,0.1)"} height={4} /></div>
                    <span style={{ fontSize: 10, color: mData ? TEAL : "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace", width: 30, textAlign: "right" }}>{(isFuture || isBeforeLaunch) ? "–" : `${mPct}%`}</span>
                    {mData?.selfRating && <span style={{ fontSize: 10, color: GOLD }}>{"★".repeat(mData.selfRating)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SUGGESTIONS TAB ── */}
      {tab === "suggestions" && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ background: `linear-gradient(135deg,${PURPLE}12,${TEAL}08)`, border: `1px solid ${PURPLE}33`, borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: PURPLE, fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>AI IMPROVEMENT SUGGESTIONS</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>Based on your goals for {MONTHS[viewMonth]} {viewYear} and your check-in reflection, get personalized growth suggestions.</p>
            </div>
            <Btn onClick={generateSuggestions} disabled={aiLoading} style={{ padding: "10px 20px", background: aiLoading ? PURPLE + "44" : PURPLE, color: aiLoading ? "rgba(255,255,255,0.4)" : BG, flexShrink: 0 }}>
              {aiLoading ? "Analyzing…" : "✦ Generate"}
            </Btn>
          </div>
          {aiErr && <div style={{ padding: "10px 14px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 8, color: RED, fontSize: 13, marginBottom: 16 }}>{aiErr}</div>}
          {!aiSuggestions && !aiLoading && (
            <EmptyState icon="✦" title="No suggestions yet" sub="Complete some goals and fill in your monthly check-in, then generate suggestions." />
          )}
          {aiLoading && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${PURPLE}33`, borderTop: `3px solid ${PURPLE}`, animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Analyzing your growth data…</div>
            </div>
          )}
          {aiSuggestions && !aiLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.3s ease" }}>
              <div style={{ background: PURPLE + "12", border: `1px solid ${PURPLE}33`, borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontSize: 10, color: PURPLE, fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>OVERALL ASSESSMENT</div>
                <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.7 }}>{aiSuggestions.overallAssessment}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: CARD, border: `1px solid ${TEAL}33`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>✦ YOUR STRENGTHS</div>
                  {(aiSuggestions.strengths || []).map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: TEAL, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: CARD, border: `1px solid ${GOLD}33`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>→ SKILL TO FOCUS ON</div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{aiSuggestions.skillFocus}</p>
                </div>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: RED, fontFamily: "'DM Mono',monospace", marginBottom: 14 }}>IMPROVEMENT AREAS</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {(aiSuggestions.improvementAreas || []).map((a, i) => (
                    <div key={i} style={{ background: RED + "08", border: `1px solid ${RED}18`, borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 5 }}>{a.area}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 8 }}>{a.suggestion}</div>
                      <div style={{ fontSize: 11, color: GOLD, fontStyle: "italic" }}>→ {a.actionStep}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: CARD, border: `1px solid ${TEAL}33`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>SUGGESTED GOALS FOR NEXT MONTH</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(aiSuggestions.nextMonthGoals || []).map((g, i) => (
                    <div key={i} style={{ background: TEAL + "08", border: `1px solid ${TEAL}22`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                      <span style={{ color: TEAL, marginRight: 6 }}>◈</span>{g}
                    </div>
                  ))}
                </div>
              </div>
              {aiSuggestions.motivationalNote && (
                <div style={{ background: `linear-gradient(135deg,${GOLD}10,${TEAL}05)`, border: `1px solid ${GOLD}33`, borderRadius: 12, padding: "16px 22px", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ fontSize: 24 }}>💪</div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, fontStyle: "italic" }}>{aiSuggestions.motivationalNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── YEARLY REPORT TAB ── */}
      {tab === "yearly" && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
            <select value={yearView} onChange={(e) => { setYearView(Number(e.target.value)); setYearlyReport(null); }} style={{ padding: "7px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 12, outline: "none", fontFamily: "'DM Mono',monospace" }}>
            {(() => {
  const launchDate = store.get(KEYS.launchDate);
  const launchYear = launchDate ? new Date(launchDate).getFullYear() : currentYear;
  const years = [];
  for (let y = launchYear; y <= currentYear; y++) years.push(y);
  return years.map((y) => <option key={y} value={y}>{y}</option>);
})()}
            </select>
            <Btn onClick={() => generateYearlyReport(user.email)} disabled={yearlyLoading} style={{ padding: "9px 20px", background: yearlyLoading ? GOLD + "44" : GOLD, color: yearlyLoading ? "rgba(255,255,255,0.4)" : BG, fontSize: 12 }}>
              {yearlyLoading ? "Generating…" : "✦ Generate Yearly Report"}
            </Btn>
          </div>

          {/* Check for saved yearly report */}
          {(() => {
            const savedYearly = (data.yearly || []).find((y) => y.year === yearView);
            const displayReport = yearlyReport || savedYearly?.fullReport;
            if (!displayReport && !yearlyLoading) return (
              <EmptyState icon="◆" title={`No yearly report for ${yearView}`} sub="Generate your yearly growth report above. All data is saved for future reference." />
            );
            if (yearlyLoading) return (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${GOLD}33`, borderTop: `3px solid ${GOLD}`, animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Compiling your year in growth…</div>
              </div>
            );
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.3s ease" }}>
                <div style={{ background: `linear-gradient(135deg,${GOLD}15,${TEAL}08)`, border: `1px solid ${GOLD}44`, borderRadius: 14, padding: "24px 28px", display: "flex", gap: 20, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em", marginBottom: 8 }}>{yearView} ANNUAL GROWTH REPORT</div>
                    <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.7 }}>{displayReport.yearSummary}</p>
                  </div>
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 52, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{displayReport.growthScore}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>GROWTH SCORE</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ background: CARD, border: `1px solid ${TEAL}33`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>SKILLS LEARNED THIS YEAR</div>
                    {(displayReport.skillsLearned || []).map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "center" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: CARD, border: `1px solid ${PURPLE}33`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, color: PURPLE, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>CONTRIBUTIONS TO ULREVIX</div>
                    {(displayReport.contributions || []).map((c, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "center" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: PURPLE, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: GOLD + "12", border: `1px solid ${GOLD}44`, borderRadius: 12, padding: "18px 22px" }}>
                  <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>🏆 BIGGEST WIN OF THE YEAR</div>
                  <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.6 }}>{displayReport.biggestWin}</p>
                </div>
                <div style={{ background: TEAL + "10", border: `1px solid ${TEAL}33`, borderRadius: 12, padding: "18px 22px" }}>
                  <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>💼 CORPORATE ROLE QUALIFICATION</div>
                  <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.6, fontWeight: 600 }}>{displayReport.roleQualification}</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>CAREER TRAJECTORY</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{displayReport.careerTrajectory}</p>
                  </div>
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, color: RED, fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>FOCUS FOR NEXT YEAR</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{displayReport.nextYearFocus}</p>
                    {(displayReport.areasToImprove || []).length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        {displayReport.areasToImprove.map((a, i) => (
                          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: RED, marginTop: 6, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── ADMIN: ASSIGN GOALS TAB ── */}
      {tab === "assign" && isAdmin && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 16, letterSpacing: "0.08em" }}>ASSIGN PRIVATE GROWTH GOAL TO MEMBER</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>SELECT MEMBER</div>
              <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }}>
                <option value="">Choose a member…</option>
                {Object.entries(allUsers).map(([em, u]) => <option key={em} value={em}>{u.name || em}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>GOAL</div>
              <textarea value={adminGoalText} onChange={(e) => setAdminGoalText(e.target.value)} rows={3} placeholder="Describe the growth goal you want to assign..." style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>CATEGORY</div>
                <select value={adminGoalCat} onChange={(e) => setAdminGoalCat(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 12, outline: "none" }}>
                  {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>FOR MONTH</div>
                <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 12, outline: "none" }}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>PRIVATE NOTE TO MEMBER (optional)</div>
              <input value={adminGoalNote} onChange={(e) => setAdminGoalNote(e.target.value)} placeholder="e.g. Focus on this because of the upcoming project…" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }} />
            </div>
            <Btn onClick={assignAdminGoal} disabled={!selectedMember || !adminGoalText.trim()} style={{ width: "100%", padding: "11px", background: GOLD, color: BG }}>Assign Growth Goal</Btn>
          </div>
        </div>
      )}

      {/* ── ADMIN: TRACK MEMBERS TAB ── */}
      {tab === "track" && isAdmin && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }}>
              <option value="">Select a member to view…</option>
              {Object.entries(allUsers).map(([em, u]) => <option key={em} value={em}>{u.name || em}</option>)}
            </select>
            {selectedMember && (
              <Btn onClick={() => generateYearlyReport(selectedMember)} disabled={yearlyLoading} style={{ padding: "8px 18px", fontSize: 12, background: GOLD, color: BG }}>
                {yearlyLoading ? "Generating…" : "Generate Their Yearly Report"}
              </Btn>
            )}
          </div>

          {selectedMember && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>
                  {allUsers[selectedMember]?.name || selectedMember} — {MONTHS[viewMonth]} {viewYear} GOALS
                </div>
                {memberMonthGoals.length === 0 && memberAdminGoals.length === 0 ? (
                  <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, padding: "12px 0" }}>No goals this month.</div>
                ) : (
                  <>
                    {memberAdminGoals.map((g) => (
                      <div key={g.id} style={{ background: GOLD + "08", border: `1px solid ${GOLD}33`, borderLeft: `3px solid ${GOLD}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${g.status === "completed" ? TEAL : GOLD}`, background: g.status === "completed" ? TEAL + "33" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: TEAL, flexShrink: 0 }}>{g.status === "completed" ? "✓" : ""}</div>
                          <span style={{ fontSize: 12, color: g.status === "completed" ? "rgba(255,255,255,0.35)" : "#fff", textDecoration: g.status === "completed" ? "line-through" : "none" }}>{g.text}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginLeft: 22 }}>
                          <Badge text={g.category} color={GOLD} />
                          <Badge text="Admin Goal" color={PURPLE} />
                          <Badge text={g.status} color={g.status === "completed" ? TEAL : "rgba(255,255,255,0.25)"} />
                        </div>
                      </div>
                    ))}
                    {memberMonthGoals.map((g) => (
                      <div key={g.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${g.status === "completed" ? TEAL : GOLD}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${g.status === "completed" ? TEAL : BORDER}`, background: g.status === "completed" ? TEAL + "33" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: TEAL, flexShrink: 0 }}>{g.status === "completed" ? "✓" : ""}</div>
                          <span style={{ fontSize: 12, color: g.status === "completed" ? "rgba(255,255,255,0.35)" : "#fff", textDecoration: g.status === "completed" ? "line-through" : "none" }}>{g.text}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginLeft: 22 }}>
                          <Badge text={g.category} color={TEAL} />
                          {g.source === "auto" && <Badge text="Auto" color={PURPLE} />}
                          <Badge text={g.status} color={g.status === "completed" ? TEAL : "rgba(255,255,255,0.25)"} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>THEIR YEARLY PROGRESS</div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  {MONTHS.map((m, idx) => {
                    const mGoals = (memberViewData?.goals || []).filter((g) => g.month === idx && g.year === viewYear);
                    const mAdminGoals = (memberViewData?.adminAssigned || []).filter((g) => g.month === idx && g.year === viewYear);
                    const total = mGoals.length + mAdminGoals.length;
                    const completed = mGoals.filter((g) => g.status === "completed").length + mAdminGoals.filter((g) => g.status === "completed").length;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const launchDate = store.get(KEYS.launchDate);
const launchYear2 = launchDate ? new Date(launchDate).getFullYear() : viewYear;
const launchMonth2 = launchDate ? new Date(launchDate).getMonth() : 0;
const isPreLaunch = viewYear < launchYear2 || (viewYear === launchYear2 && idx < launchMonth2);
                    return (
                      <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace", width: 28 }}>{m.slice(0, 3)}</span>
                        <div style={{ flex: 1 }}><ProgressBar pct={pct} color={TEAL} height={4} /></div>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", width: 50, textAlign: "right", opacity: isPreLaunch ? 0.2 : 1 }}>{isPreLaunch ? "–" : total > 0 ? `${completed}/${total}` : "–"}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Saved yearly reports for this member */}
                {(memberViewData?.yearly || []).length > 0 && (
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>SAVED YEARLY REPORTS</div>
                    {(memberViewData.yearly || []).map((y) => (
                      <div key={y.year} style={{ padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{y.year}</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Badge text={`Score: ${y.growthScore || "—"}`} color={GOLD} />
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{y.summary?.slice(0, 100)}…</div>
                        <div style={{ fontSize: 11, color: TEAL, marginTop: 4 }}>{y.roleQualification?.slice(0, 80)}…</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedMember && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {Object.entries(allUsers).map(([em, u]) => {
                const uData = getGrowthData(em);
                const thisMonthGoals = (uData.goals || []).filter((g) => g.month === currentMonth && g.year === currentYear);
                const thisAdminGoals = (uData.adminAssigned || []).filter((g) => g.month === currentMonth && g.year === currentYear);
                const total = thisMonthGoals.length + thisAdminGoals.length;
                const completed = thisMonthGoals.filter((g) => g.status === "completed").length + thisAdminGoals.filter((g) => g.status === "completed").length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div key={em} style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: `2px solid ${u.color || GOLD}`, borderRadius: 12, padding: 18, cursor: "pointer" }} onClick={() => setSelectedMember(em)}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                      <Avatar name={u.name || em} color={u.color || GOLD} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{u.name || em}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{total} goals this month</div>
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={u.color || GOLD} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{completed}/{total} done</span>
                      <span style={{ fontSize: 10, color: u.color || GOLD, fontFamily: "'DM Mono',monospace" }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
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
  const myProjects = projects.filter((p) =>
    (p.members || []).includes(user.email)
  );
  const inProgressProjects = projects.filter((p) => {
    const pct = calcPct(p.tasks);
    return pct > 0 && pct < 100;
  });
  const now = new Date();

  function calcPct(tasks = []) {
    if (!tasks.length) return 0;
    return Math.round(
      (tasks.filter((t) => t.status === "Completed").length / tasks.length) *
        100
    );
  }

  const statCards = [
    {
      label: "Active Projects",
      value: inProgressProjects.length,
      sub: `${projects.length} total`,
      accent: GOLD,
    },
    {
      label: "Team Members",
      value: Object.keys(users).length,
      sub: "registered",
      accent: TEAL,
    },
    {
      label: "My Tasks",
      value: myTasks.filter((t) => t.status !== "Completed").length,
      sub: `${
        myTasks.filter((t) => t.status === "Completed").length
      } completed`,
      accent: PURPLE,
    },
    {
      label: "Overall Progress",
      value: allTasks.length
        ? `${Math.round(
            (allTasks.filter((t) => t.status === "Completed").length /
              allTasks.length) *
              100
          )}%`
        : "–",
      sub: `${allTasks.filter((t) => t.status === "Completed").length}/${
        allTasks.length
      } tasks done`,
      accent: RED,
    },
  ];

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      {/* greeting */}
      <div
        style={{
          background: `linear-gradient(135deg,rgba(200,169,110,0.07),rgba(126,184,164,0.04))`,
          border: `1px solid ${GOLD}22`,
          borderRadius: 14,
          padding: "24px 28px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: GOLD,
            letterSpacing: "0.1em",
            marginBottom: 6,
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {now
            .toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
            .toUpperCase()}
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          Good{" "}
          {now.getHours() < 12
            ? "morning"
            : now.getHours() < 17
            ? "afternoon"
            : "evening"}
          , {(user.name || user.email).split(" ")[0]} 👋
        </h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          {projects.length === 0
            ? "Welcome to Ulrevix Team OS. No projects yet — get started by creating one."
            : `You have ${
                myTasks.filter((t) => t.status !== "Completed").length
              } active tasks across ${myProjects.length} projects.`}
        </p>
      </div>

      {/* stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {statCards.map(({ label, value, sub, accent }) => (
          <div
            key={label}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderTop: `2px solid ${accent}`,
              borderRadius: 12,
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 8,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.06em",
              }}
            >
              {label.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.25)",
                marginTop: 4,
              }}
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}
      >
        {/* projects */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 14,
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.08em",
            }}
          >
            ACTIVE PROJECTS
          </div>
          {projects.length === 0 ? (
            <EmptyState
              icon="◈"
              title="No projects yet"
              sub={
                user.role === "admin"
                  ? "Go to Projects to create your first project."
                  : "Admin has not created any projects yet."
              }
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.slice(0, 5).map((p) => {
                const pct = calcPct(p.tasks);
                return (
                  <div
                    key={p.id}
                    style={{
                      background: CARD,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: "16px 18px",
                      borderLeft: `3px solid ${p.color || GOLD}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#fff",
                          marginBottom: 6,
                        }}
                      >
                        {p.name}
                      </div>
                      <ProgressBar pct={pct} color={p.color || GOLD} />
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          color: p.color || GOLD,
                        }}
                      >
                        {pct}%
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.2)",
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {
                          (p.tasks || []).filter(
                            (t) => t.status === "Completed"
                          ).length
                        }
                        /{(p.tasks || []).length} tasks
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* activity */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 14,
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.08em",
            }}
          >
            RECENT ACTIVITY
          </div>
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {activity.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.2)",
                  fontSize: 12,
                }}
              >
                No activity yet
              </div>
            ) : (
              activity.map((a, i) => {
                const u = users[a.userId] || { name: a.userId, color: GOLD };
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: "11px 16px",
                      display: "flex",
                      gap: 10,
                      borderBottom:
                        i < activity.length - 1
                          ? `1px solid rgba(255,255,255,0.04)`
                          : "none",
                    }}
                  >
                    <Avatar
                      name={u.name || a.userId}
                      color={u.color || GOLD}
                      size={28}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.55)",
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: "#fff", fontWeight: 600 }}>
                          {(u.name || a.userId).split(" ")[0]}
                        </span>{" "}
                        {a.action}{" "}
                        <span style={{ color: GOLD }}>{a.target}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.2)",
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {timeAgo(a.time)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectFlowPanel = ({ p, user, allUsers, load }) => {
  const flowSteps = p.flow || [];
  const [showFlowAdd, setShowFlowAdd] = useState(false);
  const [editFlowIdx, setEditFlowIdx] = useState(null);
  const [flowEditBuf, setFlowEditBuf] = useState({});
  const [newFlowStep, setNewFlowStep] = useState({ fromEmail: "", toEmail: "", taskTitle: "", taskDeadline: "", isStart: false, dependsOn: "" });
const [projectStartEmail, setProjectStartEmail] = useState(p.startEmail || "");
const [projectStartTask, setProjectStartTask] = useState(p.startTask || "");

  const saveFlow = (newFlow) => {
    const ps = store.get(KEYS.projects) || [];
    const pi = ps.findIndex((x) => x.id === p.id);
    if (pi < 0) return;
    ps[pi].flow = newFlow;
ps[pi].startEmail = projectStartEmail;
ps[pi].startTask = projectStartTask;
    const existingFlowTitles = (ps[pi].tasks || []).filter(t => t.isFlowTask).map(t => t.title);
    newFlow.forEach((s) => {
      if (!existingFlowTitles.includes(s.taskTitle)) {
        ps[pi].tasks.push({
          id: Date.now().toString() + Math.random(),
          title: s.taskTitle,
          assignee: s.toEmail,
          deadline: s.taskDeadline,
          status: "Not Started",
          createdAt: new Date().toISOString(),
          isFlowTask: true,
          flowFrom: s.fromEmail,
        });
      }
    });
    store.set(KEYS.projects, ps);
    load();
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>PROJECT FLOW</div>
  {user.role === "admin" && (
    <Btn onClick={() => setShowFlowAdd(!showFlowAdd)} style={{ fontSize: 11, padding: "5px 14px" }}>+ Add Flow Step</Btn>
  )}
</div>

{/* Project Start Config — admin only */}
{user.role === "admin" && (
  <div style={{ background: "rgba(200,169,110,0.06)", border: `1px solid ${GOLD}33`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
    <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 12 }}>PROJECT START CONFIGURATION</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 5 }}>WHO STARTS THE PROJECT</div>
        <select
          value={projectStartEmail}
          onChange={(e) => setProjectStartEmail(e.target.value)}
          style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12, outline: "none" }}
        >
          <option value="">Select collaborator…</option>
          {(p.members || []).map((em) => <option key={em} value={em}>{allUsers[em]?.name || em}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 5 }}>FIRST TASK TO BE DONE</div>
        <select
          value={projectStartTask}
          onChange={(e) => setProjectStartTask(e.target.value)}
          style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12, outline: "none" }}
        >
          <option value="">Select task…</option>
          {(p.tasks || []).map((t) => <option key={t.id} value={t.title}>{t.title}</option>)}
        </select>
      </div>
    </div>
    <button
      onClick={() => {
        const ps = store.get(KEYS.projects) || [];
        const pi = ps.findIndex((x) => x.id === p.id);
        if (pi < 0) return;
        ps[pi].startEmail = projectStartEmail;
        ps[pi].startTask = projectStartTask;
        store.set(KEYS.projects, ps);
        load();
      }}
      style={{ marginTop: 10, padding: "5px 14px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 6, color: GOLD, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}
    >
      Save Start Config
    </button>
  </div>
)}

{/* Display saved start config for all users */}
{(p.startEmail || p.startTask) && (
  <div style={{ background: "rgba(200,169,110,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{ fontSize: 18 }}>🚀</div>
    <div>
      <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 3 }}>PROJECT STARTS WITH</div>
      <div style={{ fontSize: 12, color: "#fff" }}>
        <span style={{ color: GOLD }}>{allUsers[p.startEmail]?.name || p.startEmail || "—"}</span>
        {p.startTask && <span style={{ color: "rgba(255,255,255,0.4)" }}> · first task: <span style={{ color: "#fff" }}>{p.startTask}</span></span>}
      </div>
    </div>
  </div>
)}

      {flowSteps.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginBottom: 12 }}>No flow defined for this project.</div>}

      {flowSteps.map((s, i) => (
        <div key={s.id || i} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${p.color || GOLD}`, borderRadius: 8, padding: "11px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: (p.color || GOLD) + "33", border: `1px solid ${p.color || GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: p.color || GOLD, flexShrink: 0 }}>{i + 1}</div>
          {editFlowIdx === i ? (
            <div style={{ flex: 1 }}>
              <Inp label="Task Title" value={flowEditBuf.taskTitle || ""} onChange={(v) => setFlowEditBuf((b) => ({ ...b, taskTitle: v }))} placeholder="Task title..." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>FROM</div>
                  <select value={flowEditBuf.fromEmail || ""} onChange={(e) => setFlowEditBuf((b) => ({ ...b, fromEmail: e.target.value }))} style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12 }}>
                    <option value="">Select</option>
                    {(p.members || []).map((em) => <option key={em} value={em}>{allUsers[em]?.name || em}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>TO (ASSIGNEE)</div>
                  <select value={flowEditBuf.toEmail || ""} onChange={(e) => setFlowEditBuf((b) => ({ ...b, toEmail: e.target.value }))} style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12 }}>
                    <option value="">Select</option>
                    {(p.members || []).map((em) => <option key={em} value={em}>{allUsers[em]?.name || em}</option>)}
                  </select>
                </div>
              </div>
              <Inp label="Deadline" value={flowEditBuf.taskDeadline || ""} onChange={(v) => setFlowEditBuf((b) => ({ ...b, taskDeadline: v }))} type="date" />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn onClick={() => { const nf = flowSteps.map((x, idx) => idx === i ? { ...x, ...flowEditBuf } : x); saveFlow(nf); setEditFlowIdx(null); }} style={{ fontSize: 11, padding: "6px 14px", background: TEAL, color: BG }}>Save</Btn>
                <Btn variant="secondary" onClick={() => setEditFlowIdx(null)} style={{ fontSize: 11, padding: "6px 12px" }}>Cancel</Btn>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>
    {s.taskTitle}
    {s.isStart && <span style={{ marginLeft: 8, fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", background: GOLD + "18", border: `1px solid ${GOLD}44`, borderRadius: 4, padding: "1px 6px" }}>ENTRY POINT</span>}
  </div>
  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>
    {allUsers[s.fromEmail]?.name || s.fromEmail || "—"} → {allUsers[s.toEmail]?.name || s.toEmail || "—"}
    {s.taskDeadline && <span style={{ marginLeft: 8 }}>· Due {s.taskDeadline}</span>}
  </div>
  {s.dependsOn && (
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>
      Unblocked after: <span style={{ color: TEAL }}>{s.dependsOn}</span>
    </div>
  )}
</div>
          )}
          {user.role === "admin" && editFlowIdx !== i && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setEditFlowIdx(i); setFlowEditBuf({ ...s }); }} style={{ background: "none", border: `1px solid ${GOLD}44`, borderRadius: 5, color: GOLD, fontSize: 10, cursor: "pointer", padding: "3px 8px", fontFamily: "'DM Mono',monospace" }}>EDIT</button>
              <button onClick={() => { const nf = flowSteps.filter((_, idx) => idx !== i); saveFlow(nf); }} style={{ background: "none", border: `1px solid ${RED}44`, borderRadius: 5, color: RED, fontSize: 10, cursor: "pointer", padding: "3px 8px", fontFamily: "'DM Mono',monospace" }}>REMOVE</button>
            </div>
          )}
           {s.dependsOn && (
          <div style={{ paddingLeft: 36, marginBottom: 2 }}>
            <div style={{ fontSize: 9, color: TEAL, fontFamily: "'DM Mono',monospace", opacity: 0.6 }}>↳ waits for: {s.dependsOn}</div>
          </div>
        )}
         </div>
      ))}

      {showFlowAdd && user.role === "admin" && (
        <div style={{ background: "rgba(200,169,110,0.05)", border: `1px dashed ${GOLD}44`, borderRadius: 8, padding: "14px 16px", marginTop: 8 }}>
          <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>NEW FLOW STEP</div>
          <Inp label="Task Title" value={newFlowStep.taskTitle} onChange={(v) => setNewFlowStep((s) => ({ ...s, taskTitle: v }))} placeholder="What needs to be done?" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
  <div>
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 5 }}>DEPENDS ON (UNBLOCKED AFTER)</div>
    <select
      value={newFlowStep.dependsOn}
      onChange={(e) => setNewFlowStep((s) => ({ ...s, dependsOn: e.target.value }))}
      style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12, outline: "none" }}
    >
      <option value="">None (runs independently)</option>
      {flowSteps.map((fs, fi) => <option key={fi} value={fs.taskTitle}>{fs.taskTitle}</option>)}
    </select>
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 18 }}>
    <input
      type="checkbox"
      id="isStartCheck"
      checked={newFlowStep.isStart}
      onChange={(e) => setNewFlowStep((s) => ({ ...s, isStart: e.target.checked }))}
      style={{ cursor: "pointer", width: 14, height: 14 }}
    />
    <label htmlFor="isStartCheck" style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
      Mark as entry point
    </label>
  </div>
</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>FROM</div>
              <select value={newFlowStep.fromEmail} onChange={(e) => setNewFlowStep((s) => ({ ...s, fromEmail: e.target.value }))} style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12 }}>
                <option value="">Select</option>
                {(p.members || []).map((em) => <option key={em} value={em}>{allUsers[em]?.name || em}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>TO (ASSIGNEE)</div>
              <select value={newFlowStep.toEmail} onChange={(e) => setNewFlowStep((s) => ({ ...s, toEmail: e.target.value }))} style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12 }}>
                <option value="">Select</option>
                {(p.members || []).map((em) => <option key={em} value={em}>{allUsers[em]?.name || em}</option>)}
              </select>
            </div>
          </div>
          <Inp label="Deadline (optional)" value={newFlowStep.taskDeadline} onChange={(v) => setNewFlowStep((s) => ({ ...s, taskDeadline: v }))} type="date" />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={() => { if (!newFlowStep.taskTitle.trim() || !newFlowStep.toEmail) return; saveFlow([...flowSteps, { ...newFlowStep, id: Date.now().toString() }]); setNewFlowStep({ fromEmail: "", toEmail: "", taskTitle: "", taskDeadline: "", isStart: false, dependsOn: "" }); setShowFlowAdd(false); }} style={{ fontSize: 11, padding: "7px 16px" }}>Add Step</Btn>
            <Btn variant="secondary" onClick={() => setShowFlowAdd(false)} style={{ fontSize: 11, padding: "7px 12px" }}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminUploadReview = ({ uploadId, projectId, taskId, uploadedBy, currentStatus, currentFeedback, onReviewed, adminEmail }) => {
  const [feedback, setFeedback] = useState(currentFeedback || "");
  const [open, setOpen] = useState(false);

  const saveReview = (status) => {
    if (status === "rejected" && !feedback.trim()) {
      alert("Please provide feedback explaining what needs to be changed.");
      return;
    }
    const reviewKey = `${KEYS.taskUploadReviews}_${projectId}_${taskId}_${uploadId}`;
    store.set(reviewKey, {
      status,
      reviewedBy: adminEmail,
      reviewedAt: new Date().toISOString(),
      feedback: feedback.trim(),
    });
    if (status === "approved") {
      addNotif(uploadedBy, "task", `Your task upload was approved by admin and is now visible to the team.`);
    } else {
      addNotif(uploadedBy, "task", `Your task upload requires revisions. Admin feedback: "${feedback.trim()}"`);
    }
    setOpen(false);
    onReviewed();
  };

  if (!open) return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(true)} style={{ padding: "4px 12px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 6, color: GOLD, fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
        Review Upload
      </button>
    </div>
  );

  return (
    <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}33`, borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>ADMIN REVIEW</div>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={2}
        placeholder="Leave feedback (required if rejecting, optional if approving)..."
        style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 11, resize: "vertical", marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => saveReview("approved")} style={{ padding: "5px 14px", background: TEAL, border: "none", borderRadius: 6, color: BG, fontSize: 11, cursor: "pointer", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
          ✓ Approve
        </button>
        <button onClick={() => saveReview("rejected")} style={{ padding: "5px 14px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 6, color: RED, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
          ✗ Request Revision
        </button>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14 }}>×</button>
      </div>
    </div>
  );
};

const TaskUploadSection = ({ projectId, taskId, taskTitle, uploaderEmail, allUsers, canUpload = true, viewerRole = "member" }) => {
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileInputRef = useRef();
  const [linkInput, setLinkInput] = useState("");
const [showLinkInput, setShowLinkInput] = useState(false);

  const load = async () => {
    const u = await getTaskUploads(projectId, taskId);
    setUploads(u);
  };

  useEffect(() => { load(); }, [projectId, taskId]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const MAX_DIRECT = 5 * 1024 * 1024; // 5MB threshold
if (file.size > MAX_DIRECT) {
  setUploadErr("File exceeds 5MB. Please submit a link instead using the 'Submit Link' option below.");
  e.target.value = "";
  setUploading(false);
  setShowLinkInput(true);
  return;
}
    setUploadErr("");
    setUploading(true);
    try {
      await saveTaskUpload(projectId, taskId, file, uploaderEmail);
      await load();
      addActivity(uploaderEmail, "uploaded task file for:", taskTitle, projectId);
      addNotif(ADMIN_EMAIL, "task", `${uploaderEmail} uploaded a file for task: "${taskTitle}"`);
    } catch (err) {
      setUploadErr("Upload failed. File may be too large for browser storage.");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleLinkSubmit = () => {
    if (!linkInput.trim()) return;
    try {
      const key = `${KEYS.taskUploads}_${projectId}_${taskId}`;
      let existing = store.get(key) || [];
      existing.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        fileName: linkInput.trim(),
        fileType: "link",
        fileSize: 0,
        uploadedBy: uploaderEmail,
        uploadedAt: new Date().toISOString(),
        data: linkInput.trim(),
        isLink: true,
      });
      store.set(key, existing);
      load();
      addActivity(uploaderEmail, "submitted task link for:", taskTitle, projectId);
      addNotif(ADMIN_EMAIL, "task", `${uploaderEmail} submitted a link for task: "${taskTitle}"`);
      setLinkInput("");
      setShowLinkInput(false);
    } catch {
      setUploadErr("Failed to save link.");
    }
  };

  const downloadFile = (upload) => {
    const a = document.createElement("a");
    a.href = upload.data;
    a.download = upload.fileName;
    a.click();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const isImage = (type) => type && type.startsWith("image/");

  return (
    <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 8 }}>
        TASK UPLOADS ({uploads.length}) — Required before marking Completed
      </div>

      {uploads.length > 0 && (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
    {uploads.map((u) => {
      const uploader = allUsers[u.uploadedBy] || { name: u.uploadedBy, color: GOLD };
      const reviewKey = `${KEYS.taskUploadReviews}_${projectId}_${taskId}_${u.id}`;
      const reviewData = store.get(reviewKey);
      const uploadStatus = reviewData?.status || "pending";
      const isUploader = u.uploadedBy === uploaderEmail;
      const isAdmin = viewerRole === "admin";
      const canSeeUpload = isUploader || isAdmin || uploadStatus === "approved";
      if (!canSeeUpload) return null;
      return (
        <div key={u.id} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${uploadStatus === "approved" ? TEAL + "44" : uploadStatus === "rejected" ? RED + "44" : BORDER}`, borderRadius: 6, padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 18, flexShrink: 0 }}>
              {u.isLink ? "🔗" : isImage(u.fileType) ? "🖼" : u.fileType?.includes("pdf") ? "📄" : u.fileType?.includes("video") ? "🎬" : "📎"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.fileName}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
                {formatSize(u.fileSize)} · by {uploader.name || u.uploadedBy} · {timeAgo(u.uploadedAt)}
              </div>
              <div style={{ fontSize: 10, color: uploadStatus === "approved" ? TEAL : uploadStatus === "rejected" ? RED : GOLD, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>
                {uploadStatus === "approved" ? "✓ Approved" : uploadStatus === "rejected" ? "✗ Needs Revision" : "⏳ Pending Review"}
              </div>
              {uploadStatus === "rejected" && reviewData?.feedback && isUploader && (
                <div style={{ fontSize: 11, color: RED, marginTop: 4, padding: "5px 8px", background: RED + "15", borderRadius: 5, borderLeft: `2px solid ${RED}` }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, display: "block", marginBottom: 2 }}>ADMIN FEEDBACK</span>
                  {reviewData.feedback}
                </div>
              )}
            </div>
            {uploadStatus === "approved" && (
              <>
                {isImage(u.fileType) && !u.isLink && (
                  <img src={u.data} alt={u.fileName} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0, border: `1px solid ${BORDER}` }} />
                )}
                {u.isLink ? (
                  <a href={u.data} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <button style={{ background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 6, color: TEAL, fontSize: 10, cursor: "pointer", padding: "4px 10px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                      ↗ Open Link
                    </button>
                  </a>
                ) : (
                  <button onClick={() => downloadFile(u)} style={{ background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 6, color: TEAL, fontSize: 10, cursor: "pointer", padding: "4px 10px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                    ↓ Download
                  </button>
                )}
              </>
            )}
          </div>
          {isAdmin && (
            <AdminUploadReview
              uploadId={u.id}
              projectId={projectId}
              taskId={taskId}
              uploadedBy={u.uploadedBy}
              currentStatus={uploadStatus}
              currentFeedback={reviewData?.feedback || ""}
              onReviewed={load}
              adminEmail={uploaderEmail}
            />
          )}
        </div>
      );
    })}
  </div>
)}

      {uploadErr && (
        <div style={{ fontSize: 11, color: RED, marginBottom: 8 }}>{uploadErr}</div>
      )}

{canUpload && (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFile} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ padding: "6px 14px", background: uploading ? "rgba(255,255,255,0.05)" : TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 6, color: uploading ? "rgba(255,255,255,0.3)" : TEAL, fontSize: 11, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "'DM Mono',monospace" }}
      >
        {uploading ? "Uploading…" : "+ Upload File (≤5MB)"}
      </button>
      <button
        onClick={() => setShowLinkInput(!showLinkInput)}
        style={{ padding: "6px 14px", background: PURPLE + "22", border: `1px solid ${PURPLE}44`, borderRadius: 6, color: PURPLE, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}
      >
        🔗 Submit Link (&gt;5MB)
      </button>
    </div>
    {showLinkInput && (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          placeholder="Paste Google Drive, Dropbox, or any file link..."
          style={{ flex: 1, padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12, outline: "none" }}
        />
        <button
          onClick={handleLinkSubmit}
          style={{ padding: "6px 14px", background: PURPLE, border: "none", borderRadius: 6, color: BG, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}
        >
          Submit
        </button>
        <button
          onClick={() => { setShowLinkInput(false); setLinkInput(""); }}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16 }}
        >
          ×
        </button>
      </div>
    )}
  </div>
)}
    </div>
  );
};



// ─── PROJECTS ─────────────────────────────────────────────────────────────────
const Projects = ({ user }) => {
  const [showAddPrivateTask, setShowAddPrivateTask] = useState(false);
const [newPrivateTask, setNewPrivateTask] = useState({ title: "", assignee: "", deadline: "" });
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [taskFilter, setTaskFilter] = useState("All");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    assignee: "",
    deadline: "",
  });
  const allUsers = store.get(KEYS.users) || {};

  const load = () => setProjects(store.get(KEYS.projects) || []);
  useEffect(load, []);

  function calcPct(tasks = []) {
    if (!tasks.length) return 0;
    return Math.round(
      (tasks.filter((t) => t.status === "Completed").length / tasks.length) *
        100
    );
  }

  const saveProjects = (ps) => {
    store.set(KEYS.projects, ps);
    setProjects(ps);
  };

  const updateTaskStatus = async (projectId, taskId, newStatus) => {
    if (newStatus === "Completed") {
      const uploads = await getTaskUploads(projectId, taskId);
      if (uploads.length === 0) {
        alert("You must upload proof of task completion (e.g. script, design, file) before marking it as Completed.");
        return;
      }
      const hasApproved = uploads.some(u => {
        const reviewKey = `${KEYS.taskUploadReviews}_${projectId}_${taskId}_${u.id}`;
        const review = store.get(reviewKey);
        return review?.status === "approved";
      });
      if (!hasApproved) {
        alert("Your upload is pending admin review. You can only mark this task as Completed once your upload has been approved.");
        return;
      }
    }
    const ps = store.get(KEYS.projects) || [];
    const pi = ps.findIndex((p) => p.id === projectId);
    if (pi < 0) return;
    const ti = ps[pi].tasks.findIndex((t) => t.id === taskId);
    if (ti < 0) return;
    ps[pi].tasks[ti].status = newStatus;
    ps[pi].tasks[ti].updatedAt = new Date().toISOString();
    saveProjects(ps);
    addActivity(user.email, `marked task as ${newStatus}:`, ps[pi].tasks[ti].title, projectId);
    addNotif(ADMIN_EMAIL, "task", `${user.email} marked "${ps[pi].tasks[ti].title}" as ${newStatus}`);
  };

  const addTask = (projectId) => {
    if (!newTask.title.trim()) return;
    const ps = store.get(KEYS.projects) || [];
    const pi = ps.findIndex((p) => p.id === projectId);
    if (pi < 0) return;
    const isPrivate = !(ps[pi].members || []).includes(newTask.assignee);
    const task = {
      id: Date.now().toString(),
      ...newTask,
      status: "Not Started",
      isPrivate: isPrivate,
      createdAt: new Date().toISOString(),
    };
    ps[pi].tasks.push(task);
    saveProjects(ps);
    addActivity(user.email, "added task:", newTask.title, projectId);
    setNewTask({ title: "", assignee: "", deadline: "" });
    setShowAddTask(false);
    load();
  };

  const addPrivateTask = (projectId) => {
  if (!newPrivateTask.title.trim() || !newPrivateTask.assignee) return;
  const ps = store.get(KEYS.projects) || [];
  const pi = ps.findIndex((p) => p.id === projectId);
  if (pi < 0) return;
  const task = {
    id: Date.now().toString(),
    title: newPrivateTask.title,
    assignee: newPrivateTask.assignee,
    deadline: newPrivateTask.deadline,
    status: "Not Started",
    isPrivate: true,
    isProjectPrivate: true,
    createdAt: new Date().toISOString(),
  };
  ps[pi].tasks.push(task);
  saveProjects(ps);
  addActivity(user.email, "assigned a private task:", newPrivateTask.title, projectId);
  addNotif(newPrivateTask.assignee, "task", `You have been privately assigned a task in project "${ps[pi].name}": "${newPrivateTask.title}"`);
  setNewPrivateTask({ title: "", assignee: "", deadline: "" });
  setShowAddPrivateTask(false);
  load();
};

  const deleteProject = (id) => {
    const ps = (store.get(KEYS.projects) || []).filter((p) => p.id !== id);
    saveProjects(ps);
    addActivity(
      user.email,
      "deleted project",
      showDeleteConfirm?.name || id,
      null
    );
    setShowDeleteConfirm(null);
    setSelected(null);
  };

  const selectedProject = projects.find((p) => p.id === selected);
  const isContributor =
    selectedProject && (selectedProject.members || []).includes(user.email);

  if (selected && selectedProject) {
    const p = selectedProject;
    const pct = calcPct(p.tasks);
    const filtered = (taskFilter === "All" ? p.tasks : p.tasks.filter((t) => t.status === taskFilter))
  .filter((t) => {
    if (t.isProjectPrivate) {
      return user.role === "admin" || t.assignee === user.email;
    }
    if (t.isPrivate && !t.isProjectPrivate) {
      return user.role === "admin" || t.assignee === user.email;
    }
    return true;
  });
    const contributions = (p.members || []).map((em) => {
      const u = allUsers[em] || { name: em, color: GOLD };
      const done = (p.tasks || []).filter(
        (t) => t.assignee === em && t.status === "Completed" && (!t.isProjectPrivate || user.role === "admin" || t.assignee === user.email)
      ).length;
      const total = (p.tasks || []).filter(
        (t) => t.assignee === em && (!t.isProjectPrivate || user.role === "admin" || t.assignee === user.email)
      ).length;
      const contrib = (p.tasks || []).length
        ? Math.round((done / (p.tasks || []).length) * 100)
        : 0;
      return { em, u, done, total, contrib };
    });

    return (
      <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <button
            onClick={() => setSelected(null)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ← Projects
          </button>
          {user.role === "admin" && (
            <Btn
              variant="danger"
              onClick={() => setShowDeleteConfirm(p)}
              style={{ marginLeft: "auto", padding: "6px 14px", fontSize: 11 }}
            >
              Delete Project
            </Btn>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: p.color || GOLD,
                }}
              />
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
                {p.name}
              </h2>
              <Badge
                text={
                  pct === 100
                    ? "Completed"
                    : pct > 0
                    ? "In Progress"
                    : "Not Started"
                }
                color={statusColor(
                  pct === 100
                    ? "Completed"
                    : pct > 0
                    ? "In Progress"
                    : "Not Started"
                )}
              />
            </div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
              {p.description}
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: p.color || GOLD,
                lineHeight: 1,
              }}
            >
              {pct}%
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              Deadline: {p.deadline}
            </div>
          </div>
        </div>
        <ProgressBar pct={pct} color={p.color || GOLD} height={6} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 260px",
            gap: 20,
            marginTop: 24,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              {["All", "Not Started", "In Progress", "Completed"].map((f) => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: `1px solid ${
                      taskFilter === f ? p.color || GOLD : BORDER
                    }`,
                    background:
                      taskFilter === f
                        ? (p.color || GOLD) + "22"
                        : "transparent",
                    color:
                      taskFilter === f
                        ? p.color || GOLD
                        : "rgba(255,255,255,0.4)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  {f}
                </button>
              ))}
              {(isContributor || user.role === "admin") && (
                <Btn
                  onClick={() => setShowAddTask(true)}
                  style={{
                    padding: "4px 14px",
                    fontSize: 11,
                    marginLeft: "auto",
                  }}
                >
                  + Add Task
                </Btn>
              )}
              {user.role === "admin" && (
  <Btn
    onClick={() => setShowAddPrivateTask(true)}
    style={{ padding: "4px 14px", fontSize: 11, background: PURPLE + "22", border: `1px solid ${PURPLE}44`, color: PURPLE }}
  >
    + Private Task
  </Btn>
)}
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                icon="◻"
                title="No tasks"
                sub="Add tasks to this project."
              />
            ) : (
              filtered.map((task) => {
                const assigneeUser = allUsers[task.assignee] || {
                  name: task.assignee,
                  color: GOLD,
                };
                const canEdit = user.role === "admin" || task.assignee === user.email;
                return (
                  <div
                    key={task.id}
                    style={{
                      background: CARD,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: "13px 16px",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `2px solid ${statusColor(task.status)}`,
                        background:
                          task.status === "Completed"
                            ? statusColor(task.status) + "33"
                            : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        color: statusColor(task.status),
                        flexShrink: 0,
                      }}
                    >
                      {task.status === "Completed" ? "✓" : ""}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color:
                            task.status === "Completed"
                              ? "rgba(255,255,255,0.35)"
                              : "#fff",
                          textDecoration:
                            task.status === "Completed"
                              ? "line-through"
                              : "none",
                        }}
                      >
                        {task.title}
                        {(task.isPrivate || task.isProjectPrivate) && <span style={{ marginLeft: 6, fontSize: 10, color: PURPLE, fontFamily: "'DM Mono',monospace", background: PURPLE + "18", border: `1px solid ${PURPLE}44`, borderRadius: 4, padding: "1px 6px" }}>🔒 PRIVATE</span>}
                      </div>
                      {task.deadline && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.25)",
                            fontFamily: "'DM Mono',monospace",
                            marginTop: 2,
                          }}
                        >
                          Due {task.deadline}
                        </div>
                      )}
                    </div>
                    {task.assignee && (
                      <Avatar
                        name={assigneeUser.name || task.assignee}
                        color={assigneeUser.color || GOLD}
                        size={24}
                      />
                    )}
                    {canEdit && (
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTaskStatus(p.id, task.id, e.target.value)
                        }
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: `1px solid ${BORDER}`,
                          borderRadius: 6,
                          color: "#fff",
                          fontSize: 11,
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {["Not Started", "In Progress", "Completed"].map(
                          (s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          )
                        )}
                      </select>
                    )}
                    {!canEdit && (
                      <Badge
                        text={task.status}
                        color={statusColor(task.status)}
                      />
                    )}
                  </div>
                  <TaskUploadSection
  projectId={p.id}
  taskId={task.id}
  taskTitle={task.title}
  uploaderEmail={user.email}
  allUsers={allUsers}
  canUpload={user.role === "admin" || task.assignee === user.email}
  viewerRole={user.role}
/>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 12,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.08em",
              }}
            >
              CONTRIBUTIONS
            </div>
            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 18,
                marginBottom: 16,
              }}
            >
              {contributions.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
                  No members assigned
                </div>
              ) : (
                contributions.map(({ em, u, done, total, contrib }) => (
                  <div key={em} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <Avatar
                        name={u.name || em}
                        color={u.color || GOLD}
                        size={26}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#fff",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {(u.name || em).split(" ")[0]}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.25)",
                          }}
                        >
                          {done}/{total} tasks
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: u.color || GOLD,
                        }}
                      >
                        {contrib}%
                      </div>
                    </div>
                    <ProgressBar pct={contrib} color={u.color || GOLD} />
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 18,
              }}
            >
              {[
                ["Team", p.team],
                ["Deadline", p.deadline],
                ["Members", (p.members || []).length],
                ["Tasks", (p.tasks || []).length],
                [
                  "Done",
                  (p.tasks || []).filter((t) => t.status === "Completed")
                    .length,
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: `1px solid rgba(255,255,255,0.04)`,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>{k}</span>
                  <span style={{ color: "#fff", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ProjectFlowPanel p={p} user={user} allUsers={allUsers} load={load} />

        {showAddTask && (
          <Modal
            title="Add Task"
            onClose={() => setShowAddTask(false)}
            width={420}
          >
            <Inp
              label="Task Title"
              value={newTask.title}
              onChange={(v) => setNewTask((t) => ({ ...t, title: v }))}
              placeholder="Describe the task..."
            />
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 7,
                  fontFamily: "'DM Mono',monospace",
                  letterSpacing: "0.08em",
                }}
              >
                ASSIGN TO
              </div>
              <select
                value={newTask.assignee}
                onChange={(e) =>
                  setNewTask((t) => ({ ...t, assignee: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 14,
                }}
              >
                <option value="">Select member</option>
                {Object.entries(allUsers).map(([em, u]) => (
                  <option key={em} value={em}>
                    {u?.name || em}{!(p.members || []).includes(em) ? " (private)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <Inp
              label="Deadline"
              value={newTask.deadline}
              onChange={(v) => setNewTask((t) => ({ ...t, deadline: v }))}
              type="date"
            />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn onClick={() => addTask(p.id)} style={{ flex: 1 }}>
                Add Task
              </Btn>
              <Btn variant="secondary" onClick={() => setShowAddTask(false)}>
                Cancel
              </Btn>
            </div>
          </Modal>
        )}

{showAddPrivateTask && (
  <Modal
    title="Assign Private Task"
    onClose={() => setShowAddPrivateTask(false)}
    width={420}
  >
    <div style={{ padding: "10px 14px", background: PURPLE + "12", border: `1px solid ${PURPLE}33`, borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 16, lineHeight: 1.6 }}>
      🔒 This task will only be visible to you (admin) and the assigned member. Other project members cannot see it.
    </div>
    <Inp
      label="Task Title"
      value={newPrivateTask.title}
      onChange={(v) => setNewPrivateTask((t) => ({ ...t, title: v }))}
      placeholder="Describe the private task..."
    />
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 7, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
        ASSIGN TO
      </div>
      <select
        value={newPrivateTask.assignee}
        onChange={(e) => setNewPrivateTask((t) => ({ ...t, assignee: e.target.value }))}
        style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14 }}
      >
        <option value="">Select member</option>
        {Object.entries(allUsers).map(([em, u]) => (
          <option key={em} value={em}>{u?.name || em}</option>
        ))}
      </select>
    </div>
    <Inp
      label="Deadline"
      value={newPrivateTask.deadline}
      onChange={(v) => setNewPrivateTask((t) => ({ ...t, deadline: v }))}
      type="date"
    />
    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
      <Btn onClick={() => addPrivateTask(p.id)} style={{ flex: 1 }}>
        Assign Private Task
      </Btn>
      <Btn variant="secondary" onClick={() => setShowAddPrivateTask(false)}>
        Cancel
      </Btn>
    </div>
  </Modal>
)}
        {showDeleteConfirm && (
          <Modal
            title="Delete Project"
            onClose={() => setShowDeleteConfirm(null)}
            width={380}
          >
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              Are you sure you want to delete{" "}
              <strong style={{ color: "#fff" }}>
                {showDeleteConfirm.name}
              </strong>
              ? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn
                variant="danger"
                onClick={() => deleteProject(showDeleteConfirm.id)}
                style={{ flex: 1 }}
              >
                Delete Permanently
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Btn>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <CreateProjectModal
        show={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          load();
          setShowCreate(false);
        }}
        user={user}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {projects.length} PROJECTS
        </div>
        {user.role === "admin" && (
          <Btn onClick={() => setShowCreate(true)} style={{ fontSize: 12 }}>
            + New Project
          </Btn>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="◈"
          title="No projects yet"
          sub={
            user.role === "admin"
              ? "Create your first project to get started."
              : "No projects have been created yet."
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: 18,
          }}
        >
          {projects.map((p) => {
            const pct = calcPct(p.tasks);
            return (
              <div
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderTop: `3px solid ${p.color || GOLD}`,
                  borderRadius: 14,
                  padding: 22,
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = p.color || GOLD)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = BORDER)
                }
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div style={{ flex: 1, paddingRight: 12 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#fff",
                        marginBottom: 4,
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.3)",
                        lineHeight: 1.4,
                      }}
                    >
                      {p.description}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: p.color || GOLD,
                      flexShrink: 0,
                    }}
                  >
                    {pct}%
                  </div>
                </div>
                <ProgressBar pct={pct} color={p.color || GOLD} />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 14,
                  }}
                >
                  <div style={{ display: "flex", gap: 0 }}>
                    {(p.members || []).slice(0, 4).map((em, i) => {
                      const u = allUsers[em] || { name: em, color: GOLD };
                      return (
                        <div key={em} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                          <Avatar
                            name={u.name || em}
                            color={u.color || GOLD}
                            size={22}
                          />
                        </div>
                      );
                    })}
                    {(p.members || []).length > 4 && (
                      <div
                        style={{
                          marginLeft: -8,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        +{p.members.length - 4}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge
                      text={
                        pct === 100
                          ? "Completed"
                          : pct > 0
                          ? "In Progress"
                          : "Not Started"
                      }
                      color={statusColor(
                        pct === 100
                          ? "Completed"
                          : pct > 0
                          ? "In Progress"
                          : "Not Started"
                      )}
                    />
                    <Badge text={p.team || "General"} color={PURPLE} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CreateProjectModal = ({ show, onClose, onCreated, user }) => {
  const [form, setForm] = useState({
    name: "",
    desc: "",
    team: "",
    deadline: "",
    color: GOLD,
    members: [],
  });
  const [flowSteps, setFlowSteps] = useState([]);
  // flowSteps: [{ id, fromEmail, toEmail, taskTitle, taskDeadline }]
  const [newStep, setNewStep] = useState({ fromEmail: "", toEmail: "", taskTitle: "", taskDeadline: "" });
  const [flowErr, setFlowErr] = useState("");

  const allUsers = store.get(KEYS.users) || {};

  if (!show) return null;

  const toggle = (em) =>
    setForm((f) => ({
      ...f,
      members: f.members.includes(em)
        ? f.members.filter((x) => x !== em)
        : [...f.members, em],
    }));

  const create = () => {
    if (!form.name.trim()) return;
    const ps = store.get(KEYS.projects) || [];
    const flowTasks = flowSteps.map((s) => ({
      id: Date.now().toString() + Math.random(),
      title: s.taskTitle,
      assignee: s.toEmail,
      deadline: s.taskDeadline,
      status: "Not Started",
      createdAt: new Date().toISOString(),
      isFlowTask: true,
      flowFrom: s.fromEmail,
    }));
    const project = {
      id: Date.now().toString(),
      name: form.name,
      description: form.desc,
      team: form.team,
      deadline: form.deadline,
      color: form.color,
      members: form.members,
      tasks: flowTasks,
      flow: flowSteps,
      createdAt: new Date().toISOString(),
    };
    ps.push(project);
    store.set(KEYS.projects, ps);
    addActivity(user.email, "created project", form.name, project.id);
    form.members.forEach((em) => {
      if (em !== user.email)
        addNotif(em, "task", `You've been added to project: ${form.name}`);
    });
    onCreated();
  };

  return (
    <Modal title="Create New Project" onClose={onClose} width={520}>
      <Inp
        label="Project Name"
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        placeholder="e.g. LORE Platform v1.0"
      />
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginBottom: 7,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "0.08em",
          }}
        >
          DESCRIPTION
        </div>
        <textarea
          value={form.desc}
          onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
          rows={3}
          placeholder="What is this project about?"
          style={{
            width: "100%",
            padding: "11px 14px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            resize: "vertical",
          }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <Inp
          label="Team / Department"
          value={form.team}
          onChange={(v) => setForm((f) => ({ ...f, team: v }))}
          placeholder="Engineering"
        />
        <Inp
          label="Deadline"
          value={form.deadline}
          onChange={(v) => setForm((f) => ({ ...f, deadline: v }))}
          type="date"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginBottom: 10,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "0.08em",
          }}
        >
          PROJECT COLOR
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {COLORS.map((c) => (
            <div
              key={c}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: c,
                cursor: "pointer",
                border:
                  form.color === c ? "3px solid #fff" : "3px solid transparent",
                transition: "border 0.15s",
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginBottom: 10,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "0.08em",
          }}
        >
          ADD CONTRIBUTORS
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {Object.entries(allUsers).map(([em, u]) => (
            <div
              key={em}
              onClick={() => toggle(em)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 8,
                background: form.members.includes(em)
                  ? GOLD + "18"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  form.members.includes(em) ? GOLD + "44" : BORDER
                }`,
                cursor: "pointer",
              }}
            >
              <Avatar name={u.name || em} color={u.color || GOLD} size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#fff" }}>
                  {u.name || em}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                  {em}
                </div>
              </div>
              {form.members.includes(em) && (
                <span style={{ color: GOLD, fontSize: 14 }}>✓</span>
              )}
            </div>
          ))}
          {Object.keys(allUsers).length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
              No members registered yet
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={create} style={{ flex: 1 }}>
          Create Project
        </Btn>
        <Btn variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
      </div>
    </Modal>
  );
};

// ─── MY TASKS ─────────────────────────────────────────────────────────────────
const MyTasks = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("All");
const [showAssignForm, setShowAssignForm] = useState(false);
const [assignForm, setAssignForm] = useState({ title: "", assignee: "", deadline: "" });
const [assignErr, setAssignErr] = useState("");

const allUsers = store.get(KEYS.users) || {};

const loadTasks = () => {
  const projects = store.get(KEYS.projects) || [];
  const result = [];
  projects.forEach((p) => {
    (p.tasks || [])
      .filter((t) => {
        if (t.assignee !== user.email) return false;
        // Hide private tasks from non-assignee non-admin viewers
        if (t.isAdminPrivate && user.role !== "admin" && t.assignee !== user.email) return false;
        return true;
      })
      .forEach((t) => {
        result.push({
          ...t,
          projectName: p.name,
          projectColor: p.color || GOLD,
          projectId: p.id,
        });
      });
  });
  // Also include admin-private tasks assigned to this user from any project
  if (user.role === "admin") {
    const projects2 = store.get(KEYS.projects) || [];
    projects2.forEach((p) => {
      (p.tasks || [])
        .filter((t) => t.isAdminPrivate && t.assignee !== user.email)
        .forEach((t) => {
          if (!result.find((r) => r.id === t.id)) {
            result.push({
              ...t,
              projectName: p.name,
              projectColor: p.color || GOLD,
              projectId: p.id,
            });
          }
        });
    });
  }
  result.sort(
    (a, b) => new Date(a.deadline || "2099") - new Date(b.deadline || "2099")
  );
  setTasks(result);
};

useEffect(() => {
  loadTasks();
}, [user.email]);

const submitPrivateTask = () => {
  setAssignErr("");
  if (!assignForm.title.trim()) { setAssignErr("Please enter a task title."); return; }
  if (!assignForm.assignee) { setAssignErr("Please select a member to assign to."); return; }
  const projects = store.get(KEYS.projects) || [];
  // Find or create a hidden "Admin Private Tasks" project
  let privateProjectIdx = projects.findIndex((p) => p.id === "__admin_private__");
  if (privateProjectIdx < 0) {
    projects.push({
      id: "__admin_private__",
      name: "Admin Private Tasks",
      description: "Private tasks assigned by admin",
      team: "",
      deadline: "",
      color: PURPLE,
      members: [],
      tasks: [],
      flow: [],
      createdAt: new Date().toISOString(),
    });
    privateProjectIdx = projects.length - 1;
  }
  const task = {
    id: Date.now().toString(),
    title: assignForm.title.trim(),
    assignee: assignForm.assignee,
    deadline: assignForm.deadline,
    status: "Not Started",
    isAdminPrivate: true,
    isPrivate: true,
    createdAt: new Date().toISOString(),
  };
  projects[privateProjectIdx].tasks.push(task);
  store.set(KEYS.projects, projects);
  addActivity(user.email, "assigned a private task to", assignForm.assignee, "__admin_private__");
  addNotif(assignForm.assignee, "task", `You have been assigned a private task: "${assignForm.title.trim()}"`);
  setAssignForm({ title: "", assignee: "", deadline: "" });
  setShowAssignForm(false);
  loadTasks();
};

const filtered = (filter === "All" ? tasks : tasks.filter((t) => t.status === filter))
.filter((t) => {
  // Non-admin users should never see private tasks that aren't theirs
  if (t.isAdminPrivate && user.role !== "admin" && t.assignee !== user.email) return false;
  return true;
});

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["All", "Not Started", "In Progress", "Completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: `1px solid ${filter === f ? GOLD : BORDER}`,
              background: filter === f ? GOLD + "22" : "transparent",
              color: filter === f ? GOLD : "rgba(255,255,255,0.4)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {f}
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "rgba(255,255,255,0.3)",
            alignSelf: "center",
          }}
        >
          {filtered.length} tasks
        </span>
        {user.role === "admin" && (
          <Btn
            onClick={() => setShowAssignForm(!showAssignForm)}
            style={{ padding: "5px 16px", fontSize: 11 }}
          >
            {showAssignForm ? "Cancel" : "+ Assign Private Task"}
          </Btn>
        )}
      </div>

      {user.role === "admin" && showAssignForm && (
        <div style={{ background: CARD, border: `1px solid ${PURPLE}44`, borderRadius: 12, padding: "20px 22px", marginBottom: 20, animation: "fadeIn 0.2s ease" }}>
          <div style={{ fontSize: 11, color: PURPLE, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 14 }}>ASSIGN PRIVATE TASK</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14, lineHeight: 1.6 }}>
            🔒 This task will only be visible to you (admin) and the assigned member. Other users cannot see it.
          </div>
          {assignErr && (
            <div style={{ padding: "9px 13px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 8, color: RED, fontSize: 12, marginBottom: 14 }}>
              {assignErr}
            </div>
          )}
          <Inp
            label="Task Title"
            value={assignForm.title}
            onChange={(v) => setAssignForm((f) => ({ ...f, title: v }))}
            placeholder="Describe the task..."
          />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 7, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>ASSIGN TO</div>
            <select
              value={assignForm.assignee}
              onChange={(e) => setAssignForm((f) => ({ ...f, assignee: e.target.value }))}
              style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }}
            >
              <option value="">Select a member...</option>
              {Object.entries(allUsers).map(([em, u]) => (
                <option key={em} value={em}>{u.name || em}</option>
              ))}
            </select>
          </div>
          <Inp
            label="Deadline (optional)"
            value={assignForm.deadline}
            onChange={(v) => setAssignForm((f) => ({ ...f, deadline: v }))}
            type="date"
          />
          <Btn onClick={submitPrivateTask} style={{ marginTop: 4 }}>
            Assign Task
          </Btn>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="◻"
          title="No tasks"
          sub="Tasks assigned to you will appear here."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((task) => (
            <div
            key={task.id}
            style={{
              background: task.isAdminPrivate ? PURPLE + "08" : CARD,
              border: `1px solid ${task.isAdminPrivate ? PURPLE + "44" : BORDER}`,
              borderLeft: `3px solid ${task.isAdminPrivate ? PURPLE : task.projectColor}`,
              borderRadius: 10,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color:
                      task.status === "Completed"
                        ? "rgba(255,255,255,0.35)"
                        : "#fff",
                    textDecoration:
                      task.status === "Completed" ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </div>
                {task.isAdminPrivate && (
                  <Badge text="🔒 Private" color={PURPLE} />
                )}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {!task.isAdminPrivate && <Badge text={task.projectName} color={task.projectColor} />}
                {task.isAdminPrivate && user.role === "admin" && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
                    Assigned to: {(store.get(KEYS.users) || {})[task.assignee]?.name || task.assignee}
                  </span>
                )}
                {task.deadline && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    Due {task.deadline}
                  </span>
                )}
              </div>
            </div>
            <Badge text={task.status} color={statusColor(task.status)} />
          </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── TEAM ─────────────────────────────────────────────────────────────────────
const Team = ({ user }) => {
  const [users, setUsers] = useState({});
  const [selected, setSelected] = useState(null);
  const allProjects = store.get(KEYS.projects) || [];

  useEffect(() => {
    setUsers(store.get(KEYS.users) || {});
  }, []);

  const allTasks = allProjects.flatMap((p) => p.tasks || []);

  if (selected) {
    const em = selected;
    const u = users[em] || { name: em, color: GOLD };
    const myTasks = allTasks.filter((t) => t.assignee === em);
    const done = myTasks.filter((t) => t.status === "Completed");
    const active = myTasks.filter((t) => t.status === "In Progress");
    const pending = myTasks.filter((t) => t.status === "Not Started");
    const score = myTasks.length
      ? Math.round((done.length / myTasks.length) * 100)
      : 0;

    return (
      <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
            fontSize: 13,
            marginBottom: 22,
          }}
        >
          ← Team
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 28,
          }}
        >
          <Avatar name={u.name || em} color={u.color || GOLD} size={60} />
          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 6,
              }}
            >
              {u.name || em}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <Badge text={u.role || "Member"} color={GOLD} />
              {u.team && <Badge text={u.team} color={TEAL} />}
              {u.title && <Badge text={u.title} color={PURPLE} />}
            </div>
            <div style={{ marginTop: 8 }}>
  <PresenceDot email={em} size={9} />
</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div
              style={{ fontSize: 36, fontWeight: 900, color: u.color || GOLD }}
            >
              {score}%
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              completion score
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Total Tasks", val: myTasks.length, c: GOLD },
            { label: "Completed", val: done.length, c: TEAL },
            { label: "Active", val: active.length, c: PURPLE },
          ].map(({ label, val, c }) => (
            <div
              key={label}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderTop: `2px solid ${c}`,
                borderRadius: 12,
                padding: "16px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>
                {val}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "'DM Mono',monospace",
                  marginTop: 4,
                }}
              >
                {label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {[
          { label: "COMPLETED TASKS", tasks: done, color: TEAL },
          { label: "IN PROGRESS", tasks: active, color: GOLD },
          {
            label: "NOT STARTED",
            tasks: pending,
            color: "rgba(255,255,255,0.25)",
          },
        ].map(
          ({ label, tasks, color }) =>
            tasks.length > 0 && (
              <div key={label} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: 12,
                    fontFamily: "'DM Mono',monospace",
                    letterSpacing: "0.08em",
                  }}
                >
                  {label}
                </div>
                {tasks.map((task) => {
                  const proj = allProjects.find((p) =>
                    (p.tasks || []).some((t) => t.id === task.id)
                  );
                  return (
                    <div
                      key={task.id}
                      style={{
                        background: CARD,
                        border: `1px solid ${BORDER}`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 10,
                        padding: "11px 16px",
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: "#fff" }}>
                          {task.title}
                        </div>
                        {proj && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.25)",
                              marginTop: 2,
                            }}
                          >
                            {proj.name}
                          </div>
                        )}
                      </div>
                      {task.deadline && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.25)",
                            fontFamily: "'DM Mono',monospace",
                          }}
                        >
                          {task.deadline}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )
        )}

        {myTasks.length === 0 && (
          <EmptyState
            icon="◻"
            title="No tasks assigned"
            sub="This member has no tasks yet."
          />
        )}
      </div>
    );
  }

  const entries = Object.entries(users);

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.3)",
          marginBottom: 20,
          fontFamily: "'DM Mono',monospace",
        }}
      >
        {entries.length} MEMBERS
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon="◎"
          title="No members yet"
          sub="Members will appear here once they register."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 16,
          }}
        >
          {entries.map(([em, u]) => {
            const myTasks = allTasks.filter((t) => t.assignee === em);
            const done = myTasks.filter((t) => t.status === "Completed").length;
            const active = myTasks.filter(
              (t) => t.status === "In Progress"
            ).length;
            const score = myTasks.length
              ? Math.round((done / myTasks.length) * 100)
              : 0;
            return (
              <div
                key={em}
                onClick={() => setSelected(em)}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderTop: `2px solid ${u.color || GOLD}`,
                  borderRadius: 14,
                  padding: 20,
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = u.color || GOLD)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = BORDER)
                }
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Avatar
                    name={u.name || em}
                    color={u.color || GOLD}
                    size={40}
                  />
                  <div style={{ minWidth: 0 }}>
  <div
    style={{
      fontSize: 13,
      fontWeight: 700,
      color: "#fff",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }}
  >
    {u.name || em}
  </div>
  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>
    {u.team || "—"}
  </div>
  <PresenceDot email={em} size={7} />
</div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {[
                    { l: "Tasks", v: myTasks.length },
                    { l: "Done", v: done },
                    { l: "Active", v: active },
                  ].map(({ l, v }) => (
                    <div
                      key={l}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: 8,
                        padding: "8px 10px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}
                      >
                        {v}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.3)",
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {l.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.3)",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    SCORE
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: u.color || GOLD,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {score}%
                  </span>
                </div>
                <ProgressBar pct={score} color={u.color || GOLD} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
const Analytics = () => {
  const projects = store.get(KEYS.projects) || [];
  const users = store.get(KEYS.users) || {};
  const allTasks = projects.flatMap((p) => p.tasks || []);

  const byStatus = {
    Completed: allTasks.filter((t) => t.status === "Completed").length,
    "In Progress": allTasks.filter((t) => t.status === "In Progress").length,
    "Not Started": allTasks.filter((t) => t.status === "Not Started").length,
  };

  const leaderboard = Object.entries(users)
    .map(([em, u]) => {
      const tasks = allTasks.filter((t) => t.assignee === em);
      const done = tasks.filter((t) => t.status === "Completed").length;
      return {
        em,
        u,
        done,
        total: tasks.length,
        score: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (allTasks.length === 0)
    return (
      <div style={{ padding: 28, flex: 1 }}>
        <EmptyState
          icon="▲"
          title="No data yet"
          sub="Analytics will populate as projects are created and tasks completed."
        />
      </div>
    );

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 22,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 18,
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.08em",
            }}
          >
            TASK STATUS BREAKDOWN
          </div>
          {Object.entries(byStatus).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                  {k}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                  {v}{" "}
                  <span
                    style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}
                  >
                    / {allTasks.length}
                  </span>
                </span>
              </div>
              <ProgressBar
                pct={allTasks.length ? (v / allTasks.length) * 100 : 0}
                color={statusColor(k)}
                height={7}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 22,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 18,
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.08em",
            }}
          >
            PROJECT HEALTH MATRIX
          </div>
          {projects.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              No projects
            </div>
          ) : (
            projects.map((p) => {
              const pct = p.tasks?.length
                ? Math.round(
                    (p.tasks.filter((t) => t.status === "Completed").length /
                      p.tasks.length) *
                      100
                  )
                : 0;
              const daysLeft = p.deadline
                ? Math.round((new Date(p.deadline) - new Date()) / 86400000)
                : 999;
              const health =
                pct === 100
                  ? "Completed"
                  : pct > 50 || daysLeft > 21
                  ? "On Track"
                  : pct > 20
                  ? "At Risk"
                  : "Critical";
              const hColor = {
                Completed: TEAL,
                "On Track": TEAL,
                "At Risk": GOLD,
                Critical: RED,
              }[health];
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: p.color || GOLD,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {p.name}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                  </span>
                  <Badge text={health} color={hColor} />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 22,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            marginBottom: 18,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "0.08em",
          }}
        >
          PERFORMANCE LEADERBOARD
        </div>
        {leaderboard.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
            No members yet
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(
                leaderboard.length,
                6
              )},1fr)`,
              gap: 12,
            }}
          >
            {leaderboard.map(({ em, u, done, total, score }, i) => (
              <div
                key={em}
                style={{
                  background: i === 0 ? GOLD + "12" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${i === 0 ? GOLD + "44" : BORDER}`,
                  borderRadius: 12,
                  padding: "16px 12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: i === 0 ? GOLD : "rgba(255,255,255,0.25)",
                    fontFamily: "'DM Mono',monospace",
                    marginBottom: 8,
                  }}
                >
                  #{i + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Avatar
                    name={u.name || em}
                    color={u.color || GOLD}
                    size={34}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    marginBottom: 3,
                  }}
                >
                  {(u.name || em).split(" ")[0]}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: u.color || GOLD,
                  }}
                >
                  {score}%
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                  {done}/{total}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── REPORTS ─────────────────────────────────────────────────────────────────
const Reports = ({ user }) => {
  const [tab, setTab] = useState("weekly");
  const [subTab, setSubTab] = useState("my");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tasks: "", blockers: "", goals: "" });
  const [monthForm, setMonthForm] = useState({
    summary: "",
    achievements: "",
    goals: "",
  });
  const [reports, setReports] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, type } or null
  const [expandedUser, setExpandedUser] = useState(null); // email of expanded user profile
  const [reportDeleteReq, setReportDeleteReq] = useState(null); // { id, type, label } — report being requested for deletion
  const [reportDeleteReason, setReportDeleteReason] = useState("");
  const [reportDeleteErr, setReportDeleteErr] = useState("");

  const submitReportDeleteRequest = (reportId, reportType, reportLabel) => {
    if (!reportDeleteReason.trim()) {
      setReportDeleteErr("Please provide a reason for deletion.");
      return;
    }
    const reqs = store.get(KEYS.reportDeleteRequests) || [];
    const existing = reqs.find((r) => r.reportId === reportId && r.status === "pending");
    if (existing) {
      setReportDeleteErr("A deletion request for this report is already pending.");
      return;
    }
    // Check 24-hour window — find the report's submittedAt
    const key = reportType === "weekly" ? KEYS.weeklyReports : KEYS.monthlyReports;
    const allReps = store.get(key) || [];
    const rep = allReps.find((r) => r.id === reportId);
    if (!rep) { setReportDeleteErr("Report not found."); return; }
    const hoursSince = (Date.now() - new Date(rep.submittedAt).getTime()) / 3600000;
    if (hoursSince > 24) {
      setReportDeleteErr("Deletion requests can only be made within 24 hours of submission.");
      return;
    }
    reqs.push({
      id: Date.now().toString(),
      reportId,
      reportType,
      reportLabel,
      requestedBy: user.email,
      reason: reportDeleteReason.trim(),
      requestedAt: new Date().toISOString(),
      status: "pending",
    });
    store.set(KEYS.reportDeleteRequests, reqs);
    addNotif(ADMIN_EMAIL, "report", `${user.email} requested deletion of their ${reportType} report: "${reportLabel}"`);
    setReportDeleteReason("");
    setReportDeleteErr("");
    setReportDeleteReq(null);
    alert("Deletion request submitted to admin.");
  };

  const now = new Date();
  const week = getWeekNum(now);
  const month = now.getMonth();
  const year = now.getFullYear();

  const load = () => {
    const weeklyAll = store.get(KEYS.weeklyReports) || [];
    const monthlyAll = store.get(KEYS.monthlyReports) || [];
    setReports(tab === "weekly" ? weeklyAll : monthlyAll);
  };

  useEffect(load, [tab]);

  const deleteReport = (id) => {
    const key = tab === "weekly" ? KEYS.weeklyReports : KEYS.monthlyReports;
    const existing = store.get(key) || [];
    store.set(key, existing.filter((r) => r.id !== id));
    setDeleteConfirm(null);
    load();
  };

  // Compute the last Friday of a given month/year
  const lastFridayOf = (year, month) => {
    // month is 0-indexed
    const lastDay = new Date(year, month + 1, 0);
    const dayOfWeek = lastDay.getDay(); // 0=Sun,6=Sat
    const diff = (dayOfWeek >= 5) ? dayOfWeek - 5 : dayOfWeek + 2;
    lastDay.setDate(lastDay.getDate() - diff);
    return lastDay;
  };

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Last Friday of current month (for monthly due date)
  const lastFridayThisMonth = lastFridayOf(currentYear, currentMonth);
  const monthlyDue = `${MONTHS[currentMonth]} — due ${lastFridayThisMonth.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}`;

  // Last Friday of current week's week (for weekly due date — just show last Friday of current month week)
  // Simpler: show "every last Friday of the week" as a label
  const weeklyDueLabel = "Due every last Friday of the week";

  const submitWeekly = () => {
    const reps = store.get(KEYS.weeklyReports) || [];
    reps.push({
      id: Date.now().toString(),
      email: user.email,
      week,
      year,
      ...form,
      submittedAt: new Date().toISOString(),
    });
    store.set(KEYS.weeklyReports, reps);
    addActivity(
      user.email,
      "submitted weekly report",
      `W${week} ${year}`,
      null
    );
    addNotif(
      ADMIN_EMAIL,
      "report",
      `${user.email} submitted their weekly report for W${week}`
    );
    setForm({ tasks: "", blockers: "", goals: "" });
    setShowForm(false);
    load();
  };

  const submitMonthly = () => {
    const reps = store.get(KEYS.monthlyReports) || [];
    reps.push({
      id: Date.now().toString(),
      email: user.email,
      month,
      year,
      ...monthForm,
      submittedAt: new Date().toISOString(),
    });
    store.set(KEYS.monthlyReports, reps);
    addActivity(
      user.email,
      "submitted monthly report",
      `${MONTHS[month]} ${year}`,
      null
    );
    addNotif(
      ADMIN_EMAIL,
      "report",
      `${user.email} submitted their monthly report for ${MONTHS[month]} ${year}`
    );
    setMonthForm({ summary: "", achievements: "", goals: "" });
    setShowForm(false);
    load();
  };

  const allUsers = store.get(KEYS.users) || {};

  // For non-admin: just show own reports
  let myReports = reports.filter((r) => r.email === user.email);

  // For admin: group all reports by user email
  const allEmails = [...new Set(reports.map((r) => r.email))];

  // Search filter for admin
  const searchLower = search.trim().toLowerCase();
  const filteredEmails = searchLower
    ? allEmails.filter((em) => {
        const name = (allUsers[em]?.name || em).toLowerCase();
        const userReports = reports.filter((r) => r.email === em);
        const matchesName = name.includes(searchLower) || em.toLowerCase().includes(searchLower);
        const matchesDate = userReports.some(
          (r) => (r.submittedAt || "").toLowerCase().includes(searchLower)
        );
        return matchesName || matchesDate;
      })
    : allEmails;

    const ReportCard = ({ r, showDelete }) => {
      const u = allUsers[r.email] || { name: r.email, color: GOLD };
      const isOwn = r.email === user.email;
      const hoursSince = (Date.now() - new Date(r.submittedAt).getTime()) / 3600000;
      const withinWindow = hoursSince <= 24;
      const existingReq = (store.get(KEYS.reportDeleteRequests) || []).find(
        (req) => req.reportId === r.id && req.status === "pending"
      );
      const reportLabel = tab === "weekly" ? `W${r.week} ${r.year}` : `${MONTHS[r.month]} ${r.year}`;
      const isRequestingThis = reportDeleteReq?.id === r.id;
      return (
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: "18px 20px",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Avatar name={u.name || r.email} color={u.color || GOLD} size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                {u.name || r.email}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                {tab === "weekly"
                  ? `W${r.week} ${r.year}`
                  : `${MONTHS[r.month]} ${r.year}`}{" "}
                · {timeAgo(r.submittedAt)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge text={tab === "weekly" ? "Weekly" : "Monthly"} color={PURPLE} />
            {showDelete && (
              <Btn
                variant="danger"
                onClick={() => setDeleteConfirm({ id: r.id, type: tab })}
                style={{ padding: "4px 10px", fontSize: 10 }}
              >
                Delete
              </Btn>
            )}
          </div>
        </div>
        {tab === "weekly" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Tasks worked on", r.tasks],
              ["Blockers", r.blockers],
              ["Next goals", r.goals],
            ].map(
              ([label, val]) =>
                val && (
                  <div key={label}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.3)",
                        fontFamily: "'DM Mono',monospace",
                        marginBottom: 3,
                      }}
                    >
                      {label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.6)",
                        lineHeight: 1.5,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                )
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Monthly summary", r.summary],
              ["Key achievements", r.achievements],
              ["Goals for next month", r.goals],
            ].map(
              ([label, val]) =>
                val && (
                  <div key={label}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.3)",
                        fontFamily: "'DM Mono',monospace",
                        marginBottom: 3,
                      }}
                    >
                      {label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.6)",
                        lineHeight: 1.5,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                )
            )}
          </div>
       )}
       {isOwn && withinWindow && !showDelete && (
         <div style={{ marginTop: 14, borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: 12 }}>
           {existingReq ? (
             <div style={{ fontSize: 11, color: GOLD, fontFamily: "'DM Mono',monospace" }}>
               ⏳ Deletion request pending admin approval
             </div>
           ) : isRequestingThis ? (
             <div>
               {reportDeleteErr && (
                 <div style={{ padding: "7px 10px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 6, color: RED, fontSize: 11, marginBottom: 8 }}>
                   {reportDeleteErr}
                 </div>
               )}
               <textarea
                 value={reportDeleteReason}
                 onChange={(e) => setReportDeleteReason(e.target.value)}
                 rows={2}
                 placeholder="State your reason for requesting deletion..."
                 style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, color: "#fff", fontSize: 12, resize: "vertical", marginBottom: 8 }}
               />
               <div style={{ display: "flex", gap: 8 }}>
                 <Btn variant="danger" onClick={() => submitReportDeleteRequest(r.id, tab, reportLabel)} style={{ fontSize: 11, padding: "6px 14px" }}>Submit Request</Btn>
                 <Btn variant="secondary" onClick={() => { setReportDeleteReq(null); setReportDeleteReason(""); setReportDeleteErr(""); }} style={{ fontSize: 11, padding: "6px 12px" }}>Cancel</Btn>
               </div>
             </div>
           ) : (
             <button
               onClick={() => { setReportDeleteReq({ id: r.id, type: tab, label: reportLabel }); setReportDeleteReason(""); setReportDeleteErr(""); }}
               style={{ background: "none", border: `1px solid ${RED}44`, borderRadius: 6, color: RED, fontSize: 11, cursor: "pointer", padding: "4px 12px", fontFamily: "'DM Mono',monospace" }}
             >
               Request Deletion
             </button>
           )}
         </div>
       )}
       </div>
     );
   };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1, maxWidth: 800 }}>
      {/* Delete confirmation modal */}
      {deleteConfirm && (
  <Modal title={`Delete ${deleteConfirm.type === "weekly" ? "Weekly" : "Monthly"} Report`} onClose={() => setDeleteConfirm(null)} width={380}>
    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
      Are you sure you want to permanently delete this report? This cannot be undone.
    </p>
    <div style={{ display: "flex", gap: 10 }}>
      <Btn variant="danger" onClick={() => deleteReport(deleteConfirm.id)} style={{ flex: 1 }}>
        Delete Permanently
      </Btn>
      <Btn variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
    </div>
  </Modal>
)}

      {/* Tabs + controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["weekly", "monthly"].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); }}
            style={{
              padding: "7px 18px",
              borderRadius: 20,
              border: `1px solid ${tab === t ? GOLD : BORDER}`,
              background: tab === t ? GOLD + "22" : "transparent",
              color: tab === t ? GOLD : "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Mono',monospace",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
        {user.role === "admin" && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or date…"
            style={{
              padding: "6px 14px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${BORDER}`,
              borderRadius: 20,
              color: "#fff",
              fontSize: 12,
              outline: "none",
              width: 220,
            }}
          />
        )}
        <Btn
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "7px 16px",
            fontSize: 12,
            marginLeft: "auto",
          }}
        >
          {showForm ? "Cancel" : `+ ${tab === "weekly" ? "Weekly" : "Monthly"} Report`}
        </Btn>
      </div>

      {/* Due date reminder banner */}
      <div style={{
        padding: "10px 16px",
        background: GOLD + "10",
        border: `1px solid ${GOLD}33`,
        borderRadius: 8,
        marginBottom: 20,
        fontSize: 12,
        color: GOLD,
        fontFamily: "'DM Mono',monospace",
      }}>
        {tab === "weekly"
          ? `📅 WEEKLY REPORTS — ${weeklyDueLabel}`
          : `📅 MONTHLY REPORTS — ${monthlyDue}`}
      </div>

      {/* Submit form */}
      {showForm && (
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 24,
            marginBottom: 20,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 16 }}>
            {tab === "weekly" ? `Week ${week}, ${year}` : `${MONTHS[month]} ${year}`} Report
          </div>
          {tab === "weekly" ? (
            <>
              {[
                ["TASKS WORKED ON", "tasks", "Describe the tasks you worked on this week..."],
                ["BLOCKERS", "blockers", "Any challenges or blockers?"],
                ["GOALS FOR NEXT WEEK", "goals", "What are you planning next week?"],
              ].map(([label, field, ph]) => (
                <div key={field} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 7, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>{label}</div>
                  <textarea
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    rows={2}
                    placeholder={ph}
                    style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical" }}
                  />
                </div>
              ))}
              <Btn onClick={submitWeekly}>Submit Weekly Report</Btn>
            </>
          ) : (
            <>
              {[
                ["MONTHLY SUMMARY", "summary", "Summarize your month..."],
                ["KEY ACHIEVEMENTS", "achievements", "What did you accomplish?"],
                ["GOALS FOR NEXT MONTH", "goals", "What are you aiming for next month?"],
              ].map(([label, field, ph]) => (
                <div key={field} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 7, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>{label}</div>
                  <textarea
                    value={monthForm[field]}
                    onChange={(e) => setMonthForm((f) => ({ ...f, [field]: e.target.value }))}
                    rows={2}
                    placeholder={ph}
                    style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical" }}
                  />
                </div>
              ))}
              <Btn onClick={submitMonthly}>Submit Monthly Report</Btn>
            </>
          )}
        </div>
      )}

      {/* ── ADMIN VIEW: grouped by user ── */}
      {user.role === "admin" && (
        <div>
          {filteredEmails.length === 0 ? (
            <EmptyState icon="▣" title="No reports found" sub="No reports match your search." />
          ) : (
            filteredEmails.map((em) => {
              const u = allUsers[em] || { name: em, color: GOLD };
              const userReports = reports
                .filter((r) => r.email === em)
                .filter((r) => {
                  if (!searchLower) return true;
                  const name = (allUsers[em]?.name || em).toLowerCase();
                  return (
                    name.includes(searchLower) ||
                    em.toLowerCase().includes(searchLower) ||
                    (r.submittedAt || "").toLowerCase().includes(searchLower)
                  );
                })
                .slice()
                .reverse();
              const isExpanded = expandedUser === em;
              return (
                <div
                  key={em}
                  style={{
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    marginBottom: 14,
                    overflow: "hidden",
                  }}
                >
                  {/* User header — click to expand/collapse */}
                  <div
                    onClick={() => setExpandedUser(isExpanded ? null : em)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 20px",
                      cursor: "pointer",
                      borderBottom: isExpanded ? `1px solid ${BORDER}` : "none",
                      background: isExpanded ? "rgba(200,169,110,0.05)" : "transparent",
                    }}
                  >
                    <Avatar name={u.name || em} color={u.color || GOLD} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                        {u.name || em}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        {em} · {userReports.length} {tab} report{userReports.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {u.team && <Badge text={u.team} color={TEAL} />}
                      <span style={{ fontSize: 16, color: "rgba(255,255,255,0.3)" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {/* Expanded: reports listed */}
                  {isExpanded && (
                    <div style={{ padding: "16px 20px" }}>
                      {userReports.length === 0 ? (
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", padding: "12px 0" }}>
                          No {tab} reports submitted yet.
                        </div>
                      ) : (
                        userReports.map((r) => (
                          <ReportCard key={r.id} r={r} showDelete={true} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MEMBER VIEW: own reports only ── */}
      {user.role !== "admin" && (
        <div>
          {myReports.length === 0 ? (
            <EmptyState icon="▣" title="No reports yet" sub="Submit your first report above." />
          ) : (
            myReports.slice().reverse().map((r) => (
              <ReportCard key={r.id} r={r} showDelete={false} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── ACTIVITY & CHAT ─────────────────────────────────────────────────────────
const ActivityChat = ({ user }) => {
  const [tab, setTab] = useState("feed");
  const [chatTarget, setChatTarget] = useState(null); // email or group id
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [allUsers, setAllUsers] = useState({});
  const [groups, setGroups] = useState([]);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [activeGroupMenu, setActiveGroupMenu] = useState(null); // group id with open menu
  const [replyingTo, setReplyingTo] = useState(null); // { id, from, body }
  const [editingMsg, setEditingMsg] = useState(null); // { id, body }
  const [editText, setEditText] = useState("");
  const [forwardMsg, setForwardMsg] = useState(null); // message object(s)
  const [forwardTargets, setForwardTargets] = useState([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const bottomRef = useRef();

  const load = () => {
    setMessages(store.get(KEYS.messages) || []);
    setActivity((store.get(KEYS.activity) || []).slice(0, 100));
    setAllUsers(store.get(KEYS.users) || {});
    setGroups(store.get(KEYS.groups) || []);
  };

  const isGroupAdmin = (groupId) => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return false;
    return (g.admins || []).includes(user.email);
  };

  const promoteToGroupAdmin = (groupId, targetEmail) => {
    const gs = store.get(KEYS.groups) || [];
    const idx = gs.findIndex((g) => g.id === groupId);
    if (idx < 0) return;
    gs[idx].admins = [...new Set([...(gs[idx].admins || []), targetEmail])];
    store.set(KEYS.groups, gs);
    load();
  };

  const removeMemberFromGroup = (groupId, targetEmail) => {
    if (!window.confirm(`Remove this member from the group?`)) return;
    const gs = store.get(KEYS.groups) || [];
    const idx = gs.findIndex((g) => g.id === groupId);
    if (idx < 0) return;
    gs[idx].members = gs[idx].members.filter((m) => m !== targetEmail);
    gs[idx].admins = (gs[idx].admins || []).filter((m) => m !== targetEmail);
    store.set(KEYS.groups, gs);
    load();
  };

  const deleteGroup = (groupId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this group? This cannot be undone."
      )
    )
      return;
    const gs = (store.get(KEYS.groups) || []).filter((g) => g.id !== groupId);
    store.set(KEYS.groups, gs);
    if (chatTarget === groupId) setChatTarget(null);
    load();
  };

  useEffect(() => {
    load();
    const pollCalls = () => {
      const calls = store.get("ulx_calls") || {};
      const myCall = calls[user.email];

      // Handle incoming call
      if (myCall && myCall.status === "ringing" && myCall.callerEmail !== user.email) {
        setActiveCall(prev => {
          if (prev && prev.type === "incoming" && prev.callId === myCall.callId) return prev;
          return { type: "incoming", ...myCall };
        });
      }

      // Handle outgoing call: detect if callee declined (their entry removed or status set to declined)
      setActiveCall(prev => {
        if (!prev) return prev;

        if (prev.type === "outgoing") {
  const outgoing = calls[`outgoing_${user.email}`];
  if (!outgoing) return null;

  // Check if callee accepted
  if (outgoing.status === "active" && outgoing.acceptedBy) {
    return { ...prev, type: "active", startedAt: prev.startedAt || Date.now() };
  }

  // Check if any target declined: their entry is gone but we're still ringing
  const targets = outgoing.targets || [prev.target];
  const allGone = targets.every(em => !calls[em] || calls[em].status === "declined");
  if (allGone && outgoing.status === "ringing") {
    const updatedCalls = store.get("ulx_calls") || {};
    delete updatedCalls[`outgoing_${user.email}`];
    store.set("ulx_calls", updatedCalls);
    return null;
  }
}

        if (prev.type === "incoming") {
  if (!myCall || myCall.callId !== prev.callId) return null;
  if (myCall.status === "cancelled") return null;
}

        if (prev.type === "active") {
          // Check if the other party ended the call
          const outgoing = calls[`outgoing_${user.email}`];
          const incoming = calls[user.email];
          if (!outgoing && !incoming) return null;
        }

        return prev;
      });
    };
    pollCalls();
    const t = setInterval(() => { load(); pollCalls(); }, 1500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!activeCall || !activeCall.callId) return;
    const callId = activeCall.callId;
    let signalTimestamp = Date.now() - 5000;
  
    const pollSignals = async () => {
      const signals = readSignals(user.email, callId, signalTimestamp);
      if (signals.length === 0) return;
      signalTimestamp = Math.max(...signals.map(s => s.createdAt));
  
      for (const sig of signals) {
        const pc = peerConnections[sig.fromEmail];
        if (!pc) continue;
  
        if (sig.type === "answer") {
          if (pc.signalingState === "have-local-offer") {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.data.sdp));
              // Queue any ICE candidates that arrived before the answer
              const pendingIce = readSignals(user.email, callId, 0).filter(
                s => s.type === "ice" && s.fromEmail === sig.fromEmail && s.createdAt <= signalTimestamp
              );
              for (const ice of pendingIce) {
                try { await pc.addIceCandidate(new RTCIceCandidate(ice.data)); } catch {}
              }
              const updatedCalls = store.get("ulx_calls") || {};
              if (updatedCalls[`outgoing_${user.email}`]) {
                updatedCalls[`outgoing_${user.email}`].status = "active";
                store.set("ulx_calls", updatedCalls);
              }
              setActiveCall(prev => {
  if (!prev) return prev;
  return { ...prev, type: "active", startedAt: prev.startedAt || Date.now(), connectedWith: sig.fromEmail };
});
            } catch (e) { console.error("setRemoteDescription error:", e); }
          }
        } else if (sig.type === "ice") {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(sig.data));
            }
          } catch (e) { console.error("addIceCandidate error:", e); }
        }
      }
    };
  
    const t = setInterval(pollSignals, 800);
    return () => clearInterval(t);
  }, [activeCall?.callId, activeCall?.type]);

  useEffect(() => {
    if (bottomRef.current)
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatTarget]);

  const sendMsg = () => {
    if (!chatMsg.trim() || !chatTarget) return;
    const msgs = store.get(KEYS.messages) || [];

    if (chatTarget === "__broadcast__") {
      Object.keys(allUsers).filter(em => em !== user.email).forEach(em => {
        const bMsg = {
          id: Date.now().toString() + Math.random(),
          from: user.email,
          to: em,
          body: chatMsg.trim(),
          sentAt: new Date().toISOString(),
          readBy: [user.email],
          isBroadcast: true,
        };
        msgs.push(bMsg);
        addNotif(em, "message", `📢 Broadcast from Admin: ${chatMsg.trim().slice(0, 60)}${chatMsg.trim().length > 60 ? "…" : ""}`);
      });
      store.set(KEYS.messages, msgs);
      addActivity(user.email, "sent a broadcast message to all users", "", null);
      setChatMsg("");
      setReplyingTo(null);
      load();
      return;
    }

    const msg = {
      id: Date.now().toString(),
      from: user.email,
      to: chatTarget,
      body: chatMsg.trim(),
      sentAt: new Date().toISOString(),
      readBy: [user.email],
      ...(replyingTo
        ? {
            replyTo: {
              id: replyingTo.id,
              from: replyingTo.from,
              body: replyingTo.body,
            },
          }
        : {}),
    };
    msgs.push(msg);
    store.set(KEYS.messages, msgs);
    addActivity(user.email, "sent a message", "", null);
    if (!chatTarget.startsWith("group_")) {
      addNotif(
        chatTarget,
        "message",
        `New message from ${allUsers[user.email]?.name || user.email}`
      );
    } else {
      const g = groups.find((x) => x.id === chatTarget);
      (g?.members || [])
        .filter((m) => m !== user.email)
        .forEach((m) => addNotif(m, "message", `New message in ${g.name}`));
    }
    setChatMsg("");
    setReplyingTo(null);
    load();
  };

  const createGroup = () => {
    if (!groupName.trim()) return;
    if (!groupMembers.includes(ADMIN_EMAIL) && user.email !== ADMIN_EMAIL) {
      alert("At least one website admin must be added to every group chat.");
      return;
    }
    const gs = store.get(KEYS.groups) || [];
    const g = {
      id: `group_${Date.now()}`,
      name: groupName,
      description: groupDescription,
      members: [...new Set([user.email, ...groupMembers])],
      admins: [...new Set([user.email, ADMIN_EMAIL])],
      createdBy: user.email,
      createdAt: new Date().toISOString(),
    };
    gs.push(g);
    store.set(KEYS.groups, gs);
    setGroupName("");
    setGroupDescription("");
    setGroupMembers([]);
    setShowNewGroup(false);
    load();
  };

  const getConvo = (target) => {
    if (target === "__broadcast__") {
      return messages.filter(m => m.from === user.email && m.isBroadcast);
    }
    const isGroup = target.startsWith("group_");
    return messages.filter((m) =>
      isGroup
        ? m.to === target
        : (m.from === user.email && m.to === target) ||
          (m.from === target && m.to === user.email)
    );
  };

  const getUnread = (target) => {
    const convo = getConvo(target);
    return convo.filter(
      (m) => m.from !== user.email && !(m.readBy || []).includes(user.email)
    ).length;
  };

  const markRead = (target) => {
    const msgs = store.get(KEYS.messages) || [];
    msgs.forEach((m) => {
      const match =
        m.to === target || (m.from === target && m.to === user.email);
      if (match && !(m.readBy || []).includes(user.email))
        m.readBy = [...(m.readBy || []), user.email];
    });
    store.set(KEYS.messages, msgs);
    load();
  };

  const canEditMsg = (msg) => {
    return (
      msg.from === user.email &&
      Date.now() - new Date(msg.sentAt).getTime() < 5 * 60 * 1000
    );
  };

  const saveEditMsg = (msgId) => {
    if (!editText.trim()) return;
    const msgs = store.get(KEYS.messages) || [];
    const idx = msgs.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    msgs[idx].body = editText.trim();
    msgs[idx].editedAt = new Date().toISOString();
    store.set(KEYS.messages, msgs);
    setEditingMsg(null);
    setEditText("");
    load();
  };

  const pinMessage = (msgId, target) => {
    const isGroup = target.startsWith("group_");
    const amGA = isGroup && isGroupAdmin(target);
    if (isGroup && !amGA) return; // only group admins in groups
    const msgs = store.get(KEYS.messages) || [];
    const idx = msgs.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    msgs[idx].pinned = !msgs[idx].pinned;
    store.set(KEYS.messages, msgs);
    load();
  };

  const deleteGroupMsg = (msgId) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    const msgs = store.get(KEYS.messages) || [];
    const idx = msgs.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    msgs[idx].deletedForGroup = true;
    msgs[idx].body = "";
    store.set(KEYS.messages, msgs);
    load();
  };

  const doForward = () => {
    if (!forwardMsg || forwardTargets.length === 0) return;
    const msgsToForward = Array.isArray(forwardMsg) ? forwardMsg : [forwardMsg];
    const msgs = store.get(KEYS.messages) || [];
    forwardTargets.forEach((target) => {
      msgsToForward.forEach((orig) => {
        const fwd = {
          id: Date.now().toString() + Math.random(),
          from: user.email,
          to: target,
          body: orig.body,
          sentAt: new Date().toISOString(),
          readBy: [user.email],
          forwarded: true,
          forwardedFrom: orig.from,
        };
        msgs.push(fwd);
        if (!target.startsWith("group_")) {
          addNotif(
            target,
            "message",
            `Forwarded message from ${allUsers[user.email]?.name || user.email}`
          );
        } else {
          const g = groups.find((x) => x.id === target);
          (g?.members || [])
            .filter((m) => m !== user.email)
            .forEach((m) =>
              addNotif(m, "message", `Forwarded message in ${g.name}`)
            );
        }
      });
    });
    store.set(KEYS.messages, msgs);
    setForwardMsg(null);
    setForwardTargets([]);
    setShowForwardModal(false);
    load();
  };

  const requestLeaveGroup = (groupId) => {
    const reqs = store.get(KEYS.leaveRequests) || [];
    const existing = reqs.find(
      (r) =>
        r.email === user.email &&
        r.groupId === groupId &&
        r.status === "pending"
    );
    if (existing) {
      alert("Your leave request is already pending admin approval.");
      return;
    }
    reqs.push({
      id: Date.now().toString(),
      email: user.email,
      groupId,
      requestedAt: new Date().toISOString(),
      status: "pending",
    });
    store.set(KEYS.leaveRequests, reqs);
    addNotif(
      ADMIN_EMAIL,
      "alert",
      `${user.email} wants to leave group: ${
        groups.find((g) => g.id === groupId)?.name
      }`
    );
    alert("Leave request sent to admin for approval.");
  };

  const markSeenBy = (target) => {
    const msgs = store.get(KEYS.messages) || [];
    let changed = false;
    msgs.forEach((m) => {
      const relevant =
        m.to === target ||
        (m.from === target && m.to === user.email) ||
        (target.startsWith("group_") && m.to === target);
      if (relevant && !(m.readBy || []).includes(user.email)) {
        m.readBy = [...(m.readBy || []), user.email];
        changed = true;
      }
    });
    if (changed) store.set(KEYS.messages, msgs);
  };

  const initiateCall = async (targetEmail, callType, isGroup = false, groupId = null) => {
    const presence = store.get(KEYS.presence) || {};
    if (!isGroup) {
      const info = presence[targetEmail];
      if (!info || !info.online) {
        setActiveCall({
          type: "offline_notice",
          target: targetEmail,
          callType,
          targetName: allUsers[targetEmail]?.name || targetEmail,
        });
        return;
      }
    }
  
    const stream = await getLocalStream(callType);
    if (!stream) {
      alert("Could not access microphone" + (callType === "video" ? "/camera" : "") + ". Please check permissions.");
      return;
    }
  
    const callId = Date.now().toString();
    const callerName = allUsers[user.email]?.name || user.email;
    const calls = store.get("ulx_calls") || {};
    const targets = isGroup
      ? (groups.find(g => g.id === groupId)?.members || []).filter(e => e !== user.email)
      : [targetEmail];
  
    targets.forEach(em => {
      calls[em] = {
        callId,
        callerEmail: user.email,
        callerName,
        callType,
        isGroup,
        groupId,
        groupName: isGroup ? groups.find(g => g.id === groupId)?.name : null,
        target: em,
        status: "ringing",
        startedAt: new Date().toISOString(),
      };
    });
    calls[`outgoing_${user.email}`] = { callId, targets, callType, isGroup, groupId, status: "ringing", startedAt: Date.now() };
    store.set("ulx_calls", calls);
  
    setActiveCall({
      type: "outgoing",
      target: isGroup ? groupId : targetEmail,
      targetName: isGroup ? groups.find(g => g.id === groupId)?.name : allUsers[targetEmail]?.name || targetEmail,
      callType,
      callId,
      isGroup,
      targets,
      startedAt: Date.now(),
    });
  
    for (const em of targets) {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections[em] = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(user.email, em, callId, "ice", e.candidate);
      };
      pc.ontrack = (e) => {
  if (!e.streams || !e.streams[0]) return;
  setActiveCall(prev => {
    if (!prev) return prev;
    const streams = { ...(prev.remoteStreams || {}) };
    streams[em] = e.streams[0];
    return { ...prev, type: prev.type === "outgoing" ? "active" : prev.type, remoteStreams: streams };
  });
};
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(user.email, em, callId, "offer", { sdp: offer, callerEmail: user.email, callerName, callType, isGroup, groupId, groupName: isGroup ? groups.find(g => g.id === groupId)?.name : null });
    }
  };

  const acceptCall = async () => {
    if (!activeCall) return;
    const stream = await getLocalStream(activeCall.callType);
    if (!stream) {
      alert("Could not access microphone" + (activeCall.callType === "video" ? "/camera" : "") + ". Please check permissions.");
      return;
    }
  
    const calls = store.get("ulx_calls") || {};
    if (calls[user.email]) calls[user.email].status = "active";
    store.set("ulx_calls", calls);
  
    const signals = readSignals(user.email, activeCall.callId, 0);
    const offerSignal = signals.find(s => s.type === "offer");
    if (!offerSignal) {
      setActiveCall(prev => ({ ...prev, type: "active", startedAt: Date.now() }));
      return;
    }
  
    const callerEmail = offerSignal.fromEmail;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections[callerEmail] = pc;
  
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(user.email, callerEmail, activeCall.callId, "ice", e.candidate);
    };
    pc.ontrack = (e) => {
  if (!e.streams || !e.streams[0]) return;
  setActiveCall(prev => {
    if (!prev) return prev;
    const streams = { ...(prev.remoteStreams || {}) };
    streams[callerEmail] = e.streams[0];
    return { ...prev, remoteStreams: streams };
  });
};
  
    await pc.setRemoteDescription(new RTCSessionDescription(offerSignal.data.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal(user.email, callerEmail, activeCall.callId, "answer", { sdp: answer });
  
    signals.filter(s => s.type === "ice" && s.fromEmail === callerEmail).forEach(s => {
      pc.addIceCandidate(new RTCIceCandidate(s.data)).catch(() => {});
    });
  
    const updatedCalls = store.get("ulx_calls") || {};
if (updatedCalls[`outgoing_${callerEmail}`]) {
  updatedCalls[`outgoing_${callerEmail}`].status = "active";
  updatedCalls[`outgoing_${callerEmail}`].acceptedBy = user.email;
  updatedCalls[`outgoing_${callerEmail}`].acceptedAt = Date.now();
  store.set("ulx_calls", updatedCalls);
}

// Also update the caller's own call entry so their signal poll detects acceptance
if (updatedCalls[callerEmail]) {
  updatedCalls[callerEmail] = {
    ...updatedCalls[callerEmail],
    status: "active",
    acceptedBy: user.email,
  };
  store.set("ulx_calls", updatedCalls);
}

setActiveCall(prev => ({ ...prev, type: "active", startedAt: Date.now() }));
  };

  const endCall = () => {
    const calls = store.get("ulx_calls") || {};
    const callType = activeCall?.callType || "voice";
    const isGroup = activeCall?.isGroup || false;
    const groupId = activeCall?.isGroup ? activeCall.target : null;
    const callId = activeCall?.callId;
    const startedAt = activeCall?.startedAt || Date.now();
  
    const remoteParticipants = activeCall?.isGroup
      ? (groups.find(g => g.id === activeCall.target)?.members || [])
      : activeCall?.target ? [activeCall.target] : [];
    const allParticipants = [...new Set([user.email, ...remoteParticipants])];
  
    if (callId) {
      Object.keys(calls).forEach(k => {
        if (calls[k]?.callId === callId) delete calls[k];
      });
    }
    delete calls[`outgoing_${user.email}`];
    delete calls[user.email];
    store.set("ulx_calls", calls);

    // Signal to callees that caller cancelled before pickup
if (activeCall?.type === "outgoing") {
  const targets = activeCall.targets || (activeCall.target ? [activeCall.target] : []);
  targets.forEach(em => {
    const updatedCalls = store.get("ulx_calls") || {};
    if (updatedCalls[em] && updatedCalls[em].status === "ringing") {
      updatedCalls[em].status = "cancelled";
      store.set("ulx_calls", updatedCalls);
      setTimeout(() => {
        const c2 = store.get("ulx_calls") || {};
        delete c2[em];
        store.set("ulx_calls", c2);
      }, 2000);
    }
  });
}
  
    if (callId) {
      saveCallLog(callId, user.email, callType, isGroup, groupId, allParticipants, startedAt, Date.now(), allUsers, groups);
    }
  
    stopLocalStream();
    closePeerConnections();
    setActiveCall(null);
  };

  const allDmTargets = [
    ...new Set([
      ...messages
        .filter((m) => m.from === user.email || m.to === user.email)
        .map((m) => (m.from === user.email ? m.to : m.from))
        .filter((t) => !t.startsWith("group_")),
    ]),
  ];
  const allOtherUsers = Object.entries(allUsers).filter(
    ([em]) => em !== user.email
  );

  return (
    <div
      style={{ display: "flex", flex: 1, height: "100%", overflow: "hidden" }}
      onClick={() => setActiveGroupMenu(null)}
    >
      {/* left: list */}
      <div
        style={{
          width: 240,
          borderRight: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 16px 10px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
  {["feed", "chat", "calls"].map((t) => {
    const totalUnread =
      t === "chat"
        ? [
            ...Object.entries(allUsers)
              .filter(([em]) => em !== user.email)
              .map(([em]) => getUnread(em)),
            ...groups
              .filter((g) => g.members.includes(user.email))
              .map((g) => getUnread(g.id)),
          ].filter((n) => n > 0).length
        : 0;
    return (
      <button
        key={t}
        onClick={() => setTab(t)}
        style={{
          flex: 1,
          padding: "6px",
          borderRadius: 8,
          border: `1px solid ${tab === t ? GOLD : BORDER}`,
          background: tab === t ? GOLD + "22" : "transparent",
          color: tab === t ? GOLD : "rgba(255,255,255,0.4)",
          fontSize: 11,
          cursor: "pointer",
          fontFamily: "'DM Mono',monospace",
          textTransform: "capitalize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
        }}
      >
        {t === "chat" && totalUnread > 0 ? `chat (${totalUnread})` : t}
      </button>
    );
  })}
</div>
        </div>
        {tab === "chat" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {user.role === "admin" && (
              <div style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
                <button
                  onClick={() => setChatTarget("__broadcast__")}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: chatTarget === "__broadcast__" ? GOLD + "22" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${chatTarget === "__broadcast__" ? GOLD + "55" : BORDER}`,
                    borderRadius: 8,
                    color: chatTarget === "__broadcast__" ? GOLD : "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'Sora',sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>📢</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Broadcast to All</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>Send message to every user</div>
                  </div>
                </button>
              </div>
            )}
            <div style={{ padding: "10px 12px 4px" }}>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "'DM Mono',monospace",
                  marginBottom: 8,
                }}
              >
                DIRECT MESSAGES
              </div>
              {allOtherUsers.map(([em, u]) => {
                const unread = getUnread(em);
                return (
                  <div
                    key={em}
                    onClick={() => {
                      setChatTarget(em);
                      markRead(em);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background:
                        chatTarget === em ? GOLD + "18" : "transparent",
                      cursor: "pointer",
                      marginBottom: 2,
                    }}
                  >
                    <Avatar
                      name={u.name || em}
                      color={u.color || GOLD}
                      size={28}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
  <div
    style={{
      fontSize: 12,
      color: "#fff",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }}
  >
    {u.name || em}
  </div>
  <PresenceDot email={em} size={6} />
</div>
{unread > 0 && (
                      <span
                        style={{
                          background: GOLD,
                          color: BG,
                          fontSize: 9,
                          fontWeight: 700,
                          borderRadius: 10,
                          padding: "1px 5px",
                        }}
                      >
                        {unread}
                      </span>
                    )}
                    <button
                      title="Voice call"
                      onClick={(e) => { e.stopPropagation(); initiateCall(em, "voice"); }}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13, padding: "2px 3px", lineHeight: 1 }}
                    >
                      📞
                    </button>
                    <button
                      title="Video call"
                      onClick={(e) => { e.stopPropagation(); initiateCall(em, "video"); }}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13, padding: "2px 3px", lineHeight: 1 }}
                    >
                      🎥
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "10px 12px 4px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  GROUPS
                </div>
                <button
                  onClick={() => setShowNewGroup(!showNewGroup)}
                  style={{
                    background: "none",
                    border: "none",
                    color: GOLD,
                    cursor: "pointer",
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>
              {groups
                .filter((g) => g.members.includes(user.email))
                .map((g) => {
                  const unread = getUnread(g.id);
                  const amGroupAdmin = (g.admins || []).includes(user.email);
                  return (
                    <div
                      key={g.id}
                      style={{ position: "relative", marginBottom: 2 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          background:
                            chatTarget === g.id ? GOLD + "18" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          onClick={() => {
                            setChatTarget(g.id);
                            markRead(g.id);
                            setActiveGroupMenu(null);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: PURPLE + "44",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              color: PURPLE,
                            }}
                          >
                            #
                          </div>
                          <span
                            style={{ fontSize: 12, color: "#fff", flex: 1 }}
                          >
                            {g.name}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {unread > 0 && (
                            <span
                              style={{
                                background: GOLD,
                                color: BG,
                                fontSize: 9,
                                fontWeight: 700,
                                borderRadius: 10,
                                padding: "1px 5px",
                              }}
                            >
                              {unread}
                            </span>
                          )}
                          <button
                            title="Group voice call"
                            onClick={(e) => { e.stopPropagation(); initiateCall(null, "voice", true, g.id); }}
                            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12, padding: "2px 3px", lineHeight: 1 }}
                          >
                            📞
                          </button>
                          {(amGroupAdmin || g.members.includes(user.email)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveGroupMenu(
                                  activeGroupMenu === g.id ? null : g.id
                                );
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "rgba(255,255,255,0.3)",
                                cursor: "pointer",
                                fontSize: 14,
                                lineHeight: 1,
                                padding: "0 2px",
                              }}
                            >
                              ⋮
                            </button>
                          )}
                        </div>
                      </div>
                      {activeGroupMenu === g.id && amGroupAdmin && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "100%",
                            zIndex: 50,
                            background: "#1a1a24",
                            border: `1px solid ${BORDER}`,
                            borderRadius: 10,
                            padding: "8px 0",
                            minWidth: 200,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                          }}
                        >
                          {amGroupAdmin && (
                            <>
                              <div
                                style={{
                                  padding: "4px 12px 8px",
                                  fontSize: 10,
                                  color: "rgba(255,255,255,0.3)",
                                  fontFamily: "'DM Mono',monospace",
                                }}
                              >
                                GROUP ADMIN
                              </div>
                              <div
                                style={{
                                  padding: "6px 14px 2px",
                                  fontSize: 10,
                                  color: "rgba(255,255,255,0.25)",
                                  fontFamily: "'DM Mono',monospace",
                                }}
                              >
                                MEMBERS
                              </div>
                              {g.members.map((em) => {
                                const mu = (store.get(KEYS.users) || {})[
                                  em
                                ] || { name: em };
                                const isAdmin = (g.admins || []).includes(em);
                                const isSelf = em === user.email;
                                return (
                                  <div
                                    key={em}
                                    style={{
                                      padding: "5px 14px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 12,
                                        color: isAdmin ? GOLD : "#fff",
                                      }}
                                    >
                                      {mu.name || em} {isAdmin ? "★" : ""}
                                    </span>
                                    {!isSelf && (
                                      <div style={{ display: "flex", gap: 6 }}>
                                        {!isAdmin && (
                                          <button
                                            onClick={() =>
                                              promoteToGroupAdmin(g.id, em)
                                            }
                                            style={{
                                              background: "none",
                                              border: `1px solid ${GOLD}44`,
                                              borderRadius: 4,
                                              color: GOLD,
                                              fontSize: 9,
                                              cursor: "pointer",
                                              padding: "2px 6px",
                                              fontFamily: "'DM Mono',monospace",
                                            }}
                                          >
                                            PROMOTE
                                          </button>
                                        )}
                                        <button
                                          onClick={() =>
                                            removeMemberFromGroup(g.id, em)
                                          }
                                          style={{
                                            background: "none",
                                            border: `1px solid ${RED}44`,
                                            borderRadius: 4,
                                            color: RED,
                                            fontSize: 9,
                                            cursor: "pointer",
                                            padding: "2px 6px",
                                            fontFamily: "'DM Mono',monospace",
                                          }}
                                        >
                                          REMOVE
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              <div
                                style={{
                                  borderTop: `1px solid ${BORDER}`,
                                  margin: "8px 0 4px",
                                }}
                              />
                              <div
                                onClick={() => deleteGroup(g.id)}
                                style={{
                                  padding: "7px 14px",
                                  fontSize: 12,
                                  color: RED,
                                  cursor: "pointer",
                                }}
                              >
                                Delete Group
                              </div>
                            </>
                          )}
                          {!amGroupAdmin && g.members.includes(user.email) && (
                            <div
                              onClick={() => requestLeaveGroup(g.id)}
                              style={{
                                padding: "10px 14px",
                                fontSize: 12,
                                color: TEAL,
                                cursor: "pointer",
                              }}
                            >
                              Leave Group
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            {showNewGroup && (
              <div
                style={{
                  padding: "10px 12px",
                  borderTop: `1px solid ${BORDER}`,
                }}
              >
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    marginBottom: 8,
                    outline: "none",
                  }}
                />
                <input
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Group description (optional)"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    marginBottom: 8,
                    outline: "none",
                  }}
                />

                {allOtherUsers.map(([em, u]) => (
                  <div
                    key={em}
                    onClick={() =>
                      setGroupMembers((m) =>
                        m.includes(em) ? m.filter((x) => x !== em) : [...m, em]
                      )
                    }
                    style={{
                      fontSize: 12,
                      color: groupMembers.includes(em)
                        ? GOLD
                        : "rgba(255,255,255,0.5)",
                      padding: "4px 6px",
                      cursor: "pointer",
                    }}
                  >
                    {groupMembers.includes(em) ? "✓ " : "○ "}
                    {u.name || em}
                  </div>
                ))}
                <Btn
                  onClick={createGroup}
                  style={{
                    width: "100%",
                    padding: "7px",
                    fontSize: 11,
                    marginTop: 8,
                  }}
                >
                  Create Group
                </Btn>
              </div>
            )}
          </div>
        )}
        {tab === "feed" && <div style={{ flex: 1 }} />}
        {tab === "calls" && (
  <div style={{ flex: 1, overflowY: "auto" }}>
    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>CALL HISTORY</div>
    </div>
    {(() => {
      const logs = (store.get("ulx_call_logs") || []).filter(log =>
        log.participants.includes(user.email)
      );
      if (logs.length === 0) return (
        <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No calls yet</div>
      );
      return logs.map(log => {
        const isMe = log.callerEmail === user.email;
        const others = log.participants.filter(e => e !== user.email);
        return (
          <div key={log.id} style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{log.callType === "video" ? "🎥" : "📞"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.isGroup ? (log.groupName || "Group Call") : (allUsers[others[0]]?.name || others[0] || "Unknown")}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
                  {isMe ? "↑ Outgoing" : "↓ Incoming"} · {log.duration} · {timeAgo(log.startedAt)}
                </div>
              </div>
              <Badge text={log.callType} color={log.callType === "video" ? PURPLE : TEAL} />
            </div>
            {log.isGroup && log.participants.length > 1 && (
              <div style={{ paddingLeft: 24, display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {log.participants.map(em => {
                  const u = allUsers[em] || { name: em, color: GOLD };
                  return (
                    <div key={em} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 12, border: `1px solid rgba(255,255,255,0.08)` }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: u.color || GOLD }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>{u.name || em}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      });
    })()}
  </div>
)}
      </div>

      {/* right: content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {tab === "feed" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 16,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.08em",
              }}
            >
              TEAM ACTIVITY FEED
            </div>
            {activity.length === 0 ? (
              <EmptyState
                icon="◌"
                title="No activity yet"
                sub="Activity will appear here as your team works."
              />
            ) : (
              activity.map((a, i) => {
                const u = allUsers[a.userId] || { name: a.userId, color: GOLD };
                return (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: `1px solid rgba(255,255,255,0.04)`,
                    }}
                  >
                    <Avatar
                      name={u.name || a.userId}
                      color={u.color || GOLD}
                      size={32}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.6)",
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: "#fff", fontWeight: 600 }}>
                          {(u.name || a.userId).split(" ")[0]}
                        </span>{" "}
                        {a.action}{" "}
                        {a.target && (
                          <span style={{ color: GOLD }}>{a.target}</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.2)",
                          fontFamily: "'DM Mono',monospace",
                          marginTop: 2,
                        }}
                      >
                        {timeAgo(a.time)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      {tab === "calls" && (
  <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
      FULL CALL LOG
    </div>
    {(() => {
      const logs = (store.get("ulx_call_logs") || []).filter(log =>
        user.role === "admin" || log.participants.includes(user.email)
      );
      if (logs.length === 0) return (
        <EmptyState icon="📞" title="No calls recorded yet" sub="Call history will appear here after your first call." />
      );
      return logs.map(log => {
        const callerUser = allUsers[log.callerEmail] || { name: log.callerEmail, color: GOLD };
        return (
          <div key={log.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 24 }}>{log.callType === "video" ? "🎥" : "📞"}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                    {log.isGroup ? (log.groupName || "Group Call") : log.participants.filter(e => e !== log.callerEmail).map(e => allUsers[e]?.name || e).join(", ")}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
                    Called by {callerUser.name || log.callerEmail} · {timeAgo(log.startedAt)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <Badge text={log.callType} color={log.callType === "video" ? PURPLE : TEAL} />
                <Badge text={log.isGroup ? "Group" : "1-on-1"} color={log.isGroup ? PURPLE : GOLD} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>Duration: </span>{log.duration}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>Started: </span>
                {new Date(log.startedAt).toLocaleString()}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>
              PARTICIPANTS ({log.participants.length})
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {log.participants.map(em => {
                const u = allUsers[em] || { name: em, color: GOLD };
                return (
                  <div key={em} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 20, border: `1px solid ${BORDER}` }}>
                    <Avatar name={u.name || em} color={u.color || GOLD} size={20} />
                    <span style={{ fontSize: 11, color: "#fff" }}>{u.name || em}</span>
                    {em === log.callerEmail && <Badge text="Caller" color={GOLD} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      });
    })()}
  </div>
)}

        {tab === "chat" && chatTarget && (
          <>
            <div
              style={{
                padding: "14px 20px",
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              {chatTarget === "__broadcast__" ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>📢 Broadcast to All Users</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                    Your message will be delivered individually to every team member
                  </div>
                </div>
              ) : chatTarget.startsWith("group_") ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                    {groups.find((g) => g.id === chatTarget)?.name || "Group"}
                  </div>
                  {groups.find((g) => g.id === chatTarget)?.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 2,
                      }}
                    >
                      {groups.find((g) => g.id === chatTarget).description}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar
                    name={allUsers[chatTarget]?.name || chatTarget}
                    color={allUsers[chatTarget]?.color || GOLD}
                    size={28}
                  />
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                    {allUsers[chatTarget]?.name || chatTarget}
                  </div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {getConvo(chatTarget).length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "rgba(255,255,255,0.2)",
                    fontSize: 13,
                    paddingTop: 40,
                  }}
                >
                  Start the conversation…
                </div>
              ) : (
                (() => {
                  const convo = getConvo(chatTarget);
                  const pinnedMsgs = convo.filter(
                    (m) => m.pinned && !m.deletedForGroup
                  );
                  return (
                    <>
                      {pinnedMsgs.length > 0 && (
                        <div
                          style={{
                            background: GOLD + "10",
                            border: `1px solid ${GOLD}22`,
                            borderRadius: 8,
                            padding: "8px 14px",
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: GOLD,
                              fontFamily: "'DM Mono',monospace",
                              marginBottom: 4,
                            }}
                          >
                            📌 {pinnedMsgs.length} PINNED MESSAGE
                            {pinnedMsgs.length > 1 ? "S" : ""}
                          </div>
                          {pinnedMsgs.slice(-2).map((pm) => (
                            <div
                              key={pm.id}
                              style={{
                                fontSize: 11,
                                color: "rgba(255,255,255,0.5)",
                                marginBottom: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span style={{ color: GOLD }}>
                                {
                                  (allUsers[pm.from]?.name || pm.from).split(
                                    " "
                                  )[0]
                                }
                                :{" "}
                              </span>
                              {pm.body}
                            </div>
                          ))}
                        </div>
                      )}
                      {convo.map((msg) => {
                        const isMe = msg.from === user.email;
                        const sender = allUsers[msg.from] || {
                          name: msg.from,
                          color: GOLD,
                        };
                        const isGroup = chatTarget.startsWith("group_");
                        const amGA = isGroup && isGroupAdmin(chatTarget);
                        const canDelete = isGroup ? amGA : false;
                        const seenBy = (msg.readBy || []).filter(
                          (e) => e !== msg.from
                        );
                        const isEditing = editingMsg?.id === msg.id;

                        if (msg.deletedForGroup)
                          return (
                            <div
                              key={msg.id}
                              style={{
                                textAlign: "center",
                                padding: "4px 0",
                                fontSize: 11,
                                color: "rgba(255,255,255,0.2)",
                                fontStyle: "italic",
                              }}
                            >
                              This message was deleted
                            </div>
                          );

                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: "flex",
                              gap: 10,
                              marginBottom: 14,
                              flexDirection: isMe ? "row-reverse" : "row",
                            }}
                            onMouseEnter={(e) => {
                              const bar =
                                e.currentTarget.querySelector(".msg-actions");
                              if (bar) bar.style.opacity = "1";
                            }}
                            onMouseLeave={(e) => {
                              const bar =
                                e.currentTarget.querySelector(".msg-actions");
                              if (bar) bar.style.opacity = "0";
                            }}
                          >
                            {!isMe && (
                              <Avatar
                                name={sender.name || msg.from}
                                color={sender.color || GOLD}
                                size={28}
                              />
                            )}
                            <div
                              style={{ maxWidth: "70%", position: "relative" }}
                            >
                              {!isMe && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "rgba(255,255,255,0.3)",
                                    marginBottom: 4,
                                    fontFamily: "'DM Mono',monospace",
                                  }}
                                >
                                  {sender.name || msg.from}
                                </div>
                              )}
                              {msg.replyTo && (
                                <div
                                  style={{
                                    background: "rgba(255,255,255,0.05)",
                                    borderLeft: `2px solid ${GOLD}`,
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    marginBottom: 4,
                                    fontSize: 11,
                                    color: "rgba(255,255,255,0.4)",
                                  }}
                                >
                                  <span style={{ color: GOLD }}>
                                    {
                                      (
                                        allUsers[msg.replyTo.from]?.name ||
                                        msg.replyTo.from
                                      )?.split(" ")[0]
                                    }
                                    :{" "}
                                  </span>
                                  {msg.replyTo.body.slice(0, 60)}
                                  {msg.replyTo.body.length > 60 ? "…" : ""}
                                </div>
                              )}
                              {msg.forwarded && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "rgba(255,255,255,0.3)",
                                    marginBottom: 3,
                                    fontFamily: "'DM Mono',monospace",
                                  }}
                                >
                                  ↪ Forwarded from{" "}
                                  {allUsers[msg.forwardedFrom]?.name ||
                                    msg.forwardedFrom}
                                </div>
                              )}
                              {isEditing ? (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <input
                                    value={editText}
                                    onChange={(e) =>
                                      setEditText(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        saveEditMsg(msg.id);
                                      if (e.key === "Escape") {
                                        setEditingMsg(null);
                                        setEditText("");
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: "8px 10px",
                                      background: "rgba(255,255,255,0.08)",
                                      border: `1px solid ${GOLD}`,
                                      borderRadius: 8,
                                      color: "#fff",
                                      fontSize: 13,
                                      outline: "none",
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveEditMsg(msg.id)}
                                    style={{
                                      background: GOLD,
                                      border: "none",
                                      borderRadius: 6,
                                      color: BG,
                                      fontSize: 11,
                                      padding: "6px 10px",
                                      cursor: "pointer",
                                      fontWeight: 700,
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMsg(null);
                                      setEditText("");
                                    }}
                                    style={{
                                      background: "rgba(255,255,255,0.07)",
                                      border: "none",
                                      borderRadius: 6,
                                      color: "#fff",
                                      fontSize: 11,
                                      padding: "6px 10px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    padding: "10px 14px",
                                    borderRadius: isMe
                                      ? "12px 12px 4px 12px"
                                      : "12px 12px 12px 4px",
                                    background: isMe
                                      ? GOLD + "33"
                                      : "rgba(255,255,255,0.07)",
                                    fontSize: 13,
                                    color: "#fff",
                                    lineHeight: 1.5,
                                    position: "relative",
                                  }}
                                >
                                  {msg.pinned && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        color: GOLD,
                                        marginRight: 4,
                                      }}
                                    >
                                      📌
                                    </span>
                                  )}
                                  {msg.body}
                                  {msg.editedAt && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        color: "rgba(255,255,255,0.25)",
                                        marginLeft: 6,
                                      }}
                                    >
                                      (edited)
                                    </span>
                                  )}
                                </div>
                              )}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: isMe
                                    ? "flex-end"
                                    : "flex-start",
                                  alignItems: "center",
                                  gap: 8,
                                  marginTop: 3,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "rgba(255,255,255,0.2)",
                                    fontFamily: "'DM Mono',monospace",
                                  }}
                                >
                                  {timeAgo(msg.sentAt)}
                                </div>
                                {seenBy.length > 0 && (
                                  <div
                                    style={{
                                      fontSize: 9,
                                      color: "rgba(255,255,255,0.2)",
                                      fontFamily: "'DM Mono',monospace",
                                    }}
                                  >
                                    Seen by{" "}
                                    {seenBy
                                      .map(
                                        (e) =>
                                          (allUsers[e]?.name || e).split(" ")[0]
                                      )
                                      .join(", ")}
                                  </div>
                                )}
                              </div>
                              {/* Action bar */}
                              <div
                                className="msg-actions"
                                style={{
                                  opacity: 0,
                                  transition: "opacity 0.15s",
                                  position: "absolute",
                                  top: 0,
                                  [isMe ? "left" : "right"]: "calc(100% + 6px)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 3,
                                  background: "#1a1a24",
                                  border: `1px solid ${BORDER}`,
                                  borderRadius: 8,
                                  padding: "4px 2px",
                                  zIndex: 10,
                                }}
                              >
                                {[
                                  {
                                    label: "↩ Reply",
                                    action: () =>
                                      setReplyingTo({
                                        id: msg.id,
                                        from: msg.from,
                                        body: msg.body,
                                      }),
                                  },
                                  {
                                    label: "↪ Forward",
                                    action: () => {
                                      setForwardMsg(msg);
                                      setShowForwardModal(true);
                                    },
                                  },
                                  {
                                    label: msg.pinned ? "Unpin" : "📌 Pin",
                                    action: () =>
                                      pinMessage(msg.id, chatTarget),
                                    hide: isGroup && !amGA,
                                  },
                                  {
                                    label: "✏ Edit",
                                    action: () => {
                                      setEditingMsg(msg);
                                      setEditText(msg.body);
                                    },
                                    hide: !canEditMsg(msg),
                                  },
                                  {
                                    label: "🗑 Delete",
                                    action: () => deleteGroupMsg(msg.id),
                                    hide: !canDelete,
                                  },
                                ]
                                  .filter((a) => !a.hide)
                                  .map((a) => (
                                    <button
                                      key={a.label}
                                      onClick={a.action}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "rgba(255,255,255,0.6)",
                                        fontSize: 10,
                                        cursor: "pointer",
                                        padding: "3px 10px",
                                        textAlign: "left",
                                        whiteSpace: "nowrap",
                                        fontFamily: "'Sora',sans-serif",
                                      }}
                                    >
                                      {a.label}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              {replyingTo && (
                <div
                  style={{
                    padding: "8px 20px",
                    background: "rgba(255,255,255,0.03)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                    <span style={{ color: GOLD }}>
                      Replying to{" "}
                      {
                        (
                          allUsers[replyingTo.from]?.name || replyingTo.from
                        ).split(" ")[0]
                      }
                      :{" "}
                    </span>
                    {replyingTo.body.slice(0, 60)}
                    {replyingTo.body.length > 60 ? "…" : ""}
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.3)",
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              <div style={{ padding: "14px 20px", display: "flex", gap: 10 }}>
                <input
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                  placeholder="Type a message…"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <Btn
                  onClick={sendMsg}
                  style={{ padding: "10px 18px", fontSize: 13 }}
                >
                  Send
                </Btn>
              </div>
            </div>
          </>
        )}

        {tab === "chat" && !chatTarget && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyState
              icon="◌"
              title="Select a conversation"
              sub="Choose a person or group from the left to start chatting."
            />
          </div>
        )}
      </div>
      {showForwardModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: 400,
              background: "#111118",
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                Forward Message
              </h3>
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardMsg(null);
                  setForwardTargets([]);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 10,
                fontFamily: "'DM Mono',monospace",
              }}
            >
              SELECT RECIPIENTS
            </div>
            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {Object.entries(allUsers)
                .filter(([em]) => em !== user.email)
                .map(([em, u]) => (
                  <div
                    key={em}
                    onClick={() =>
                      setForwardTargets((t) =>
                        t.includes(em) ? t.filter((x) => x !== em) : [...t, em]
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: forwardTargets.includes(em)
                        ? GOLD + "18"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        forwardTargets.includes(em) ? GOLD + "44" : BORDER
                      }`,
                      cursor: "pointer",
                    }}
                  >
                    <Avatar
                      name={u.name || em}
                      color={u.color || GOLD}
                      size={26}
                    />
                    <span style={{ fontSize: 13, color: "#fff", flex: 1 }}>
                      {u.name || em}
                    </span>
                    {forwardTargets.includes(em) && (
                      <span style={{ color: GOLD }}>✓</span>
                    )}
                  </div>
                ))}
              {groups
                .filter((g) => g.members.includes(user.email))
                .map((g) => (
                  <div
                    key={g.id}
                    onClick={() =>
                      setForwardTargets((t) =>
                        t.includes(g.id)
                          ? t.filter((x) => x !== g.id)
                          : [...t, g.id]
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: forwardTargets.includes(g.id)
                        ? PURPLE + "18"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        forwardTargets.includes(g.id) ? PURPLE + "44" : BORDER
                      }`,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: PURPLE + "44",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: PURPLE,
                      }}
                    >
                      #
                    </div>
                    <span style={{ fontSize: 13, color: "#fff", flex: 1 }}>
                      {g.name}
                    </span>
                    {forwardTargets.includes(g.id) && (
                      <span style={{ color: PURPLE }}>✓</span>
                    )}
                  </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn
                onClick={doForward}
                disabled={forwardTargets.length === 0}
                style={{ flex: 1 }}
              >
                Forward
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardMsg(null);
                  setForwardTargets([]);
                }}
              >
                Cancel
              </Btn>
            </div>
          </div>
        </div>
      )}

{activeCall && (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
    zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(10px)",
  }}>
    <div style={{
      width: activeCall.type === "active" && activeCall.callType === "video" ? 720 : 360,
      background: "#111118", border: `1px solid ${BORDER}`,
      borderRadius: 20, padding: "32px 28px", textAlign: "center",
      boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
      transition: "width 0.3s ease",
    }}>
      {activeCall.type === "offline_notice" ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📴</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            {activeCall.targetName} is offline
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: 24 }}>
            This user is currently offline. Try calling again when they are active.
          </div>
          <Btn onClick={() => setActiveCall(null)} style={{ width: "100%", padding: "11px" }}>OK</Btn>
        </>
      ) : activeCall.type === "incoming" ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 1s infinite" }}>
            {activeCall.callType === "video" ? "🎥" : "📞"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>
            INCOMING {activeCall.callType?.toUpperCase()} CALL
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            {activeCall.callerName || activeCall.callerEmail}
          </div>
          {activeCall.isGroup && (
            <div style={{ fontSize: 13, color: PURPLE, marginBottom: 16 }}>Group: {activeCall.groupName}</div>
          )}
          <div style={{ marginBottom: 24 }} />
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button onClick={() => {
              const calls = store.get("ulx_calls") || {};
              const callerEmail = activeCall?.callerEmail;
              if (calls[user.email]) {
                calls[user.email].status = "declined";
                store.set("ulx_calls", calls);
              }
              if (callerEmail && calls[`outgoing_${callerEmail}`]) {
                calls[`outgoing_${callerEmail}`].status = "declined";
                store.set("ulx_calls", calls);
              }
              setTimeout(() => {
                const updatedCalls = store.get("ulx_calls") || {};
                delete updatedCalls[user.email];
                if (callerEmail) delete updatedCalls[`outgoing_${callerEmail}`];
                store.set("ulx_calls", updatedCalls);
              }, 2000);
              stopLocalStream();
              closePeerConnections();
              setActiveCall(null);
            }} style={{ width: 56, height: 56, borderRadius: "50%", background: RED, border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
            <button onClick={acceptCall} style={{ width: 56, height: 56, borderRadius: "50%", background: TEAL, border: "none", fontSize: 22, cursor: "pointer" }}>✓</button>
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace" }}>
            TAP ✓ TO ACCEPT · ✕ TO DECLINE
          </div>
        </>
      ) : activeCall.type === "outgoing" ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 1.5s infinite" }}>
            {activeCall.callType === "video" ? "🎥" : "📞"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>CALLING…</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{activeCall.targetName}</div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${GOLD}44`, borderTop: `3px solid ${GOLD}`, animation: "spin 1s linear infinite", margin: "16px auto 24px" }} />
          <Btn variant="danger" onClick={endCall} style={{ width: "100%", padding: "11px" }}>Cancel Call</Btn>
        </>
      ) : activeCall.type === "active" ? (
        <>
          {activeCall.callType === "video" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: "relative", background: "#000", borderRadius: 12, overflow: "hidden", marginBottom: 8, height: 280 }}>
                {activeCall.remoteStreams && Object.entries(activeCall.remoteStreams).map(([em, stream]) => (
                  <video key={em} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    ref={el => { if (el && stream) el.srcObject = stream; }} />
                ))}
                {(!activeCall.remoteStreams || Object.keys(activeCall.remoteStreams).length === 0) && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                    Connecting video…
                  </div>
                )}
                <video autoPlay playsInline muted
  style={{ position: "absolute", bottom: 10, right: 10, width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: `2px solid ${GOLD}`, background: "#000" }}
  ref={el => {
    if (el) {
      if (localStreamRef.current) el.srcObject = localStreamRef.current;
      else { const check = setInterval(() => { if (localStreamRef.current) { el.srcObject = localStreamRef.current; clearInterval(check); } }, 200); }
    }
  }} />
              </div>
              {activeCall.remoteStreams && Object.entries(activeCall.remoteStreams).map(([em, stream]) => (
                <audio key={`audio-${em}`} autoPlay ref={el => { if (el && stream) el.srcObject = stream; }} style={{ display: "none" }} />
              ))}
            </div>
          )}
          {activeCall.callType !== "video" && activeCall.remoteStreams && Object.entries(activeCall.remoteStreams).map(([em, stream]) => (
            <audio key={em} autoPlay ref={el => { if (el && stream) el.srcObject = stream; }} style={{ display: "none" }} />
          ))}
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {activeCall.callType === "video" ? "🎥" : "📞"}
          </div>
          <div style={{ fontSize: 13, color: TEAL, marginBottom: 4, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
            {activeCall.callType?.toUpperCase()} CALL CONNECTED
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            {activeCall.targetName}
          </div>
          {activeCall.isGroup && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
              {Object.keys(activeCall.remoteStreams || {}).length} participant(s) connected
            </div>
          )}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 20, marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace" }}>LIVE — BOTH ENDS CONNECTED</span>
          </div>
          {activeCall.isGroup && activeCall.remoteStreams && Object.keys(activeCall.remoteStreams).length > 0 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
              {Object.keys(activeCall.remoteStreams).map(em => {
                const u = allUsers[em] || { name: em, color: GOLD };
                return (
                  <div key={em} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 20 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL }} />
                    <span style={{ fontSize: 11, color: "#fff" }}>{u.name || em}</span>
                  </div>
                );
              })}
            </div>
          )}
          <Btn variant="danger" onClick={endCall} style={{ width: "100%", padding: "11px" }}>End Call</Btn>
        </>
      ) : null}
    </div>
  </div>
)}
    </div>
  );
};

// ─── AI INSIGHTS

// ─── AI INSIGHTS ─────────────────────────────────────────────────────────────
const AIInsights = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [reportScope, setReportScope] = useState("team"); // team | member
  const [selectedMember, setSelectedMember] = useState("");
  const [timePeriod, setTimePeriod] = useState("weekly"); // daily | weekly | monthly
  const [showHistory, setShowHistory] = useState(false);

  const projects = store.get(KEYS.projects) || [];
  const allUsers = store.get(KEYS.users) || {};
  const allTasks = projects.flatMap((p) => p.tasks || []);

  const generate = async () => {
    setLoading(true);
    setErr("");
    setResult(null);

    const isAdmin = user.role === "admin";
    const targetEmail = isAdmin && reportScope === "member" && selectedMember
      ? selectedMember
      : user.email;
    const targetUser = allUsers[targetEmail] || { name: targetEmail };

    const now = new Date();
    const dayMs = 86400000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;
    const periodMs = timePeriod === "daily" ? dayMs : timePeriod === "weekly" ? weekMs : monthMs;
    const periodLabel = timePeriod === "daily" ? "today" : timePeriod === "weekly" ? "this week" : "this month";

    // Filter tasks by period based on updatedAt or createdAt
    const filterByPeriod = (tasks) => tasks.filter((t) => {
      const d = new Date(t.updatedAt || t.createdAt || 0);
      return (now - d) <= periodMs;
    });

    const myProjects = isAdmin && reportScope === "team"
      ? projects
      : projects.filter((p) => (p.members || []).includes(targetEmail));

    const myAllTasks = isAdmin && reportScope === "team"
      ? allTasks
      : allTasks.filter((t) => t.assignee === targetEmail);

    const myPeriodTasks = filterByPeriod(myAllTasks);

    const weeklyReports = store.get(KEYS.weeklyReports) || [];
    const monthlyReports = store.get(KEYS.monthlyReports) || [];
    const memberWeekly = weeklyReports.filter((r) => r.email === targetEmail).slice(-4);
    const memberMonthly = monthlyReports.filter((r) => r.email === targetEmail).slice(-3);

    let prompt;

    if (isAdmin && reportScope === "team") {
      prompt = `You are an AI team intelligence assistant for Ulrevix. Generate a structured team intelligence report for the period: ${timePeriod.toUpperCase()} (${periodLabel}). JSON only, no backticks, no markdown.
Projects: ${JSON.stringify(myProjects.map((p) => ({
        name: p.name,
        progress: p.tasks?.length ? Math.round((p.tasks.filter((t) => t.status === "Completed").length / p.tasks.length) * 100) + "%" : "0%",
        deadline: p.deadline,
        members: p.members?.length,
      })))}
Team: ${JSON.stringify(Object.values(allUsers).map((u) => ({ name: u.name, team: u.team, role: u.role })))}
Tasks overall: ${JSON.stringify({ done: allTasks.filter((t) => t.status === "Completed").length, inProgress: allTasks.filter((t) => t.status === "In Progress").length, notStarted: allTasks.filter((t) => t.status === "Not Started").length })}
Tasks active ${periodLabel}: ${JSON.stringify({ updated: filterByPeriod(allTasks).length, completed: filterByPeriod(allTasks).filter((t) => t.status === "Completed").length })}
Return JSON: { "headline": "...", "period": "${timePeriod}", "insights": ["...x3"], "risks": ["...x2"], "recommendations": [{"action":"...","detail":"..."}x3], "spotlight": { "name": "...", "reason": "..." } }`;
    } else if (isAdmin && reportScope === "member") {
      prompt = `You are an AI performance analyst. Generate a detailed ${timePeriod} performance report for team member: ${targetUser.name || targetEmail}. JSON only, no backticks.
Period: ${timePeriod.toUpperCase()} — ${periodLabel}
Member: ${JSON.stringify({ name: targetUser.name, team: targetUser.team, title: targetUser.title, dept: targetUser.dept })}
All tasks: ${JSON.stringify(myAllTasks.map((t) => ({ title: t.title, status: t.status, deadline: t.deadline })))}
Tasks active ${periodLabel}: ${JSON.stringify(myPeriodTasks.map((t) => ({ title: t.title, status: t.status })))}
Projects involved: ${JSON.stringify(myProjects.map((p) => ({ name: p.name, tasksDone: (p.tasks || []).filter((t) => t.assignee === targetEmail && t.status === "Completed").length, tasksTotal: (p.tasks || []).filter((t) => t.assignee === targetEmail).length })))}
Recent weekly reports: ${JSON.stringify(memberWeekly.map((r) => ({ week: r.week, year: r.year, tasks: r.tasks, blockers: r.blockers, goals: r.goals })))}
Recent monthly reports: ${JSON.stringify(memberMonthly.map((r) => ({ month: r.month, year: r.year, summary: r.summary, achievements: r.achievements })))}
Return JSON: { "headline": "...", "period": "${timePeriod}", "memberName": "${targetUser.name || targetEmail}", "insights": ["...x3"], "risks": ["...x2"], "recommendations": [{"action":"...","detail":"..."}x3], "metrics": { "tasksThisPeriod": ${myPeriodTasks.length}, "completedThisPeriod": ${myPeriodTasks.filter(t => t.status === "Completed").length}, "totalTasks": ${myAllTasks.length}, "totalCompleted": ${myAllTasks.filter(t => t.status === "Completed").length}, "completionRate": "${myAllTasks.length ? Math.round((myAllTasks.filter(t => t.status === "Completed").length / myAllTasks.length) * 100) : 0}%" } }`;
    } else {
      prompt = `You are an AI performance assistant. Generate a ${timePeriod} personal insights report for a team member. JSON only, no backticks.
Period: ${timePeriod.toUpperCase()} — ${periodLabel}
All my tasks: ${JSON.stringify(myAllTasks.map((t) => ({ title: t.title, status: t.status, deadline: t.deadline })))}
Tasks active ${periodLabel}: ${JSON.stringify(myPeriodTasks.map((t) => ({ title: t.title, status: t.status })))}
My projects: ${JSON.stringify(myProjects.map((p) => ({ name: p.name, myContrib: (p.tasks || []).filter((t) => t.assignee === user.email).length })))}
Return JSON: { "headline": "...", "period": "${timePeriod}", "insights": ["...x3"], "risks": ["...x2"], "recommendations": [{"action":"...","detail":"..."}x3], "metrics": { "tasksThisPeriod": ${myPeriodTasks.length}, "completedThisPeriod": ${myPeriodTasks.filter(t => t.status === "Completed").length}, "totalTasks": ${myAllTasks.length}, "totalCompleted": ${myAllTasks.filter(t => t.status === "Completed").length}, "completionRate": "${myAllTasks.length ? Math.round((myAllTasks.filter(t => t.status === "Completed").length / myAllTasks.length) * 100) : 0}%" } }`;
    }

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await resp.json();
      const text = (data.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        setResult(parsed);
        // Save to persistent storage
        const savedReports = store.get(KEYS.aiReports) || [];
        savedReports.unshift({
          id: Date.now().toString(),
          generatedBy: user.email,
          scope: isAdmin ? reportScope : "member",
          targetEmail: isAdmin && reportScope === "member" ? targetEmail : user.email,
          timePeriod,
          generatedAt: new Date().toISOString(),
          headline: parsed.headline || "",
          period: parsed.period || timePeriod,
          memberName: parsed.memberName || null,
          metrics: parsed.metrics || null,
          insights: parsed.insights || [],
          risks: parsed.risks || [],
          spotlight: parsed.spotlight || null,
        });
        store.set(KEYS.aiReports, savedReports.slice(0, 200));
      } catch {
        setErr("Could not generate report. Please try again.");
      }
      setLoading(false);
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1, maxWidth: 860 }}>
      <div
        style={{
          background: `linear-gradient(135deg,${PURPLE}12,${GOLD}08)`,
          border: `1px solid ${PURPLE}33`,
          borderRadius: 14,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: user.role === "admin" ? 20 : 0 }}>
          <div>
            <div style={{ fontSize: 11, color: PURPLE, letterSpacing: "0.1em", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>
              AI INTELLIGENCE ENGINE
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              {user.role === "admin"
                ? reportScope === "member" && selectedMember
                  ? `Member Report · ${allUsers[selectedMember]?.name || selectedMember}`
                  : "Team Intelligence Report"
                : "My Performance Report"}
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              Powered by Ulrevix Core · <span style={{ color: PURPLE, textTransform: "capitalize" }}>{timePeriod}</span> view
            </p>
          </div>
          <Btn
            onClick={generate}
            disabled={loading || (user.role === "admin" && reportScope === "member" && !selectedMember)}
            style={{ padding: "11px 22px", background: loading ? PURPLE + "44" : PURPLE, color: loading ? "rgba(255,255,255,0.4)" : BG, border: "none", flexShrink: 0 }}
          >
            {loading ? "ANALYZING..." : "✦ GENERATE"}
          </Btn>
        </div>

        {/* Controls — admin only */}
        {user.role === "admin" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* Scope toggle */}
            <div style={{ display: "flex", gap: 6 }}>
              {[{ v: "team", label: "Full Team" }, { v: "member", label: "Per Member" }].map(({ v, label }) => (
                <button key={v} onClick={() => { setReportScope(v); setResult(null); }}
                  style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${reportScope === v ? GOLD : BORDER}`, background: reportScope === v ? GOLD + "22" : "transparent", color: reportScope === v ? GOLD : "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Member selector */}
            {reportScope === "member" && (
              <select
                value={selectedMember}
                onChange={(e) => { setSelectedMember(e.target.value); setResult(null); }}
                style={{ padding: "6px 14px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 20, color: selectedMember ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 11, outline: "none", cursor: "pointer", fontFamily: "'DM Mono',monospace" }}
              >
                <option value="">Select a member…</option>
                {Object.entries(allUsers).map(([em, u]) => (
                  <option key={em} value={em}>{u.name || em}</option>
                ))}
              </select>
            )}

            {/* Period selector */}
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {[{ v: "daily", label: "Daily" }, { v: "weekly", label: "Weekly" }, { v: "monthly", label: "Monthly" }].map(({ v, label }) => (
                <button key={v} onClick={() => { setTimePeriod(v); setResult(null); }}
                  style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${timePeriod === v ? PURPLE : BORDER}`, background: timePeriod === v ? PURPLE + "22" : "transparent", color: timePeriod === v ? PURPLE : "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Period selector — members only */}
        {user.role !== "admin" && (
          <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
            {[{ v: "daily", label: "Daily" }, { v: "weekly", label: "Weekly" }, { v: "monthly", label: "Monthly" }].map(({ v, label }) => (
              <button key={v} onClick={() => { setTimePeriod(v); setResult(null); }}
                style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${timePeriod === v ? PURPLE : BORDER}`, background: timePeriod === v ? PURPLE + "22" : "transparent", color: timePeriod === v ? PURPLE : "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>



      {err && (
        <div
          style={{
            padding: "12px 16px",
            background: RED + "22",
            border: `1px solid ${RED}44`,
            borderRadius: 8,
            color: RED,
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {err}
        </div>
      )}

      {/* Saved Reports History */}
      {(() => {
        const saved = store.get(KEYS.aiReports) || [];
        const visibleSaved = user.role === "admin"
          ? saved
          : saved.filter((r) => r.generatedBy === user.email);
        if (visibleSaved.length === 0) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "10px 16px",
                cursor: "pointer",
                width: "100%",
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.06em",
              }}
            >
              <span style={{ color: PURPLE }}>◆</span>
              SAVED REPORT HISTORY ({visibleSaved.length})
              <span style={{ marginLeft: "auto", fontSize: 14 }}>{showHistory ? "▲" : "▼"}</span>
            </button>
            {showHistory && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {visibleSaved.map((r) => {
                  const generatorUser = allUsers[r.generatedBy] || { name: r.generatedBy, color: GOLD };
                  const targetUserData = r.targetEmail ? (allUsers[r.targetEmail] || { name: r.targetEmail, color: GOLD }) : null;
                  const scopeLabel = r.scope === "team" ? "Full Team" : `Member · ${r.memberName || r.targetEmail || ""}`;
                  return (
                    <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <Avatar name={generatorUser.name || r.generatedBy} color={generatorUser.color || GOLD} size={28} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
                              {generatorUser.name || r.generatedBy}
                              {user.role === "admin" && r.scope === "member" && targetUserData && r.targetEmail !== r.generatedBy && (
                                <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}> → {targetUserData.name || r.targetEmail}</span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
                              {timeAgo(r.generatedAt)} · {scopeLabel}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Badge text={r.timePeriod} color={PURPLE} />
                          {r.scope === "team" && <Badge text="Team" color={GOLD} />}
                        </div>
                      </div>
                      {r.headline && (
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: r.metrics ? 10 : 0, borderLeft: `2px solid ${PURPLE}`, paddingLeft: 10 }}>
                          {r.headline}
                        </div>
                      )}
                      {r.metrics && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 10 }}>
                          {[
                            { label: `Tasks (${r.timePeriod})`, val: r.metrics.tasksThisPeriod, color: PURPLE },
                            { label: "Completed", val: r.metrics.completedThisPeriod, color: TEAL },
                            { label: "Total Tasks", val: r.metrics.totalTasks, color: GOLD },
                            { label: "Rate", val: r.metrics.completionRate, color: TEAL },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: color + "10", border: `1px solid ${color}22`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
                              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{label.toUpperCase()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 40px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `3px solid ${PURPLE}33`,
              borderTop: `3px solid ${PURPLE}`,
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            Analyzing…
          </div>
        </div>
      )}

      {!result && !loading && !err && (
        <EmptyState
          icon="✦"
          title="No report generated yet"
          sub="Click Generate to get AI-powered insights."
        />
      )}

      {result && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              background: PURPLE + "12",
              border: `1px solid ${PURPLE}33`,
              borderRadius: 12,
              padding: "18px 22px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: PURPLE,
                marginBottom: 8,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.1em",
              }}
            >
              EXECUTIVE SUMMARY
            </div>
            <p
              style={{
                fontSize: 14,
                color: "#fff",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {result.headline}
            </p>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {[
              {
                title: "KEY INSIGHTS",
                data: result.insights,
                color: TEAL,
                icon: "◈",
              },
              {
                title: "RISKS DETECTED",
                data: result.risks,
                color: RED,
                icon: "⚠",
              },
            ].map(({ title, data, color, icon }) => (
              <div
                key={title}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color,
                    marginBottom: 14,
                    fontFamily: "'DM Mono',monospace",
                    letterSpacing: "0.1em",
                  }}
                >
                  {icon} {title}
                </div>
                {(data || []).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 10,
                      paddingBottom: 10,
                      borderBottom:
                        i < data.length - 1
                          ? `1px solid rgba(255,255,255,0.04)`
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: color,
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                        lineHeight: 1.6,
                      }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: GOLD,
                marginBottom: 14,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.1em",
              }}
            >
              → RECOMMENDATIONS
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 12,
              }}
            >
              {(result.recommendations || []).map((r, i) => (
                <div
                  key={i}
                  style={{
                    background: GOLD + "08",
                    border: `1px solid ${GOLD}18`,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: GOLD,
                      marginBottom: 6,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    ACTION {i + 1}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#fff",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {r.action || r}
                  </div>
                  {r.detail && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.45)",
                        lineHeight: 1.5,
                      }}
                    >
                      {r.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {result.metrics && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, color: PURPLE, marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em" }}>
                ◆ {timePeriod.toUpperCase()} METRICS
                {result.memberName && <span style={{ color: GOLD, marginLeft: 8 }}>· {result.memberName}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label: `Tasks This ${timePeriod === "daily" ? "Day" : timePeriod === "weekly" ? "Week" : "Month"}`, val: result.metrics.tasksThisPeriod, color: PURPLE },
                  { label: "Completed This Period", val: result.metrics.completedThisPeriod, color: TEAL },
                  { label: "Total Tasks", val: result.metrics.totalTasks, color: GOLD },
                  { label: "Completion Rate", val: result.metrics.completionRate, color: TEAL },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: color + "10", border: `1px solid ${color}22`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color, marginBottom: 4 }}>{val}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace", lineHeight: 1.4 }}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          
          {result.spotlight && user.role === "admin" && (
            <div
              style={{
                background: `linear-gradient(135deg,${GOLD}10,${GOLD}05)`,
                border: `1px solid ${GOLD}33`,
                borderRadius: 12,
                padding: "18px 22px",
                display: "flex",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 28, color: GOLD }}>★</div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: GOLD,
                    marginBottom: 4,
                    fontFamily: "'DM Mono',monospace",
                    letterSpacing: "0.1em",
                  }}
                >
                  TEAM SPOTLIGHT
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 4,
                  }}
                >
                  {result.spotlight.name}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  {result.spotlight.reason}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── ISSUES ──────────────────────────────────────────────────────────────────
const Issues = ({ user }) => {
  const [tab, setTab] = useState("submit");
  const [category, setCategory] = useState("website");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [issues, setIssues] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState("");

  const isAdmin = user.role === "admin";

  const load = () => setIssues(store.get(KEYS.issues) || []);
  useEffect(load, []);

  const submit = () => {
    setErr(""); setSuccess("");
    if (!title.trim() || !body.trim()) { setErr("Please fill in both title and description."); return; }
    const all = store.get(KEYS.issues) || [];
    all.unshift({
      id: Date.now().toString(),
      category,
      title: title.trim(),
      body: body.trim(),
      submittedBy: user.email,
      submittedAt: new Date().toISOString(),
      status: "submitted",
    });
    store.set(KEYS.issues, all);
    addNotif(ADMIN_EMAIL, "alert", `New ${category} issue submitted by ${user.email}: "${title.trim()}"`);
    setTitle(""); setBody(""); setSuccess("Issue submitted successfully.");
    load();
  };

  const saveStatus = (id) => {
    const all = store.get(KEYS.issues) || [];
    const idx = all.findIndex(i => i.id === id);
    if (idx < 0) return;
    const issue = all[idx];
    all[idx].status = editStatus;
    store.set(KEYS.issues, all);
    addNotif(issue.submittedBy, "alert", `Your ${issue.category} issue "${issue.title}" status updated to: ${editStatus.replace("_", " ")}.`);
    setEditingId(null); setEditStatus("");
    load();
  };

  const statusColor = (s) => ({ submitted: "rgba(255,255,255,0.3)", seen: TEAL, reviewing: GOLD, worked_on: PURPLE }[s] || GOLD);
  const statusLabel = (s) => ({ submitted: "Submitted", seen: "Seen", reviewing: "Reviewing", worked_on: "Worked On" }[s] || s);
  const categoryColor = (c) => ({ website: TEAL, team: GOLD, collaboration: PURPLE, member: RED, project: "#7BA8C4" }[c] || GOLD);

  // What issues each role sees per tab
  const websiteIssues = issues.filter(i => i.category === "website");
  const myOtherIssues = issues.filter(i => i.category !== "website" && i.submittedBy === user.email);
  const adminOtherIssues = issues.filter(i => i.category !== "website");

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1, maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { id: "submit", label: "Submit Issue" },
          { id: "website", label: `Website Issues (${websiteIssues.length})` },
          ...(!isAdmin ? [{ id: "mine", label: `My Issues (${myOtherIssues.length})` }] : []),
          ...(isAdmin ? [{ id: "other", label: `Team/Collab/Member/Project (${adminOtherIssues.length})` }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${tab === t.id ? GOLD : BORDER}`, background: tab === t.id ? GOLD + "22" : "transparent", color: tab === t.id ? GOLD : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "submit" && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>SUBMIT A NEW ISSUE</div>
          {err && <div style={{ padding: "10px 14px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 8, color: RED, fontSize: 13, marginBottom: 14 }}>{err}</div>}
          {success && <div style={{ padding: "10px 14px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 8, color: TEAL, fontSize: 13, marginBottom: 14 }}>{success}</div>}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>CATEGORY</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ v: "website", label: "Website" }, { v: "team", label: "Team" }, { v: "collaboration", label: "Collaboration" }, { v: "member", label: "Member" }, { v: "project", label: "Project" }].map(({ v, label }) => (
                <button key={v} onClick={() => setCategory(v)} style={{ padding: "6px 16px", borderRadius: 20, border: `1px solid ${category === v ? categoryColor(v) : BORDER}`, background: category === v ? categoryColor(v) + "22" : "transparent", color: category === v ? categoryColor(v) : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>{label}</button>
              ))}
            </div>
          </div>
          <Inp label="Issue Title" value={title} onChange={setTitle} placeholder="Brief summary of the issue..." />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 7, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>DESCRIPTION</div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Describe the issue in detail..." style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical" }} />
          </div>
          {category !== "website" && (
            <div style={{ padding: "10px 14px", background: GOLD + "10", border: `1px solid ${GOLD}22`, borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
              ℹ️ This complaint is private — only you and the admin can see it.
            </div>
          )}
          <Btn onClick={submit}>Submit Issue</Btn>
        </div>
      )}

      {tab === "website" && (
        <div>
          <div style={{ padding: "10px 16px", background: TEAL + "10", border: `1px solid ${TEAL}22`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            🌐 Website issues are visible to all users.
          </div>
          {websiteIssues.length === 0 ? <EmptyState icon="⚑" title="No website issues yet" sub="Submit one using the form." /> : websiteIssues.map(issue => (
            <IssueCard key={issue.id} issue={issue} isAdmin={isAdmin} user={user} editingId={editingId} setEditingId={setEditingId} editStatus={editStatus} setEditStatus={setEditStatus} saveStatus={saveStatus} statusColor={statusColor} statusLabel={statusLabel} categoryColor={categoryColor} showStatusEditor={isAdmin} />
          ))}
        </div>
      )}

      {tab === "mine" && !isAdmin && (
        <div>
          {myOtherIssues.length === 0 ? <EmptyState icon="⚑" title="No complaints submitted" sub="Your team, collaboration, and member complaints appear here." /> : myOtherIssues.map(issue => (
            <IssueCard key={issue.id} issue={issue} isAdmin={false} user={user} editingId={editingId} setEditingId={setEditingId} editStatus={editStatus} setEditStatus={setEditStatus} saveStatus={saveStatus} statusColor={statusColor} statusLabel={statusLabel} categoryColor={categoryColor} showStatusEditor={false} />
          ))}
        </div>
      )}

      {tab === "other" && isAdmin && (
        <div>
          {adminOtherIssues.length === 0 ? <EmptyState icon="⚑" title="No team/collaboration/member/project issues" sub="All clear." /> : adminOtherIssues.map(issue => (
            <IssueCard key={issue.id} issue={issue} isAdmin={true} user={user} editingId={editingId} setEditingId={setEditingId} editStatus={editStatus} setEditStatus={setEditStatus} saveStatus={saveStatus} statusColor={statusColor} statusLabel={statusLabel} categoryColor={categoryColor} showStatusEditor={true} />
          ))}
        </div>
      )}
    </div>
  );
};

const IssueCard = ({ issue, isAdmin, user, editingId, setEditingId, editStatus, setEditStatus, saveStatus, statusColor, statusLabel, categoryColor, showStatusEditor }) => {
  const allUsers = store.get(KEYS.users) || {};
  const submitter = allUsers[issue.submittedBy] || { name: issue.submittedBy, color: GOLD };
  const isEditing = editingId === issue.id;
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${categoryColor(issue.category)}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Avatar name={submitter.name || issue.submittedBy} color={submitter.color || GOLD} size={30} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{issue.title}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
              {isAdmin || issue.submittedBy !== user.email ? (submitter.name || issue.submittedBy) + " · " : ""}{timeAgo(issue.submittedAt)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <Badge text={issue.category.charAt(0).toUpperCase() + issue.category.slice(1)} color={categoryColor(issue.category)} />
          <Badge text={statusLabel(issue.status)} color={statusColor(issue.status)} />
        </div>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: showStatusEditor ? 14 : 0 }}>{issue.body}</div>
      {showStatusEditor && (
        isEditing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ padding: "7px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 12, outline: "none", fontFamily: "'DM Mono',monospace" }}>
              <option value="submitted">Submitted</option>
              {issue.category === "website" && <option value="seen">Seen</option>}
              <option value="reviewing">Reviewing</option>
              <option value="worked_on">Worked On</option>
            </select>
            <Btn onClick={() => saveStatus(issue.id)} style={{ padding: "7px 16px", fontSize: 12, background: TEAL, color: BG }}>Save</Btn>
            <Btn variant="secondary" onClick={() => { setEditingId(null); setEditStatus(""); }} style={{ padding: "7px 12px", fontSize: 12 }}>Cancel</Btn>
          </div>
        ) : (
          <button onClick={() => { setEditingId(issue.id); setEditStatus(issue.status); }} style={{ marginTop: 12, background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", padding: "5px 14px", fontFamily: "'DM Mono',monospace" }}>
            Update Status
          </button>
        )
      )}
    </div>
  );
};

// ─── PERFORMANCE ──────────────────────────────────────────────────────────────
const Performance = ({ user }) => {
  const [period, setPeriod] = useState("month");
  const [selectedUser, setSelectedUser] = useState(user.email);
  const [editingHours, setEditingHours] = useState(false);
  const [hoursForm, setHoursForm] = useState({ type: "full-time", hoursRequired: 40 });
  const [hoursSaved, setHoursSaved] = useState(false);
  const [growthPeriod, setGrowthPeriod] = useState(null); // selected period label
const [growthMetrics, setGrowthMetrics] = useState([]);
const [showGrowthSection, setShowGrowthSection] = useState(false);
const [snapshotSaved, setSnapshotSaved] = useState(false);

  const allUsers = store.get(KEYS.users) || {};
  const projects = store.get(KEYS.projects) || [];
  const allTasks = projects.flatMap((p) => p.tasks || []);
  const weeklyReports = store.get(KEYS.weeklyReports) || [];
  const monthlyReports = store.get(KEYS.monthlyReports) || [];
  const presence = store.get(KEYS.presence) || {};
  const activity = store.get(KEYS.activity) || [];
  const workHoursData = store.get(KEYS.workHours) || {};

  const viewEmail = user.role === "admin" ? selectedUser : user.email;
  const u = allUsers[viewEmail] || { name: viewEmail, color: GOLD };
  const myTasks = allTasks.filter((t) => t.assignee === viewEmail);
  const done = myTasks.filter((t) => t.status === "Completed").length;
  const active = myTasks.filter((t) => t.status === "In Progress").length;
  const score = myTasks.length ? Math.round((done / myTasks.length) * 100) : 0;
  const myProjects = projects.filter((p) => (p.members || []).includes(viewEmail));
  const myWeekly = weeklyReports.filter((r) => r.email === viewEmail);
  const myMonthly = monthlyReports.filter((r) => r.email === viewEmail);

  const userWorkHours = workHoursData[viewEmail] || { type: "full-time", hoursRequired: 40 };

  // Estimate active hours from activity log
  const now = new Date();
  const periodMs = period === "month" ? 30 * 86400000 : period === "quarter" ? 90 * 86400000 : null;
  const cutoff = periodMs ? new Date(now.getTime() - periodMs) : null;

  const userActivity = activity.filter((a) => {
    if (a.userId !== viewEmail) return false;
    if (cutoff && new Date(a.time) < cutoff) return false;
    return true;
  });

  // Estimate hours: count unique hours from activity timestamps
  const presenceData = store.get(KEYS.presence) || {};
const userPresence = presenceData[viewEmail];
const sessionStartHour = userPresence?.sessionStart
  ? (() => {
      const d = new Date(userPresence.sessionStart);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    })()
  : null;

const activityHourSet = new Set(
  userActivity.map((a) => {
    const d = new Date(a.time);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
  })
);
if (sessionStartHour) activityHourSet.add(sessionStartHour);
const uniqueHours = activityHourSet.size;

  const presenceInfo = presence[viewEmail];
  const lastSeen = presenceInfo?.lastSeen ? new Date(presenceInfo.lastSeen) : null;
  const isOnline = presenceInfo?.online || false;

  const requiredHours = userWorkHours.hoursRequired || 40;
  const hoursPercent = Math.min(Math.round((uniqueHours / requiredHours) * 100), 100);
// Save this month's performance snapshot automatically
useEffect(() => {
  const now2 = new Date();
  const snapMonth = now2.getMonth();
  const snapYear = now2.getFullYear();
  const { overallInsight, excelling, improving, needsImprovement } = computeOverallInsight(score, uniqueHours, requiredHours);
  const snapshotData = {
    score,
    uniqueHours,
    hoursPercent,
    done,
    active,
    totalTasks: myTasks.length,
    overallInsight,
    excelling,
    improving,
    needsImprovement,
    userWorkHoursType: userWorkHours.type || "full-time",
    requiredHours,
  };
  savePerformanceSnapshot(viewEmail, snapMonth, snapYear, snapshotData);

  // Save growth metrics to persistent storage
  const metrics = generateGrowthMetrics(viewEmail);
  setGrowthMetrics(metrics);
  const allGrowth = store.get(KEYS.performanceGrowthMetrics) || {};
  allGrowth[viewEmail] = metrics;
  store.set(KEYS.performanceGrowthMetrics, allGrowth);
  setSnapshotSaved(true);
}, [viewEmail, score, uniqueHours, hoursPercent]);
  const openHoursEdit = () => {
    setHoursForm({ type: userWorkHours.type || "full-time", hoursRequired: userWorkHours.hoursRequired || 40 });
    setHoursSaved(false);
    setEditingHours(true);
  };

  const saveHours = () => {
    const all = store.get(KEYS.workHours) || {};
    all[viewEmail] = { type: hoursForm.type, hoursRequired: Number(hoursForm.hoursRequired) };
    store.set(KEYS.workHours, all);
    setEditingHours(false);
    setHoursSaved(true);
    addActivity(user.email, "updated work hours configuration for", viewEmail, null);
    addNotif(viewEmail, "task", `Your required working hours have been updated to ${hoursForm.hoursRequired}hrs/week (${hoursForm.type}).`);
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        {user.role === "admin" && (
          <select
            value={selectedUser}
            onChange={(e) => { setSelectedUser(e.target.value); setEditingHours(false); setHoursSaved(false); }}
            style={{ padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }}
          >
            {Object.entries(allUsers).map(([em, u]) => (
              <option key={em} value={em}>{u.name || em}</option>
            ))}
          </select>
        )}
        {["month", "quarter", "all"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${period === p ? GOLD : BORDER}`, background: period === p ? GOLD + "22" : "transparent", color: period === p ? GOLD : "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace", textTransform: "capitalize" }}
          >
            {p === "all" ? "All Time" : p === "quarter" ? "This Quarter" : "This Month"}
          </button>
        ))}
      </div>

      {/* Member header */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
        <Avatar name={u.name || viewEmail} color={u.color || GOLD} size={54} />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{u.name || viewEmail}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {u.team && <Badge text={u.team} color={TEAL} />}
            {u.title && <Badge text={u.title} color={PURPLE} />}
            <Badge text={userWorkHours.type || "full-time"} color={userWorkHours.type === "part-time" ? PURPLE : GOLD} />
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: u.color || GOLD, lineHeight: 1 }}>{score}%</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Overall Score</div>
        </div>
      </div>

      {/* ── HOURS CONFIG (admin only) ── */}
      {user.role === "admin" && (
        <div style={{ background: "rgba(200,169,110,0.05)", border: `1px solid ${GOLD}33`, borderRadius: 12, padding: "18px 22px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editingHours ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 4 }}>WORK HOURS CONFIGURATION</div>
              {!editingHours && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{userWorkHours.hoursRequired || 40} hrs/week</span>
                  <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 8 }}>({userWorkHours.type || "full-time"})</span>
                  {hoursSaved && <span style={{ color: TEAL, fontSize: 11, marginLeft: 10, fontFamily: "'DM Mono',monospace" }}>✓ Saved</span>}
                </div>
              )}
            </div>
            {!editingHours && (
              <button
                onClick={openHoursEdit}
                style={{ padding: "6px 16px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 8, color: GOLD, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}
              >
                EDIT
              </button>
            )}
          </div>
          {editingHours && (
            <div>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 6, letterSpacing: "0.08em" }}>EMPLOYMENT TYPE</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["full-time", "part-time"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setHoursForm((f) => ({ ...f, type: t, hoursRequired: t === "full-time" ? 40 : 20 }))}
                        style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${hoursForm.type === t ? GOLD : BORDER}`, background: hoursForm.type === t ? GOLD + "22" : "transparent", color: hoursForm.type === t ? GOLD : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace", textTransform: "capitalize" }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 6, letterSpacing: "0.08em" }}>HOURS REQUIRED PER WEEK</div>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={hoursForm.hoursRequired}
                    onChange={(e) => setHoursForm((f) => ({ ...f, hoursRequired: e.target.value }))}
                    style={{ padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", width: 100 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={saveHours} style={{ padding: "8px 20px", fontSize: 12, background: TEAL, color: BG }}>Save</Btn>
                  <Btn variant="secondary" onClick={() => setEditingHours(false)} style={{ padding: "8px 14px", fontSize: 12 }}>Cancel</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PERFORMANCE INSIGHTS (hours + tasks) ── */}
      <div style={{ background: `linear-gradient(135deg,${PURPLE}10,${TEAL}06)`, border: `1px solid ${PURPLE}33`, borderRadius: 14, padding: "20px 24px", marginBottom: 22 }}>
        <div style={{ fontSize: 10, color: PURPLE, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 16 }}>PERFORMANCE INSIGHTS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
          {/* Hours insight */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>HOURS ACTIVE ON PLATFORM</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: uniqueHours >= requiredHours ? TEAL : uniqueHours >= requiredHours * 0.6 ? GOLD : RED, lineHeight: 1 }}>
                  {uniqueHours}
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 400, marginLeft: 4 }}>/ {requiredHours} hrs</span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                  {period === "all" ? "all time" : period === "month" ? "this month" : "this quarter"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: uniqueHours >= requiredHours ? TEAL : uniqueHours >= requiredHours * 0.6 ? GOLD : RED }}>{hoursPercent}%</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace" }}>OF REQUIRED</div>
              </div>
            </div>
            <ProgressBar pct={hoursPercent} color={uniqueHours >= requiredHours ? TEAL : uniqueHours >= requiredHours * 0.6 ? GOLD : RED} height={5} />
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              {uniqueHours >= requiredHours
                ? "✓ Required hours met or exceeded."
                : uniqueHours >= requiredHours * 0.6
                ? `⚠ ${requiredHours - uniqueHours} more active hours needed.`
                : `✗ Significantly below the required ${requiredHours}hrs threshold.`}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace" }}>
              {isOnline ? "● Online now" : lastSeen ? `Last seen ${timeAgo(lastSeen.toISOString())}` : "No presence data"}
              {" · "}
              {userWorkHours.type || "full-time"} · {requiredHours}hrs/wk required
            </div>
          </div>

          {/* Task insight */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>TASK PERFORMANCE INSIGHT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Total Assigned", val: myTasks.length, color: GOLD },
                { label: "Completed", val: done, color: TEAL },
                { label: "Active / In Progress", val: active, color: PURPLE },
                { label: "Not Started", val: myTasks.filter(t => t.status === "Not Started").length, color: "rgba(255,255,255,0.3)" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 8 }}>
                <ProgressBar pct={score} color={score >= 70 ? TEAL : score >= 40 ? GOLD : RED} height={5} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>COMPLETION RATE</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: score >= 70 ? TEAL : score >= 40 ? GOLD : RED }}>{score}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Combined insight summary */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 6, letterSpacing: "0.08em" }}>OVERALL INSIGHT</div>
          {(() => {
  const { overallInsight, excelling, improving, needsImprovement } = computeOverallInsight(score, uniqueHours, requiredHours);
  return (
    <div>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0, marginBottom: 10 }}>
        {overallInsight}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {excelling.map((e) => (
          <span key={e} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: TEAL + "22", border: `1px solid ${TEAL}44`, color: TEAL, fontFamily: "'DM Mono',monospace" }}>✦ {e}</span>
        ))}
        {improving.map((e) => (
          <span key={e} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: GOLD + "22", border: `1px solid ${GOLD}44`, color: GOLD, fontFamily: "'DM Mono',monospace" }}>↑ {e}</span>
        ))}
        {needsImprovement.map((e) => (
          <span key={e} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: RED + "22", border: `1px solid ${RED}44`, color: RED, fontFamily: "'DM Mono',monospace" }}>⚠ {e}</span>
        ))}
      </div>
    </div>
  );
})()}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Tasks Total", val: myTasks.length, c: GOLD },
          { label: "Completed", val: done, c: TEAL },
          { label: "Active", val: active, c: PURPLE },
          { label: "Projects", val: myProjects.length, c: RED },
        ].map(({ label, val, c }) => (
          <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: `2px solid ${c}`, borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{val}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>PROJECT INVOLVEMENT</div>
          {myProjects.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No projects</div>
          ) : (
            myProjects.map((p) => {
              const myDone = (p.tasks || []).filter((t) => t.assignee === viewEmail && t.status === "Completed").length;
              const myTotal = (p.tasks || []).filter((t) => t.assignee === viewEmail).length;
              const contrib = myTotal ? Math.round((myDone / myTotal) * 100) : 0;
              return (
                <div key={p.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: p.color || GOLD, fontWeight: 700 }}>{contrib}%</span>
                  </div>
                  <ProgressBar pct={contrib} color={p.color || GOLD} />
                </div>
              );
            })
          )}
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>REPORT HISTORY</div>
          {myWeekly.length === 0 && myMonthly.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No reports submitted</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: GOLD, marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>WEEKLY ({myWeekly.length} reports)</div>
              {myWeekly.slice(-3).reverse().map((r) => (
                <div key={r.id} style={{ padding: "7px 0", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  W{r.week} {r.year} · {timeAgo(r.submittedAt)}
                </div>
              ))}
              <div style={{ fontSize: 11, color: TEAL, margin: "12px 0 8px", fontFamily: "'DM Mono',monospace" }}>MONTHLY ({myMonthly.length} reports)</div>
              {myMonthly.slice(-3).reverse().map((r) => (
                <div key={r.id} style={{ padding: "7px 0", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  {MONTHS[r.month]} {r.year} · {timeAgo(r.submittedAt)}
                </div>
              ))}
            </>
          )}
        </div>
        {/* ── GROWTH METRICS SECTION ── */}
{growthMetrics.length > 0 && (
  <div style={{ marginTop: 24 }}>
    <button
      onClick={() => setShowGrowthSection(!showGrowthSection)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: `linear-gradient(135deg,${TEAL}12,${PURPLE}06)`,
        border: `1px solid ${TEAL}44`,
        borderRadius: 12,
        padding: "14px 20px",
        cursor: "pointer",
        width: "100%",
        marginBottom: showGrowthSection ? 16 : 0,
      }}
    >
      <span style={{ fontSize: 16, color: TEAL }}>◑</span>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Performance Growth Metrics</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>
          {growthMetrics.length} period{growthMetrics.length !== 1 ? "s" : ""} tracked · click to {showGrowthSection ? "collapse" : "expand"}
        </div>
      </div>
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{showGrowthSection ? "▲" : "▼"}</span>
    </button>

    {showGrowthSection && (
      <div style={{ animation: "fadeIn 0.2s ease" }}>
        {/* Period selector tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {growthMetrics.map((gm) => (
            <button
              key={gm.periodLabel}
              onClick={() => setGrowthPeriod(growthPeriod === gm.periodLabel ? null : gm.periodLabel)}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                border: `1px solid ${growthPeriod === gm.periodLabel ? TEAL : BORDER}`,
                background: growthPeriod === gm.periodLabel ? TEAL + "22" : "transparent",
                color: growthPeriod === gm.periodLabel ? TEAL : "rgba(255,255,255,0.4)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {gm.periodLabel}
              <span style={{ fontSize: 9, marginLeft: 6, opacity: 0.6 }}>({gm.monthsCovered}mo)</span>
            </button>
          ))}
        </div>

        {growthPeriod && (() => {
          const gm = growthMetrics.find((g) => g.periodLabel === growthPeriod);
          if (!gm) return null;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.2s ease" }}>
              {/* Period header */}
              <div style={{ background: `linear-gradient(135deg,${TEAL}12,${PURPLE}08)`, border: `1px solid ${TEAL}33`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 4 }}>{gm.periodLabel.toUpperCase()} GROWTH OVERVIEW</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    {MONTHS[gm.startMonth]} {gm.startYear} → {MONTHS[gm.endMonth]} {gm.endYear} · {gm.monthsCovered} months of data
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: gm.avgScore >= 70 ? TEAL : gm.avgScore >= 40 ? GOLD : RED, lineHeight: 1 }}>{gm.avgScore}%</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>AVG SCORE</div>
                </div>
              </div>

              {/* Metric cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label: "Avg Score", val: `${gm.avgScore}%`, color: gm.avgScore >= 70 ? TEAL : gm.avgScore >= 40 ? GOLD : RED },
                  { label: "Avg Hours %", val: `${gm.avgHoursPercent}%`, color: gm.avgHoursPercent >= 80 ? TEAL : gm.avgHoursPercent >= 50 ? GOLD : RED },
                  { label: "Tasks Completed", val: gm.totalCompleted, color: GOLD },
                  { label: "Months Tracked", val: gm.monthsCovered, color: PURPLE },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: color + "10", border: `1px solid ${color}22`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color, marginBottom: 3 }}>{val}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", lineHeight: 1.4 }}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {/* Excelling / Improving / Needs Improvement */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ background: TEAL + "08", border: `1px solid ${TEAL}33`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>✦ EXCELLED IN</div>
                  {gm.excelling.length === 0
                    ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Nothing flagged yet</div>
                    : gm.excelling.map((e) => (
                      <div key={e} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: TEAL, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{e}</span>
                      </div>
                    ))}
                </div>
                <div style={{ background: GOLD + "08", border: `1px solid ${GOLD}33`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>↑ CURRENTLY IMPROVING</div>
                  {gm.improving.length === 0
                    ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Nothing flagged yet</div>
                    : gm.improving.map((e) => (
                      <div key={e} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{e}</span>
                      </div>
                    ))}
                </div>
                <div style={{ background: RED + "08", border: `1px solid ${RED}33`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, color: RED, fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>⚠ NEEDS IMPROVEMENT</div>
                  {gm.needsImprovement.length === 0
                    ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Nothing flagged yet</div>
                    : gm.needsImprovement.map((e) => (
                      <div key={e} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: RED, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{e}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Month-by-month breakdown */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 14 }}>MONTH-BY-MONTH SNAPSHOT</div>
                {(store.get(KEYS.performanceSnapshots) || [])
                  .filter((s) => {
                    if (s.email !== viewEmail) return false;
                    const cutoffDate = new Date(gm.endYear, gm.endMonth - gm.months + 1, 1);
                    if (s.year > cutoffDate.getFullYear()) return true;
                    if (s.year === cutoffDate.getFullYear() && s.month >= cutoffDate.getMonth()) return true;
                    return false;
                  })
                  .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return a.month - b.month;
                  })
                  .map((snap) => (
                    <div key={snap.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace", width: 60, flexShrink: 0 }}>
                        {MONTHS[snap.month]} {snap.year}
                      </span>
                      <div style={{ flex: 1 }}>
                        <ProgressBar pct={snap.snapshot.score || 0} color={snap.snapshot.score >= 70 ? TEAL : snap.snapshot.score >= 40 ? GOLD : RED} height={4} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: snap.snapshot.score >= 70 ? TEAL : snap.snapshot.score >= 40 ? GOLD : RED, width: 38, textAlign: "right", fontFamily: "'DM Mono',monospace" }}>
                        {snap.snapshot.score}%
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", width: 50, textAlign: "right", fontFamily: "'DM Mono',monospace" }}>
                        {snap.snapshot.uniqueHours}hr
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })()}

        {!growthPeriod && (
          <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
            Select a period above to view detailed growth metrics.
          </div>
        )}
      </div>
    )}
  </div>
)}

{/* ── MONTHLY SNAPSHOT HISTORY (admin sees all users; user sees their own) ── */}
{(() => {
  const allSnapshots = (store.get(KEYS.performanceSnapshots) || [])
    .filter((s) => s.email === viewEmail)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  if (allSnapshots.length === 0) return null;
  return (
    <div style={{ marginTop: 20, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 14 }}>
        SAVED MONTHLY PERFORMANCE INSIGHTS
      </div>
      {allSnapshots.map((snap) => (
        <div key={snap.id} style={{ padding: "12px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{MONTHS[snap.month]} {snap.year}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: snap.snapshot.score >= 70 ? TEAL : snap.snapshot.score >= 40 ? GOLD : RED }}>{snap.snapshot.score}%</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>· {snap.snapshot.uniqueHours}hr active</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: "0 0 6px" }}>{snap.snapshot.overallInsight}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(snap.snapshot.excelling || []).map((e) => (
              <span key={e} style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, background: TEAL + "22", border: `1px solid ${TEAL}33`, color: TEAL, fontFamily: "'DM Mono',monospace" }}>✦ {e}</span>
            ))}
            {(snap.snapshot.improving || []).map((e) => (
              <span key={e} style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, background: GOLD + "22", border: `1px solid ${GOLD}33`, color: GOLD, fontFamily: "'DM Mono',monospace" }}>↑ {e}</span>
            ))}
            {(snap.snapshot.needsImprovement || []).map((e) => (
              <span key={e} style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, background: RED + "22", border: `1px solid ${RED}33`, color: RED, fontFamily: "'DM Mono',monospace" }}>⚠ {e}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
})()}
      </div>
    </div>
  );
};

// ─── PROFILE ─────────────────────────────────────────────────────────────────
const Profile = ({ user, onUserUpdate }) => {
  const [profile, setProfile] = useState({});
  const [pending, setPending] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  const load = () => {
    const users = store.get(KEYS.users) || {};
    const me = users[user.email] || {};
    setProfile(me);
    setForm({
      name: me.name || "",
      team: me.team || "",
      dept: me.dept || "",
      title: me.title || "",
      status: me.status || "",
    });
    const reqs = store.get(KEYS.profileRequests) || [];
    const myPending = reqs.filter(
      (r) => r.email === user.email && r.status === "pending"
    );
    setPending(myPending.length > 0 ? myPending : null);
  };

  useEffect(load, [user.email]);

  const submitChanges = () => {
    const reqs = store.get(KEYS.profileRequests) || [];
    const changes = Object.entries(form).filter(
      ([k, v]) => v !== (profile[k] || "")
    );
    if (changes.length === 0) {
      setEditMode(false);
      return;
    }
    changes.forEach(([field, newVal]) => {
      reqs.push({
        id: Date.now().toString() + field,
        email: user.email,
        field,
        oldVal: profile[field] || "",
        newVal,
        requestedAt: new Date().toISOString(),
        status: "pending",
      });
    });
    store.set(KEYS.profileRequests, reqs);
    addNotif(
      ADMIN_EMAIL,
      "profileChange",
      `${user.email} requested profile changes`
    );
    setEditMode(false);
    load();
  };

  const COLORS_LIST = COLORS;

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1, maxWidth: 640 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 28,
        }}
      >
        
        <Avatar
          name={profile.name || user.email}
          color={profile.color || GOLD}
          size={64}
        />
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 6,
            }}
          >
            {profile.name || user.email}
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge
              text={user.role === "admin" ? "Admin" : "Member"}
              color={user.role === "admin" ? GOLD : TEAL}
            />
            {profile.team && <Badge text={profile.team} color={PURPLE} />}
            {profile.title && (
              <Badge text={profile.title} color="rgba(255,255,255,0.3)" />
            )}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          {!editMode ? (
            <Btn onClick={() => setEditMode(true)}>Edit Profile</Btn>
          ) : (
            <Btn variant="secondary" onClick={() => setEditMode(false)}>
              Cancel
            </Btn>
          )}
        </div>
      </div>

      {pending && pending.length > 0 && (
        <div
          style={{
            padding: "14px 18px",
            background: GOLD + "12",
            border: `1px solid ${GOLD}33`,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: GOLD,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            ⏳ Awaiting Admin Approval
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {pending.map((r) => `${r.field}: "${r.newVal}"`).join(" · ")}
          </div>
        </div>
      )}

      {!editMode ? (
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 22,
          }}
        >
          {[
            ["Name", profile.name || "—"],
            ["Email", user.email],
            ["Department", profile.dept || "—"],
            ["Team", profile.team || "—"],
            ["Title / Role", profile.title || "—"],
            ["Status", profile.status || "—"],
            [
              "Member Since",
              profile.registeredAt
                ? new Date(profile.registeredAt).toLocaleDateString()
                : "—",
            ],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "11px 0",
                borderBottom: `1px solid rgba(255,255,255,0.04)`,
              }}
            >
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                {k}
              </span>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>
                {v}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 22,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            Changes require admin approval before taking effect.
          </div>
          <Inp
            label="Full Name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Your name"
          />
          <Inp
            label="Department"
            value={form.dept}
            onChange={(v) => setForm((f) => ({ ...f, dept: v }))}
            placeholder="e.g. Engineering"
          />
          <Inp
            label="Team"
            value={form.team}
            onChange={(v) => setForm((f) => ({ ...f, team: v }))}
            placeholder="e.g. Core, Design"
          />
          <Inp
            label="Title"
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
            placeholder="e.g. Writer, Developer"
          />
          <Inp
            label="Status"
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            placeholder="e.g. Lead, Senior, Junior"
          />
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                marginBottom: 10,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.08em",
              }}
            >
              AVATAR COLOR
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS_LIST.map((c) => (
                <div
                  key={c}
                  onClick={() => {
                    const users = store.get(KEYS.users) || {};
                    if (users[user.email]) {
                      users[user.email].color = c;
                      store.set(KEYS.users, users);
                      onUserUpdate({ ...user, color: c });
                      load();
                    }
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: c,
                    cursor: "pointer",
                    border:
                      (profile.color || GOLD) === c
                        ? "3px solid #fff"
                        : "3px solid transparent",
                  }}
                />
              ))}
            </div>
          </div>
          <Btn onClick={submitChanges}>Submit for Approval</Btn>
        </div>
      )}
      {/* ── SIGNED AGREEMENT SECTION ── */}
      {(() => {
        const allSigned = store.get(KEYS.confidentialitySigned) || {};
        const mySignature = allSigned[user.email];
        if (!mySignature) return null;
        const agreementData = store.get(KEYS.confidentialityAgreement);
        const blocks = agreementData?.content || DEFAULT_CONFIDENTIALITY_BLOCKS;

        const parseInlineAgr = (text) => {
          const parts = [];
          const regex = /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]|\[hl=([^\]]+)\]([\s\S]*?)\[\/hl\]|\[size=(\d+)\]([\s\S]*?)\[\/size\]|\*\*([\s\S]*?)\*\*|_([\s\S]*?)_|__([\s\S]*?)__/g;
          let last = 0; let match; let key = 0;
          while ((match = regex.exec(text)) !== null) {
            if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
            if (match[1] !== undefined) parts.push(<span key={key++} style={{ color: match[1] }}>{parseInlineAgr(match[2])}</span>);
            else if (match[3] !== undefined) parts.push(<span key={key++} style={{ background: match[3], padding: "1px 4px", borderRadius: 3 }}>{parseInlineAgr(match[4])}</span>);
            else if (match[5] !== undefined) parts.push(<span key={key++} style={{ fontSize: parseInt(match[5]) }}>{parseInlineAgr(match[6])}</span>);
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
            if (line.startsWith("# ")) return <div key={li} style={{ fontSize: 18, fontWeight: 900, color: GOLD, letterSpacing: "-0.02em", marginBottom: 8, marginTop: 12 }}>{parseInlineAgr(line.slice(2))}</div>;
            if (line.startsWith("## ")) return <div key={li} style={{ fontSize: 14, fontWeight: 700, color: TEAL, marginBottom: 6, marginTop: 10 }}>{parseInlineAgr(line.slice(3))}</div>;
            if (line.startsWith("### ")) return <div key={li} style={{ fontSize: 12, fontWeight: 700, color: PURPLE, marginBottom: 5, marginTop: 8 }}>{parseInlineAgr(line.slice(4))}</div>;
            if (line.startsWith("^") && line.endsWith("^")) return <div key={li} style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 4, marginTop: 6 }}>{parseInlineAgr(line.slice(1, -1))}</div>;
            if (line.trim() === "") return <div key={li} style={{ height: 6 }} />;
            return <p key={li} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginBottom: 6 }}>{parseInlineAgr(line)}</p>;
          });
        };

        const [showAgreementText, setShowAgreementText] = useState(false);

        return (
          <div style={{ background: TEAL + "08", border: `1px solid ${TEAL}33`, borderRadius: 14, padding: "20px 22px", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 22 }}>✍️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 3 }}>CONFIDENTIALITY & BUILD AGREEMENT</div>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Signed & Agreed</div>
              </div>
              <Badge text="✓ Signed" color={TEAL} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                ["Signed Name", mySignature.fullName],
                ["Date Signed", mySignature.signDate || new Date(mySignature.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
                ["Timestamp", timeAgo(mySignature.signedAt)],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 4 }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAgreementText(!showAgreementText)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: `1px solid ${TEAL}44`, borderRadius: 8, color: TEAL, fontSize: 11, cursor: "pointer", padding: "6px 14px", fontFamily: "'DM Mono',monospace" }}
            >
              {showAgreementText ? "▲ Hide Agreement Text" : "▼ View Full Agreement Text"}
            </button>

            {showAgreementText && (
              <div style={{ marginTop: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 22px", maxHeight: 400, overflowY: "auto", animation: "fadeIn 0.2s ease" }}>
                {blocks.map((block, bi) =>
                  block.type === "text" ? (
                    <div key={bi} style={{ marginBottom: 8 }}>{renderAgrText(block.content)}</div>
                  ) : (
                    <div key={bi} style={{ overflowX: "auto", marginBottom: 16 }}>
                      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
                        <tbody>
                          {block.rows.map((row, ri) => (
                            <tr key={ri} style={{ background: ri === 0 ? "rgba(200,169,110,0.08)" : ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                              {row.map((cell, ci) => (
                                <td key={ci} style={{ border: `1px solid ${BORDER}`, padding: "7px 10px", color: ri === 0 ? GOLD : "rgba(255,255,255,0.65)", fontWeight: ri === 0 ? 600 : 400 }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
                <div style={{ marginTop: 16, padding: "14px 16px", background: TEAL + "10", border: `1px solid ${TEAL}33`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 8 }}>YOUR DIGITAL SIGNATURE</div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>FULL NAME</div>
                      <div style={{ fontSize: 13, color: "#fff", fontStyle: "italic", fontWeight: 600 }}>{mySignature.fullName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>DATE</div>
                      <div style={{ fontSize: 13, color: "#fff" }}>{mySignature.signDate || new Date(mySignature.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};


const LaunchConfirmButton = ({ onLaunch }) => {
  const [confirm, setConfirm] = useState(false);
  return !confirm ? (
    <Btn onClick={() => setConfirm(true)} style={{ padding: "13px 32px" }}>
      LAUNCH PLATFORM →
    </Btn>
  ) : (
    <div
      style={{
        background: "rgba(200,169,110,0.08)",
        border: `1px solid ${GOLD}44`,
        borderRadius: 12,
        padding: 24,
      }}
    >
      <p
        style={{
          color: "#fff",
          marginBottom: 20,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        Are you absolutely sure? All pre-launch data will be wiped and the clock
        starts now.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Btn onClick={onLaunch} style={{ padding: "11px 24px" }}>
          CONFIRM LAUNCH
        </Btn>
        <Btn variant="secondary" onClick={() => setConfirm(false)}>
          Cancel
        </Btn>
      </div>
    </div>
  );
};

// ─── MEETINGS ────────────────────────────────────────────────────────────────
const Meetings = ({ user }) => {
  const [meetings, setMeetings] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showSummary, setShowSummary] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "",
    gmeetLink: "", fileLinks: "", hostEmail: "", collaborators: [],
  });
  const allUsers = store.get(KEYS.users) || {};
  const now = new Date();
  const [showDeleteRequest, setShowDeleteRequest] = useState(null); // meeting object
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteReqErr, setDeleteReqErr] = useState("");

  const submitDeleteRequest = (meeting) => {
    if (!deleteReason.trim()) {
      setDeleteReqErr("Please provide a reason for deletion.");
      return;
    }
    const reqs = store.get(KEYS.meetingDeleteRequests) || [];
    const existing = reqs.find((r) => r.meetingId === meeting.id && r.status === "pending");
    if (existing) {
      setDeleteReqErr("A deletion request for this meeting is already pending.");
      return;
    }
    const req = {
      id: Date.now().toString(),
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      requestedBy: user.email,
      reason: deleteReason.trim(),
      requestedAt: new Date().toISOString(),
      status: "pending",
    };
    reqs.push(req);
    store.set(KEYS.meetingDeleteRequests, reqs);
    const mHist = store.get(KEYS.meetingHistory) || [];
    mHist.unshift({ id: Date.now().toString(), meetingTitle: meeting.title, action: "delete_requested", by: user.email, reason: deleteReason.trim(), at: new Date().toISOString() });
    store.set(KEYS.meetingHistory, mHist);
    addNotif(ADMIN_EMAIL, "alert", `${user.email} requested deletion of meeting: "${meeting.title}"`);
    setDeleteReason("");
    setDeleteReqErr("");
    setShowDeleteRequest(null);
    alert("Deletion request submitted to admin.");
  };

  const load = () => {
    const ms = store.get(KEYS.meetings) || [];
    ms.sort((a, b) => new Date(a.date + "T" + a.time) - new Date(b.date + "T" + b.time));
    setMeetings(ms);
  };

  useEffect(() => {
    load();
    // Check for meetings whose time has passed and the user is host and no summary yet
  }, []);

  const toggleCollaborator = (em) =>
    setForm((f) => ({
      ...f,
      collaborators: f.collaborators.includes(em)
        ? f.collaborators.filter((x) => x !== em)
        : [...f.collaborators, em],
    }));

  const createMeeting = () => {
    if (!form.title.trim() || !form.date || !form.time || !form.gmeetLink.trim()) return;
    const host = form.hostEmail || user.email;
    const meeting = {
      id: Date.now().toString(),
      title: form.title,
      description: form.description,
      date: form.date,
      time: form.time,
      gmeetLink: form.gmeetLink,
      fileLinks: form.fileLinks,
      hostEmail: host,
      scheduledBy: user.email,
      collaborators: [...new Set([...form.collaborators, host, user.email])],
      createdAt: new Date().toISOString(),
      summary: null,
      summaryAt: null,
    };
    const ms = store.get(KEYS.meetings) || [];
    ms.push(meeting);
    store.set(KEYS.meetings, ms);
    addActivity(user.email, "scheduled a meeting:", form.title, null);
    const mHist = store.get(KEYS.meetingHistory) || [];
    mHist.unshift({ id: Date.now().toString(), meetingTitle: form.title, action: "created", by: user.email, at: new Date().toISOString() });
    store.set(KEYS.meetingHistory, mHist);
    [...new Set([...form.collaborators, host])].forEach((em) => {
      if (em !== user.email)
        addNotif(em, "task", `You've been invited to a meeting: "${form.title}" on ${form.date} at ${form.time}`);
    });
    setForm({ title: "", description: "", date: "", time: "", gmeetLink: "", fileLinks: "", hostEmail: "", collaborators: [] });
    setShowCreate(false);
    load();
  };

  const submitSummary = (meetingId) => {
    if (!summaryText.trim()) return;
    const ms = store.get(KEYS.meetings) || [];
    const idx = ms.findIndex((m) => m.id === meetingId);
    if (idx >= 0) {
      ms[idx].summary = summaryText.trim();
      ms[idx].summaryAt = new Date().toISOString();
    }
    store.set(KEYS.meetings, ms);
    addActivity(user.email, "added meeting summary for:", ms[idx]?.title || meetingId, null);
    setSummaryText("");
    setShowSummary(null);
    load();
  };

  const isPast = (m) => new Date(m.date + "T" + m.time) < now;
  const needsSummary = (m) => isPast(m) && m.hostEmail === user.email && !m.summary;

  const upcomingMeetings = meetings.filter((m) => !isPast(m));
  const pastMeetings = meetings.filter((m) => isPast(m));

  if (selected) {
    const m = selected;
    const host = allUsers[m.hostEmail] || { name: m.hostEmail, color: GOLD };
    const scheduler = allUsers[m.scheduledBy] || { name: m.scheduledBy, color: TEAL };
    return (
      <div style={{ padding: 28, overflowY: "auto", flex: 1, maxWidth: 720 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 13 }}>
            ← Meetings
          </button>
          {(m.hostEmail === user.email || m.scheduledBy === user.email) && (() => {
            const reqs = store.get(KEYS.meetingDeleteRequests) || [];
            const pending = reqs.find((r) => r.meetingId === m.id && r.status === "pending");
            return pending ? (
              <div style={{ padding: "6px 14px", background: GOLD + "15", border: `1px solid ${GOLD}44`, borderRadius: 8, fontSize: 12, color: GOLD, fontFamily: "'DM Mono',monospace" }}>
                ⏳ Deletion request pending
              </div>
            ) : (
              <Btn variant="danger" onClick={() => { setShowDeleteRequest(m); setDeleteReason(""); setDeleteReqErr(""); }} style={{ padding: "6px 14px", fontSize: 11 }}>
                Request Deletion
              </Btn>
            );
          })()}
        </div>

        {showDeleteRequest && showDeleteRequest.id === m.id && (
          <div style={{ padding: "18px 20px", background: RED + "10", border: `1px solid ${RED}33`, borderRadius: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: RED, marginBottom: 10 }}>Request Meeting Deletion</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
              Your request will be sent to the admin for approval. Please state your reason below.
            </div>
            {deleteReqErr && (
              <div style={{ padding: "8px 12px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 6, color: RED, fontSize: 12, marginBottom: 10 }}>
                {deleteReqErr}
              </div>
            )}
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder="State your reason for requesting deletion..."
              style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="danger" onClick={() => submitDeleteRequest(m)} style={{ fontSize: 12, padding: "8px 18px" }}>Submit Request</Btn>
              <Btn variant="secondary" onClick={() => { setShowDeleteRequest(null); setDeleteReason(""); setDeleteReqErr(""); }} style={{ fontSize: 12, padding: "8px 14px" }}>Cancel</Btn>
            </div>
          </div>
        )}

        {needsSummary(m) && (
          <div style={{ padding: "14px 18px", background: GOLD + "15", border: `1px solid ${GOLD}44`, borderRadius: 10, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 6 }}>📝 Meeting has ended — please add a summary</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>As host, summarize what was discussed.</div>
            {showSummary === m.id ? (
              <>
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  rows={4}
                  placeholder="What was discussed? Key decisions, action items, outcomes..."
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical", marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={() => submitSummary(m.id)} style={{ fontSize: 12, padding: "8px 18px" }}>Submit Summary</Btn>
                  <Btn variant="secondary" onClick={() => setShowSummary(null)} style={{ fontSize: 12, padding: "8px 14px" }}>Cancel</Btn>
                </div>
              </>
            ) : (
              <Btn onClick={() => setShowSummary(m.id)} style={{ fontSize: 12, padding: "8px 18px" }}>Add Meeting Summary</Btn>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{m.title}</h2>
              <Badge text={isPast(m) ? "Past" : "Upcoming"} color={isPast(m) ? "rgba(255,255,255,0.25)" : TEAL} />
            </div>
            {m.description && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, maxWidth: 500 }}>{m.description}</p>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            ["Date", m.date],
            ["Time", m.time],
            ["Host", host.name || m.hostEmail],
            ["Scheduled by", scheduler.name || m.scheduledBy],
          ].map(([k, v]) => (
            <div key={k} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 5, letterSpacing: "0.08em" }}>{k.toUpperCase()}</div>
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background: CARD, border: `1px solid ${GOLD}44`, borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 4, letterSpacing: "0.08em" }}>GOOGLE MEET LINK</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", wordBreak: "break-all" }}>{m.gmeetLink}</div>
          </div>
          <a href={m.gmeetLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Btn style={{ fontSize: 12, padding: "8px 18px", background: TEAL, color: BG }}>Join Meeting →</Btn>
          </a>
        </div>

        {m.fileLinks && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 8, letterSpacing: "0.08em" }}>FILE LINKS</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, wordBreak: "break-all" }}>{m.fileLinks}</div>
          </div>
        )}

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 12, letterSpacing: "0.08em" }}>COLLABORATORS ({(m.collaborators || []).length})</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(m.collaborators || []).map((em) => {
              const u = allUsers[em] || { name: em, color: GOLD };
              return (
                <div key={em} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 20, border: `1px solid ${BORDER}` }}>
                  <Avatar name={u.name || em} color={u.color || GOLD} size={22} />
                  <span style={{ fontSize: 12, color: "#fff" }}>{u.name || em}</span>
                  {em === m.hostEmail && <Badge text="Host" color={GOLD} />}
                </div>
              );
            })}
          </div>
        </div>

        {m.summary && (
          <div style={{ background: PURPLE + "12", border: `1px solid ${PURPLE}33`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, color: PURPLE, fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>📋 MEETING SUMMARY · {timeAgo(m.summaryAt)}</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>{m.summary}</p>
          </div>
        )}

        {isPast(m) && !m.summary && !needsSummary(m) && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>No meeting summary has been added yet.</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      {showCreate && (
        <Modal title="Schedule a Meeting" onClose={() => setShowCreate(false)} width={560}>
          <Inp label="Meeting Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Q2 Strategy Review" />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 7, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>DESCRIPTION</div>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="What is this meeting about?" style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Inp label="Date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} type="date" />
            <Inp label="Time" value={form.time} onChange={(v) => setForm((f) => ({ ...f, time: v }))} type="time" />
          </div>
          <Inp label="Google Meet Link" value={form.gmeetLink} onChange={(v) => setForm((f) => ({ ...f, gmeetLink: v }))} placeholder="https://meet.google.com/xxx-xxxx-xxx" />
          <Inp label="File Links (optional)" value={form.fileLinks} onChange={(v) => setForm((f) => ({ ...f, fileLinks: v }))} placeholder="Google Drive, Notion, etc. links..." />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 7, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>APPOINT HOST (leave blank to be the host yourself)</div>
            <select value={form.hostEmail} onChange={(e) => setForm((f) => ({ ...f, hostEmail: e.target.value }))} style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13 }}>
              <option value="">I am the host</option>
              {Object.entries(allUsers).filter(([em]) => em !== user.email).map(([em, u]) => (
                <option key={em} value={em}>{u.name || em}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>ADD COLLABORATORS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
              {Object.entries(allUsers).filter(([em]) => em !== user.email).map(([em, u]) => (
                <div key={em} onClick={() => toggleCollaborator(em)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: form.collaborators.includes(em) ? GOLD + "18" : "rgba(255,255,255,0.03)", border: `1px solid ${form.collaborators.includes(em) ? GOLD + "44" : BORDER}`, cursor: "pointer" }}>
                  <Avatar name={u.name || em} color={u.color || GOLD} size={26} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#fff" }}>{u.name || em}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{em}</div>
                  </div>
                  {form.collaborators.includes(em) && <span style={{ color: GOLD }}>✓</span>}
                </div>
              ))}
              {Object.keys(allUsers).length <= 1 && <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>No other members registered yet</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={createMeeting} style={{ flex: 1 }}>Schedule Meeting</Btn>
            <Btn variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{meetings.length} TOTAL MEETINGS</div>
        <Btn onClick={() => setShowCreate(true)} style={{ fontSize: 12 }}>+ Schedule Meeting</Btn>
      </div>

      {meetings.filter(needsSummary).length > 0 && (
        <div style={{ padding: "12px 18px", background: GOLD + "12", border: `1px solid ${GOLD}44`, borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, color: GOLD }}>📝 You have {meetings.filter(needsSummary).length} meeting{meetings.filter(needsSummary).length > 1 ? "s" : ""} awaiting a summary.</div>
          <Btn onClick={() => setSelected(meetings.filter(needsSummary)[0])} style={{ fontSize: 11, padding: "6px 14px", background: GOLD, color: BG }}>Add Summary</Btn>
        </div>
      )}

      {upcomingMeetings.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>UPCOMING ({upcomingMeetings.length})</div>
          {upcomingMeetings.map((m) => {
            const host = allUsers[m.hostEmail] || { name: m.hostEmail, color: GOLD };
            return (
              <div key={m.id} onClick={() => setSelected(m)} style={{ background: CARD, border: `1px solid ${TEAL}33`, borderLeft: `3px solid ${TEAL}`, borderRadius: 12, padding: "16px 20px", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{m.title}</div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace" }}>{m.date} · {m.time}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Host: <span style={{ color: "#fff" }}>{host.name || m.hostEmail}</span></span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{(m.collaborators || []).length} participants</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <a href={m.gmeetLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
                    <Btn style={{ fontSize: 11, padding: "6px 14px", background: TEAL, color: BG }}>Join →</Btn>
                  </a>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pastMeetings.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>PAST MEETINGS ({pastMeetings.length})</div>
          {pastMeetings.slice().reverse().map((m) => {
            const host = allUsers[m.hostEmail] || { name: m.hostEmail, color: GOLD };
            return (
              <div key={m.id} onClick={() => setSelected(m)} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid rgba(255,255,255,0.15)`, borderRadius: 12, padding: "16px 20px", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, opacity: 0.75 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{m.title}</div>
                    {m.summary ? <Badge text="Summary Added" color={TEAL} /> : m.hostEmail === user.email ? <Badge text="Needs Summary" color={GOLD} /> : <Badge text="No Summary" color="rgba(255,255,255,0.25)" />}
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>{m.date} · {m.time}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Host: {host.name || m.hostEmail}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>›</span>
              </div>
            );
          })}
        </div>
      )}

      {meetings.length === 0 && (
        <EmptyState icon="◷" title="No meetings scheduled" sub="Schedule your first meeting using the button above." />
      )}
    </div>
  );
};

// ─── EDIT PROFILES PANEL ──────────────────────────────────────────────────────
const EditProfilesPanel = ({ adminEmail }) => {
  const [users, setUsers] = useState({});
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  const load = () => {
    const u = store.get(KEYS.users) || {};
    setUsers(u);
  };

  useEffect(load, []);

  const openEdit = (em) => {
    const u = users[em] || {};
    setSelected(em);
    setSaved(false);
    setForm({
      name: u.name || "",
      dept: u.dept || "",
      team: u.team || "",
      title: u.title || "",
      status: u.status || "",
    });
  };

  const saveEdit = () => {
    if (!selected) return;
    const allUsers = store.get(KEYS.users) || {};
    if (!allUsers[selected]) return;
    Object.entries(form).forEach(([field, val]) => {
      allUsers[selected][field] = val;
    });
    store.set(KEYS.users, allUsers);
    addActivity(adminEmail, "edited profile of", selected, null);
    addNotif(selected, "profileChange", "Your profile was updated by the admin.");
    setSaved(true);
    load();
  };

  const entries = Object.entries(users);

  if (selected) {
    const u = users[selected] || {};
    return (
      <div style={{ maxWidth: 520 }}>
        <button
          onClick={() => { setSelected(null); setSaved(false); }}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 13, marginBottom: 20 }}
        >
          ← All Members
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <Avatar name={u.name || selected} color={u.color || GOLD} size={44} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{u.name || selected}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{selected}</div>
          </div>
        </div>
        {saved && (
          <div style={{ padding: "10px 14px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 8, color: TEAL, fontSize: 13, marginBottom: 16 }}>
            Profile saved successfully.
          </div>
        )}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22 }}>
          <Inp label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Full name" />
          <Inp label="Department" value={form.dept} onChange={(v) => setForm((f) => ({ ...f, dept: v }))} placeholder="e.g. Engineering" />
          <Inp label="Team" value={form.team} onChange={(v) => setForm((f) => ({ ...f, team: v }))} placeholder="e.g. Core, Design" />
          <Inp label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Writer, Developer" />
          <Inp label="Status" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} placeholder="e.g. Lead, Senior, Junior" />
          <Btn onClick={saveEdit} style={{ marginTop: 4 }}>Save Changes</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
        SELECT A MEMBER TO EDIT
      </div>
      {entries.length === 0 ? (
        <EmptyState icon="◉" title="No members yet" sub="Members will appear here once they register." />
      ) : (
        entries.map(([em, u]) => (
          <div
            key={em}
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}
          >
            <Avatar name={u.name || em} color={u.color || GOLD} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{u.name || em}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{em}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                {u.dept && <Badge text={u.dept} color={PURPLE} />}
                {u.team && <Badge text={u.team} color={TEAL} />}
                {u.title && <Badge text={u.title} color="rgba(255,255,255,0.3)" />}
                {u.status && <Badge text={u.status} color={GOLD} />}
              </div>
            </div>
            <Btn onClick={() => openEdit(em)} style={{ padding: "6px 14px", fontSize: 11 }}>Edit</Btn>
          </div>
        ))
      )}
    </div>
  );
};

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
const AdminPanel = ({ user, onLaunch }) => {
  const isLaunchedCheck = !!store.get(KEYS.launched);
  const [tab, setTab] = useState(isLaunchedCheck ? "members" : "launch");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailRole, setNewEmailRole] = useState("member");
  const [pwResets, setPwResets] = useState([]);
  const [profileReqs, setProfileReqs] = useState([]);
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [blockedEmails, setBlockedEmails] = useState([]);
const textAreaRefsConf = useRef({});
const [confTab, setConfTab] = useState("view");
  const [editBlocks, setEditBlocks] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTextBlock, setActiveTextBlock] = useState(null);

  const load = () => {
    const pending = store.get(KEYS.pendingEmails) || [];
    const blocked = store.get(KEYS.blockedEmails) || [];
    setAllowedEmails([...INITIAL_MEMBER_EMAILS, ...pending]);
    setBlockedEmails(blocked);
    setPwResets(
      (store.get(KEYS.pwResets) || []).filter((r) => r.status === "pending")
    );
    setProfileReqs(
      (store.get(KEYS.profileRequests) || []).filter(
        (r) => r.status === "pending"
      )
    );
  };

  useEffect(load, []);

  const addMember = () => {
    if (!newEmail.trim()) return;
    const em = newEmail.trim().toLowerCase();
    // Remove from blocked list if previously blocked
    const blocked = store.get(KEYS.blockedEmails) || [];
    if (blocked.includes(em)) {
      store.set(
        KEYS.blockedEmails,
        blocked.filter((x) => x !== em)
      );
    }
    const existing = store.get(KEYS.pendingEmails) || [];
    if (!existing.includes(em) && !INITIAL_MEMBER_EMAILS.includes(em)) {
      existing.push(em);
      store.set(KEYS.pendingEmails, existing);
      // If registering as admin, update user role immediately if user exists
      if (newEmailRole === "admin") {
        const users = store.get(KEYS.users) || {};
        if (users[em]) {
          users[em].role = "admin";
          store.set(KEYS.users, users);
        }
      }
      addNotif(
        em,
        "task",
        `You've been registered on this platform as part of Ulrevix Team OS as ${
          newEmailRole === "admin" ? "an Admin" : "a Member"
        }. Thank you for joining our platform.`
      );
      addActivity(user.email, `added new ${newEmailRole}`, em, null);
      // Log to email history
      const hist = store.get(KEYS.emailHistory) || [];
      hist.unshift({
        email: em,
        action: "authorized",
        role: newEmailRole,
        by: user.email,
        at: new Date().toISOString(),
      });
      store.set(KEYS.emailHistory, hist);
    }
    setNewEmail("");
    setNewEmailRole("member");
    load();
  };

  const removeMember = (em) => {
    if (em === ADMIN_EMAIL) return; // can't block the main admin
    // Remove from pendingEmails
    const existing = store.get(KEYS.pendingEmails) || [];
    store.set(
      KEYS.pendingEmails,
      existing.filter((x) => x !== em)
    );


    // Add to blocked list
    const blocked = store.get(KEYS.blockedEmails) || [];
    if (!blocked.includes(em)) {
      blocked.push(em);
      store.set(KEYS.blockedEmails, blocked);
    }
    // Log to email history
    const hist = store.get(KEYS.emailHistory) || [];
    hist.unshift({
      email: em,
      action: "unauthorized",
      by: user.email,
      at: new Date().toISOString(),
    });
    store.set(KEYS.emailHistory, hist);
    addActivity(user.email, "blocked member", em, null);
    addNotif(
      em,
      "alert",
      "Your access to Ulrevix Team OS has been revoked by the admin."
    );
    load();
  };

  const unregisterMember = (em) => {
    if (em === ADMIN_EMAIL) return;
    // Remove from passwords (kills login ability) but keep account data intact
    const pws = store.get(KEYS.passwords) || {};
    delete pws[em];
    store.set(KEYS.passwords, pws);
    // Remove from pendingEmails
    const existing = store.get(KEYS.pendingEmails) || [];
    store.set(KEYS.pendingEmails, existing.filter((x) => x !== em));
    // Add to blocked list to prevent re-login
    const blocked = store.get(KEYS.blockedEmails) || [];
    if (!blocked.includes(em)) {
      blocked.push(em);
      store.set(KEYS.blockedEmails, blocked);
    }
    // Log to email history
    const hist = store.get(KEYS.emailHistory) || [];
    hist.unshift({
      email: em,
      action: "unauthorized",
      by: user.email,
      at: new Date().toISOString(),
    });
    store.set(KEYS.emailHistory, hist);
    addActivity(user.email, "unregistered member (login blocked, account kept)", em, null);
    addNotif(em, "alert", "Your login access to Ulrevix Team OS has been revoked by the admin. Your account data has been retained.");
    load();
  };

  const deleteUserAccount = (em) => {
    if (em === ADMIN_EMAIL) return;
    // Remove from passwords
    const pws = store.get(KEYS.passwords) || {};
    delete pws[em];
    store.set(KEYS.passwords, pws);
    // Delete the user record entirely
    const users = store.get(KEYS.users) || {};
    delete users[em];
    store.set(KEYS.users, users);
    // Remove from pendingEmails
    const existing = store.get(KEYS.pendingEmails) || [];
    store.set(KEYS.pendingEmails, existing.filter((x) => x !== em));
    // Add to blocked list
    const blocked = store.get(KEYS.blockedEmails) || [];
    if (!blocked.includes(em)) {
      blocked.push(em);
      store.set(KEYS.blockedEmails, blocked);
    }
    // Log to email history
    const hist = store.get(KEYS.emailHistory) || [];
    hist.unshift({
      email: em,
      action: "unauthorized",
      by: user.email,
      at: new Date().toISOString(),
    });
    store.set(KEYS.emailHistory, hist);
    addActivity(user.email, "permanently deleted account of", em, null);
    load();
  };

  const handleReset = (id, action) => {
    const resets = store.get(KEYS.pwResets) || [];
    const idx = resets.findIndex((r) => r.id === id);
    if (idx >= 0) {
      resets[idx].status = action;
      const em = resets[idx].email;
      if (action === "approved") {
        // Delete the current password so user is forced to create a new one
        const pws = store.get(KEYS.passwords) || {};
        delete pws[em];
        store.set(KEYS.passwords, pws);
      }
      addNotif(em, "pwReset", `Your password reset was ${action}.`);
      const hist = store.get(KEYS.pwResetHistory) || [];
      hist.unshift({
        id,
        email: em,
        action,
        by: user.email,
        at: new Date().toISOString(),
      });
      store.set(KEYS.pwResetHistory, hist);
    }
    store.set(KEYS.pwResets, resets);
    load();
  };

  const handleProfile = (id, action) => {
    const reqs = store.get(KEYS.profileRequests) || [];
    const idx = reqs.findIndex((r) => r.id === id);
    if (idx >= 0) {
      reqs[idx].status = action;
      const { email, field, oldVal, newVal } = reqs[idx];
      if (action === "approved") {
        const users = store.get(KEYS.users) || {};
        if (users[email]) {
          users[email][field] = newVal;
          store.set(KEYS.users, users);
        }
        addNotif(
          email,
          "profileChange",
          `Your profile change (${field}) was approved.`
        );
      } else {
        addNotif(
          email,
          "profileChange",
          `Your profile change (${field}) was rejected.`
        );
      }
      // Save to history
      const hist = store.get(KEYS.profileChangeHistory) || [];
      hist.unshift({
        id,
        email,
        field,
        oldVal,
        newVal,
        action,
        by: user.email,
        at: new Date().toISOString(),
      });
      store.set(KEYS.profileChangeHistory, hist);
    }
    store.set(KEYS.profileRequests, reqs);
    load();
  };

  const isLaunched = !!store.get(KEYS.launched);
  const leaveReqs = (store.get(KEYS.leaveRequests) || []).filter(
    (r) => r.status === "pending"
  );

  const TABS = [
    ...(!isLaunched ? [{ id: "launch", label: "🚀 Launch Platform" }] : []),
    { id: "members", label: "Members" },
    { id: "roleManagement", label: "Role Management" },
    {
      id: "pwResets",
      label: `Password Resets ${
        pwResets.length > 0 ? `(${pwResets.length})` : ""
      }`,
    },
    {
      id: "profileReqs",
      label: `Profile Changes ${
        profileReqs.length > 0 ? `(${profileReqs.length})` : ""
      }`,
    },
    {
      id: "leaveReqs",
      label: `Leave Requests ${
        leaveReqs.length > 0 ? `(${leaveReqs.length})` : ""
      }`,
    },
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
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: `1px solid ${
                t.id === "launch"
                  ? tab === t.id
                    ? GOLD
                    : GOLD + "66"
                  : tab === t.id
                  ? GOLD
                  : BORDER
              }`,
              background:
                t.id === "launch"
                  ? tab === t.id
                    ? GOLD + "33"
                    : GOLD + "11"
                  : tab === t.id
                  ? GOLD + "22"
                  : "transparent",
              color:
                t.id === "launch"
                  ? GOLD
                  : tab === t.id
                  ? GOLD
                  : "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Mono',monospace",
              fontWeight: t.id === "launch" ? 700 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "launch" && (
        <div style={{ maxWidth: 560 }}>
          <div
            style={{
              background: `linear-gradient(135deg,rgba(200,169,110,0.07),rgba(126,184,164,0.04))`,
              border: `1px solid ${GOLD}33`,
              borderRadius: 16,
              padding: "36px 32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: GOLD,
                animation: "pulse 2s infinite",
                margin: "0 auto 20px",
              }}
            />
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 10,
              }}
            >
              Official Platform Launch
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              Confirming launch will clear all test data, start the real-time
              clock from
              <strong style={{ color: GOLD }}> Week 1 / Day 1</strong>, and lock
              in today's date as the official start. This cannot be undone.
            </p>
            <LaunchConfirmButton onLaunch={onLaunch} />
          </div>
        </div>
      )}

      {tab === "members" && (
        <div>
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 14,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.08em",
              }}
            >
              ADD NEW MEMBER EMAIL
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
                placeholder="member@email.com"
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <select
                value={newEmailRole}
                onChange={(e) => setNewEmailRole(e.target.value)}
                style={{
                  padding: "11px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Btn onClick={addMember}>Add</Btn>
            </div>
          </div>
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 14,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.08em",
              }}
            >
              AUTHORIZED EMAILS ({allowedEmails.length + 1})
            </div>
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                background: GOLD + "12",
                border: `1px solid ${GOLD}33`,
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#fff" }}>{ADMIN_EMAIL}</span>
              <Badge text="Admin" color={GOLD} />
            </div>
            {allowedEmails.map((em) => {
              const users = store.get(KEYS.users) || {};
              const registered = !!store.get(KEYS.passwords)?.[em];
              const isBlocked = blockedEmails.includes(em);
              return (
                <div
                  key={em}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: isBlocked
                      ? RED + "10"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isBlocked ? RED + "33" : BORDER}`,
                    marginBottom: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: isBlocked ? "rgba(255,255,255,0.35)" : "#fff",
                      }}
                    >
                      {em}
                    </span>
                    {users[em]?.name && (
                      <span
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          fontSize: 11,
                          marginLeft: 8,
                        }}
                      >
                        ({users[em].name})
                      </span>
                    )}
                    {users[em]?.role === "admin" && (
                      <span style={{ marginLeft: 8 }}>
                        <Badge text="Admin" color={GOLD} />
                      </span>
                    )}
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <Badge
                      text={registered ? "Registered" : "Pending"}
                      color={registered ? TEAL : GOLD}
                    />
{em !== ADMIN_EMAIL && (
  <div style={{ display: "flex", gap: 6 }}>
    <Btn
      variant="danger"
      onClick={() => removeMember(em)}
      style={{ padding: "4px 10px", fontSize: 10 }}
    >
      Block
    </Btn>
    {registered && (
      <Btn
        variant="danger"
        onClick={() => {
          if (window.confirm(`Unregister ${em}? This will block their login access but keep their account data.`)) {
            unregisterMember(em);
          }
        }}
        style={{ padding: "4px 10px", fontSize: 10 }}
      >
        Unregister
      </Btn>
    )}
    {registered && (
      <Btn
        variant="danger"
        onClick={() => {
          if (window.confirm(`PERMANENTLY DELETE the account of ${em}? This will erase all their profile data and cannot be undone.`)) {
            deleteUserAccount(em);
          }
        }}
        style={{ padding: "4px 10px", fontSize: 10, background: RED, color: "#fff", border: "none" }}
      >
        Delete Account
      </Btn>
    )}
  </div>
)}
                  </div>
                </div>
              );
            })}
            {blockedEmails.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: RED,
                    fontFamily: "'DM Mono',monospace",
                    marginBottom: 10,
                    letterSpacing: "0.08em",
                  }}
                >
                  BLOCKED EMAILS ({blockedEmails.length})
                </div>
                {blockedEmails.map((em) => (
                  <div
                    key={em}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: RED + "10",
                      border: `1px solid ${RED}33`,
                      marginBottom: 6,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>{em}</span>
                    {blockedEmails.length > 0 && (
  <div style={{ marginTop: 20 }}>
    <div style={{ fontSize: 11, color: RED, fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>
      BLOCKED EMAILS ({blockedEmails.length})
    </div>
    {blockedEmails.map((em) => (
      <div key={em} style={{ padding: "9px 12px", borderRadius: 8, background: RED + "10", border: `1px solid ${RED}33`, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>{em}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            defaultValue="member"
            id={`unblock-role-${em}`}
            style={{ padding: "4px 10px", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 11, outline: "none", cursor: "pointer", fontFamily: "'DM Mono',monospace" }}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <Btn
            style={{ padding: "4px 12px", fontSize: 10, background: TEAL, color: BG }}
            onClick={() => {
              const roleSelect = document.getElementById(`unblock-role-${em}`);
              const chosenRole = roleSelect ? roleSelect.value : "member";
              const blocked = store.get(KEYS.blockedEmails) || [];
              store.set(KEYS.blockedEmails, blocked.filter((x) => x !== em));
              const existing = store.get(KEYS.pendingEmails) || [];
              if (!existing.includes(em) && !INITIAL_MEMBER_EMAILS.includes(em)) {
                existing.push(em);
                store.set(KEYS.pendingEmails, existing);
              }
              if (chosenRole === "admin") {
                const users = store.get(KEYS.users) || {};
                if (users[em]) {
                  users[em].role = "admin";
                  store.set(KEYS.users, users);
                }
              } else {
                const users = store.get(KEYS.users) || {};
                if (users[em] && users[em].role === "admin" && em !== ADMIN_EMAIL) {
                  users[em].role = "member";
                  store.set(KEYS.users, users);
                }
              }
              const hist = store.get(KEYS.emailHistory) || [];
              hist.unshift({ email: em, action: "authorized", role: chosenRole, by: user.email, at: new Date().toISOString() });
              store.set(KEYS.emailHistory, hist);
              addNotif(em, "task", `Your access to Ulrevix Team OS has been restored as ${chosenRole === "admin" ? "an Admin" : "a Member"}.`);
              addActivity(user.email, `unblocked and re-added as ${chosenRole}`, em, null);
              load();
            }}
          >
            Unblock & Add
          </Btn>
        </div>
      </div>
    ))}
  </div>
)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "pwResets" && (
        <div>
          {pwResets.length === 0 ? (
            <EmptyState
              icon="◌"
              title="No pending password resets"
              sub="All clear."
            />
          ) : (
            pwResets.map((r) => (
              <div
                key={r.id}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "18px 20px",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#fff",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {r.email}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}
                  >
                    Requested {timeAgo(r.requestedAt)}
                  </div>
                </div>
                <Btn
                  onClick={() => handleReset(r.id, "approved")}
                  style={{
                    padding: "7px 16px",
                    fontSize: 12,
                    background: TEAL,
                    color: BG,
                  }}
                >
                  Approve
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => handleReset(r.id, "rejected")}
                  style={{ padding: "7px 16px", fontSize: 12 }}
                >
                  Reject
                </Btn>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "profileReqs" && (
        <div>
          {profileReqs.length === 0 ? (
            <EmptyState
              icon="◉"
              title="No pending profile changes"
              sub="All clear."
            />
          ) : (
            profileReqs.map((r) => (
              <div
                key={r.id}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "18px 20px",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#fff",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {r.email}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 4,
                    }}
                  >
                    Wants to change{" "}
                    <span style={{ color: GOLD }}>{r.field}</span> from{" "}
                    <span
                      style={{ textDecoration: "line-through", opacity: 0.5 }}
                    >
                      "{r.oldVal}"
                    </span>{" "}
                    to <span style={{ color: TEAL }}>"{r.newVal}"</span>
                  </div>
                  <div
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}
                  >
                    Requested {timeAgo(r.requestedAt)}
                  </div>
                </div>
                <Btn
                  onClick={() => handleProfile(r.id, "approved")}
                  style={{
                    padding: "7px 16px",
                    fontSize: 12,
                    background: TEAL,
                    color: BG,
                  }}
                >
                  Approve
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => handleProfile(r.id, "rejected")}
                  style={{ padding: "7px 16px", fontSize: 12 }}
                >
                  Reject
                </Btn>
              </div>
            ))
          )}
        </div>
      )}
      {tab === "leaveReqs" && (
        <div>
          {leaveReqs.length === 0 ? (
            <EmptyState
              icon="◌"
              title="No pending leave requests"
              sub="All clear."
            />
          ) : (
            leaveReqs.map((r) => {
              const allGroups = store.get(KEYS.groups) || [];
              const g = allGroups.find((x) => x.id === r.groupId);
              const u = (store.get(KEYS.users) || {})[r.email] || {
                name: r.email,
              };
              const approve = () => {
                const reqs = store.get(KEYS.leaveRequests) || [];
                const idx = reqs.findIndex((x) => x.id === r.id);
                if (idx >= 0) reqs[idx].status = "approved";
                store.set(KEYS.leaveRequests, reqs);
                const gs = store.get(KEYS.groups) || [];
                const gi = gs.findIndex((x) => x.id === r.groupId);
                if (gi >= 0) {
                  gs[gi].members = gs[gi].members.filter((m) => m !== r.email);
                  gs[gi].admins = (gs[gi].admins || []).filter(
                    (m) => m !== r.email
                  );
                  store.set(KEYS.groups, gs);
                }
                addNotif(
                  r.email,
                  "alert",
                  `Your request to leave "${g?.name}" was approved.`
                );
                load();
              };
              const reject = () => {
                const reqs = store.get(KEYS.leaveRequests) || [];
                const idx = reqs.findIndex((x) => x.id === r.id);
                if (idx >= 0) reqs[idx].status = "rejected";
                store.set(KEYS.leaveRequests, reqs);
                addNotif(
                  r.email,
                  "alert",
                  `Your request to leave "${g?.name}" was rejected. You remain in the group.`
                );
                load();
              };
              return (
                <div
                  key={r.id}
                  style={{
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: "18px 20px",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#fff",
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      {u.name || r.email}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.5)",
                        marginBottom: 4,
                      }}
                    >
                      Wants to leave group:{" "}
                      <span style={{ color: GOLD }}>
                        {g?.name || r.groupId}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}
                    >
                      Requested {timeAgo(r.requestedAt)}
                    </div>
                  </div>
                  <Btn
                    onClick={approve}
                    style={{
                      padding: "7px 16px",
                      fontSize: 12,
                      background: TEAL,
                      color: BG,
                    }}
                  >
                    Approve
                  </Btn>
                  <Btn
                    variant="danger"
                    onClick={reject}
                    style={{ padding: "7px 16px", fontSize: 12 }}
                  >
                    Reject
                  </Btn>
                </div>
              );
            })
          )}
        </div>
      )}
      {tab === "editProfiles" && (
        <EditProfilesPanel adminEmail={user.email} />
      )}

      {tab === "emailHistory" && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 14,
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.08em",
            }}
          >
            EMAIL AUTHORIZATION HISTORY
          </div>
          {(store.get(KEYS.emailHistory) || []).length === 0 ? (
            <EmptyState
              icon="◌"
              title="No history yet"
              sub="Email authorization events will appear here."
            />
          ) : (
            (store.get(KEYS.emailHistory) || []).map((h, i) => (
              <div
                key={i}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${
                    h.action === "authorized" ? TEAL : RED
                  }`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "#fff", marginBottom: 3 }}>
                    {h.email}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.3)",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {h.action === "authorized"
                      ? `Authorized as ${h.role || "member"}`
                      : "Blocked"}{" "}
                    · by {h.by} · {timeAgo(h.at)}
                  </div>
                </div>
                <Badge
                  text={h.action === "authorized" ? "Authorized" : "Blocked"}
                  color={h.action === "authorized" ? TEAL : RED}
                />
              </div>
            ))
          )}
        </div>
      )}

      {tab === "pwResetHistory" && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 14,
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.08em",
            }}
          >
            PASSWORD RESET HISTORY
          </div>
          {(store.get(KEYS.pwResetHistory) || []).length === 0 ? (
            <EmptyState
              icon="◌"
              title="No history yet"
              sub="Password reset decisions will appear here."
            />
          ) : (
            (store.get(KEYS.pwResetHistory) || []).map((h, i) => (
              <div
                key={i}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${
                    h.action === "approved" ? TEAL : RED
                  }`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "#fff", marginBottom: 3 }}>
                    {h.email}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.3)",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {h.action} · by {h.by} · {timeAgo(h.at)}
                  </div>
                </div>
                <Badge
                  text={h.action}
                  color={h.action === "approved" ? TEAL : RED}
                />
              </div>
            ))
          )}
        </div>
      )}

      {tab === "profileHistory" && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 14,
              fontFamily: "'DM Mono',monospace",
              letterSpacing: "0.08em",
            }}
          >
            PROFILE CHANGE HISTORY
          </div>
          {(store.get(KEYS.profileChangeHistory) || []).length === 0 ? (
            <EmptyState
              icon="◌"
              title="No history yet"
              sub="Profile change decisions will appear here."
            />
          ) : (
            (store.get(KEYS.profileChangeHistory) || []).map((h, i) => (
              <div
                key={i}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${
                    h.action === "approved" ? TEAL : RED
                  }`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 13, color: "#fff", marginBottom: 3 }}
                    >
                      {h.email}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.5)",
                        marginBottom: 3,
                      }}
                    >
                      Field: <span style={{ color: GOLD }}>{h.field}</span> ·{" "}
                      <span
                        style={{ textDecoration: "line-through", opacity: 0.5 }}
                      >
                        "{h.oldVal}"
                      </span>{" "}
                      → <span style={{ color: TEAL }}>"{h.newVal}"</span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.3)",
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {h.action} · by {h.by} · {timeAgo(h.at)}
                    </div>
                  </div>
                  <Badge
                    text={h.action}
                    color={h.action === "approved" ? TEAL : RED}
                  />
                </div>
              </div>
            ))
          )}
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
          const existing = store.get(key) || [];
          store.set(key, existing.filter(r => r.id !== req.reportId));
          addNotif(req.requestedBy, "report", `Your deletion request for your ${req.reportType} report "${req.reportLabel}" was approved.`);
          load();
        };
        const rejectReportDeletion = (req) => {
          const reqs = store.get(KEYS.reportDeleteRequests) || [];
          const idx = reqs.findIndex(r => r.id === req.id);
          if (idx >= 0) { reqs[idx].status = "rejected"; reqs[idx].resolvedBy = user.email; reqs[idx].resolvedAt = new Date().toISOString(); }
          store.set(KEYS.reportDeleteRequests, reqs);
          addNotif(req.requestedBy, "report", `Your deletion request for your ${req.reportType} report "${req.reportLabel}" was rejected.`);
          load();
        };
        return (
          <div>
            {allReportDeleteReqs.length === 0 ? (
              <EmptyState icon="▣" title="No pending report deletion requests" sub="All clear." />
            ) : (
              allReportDeleteReqs.map((req) => {
                const reqUser = (store.get(KEYS.users) || {})[req.requestedBy] || { name: req.requestedBy, color: GOLD };
                return (
                  <div key={req.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                        <Avatar name={reqUser.name || req.requestedBy} color={reqUser.color || GOLD} size={28} />
                        <div>
                          <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{reqUser.name || req.requestedBy}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                            Wants to delete their <span style={{ color: GOLD, textTransform: "capitalize" }}>{req.reportType}</span> report: <span style={{ color: "#fff" }}>{req.reportLabel}</span> · {timeAgo(req.requestedAt)}
                          </div>
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
              })
            )}
          </div>
        );
      })()}

      {tab === "meetingDeleteReqs" && (() => {
        const allMeetingDeleteReqs = (store.get(KEYS.meetingDeleteRequests) || []).filter(r => r.status === "pending");
        const allMeetings = store.get(KEYS.meetings) || [];
        const approveDeletion = (req) => {
          const reqs = store.get(KEYS.meetingDeleteRequests) || [];
          const idx = reqs.findIndex(r => r.id === req.id);
          if (idx >= 0) { reqs[idx].status = "approved"; reqs[idx].resolvedBy = user.email; reqs[idx].resolvedAt = new Date().toISOString(); }
          store.set(KEYS.meetingDeleteRequests, reqs);
          const ms = (store.get(KEYS.meetings) || []).filter(m => m.id !== req.meetingId);
          store.set(KEYS.meetings, ms);
          const mHist = store.get(KEYS.meetingHistory) || [];
          mHist.unshift({ id: Date.now().toString(), meetingTitle: req.meetingTitle, action: "deleted", by: user.email, reason: req.reason, at: new Date().toISOString() });
          store.set(KEYS.meetingHistory, mHist);
          addNotif(req.requestedBy, "alert", `Your deletion request for "${req.meetingTitle}" was approved.`);
          load();
        };
        const rejectDeletion = (req) => {
          const reqs = store.get(KEYS.meetingDeleteRequests) || [];
          const idx = reqs.findIndex(r => r.id === req.id);
          if (idx >= 0) { reqs[idx].status = "rejected"; reqs[idx].resolvedBy = user.email; reqs[idx].resolvedAt = new Date().toISOString(); }
          store.set(KEYS.meetingDeleteRequests, reqs);
          const mHist = store.get(KEYS.meetingHistory) || [];
          mHist.unshift({ id: Date.now().toString(), meetingTitle: req.meetingTitle, action: "delete_rejected", by: user.email, at: new Date().toISOString() });
          store.set(KEYS.meetingHistory, mHist);
          addNotif(req.requestedBy, "alert", `Your deletion request for "${req.meetingTitle}" was rejected.`);
          load();
        };
        return (
          <div>
            {allMeetingDeleteReqs.length === 0 ? (
              <EmptyState icon="◷" title="No pending deletion requests" sub="All clear." />
            ) : (
              allMeetingDeleteReqs.map((req) => {
                const reqUser = (store.get(KEYS.users) || {})[req.requestedBy] || { name: req.requestedBy, color: GOLD };
                return (
                  <div key={req.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{req.meetingTitle}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                          Requested by <span style={{ color: GOLD }}>{reqUser.name || req.requestedBy}</span> · {timeAgo(req.requestedAt)}
                        </div>
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
              })
            )}
          </div>
        );
      })()}

      {tab === "meetingHistory" && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
            MEETING HISTORY
          </div>
          {(store.get(KEYS.meetingHistory) || []).length === 0 ? (
            <EmptyState icon="◷" title="No meeting history yet" sub="Meeting events will appear here." />
          ) : (
            (store.get(KEYS.meetingHistory) || []).map((h, i) => {
              const actionColor = { created: TEAL, deleted: RED, delete_requested: GOLD, delete_rejected: RED }[h.action] || GOLD;
              const actionLabel = { created: "Created", deleted: "Deleted", delete_requested: "Deletion Requested", delete_rejected: "Deletion Rejected" }[h.action] || h.action;
              return (
                <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${actionColor}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#fff", marginBottom: 3 }}>{h.meetingTitle}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
                        {actionLabel} · by {h.by} · {timeAgo(h.at)}
                      </div>
                      {h.reason && (
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, fontStyle: "italic" }}>
                          Reason: {h.reason}
                        </div>
                      )}
                    </div>
                    <Badge text={actionLabel} color={actionColor} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      
      
      {tab === "roleManagement" && (() => {
  const allUsers = store.get(KEYS.users) || {};
  const allPasswords = store.get(KEYS.passwords) || {};

  const changeRole = (targetEmail, newRole) => {
    if (targetEmail === ADMIN_EMAIL) {
      alert("The primary admin account cannot have its role changed.");
      return;
    }

    // Update user role in users store
    const users = store.get(KEYS.users) || {};
    if (users[targetEmail]) {
      users[targetEmail].role = newRole;
      store.set(KEYS.users, users);
    }

    // Update pendingEmails: if becoming member, ensure they're NOT in admin-only zone; if becoming admin, keep them accessible
    const pending = store.get(KEYS.pendingEmails) || [];
    if (!pending.includes(targetEmail) && !INITIAL_MEMBER_EMAILS.includes(targetEmail)) {
      pending.push(targetEmail);
      store.set(KEYS.pendingEmails, pending);
    }

    // Update emailHistory so the auth system picks up the new role
    const hist = store.get(KEYS.emailHistory) || [];
    hist.unshift({
      email: targetEmail,
      action: "authorized",
      role: newRole,
      by: user.email,
      at: new Date().toISOString(),
    });
    store.set(KEYS.emailHistory, hist);

    addNotif(
      targetEmail,
      "alert",
      `Your account role has been changed to ${newRole} by the admin. Please sign out and sign back in as ${newRole === "admin" ? "Admin" : "Member"} to continue.`
    );
    addActivity(user.email, `changed role of ${targetEmail} to`, newRole, null);
    load();
    alert(`${targetEmail} has been changed to ${newRole}. They will need to sign out and sign back in under the correct role.`);
  };

  const registeredUsers = Object.entries(allUsers).filter(([em]) => em !== ADMIN_EMAIL && allPasswords[em]);

  return (
    <div>
      <div style={{ padding: "12px 18px", background: GOLD + "10", border: `1px solid ${GOLD}33`, borderRadius: 10, marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
        ⚠️ Changing a user's role will immediately update their access. They must sign out and sign back in under the new role to see the change take effect.
      </div>
      {registeredUsers.length === 0 ? (
        <EmptyState icon="◉" title="No registered users" sub="Only registered (non-admin) users will appear here." />
      ) : (
        registeredUsers.map(([em, u]) => {
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
                  {u.team && <Badge text={u.team} color={PURPLE} />}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {isCurrentlyAdmin ? (
                  <Btn
                    variant="secondary"
                    onClick={() => {
                      if (window.confirm(`Change ${u.name || em} from Admin to Member? They will lose all admin access.`)) {
                        changeRole(em, "member");
                      }
                    }}
                    style={{ fontSize: 11, padding: "7px 16px", border: `1px solid ${TEAL}44`, color: TEAL, background: TEAL + "15" }}
                  >
                    Downgrade to Member
                  </Btn>
                ) : (
                  <Btn
                    onClick={() => {
                      if (window.confirm(`Change ${u.name || em} from Member to Admin? They will gain full admin access.`)) {
                        changeRole(em, "admin");
                      }
                    }}
                    style={{ fontSize: 11, padding: "7px 16px" }}
                  >
                    Upgrade to Admin
                  </Btn>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
})()}
{tab === "confidentiality" && user.email === ADMIN_EMAIL && (() => {
  const allSigned = store.get(KEYS.confidentialitySigned) || {};
  const agreementData = store.get(KEYS.confidentialityAgreement);
  const currentBlocks = agreementData?.content || DEFAULT_CONFIDENTIALITY_BLOCKS;

  const parseInlineConf = (text) => {
    const parts = [];
    const regex = /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]|\[hl=([^\]]+)\]([\s\S]*?)\[\/hl\]|\[size=(\d+)\]([\s\S]*?)\[\/size\]|\*\*([\s\S]*?)\*\*|_([\s\S]*?)_|__([\s\S]*?)__/g;
    let last = 0; let match; let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
      if (match[1] !== undefined) parts.push(<span key={key++} style={{ color: match[1] }}>{parseInlineConf(match[2])}</span>);
      else if (match[3] !== undefined) parts.push(<span key={key++} style={{ background: match[3], padding: "1px 4px", borderRadius: 3 }}>{parseInlineConf(match[4])}</span>);
      else if (match[5] !== undefined) parts.push(<span key={key++} style={{ fontSize: parseInt(match[5]) }}>{parseInlineConf(match[6])}</span>);
      else if (match[7] !== undefined) parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[7]}</strong>);
      else if (match[8] !== undefined) parts.push(<em key={key++}>{match[8]}</em>);
      else if (match[9] !== undefined) parts.push(<span key={key++} style={{ textDecoration: "underline" }}>{match[9]}</span>);
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
    return parts.length ? parts : text;
  };

  const renderFormattedConf = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, li) => {
      if (line.startsWith("# ")) return <div key={li} style={{ fontSize: 20, fontWeight: 900, color: GOLD, letterSpacing: "-0.02em", marginBottom: 10, marginTop: 14 }}>{parseInlineConf(line.slice(2))}</div>;
      if (line.startsWith("## ")) return <div key={li} style={{ fontSize: 15, fontWeight: 700, color: TEAL, marginBottom: 8, marginTop: 12 }}>{parseInlineConf(line.slice(3))}</div>;
      if (line.startsWith("### ")) return <div key={li} style={{ fontSize: 13, fontWeight: 700, color: PURPLE, marginBottom: 6, marginTop: 10 }}>{parseInlineConf(line.slice(4))}</div>;
      if (line.startsWith("^") && line.endsWith("^")) return <div key={li} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: 5, marginTop: 8 }}>{parseInlineConf(line.slice(1, -1))}</div>;
      if (line.trim() === "") return <div key={li} style={{ height: 8 }} />;
      return <p key={li} style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.85, marginBottom: 8 }}>{parseInlineConf(line)}</p>;
    });
  };

  const applyConfFormat = (bi, format) => {
    const block = editBlocks[bi];
    if (!block || block.type !== "text") return;
    const ref = textAreaRefsConf.current[bi];
    const start = ref ? ref.selectionStart : 0;
    const end = ref ? ref.selectionEnd : block.content.length;
    const selected = block.content.slice(start, end);
    const before = block.content.slice(0, start);
    const after = block.content.slice(end);
    let wrapped = selected;
    if (format === "bold") wrapped = `**${selected}**`;
    else if (format === "italic") wrapped = `_${selected}_`;
    else if (format === "underline") wrapped = `__${selected}__`;
    else if (format === "uppercase") wrapped = selected.toUpperCase();
    else if (format === "lowercase") wrapped = selected.toLowerCase();
    else if (format === "capitalize") wrapped = selected.replace(/\b\w/g, c => c.toUpperCase());
    else if (format === "h1") wrapped = `\n# ${selected}\n`;
    else if (format === "h2") wrapped = `\n## ${selected}\n`;
    else if (format === "h3") wrapped = `\n### ${selected}\n`;
    else if (format === "sub") wrapped = `\n^${selected}^\n`;
    else if (format.startsWith("size_")) { const sz = format.replace("size_", ""); wrapped = `[size=${sz}]${selected}[/size]`; }
    else if (format.startsWith("color_")) { const col = format.replace("color_", ""); wrapped = col === "none" ? selected.replace(/\[color=[^\]]*\](.*?)\[\/color\]/gs, "$1") : `[color=${col}]${selected}[/color]`; }
    else if (format.startsWith("highlight_")) { const col = format.replace("highlight_", ""); wrapped = col === "none" ? selected.replace(/\[hl=[^\]]*\](.*?)\[\/hl\]/gs, "$1") : `[hl=${col}]${selected}[/hl]`; }
    const nb = [...editBlocks];
    nb[bi] = { ...nb[bi], content: before + wrapped + after };
    setEditBlocks(nb);
    setTimeout(() => { if (ref) { ref.focus(); ref.selectionStart = start; ref.selectionEnd = start + wrapped.length; } }, 10);
  };

  const ConfToolbar = ({ bi }) => {
    const SITE_COLORS = [{ value: GOLD }, { value: TEAL }, { value: PURPLE }, { value: RED }, { value: "#7BA8C4" }, { value: "#A4C47B" }, { value: "#ffffff" }, { value: "rgba(255,255,255,0.45)" }];
    const btnS = (color = "rgba(255,255,255,0.5)") => ({ padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 5, color, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" });
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${BORDER}` }}>
        {[{ label: "H1", tag: "h1" }, { label: "H2", tag: "h2" }, { label: "H3", tag: "h3" }].map(({ label, tag }) => <button key={tag} style={btnS(GOLD)} onClick={() => applyConfFormat(bi, tag)}>{label}</button>)}
        <button style={btnS()} onClick={() => applyConfFormat(bi, "sub")}>Sub</button>
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        <button style={{ ...btnS(), fontWeight: 700 }} onClick={() => applyConfFormat(bi, "bold")}><b>B</b></button>
        <button style={{ ...btnS(), fontStyle: "italic" }} onClick={() => applyConfFormat(bi, "italic")}><i>I</i></button>
        <button style={{ ...btnS(), textDecoration: "underline" }} onClick={() => applyConfFormat(bi, "underline")}>U̲</button>
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        <button style={btnS()} onClick={() => applyConfFormat(bi, "uppercase")}>AA</button>
        <button style={btnS()} onClick={() => applyConfFormat(bi, "lowercase")}>aa</button>
        <button style={btnS()} onClick={() => applyConfFormat(bi, "capitalize")}>Aa</button>
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        {[10, 12, 13, 15, 18, 22].map(sz => <button key={sz} style={btnS()} onClick={() => applyConfFormat(bi, `size_${sz}`)}>{sz}px</button>)}
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        {[GOLD, TEAL, PURPLE, RED, "#3a3a00"].map(c => <button key={c} onClick={() => applyConfFormat(bi, `highlight_${c}`)} style={{ width: 16, height: 16, borderRadius: 3, background: c, border: `2px solid rgba(255,255,255,0.15)`, cursor: "pointer", flexShrink: 0 }} />)}
        <button onClick={() => applyConfFormat(bi, "highlight_none")} style={{ ...btnS(RED), fontSize: 9 }}>✕HL</button>
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        {SITE_COLORS.map(({ value }) => <button key={value} onClick={() => applyConfFormat(bi, `color_${value}`)} style={{ width: 16, height: 16, borderRadius: "50%", background: value, border: `2px solid rgba(255,255,255,0.15)`, cursor: "pointer", flexShrink: 0 }} />)}
        <button onClick={() => applyConfFormat(bi, "color_none")} style={{ ...btnS("rgba(255,255,255,0.4)"), fontSize: 9 }}>✕CLR</button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ id: "view", label: "View Agreement" }, { id: "signed", label: `Signed Members (${Object.keys(allSigned).length})` }, { id: "edit", label: "Edit Agreement" }].map(t => (
          <button key={t.id} onClick={() => { setConfTab(t.id); if (t.id === "edit") { setEditBlocks(currentBlocks.map(b => b.type === "table" ? { type: "table", rows: b.rows.map(r => [...r]) } : { ...b })); setPreviewMode(false); setActiveTextBlock(null); } }} style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${confTab === t.id ? GOLD : BORDER}`, background: confTab === t.id ? GOLD + "22" : "transparent", color: confTab === t.id ? GOLD : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>{t.label}</button>
        ))}
      </div>

      {confTab === "view" && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "28px 32px" }}>
          {agreementData?.lastEditedAt && (
            <div style={{ padding: "8px 14px", background: TEAL + "12", border: `1px solid ${TEAL}33`, borderRadius: 8, marginBottom: 20, fontSize: 11, color: TEAL, fontFamily: "'DM Mono',monospace" }}>
              Last edited by {agreementData.lastEditedBy} · {timeAgo(agreementData.lastEditedAt)}
            </div>
          )}
          {currentBlocks.map((block, bi) =>
            block.type === "text" ? (
              <div key={bi} style={{ marginBottom: 10 }}>{renderFormattedConf(block.content)}</div>
            ) : (
              <div key={bi} style={{ overflowX: "auto", marginBottom: 18 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri === 0 ? "rgba(200,169,110,0.08)" : ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ border: `1px solid ${BORDER}`, padding: "8px 12px", color: ri === 0 ? GOLD : "rgba(255,255,255,0.65)", fontWeight: ri === 0 ? 600 : 400 }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {confTab === "signed" && (
        <div>
          {Object.keys(allSigned).length === 0 ? (
            <EmptyState icon="✍" title="No signed agreements yet" sub="Members will appear here once they sign." />
          ) : (
            Object.entries(allSigned).map(([email, data]) => {
              const u = (store.get(KEYS.users) || {})[email] || { name: email, color: GOLD };
              return (
                <div key={email} style={{ background: CARD, border: `1px solid ${TEAL}33`, borderLeft: `3px solid ${TEAL}`, borderRadius: 12, padding: "18px 22px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                    <Avatar name={u.name || email} color={u.color || GOLD} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{u.name || email}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>{email}</div>
                    </div>
                    <Badge text="✓ Signed" color={TEAL} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[["Signed Name", data.fullName], ["Signed Date", data.signDate || new Date(data.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })], ["Timestamp", timeAgo(data.signedAt)]].map(([label, val]) => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 4 }}>{label.toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {confTab === "edit" && (
        previewMode ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ padding: "6px 14px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 20, fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace" }}>PREVIEW — REVIEW BEFORE PUBLISHING</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}33`, borderRadius: 12, padding: "24px 28px", marginBottom: 18 }}>
              {editBlocks.map((block, bi) =>
                block.type === "text" ? (
                  <div key={bi} style={{ marginBottom: 10 }}>{renderFormattedConf(block.content)}</div>
                ) : (
                  <div key={bi} style={{ overflowX: "auto", marginBottom: 18 }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                      <tbody>
                        {block.rows.map((row, ri) => (
                          <tr key={ri} style={{ background: ri === 0 ? "rgba(200,169,110,0.08)" : ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ border: `1px solid ${BORDER}`, padding: "8px 12px", color: ri === 0 ? GOLD : "rgba(255,255,255,0.65)", fontWeight: ri === 0 ? 600 : 400 }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => {
                store.set(KEYS.confidentialityAgreement, { content: editBlocks, lastEditedAt: new Date().toISOString(), lastEditedBy: user.email });
                setPreviewMode(false);
                setConfTab("view");
                addActivity(user.email, "updated the Confidentiality and Build Agreement", "", null);
              }} style={{ padding: "9px 22px", fontSize: 12, background: TEAL, color: BG }}>✓ Confirm & Publish</Btn>
              <Btn variant="secondary" onClick={() => setPreviewMode(false)} style={{ padding: "9px 16px", fontSize: 12 }}>← Back to Edit</Btn>
              <Btn variant="danger" onClick={() => { setPreviewMode(false); setConfTab("view"); }} style={{ padding: "9px 16px", fontSize: 12 }}>Discard</Btn>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 14, letterSpacing: "0.08em" }}>
              EDITING CONFIDENTIALITY & BUILD AGREEMENT — Select text in any block, then click a toolbar button to apply formatting.
            </div>
            {editBlocks.map((block, bi) => (
              <div key={bi} style={{ marginBottom: 14, border: `1px solid ${activeTextBlock === bi ? GOLD + "66" : BORDER}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", flex: 1 }}>{block.type === "text" ? `TEXT BLOCK ${bi + 1}` : `TABLE BLOCK ${bi + 1}`}</span>
                  <button onClick={() => { const nb = [...editBlocks]; nb.splice(bi, 0, { type: "text", content: "" }); setEditBlocks(nb); }} style={{ padding: "3px 9px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 5, color: TEAL, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ TEXT</button>
                  <button onClick={() => { const nb = [...editBlocks]; nb.splice(bi, 0, { type: "table", rows: [["", ""], ["", ""]] }); setEditBlocks(nb); }} style={{ padding: "3px 9px", background: PURPLE + "22", border: `1px solid ${PURPLE}44`, borderRadius: 5, color: PURPLE, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ TABLE</button>
                  <button onClick={() => { const nb = editBlocks.filter((_, i) => i !== bi); setEditBlocks(nb.length ? nb : [{ type: "text", content: "" }]); }} style={{ padding: "3px 9px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 5, color: RED, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>✕ REMOVE</button>
                </div>
                {block.type === "text" ? (
                  <div>
                    {activeTextBlock === bi && <ConfToolbar bi={bi} />}
                    <textarea
                      ref={(el) => { textAreaRefsConf.current[bi] = el; }}
                      value={block.content}
                      onFocus={() => setActiveTextBlock(bi)}
                      onChange={(e) => { const nb = [...editBlocks]; nb[bi] = { ...nb[bi], content: e.target.value }; setEditBlocks(nb); }}
                      rows={8}
                      placeholder="Write text here. Select text and use toolbar above to format it."
                      style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "none", color: "#fff", fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.7, display: "block", fontFamily: "'Sora',sans-serif" }}
                    />
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", padding: "12px" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", alignSelf: "center" }}>{block.rows[0]?.length || 0} COLS · {block.rows.length} ROWS</span>
                      <button onClick={() => { const nb = [...editBlocks]; nb[bi] = { ...nb[bi], rows: nb[bi].rows.map(r => [...r, ""]) }; setEditBlocks(nb); }} style={{ padding: "3px 9px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 5, color: GOLD, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ COL</button>
                      <button onClick={() => { const nb = [...editBlocks]; const cols = nb[bi].rows[0]?.length || 0; if (cols <= 1) return; nb[bi] = { ...nb[bi], rows: nb[bi].rows.map(r => r.slice(0, -1)) }; setEditBlocks(nb); }} style={{ padding: "3px 9px", background: RED + "15", border: `1px solid ${RED}33`, borderRadius: 5, color: RED, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>− COL</button>
                      <button onClick={() => { const nb = [...editBlocks]; const cols = nb[bi].rows[0]?.length || 2; nb[bi] = { ...nb[bi], rows: [...nb[bi].rows, Array(cols).fill("")] }; setEditBlocks(nb); }} style={{ padding: "3px 9px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 5, color: GOLD, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ ROW</button>
                      <button onClick={() => { const nb = [...editBlocks]; if (nb[bi].rows.length <= 1) return; nb[bi] = { ...nb[bi], rows: nb[bi].rows.slice(0, -1) }; setEditBlocks(nb); }} style={{ padding: "3px 9px", background: RED + "15", border: `1px solid ${RED}33`, borderRadius: 5, color: RED, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>− ROW</button>
                    </div>
                    <table style={{ borderCollapse: "collapse", width: "100%" }}>
                      <tbody>
                        {block.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ border: `1px solid ${BORDER}`, padding: 0 }}>
                                <input value={cell} onChange={(e) => { const nb = [...editBlocks]; nb[bi].rows[ri][ci] = e.target.value; setEditBlocks([...nb]); }} style={{ width: "100%", padding: "7px 10px", background: ri === 0 ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)", border: "none", color: ri === 0 ? GOLD : "#fff", fontSize: 12, outline: "none", fontWeight: ri === 0 ? 600 : 400, fontFamily: ri === 0 ? "'DM Mono',monospace" : "'Sora',sans-serif" }} placeholder={ri === 0 ? `Header ${ci + 1}` : `Row ${ri}, Col ${ci + 1}`} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>First row is treated as the header row.</div>
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setEditBlocks([...editBlocks, { type: "text", content: "" }])} style={{ padding: "6px 14px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 6, color: TEAL, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ Add Text Block</button>
              <button onClick={() => setEditBlocks([...editBlocks, { type: "table", rows: [["", ""], ["", ""]] }])} style={{ padding: "6px 14px", background: PURPLE + "22", border: `1px solid ${PURPLE}44`, borderRadius: 6, color: PURPLE, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ Add Table</button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => { setPreviewMode(true); setActiveTextBlock(null); }} style={{ padding: "8px 20px", fontSize: 12, background: GOLD, color: BG }}>Review Before Publishing →</Btn>
              <Btn variant="secondary" onClick={() => setConfTab("view")} style={{ padding: "8px 14px", fontSize: 12 }}>Cancel</Btn>
            </div>
          </div>
        )
      )}
    </div>
  );
})()}
    </div>
  );
};

const AboutUlrevix = ({ user }) => {
  const RichTextToolbar = ({ onFormat }) => {
    const SITE_COLORS = [
      { label: "Gold", value: GOLD },
      { label: "Teal", value: TEAL },
      { label: "Purple", value: PURPLE },
      { label: "Red", value: RED },
      { label: "Blue", value: "#7BA8C4" },
      { label: "Green", value: "#A4C47B" },
      { label: "White", value: "#ffffff" },
      { label: "Muted", value: "rgba(255,255,255,0.45)" },
    ];
    const btnStyle = (color = "rgba(255,255,255,0.5)") => ({
      padding: "4px 10px",
      background: "rgba(255,255,255,0.05)",
      border: `1px solid rgba(255,255,255,0.12)`,
      borderRadius: 5,
      color,
      fontSize: 11,
      cursor: "pointer",
      fontFamily: "'DM Mono',monospace",
      whiteSpace: "nowrap",
    });
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 10 }}>
        {/* Headings */}
        {[{ label: "H1", tag: "h1" }, { label: "H2", tag: "h2" }, { label: "H3", tag: "h3" }].map(({ label, tag }) => (
          <button key={tag} style={btnStyle(GOLD)} onClick={() => onFormat(tag)}>{label}</button>
        ))}
        {/* Sub-header */}
        <button style={btnStyle("rgba(255,255,255,0.5)")} onClick={() => onFormat("sub")}>Sub</button>
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        {/* Style */}
        <button style={{ ...btnStyle(), fontWeight: 700 }} onClick={() => onFormat("bold")}><b>B</b></button>
        <button style={{ ...btnStyle(), fontStyle: "italic" }} onClick={() => onFormat("italic")}><i>I</i></button>
        <button style={{ ...btnStyle(), textDecoration: "underline" }} onClick={() => onFormat("underline")}>U̲</button>
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        {/* Case */}
        <button style={btnStyle()} onClick={() => onFormat("uppercase")}>AA</button>
        <button style={btnStyle()} onClick={() => onFormat("lowercase")}>aa</button>
        <button style={btnStyle()} onClick={() => onFormat("capitalize")}>Aa</button>
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        {/* Font size */}
        {[10, 12, 13, 15, 18, 22].map(sz => (
          <button key={sz} style={btnStyle()} onClick={() => onFormat(`size_${sz}`)}>{sz}px</button>
        ))}
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        {/* Highlight */}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", alignSelf: "center", fontFamily: "'DM Mono',monospace" }}>HIGHLIGHT:</span>
        {[GOLD, TEAL, PURPLE, RED, "#3a3a00"].map(c => (
          <button key={c} title={`Highlight ${c}`} onClick={() => onFormat(`highlight_${c}`)} style={{ width: 18, height: 18, borderRadius: 3, background: c, border: `2px solid rgba(255,255,255,0.15)`, cursor: "pointer", flexShrink: 0 }} />
        ))}
        <button title="Remove highlight" onClick={() => onFormat("highlight_none")} style={{ ...btnStyle(RED), fontSize: 10 }}>✕ HL</button>
        <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
        {/* Text color */}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", alignSelf: "center", fontFamily: "'DM Mono',monospace" }}>COLOR:</span>
        {SITE_COLORS.map(({ label, value }) => (
          <button key={value} title={label} onClick={() => onFormat(`color_${value}`)} style={{ width: 18, height: 18, borderRadius: "50%", background: value, border: `2px solid rgba(255,255,255,0.15)`, cursor: "pointer", flexShrink: 0 }} />
        ))}
        <button title="Reset color" onClick={() => onFormat("color_none")} style={{ ...btnStyle("rgba(255,255,255,0.4)"), fontSize: 10 }}>✕ CLR</button>
      </div>
    );
  };
  const [openSection, setOpenSection] = useState(null);
  const [editingSection, setEditingSection] = useState(null); // id of section being edited
  const [editBuffer, setEditBuffer] = useState(""); // kept for text portions
  const [editBlocks, setEditBlocks] = useState([]);
  const [previewMode, setPreviewMode] = useState(false); // new: review before publish
  const [activeTextBlock, setActiveTextBlock] = useState(null); // { bi, selStart, selEnd }
  const textAreaRefs = useRef({}); 
  const applyFormat = (bi, format) => {
    const block = editBlocks[bi];
    if (!block || block.type !== "text") return;
    const ref = textAreaRefs.current[bi];
    const start = ref ? ref.selectionStart : 0;
    const end = ref ? ref.selectionEnd : block.content.length;
    const selected = block.content.slice(start, end);
    const before = block.content.slice(0, start);
    const after = block.content.slice(end);
  
    let wrapped = selected;
  
    if (format === "bold") wrapped = `**${selected}**`;
    else if (format === "italic") wrapped = `_${selected}_`;
    else if (format === "underline") wrapped = `__${selected}__`;
    else if (format === "uppercase") wrapped = selected.toUpperCase();
    else if (format === "lowercase") wrapped = selected.toLowerCase();
    else if (format === "capitalize") wrapped = selected.replace(/\b\w/g, c => c.toUpperCase());
    else if (format === "h1") wrapped = `\n# ${selected}\n`;
    else if (format === "h2") wrapped = `\n## ${selected}\n`;
    else if (format === "h3") wrapped = `\n### ${selected}\n`;
    else if (format === "sub") wrapped = `\n^${selected}^\n`;
    else if (format.startsWith("size_")) {
      const sz = format.replace("size_", "");
      wrapped = `[size=${sz}]${selected}[/size]`;
    } else if (format.startsWith("color_")) {
      const col = format.replace("color_", "");
      if (col === "none") {
        wrapped = selected.replace(/\[color=[^\]]*\](.*?)\[\/color\]/gs, "$1");
      } else {
        wrapped = `[color=${col}]${selected}[/color]`;
      }
    } else if (format.startsWith("highlight_")) {
      const col = format.replace("highlight_", "");
      if (col === "none") {
        wrapped = selected.replace(/\[hl=[^\]]*\](.*?)\[\/hl\]/gs, "$1");
      } else {
        wrapped = `[hl=${col}]${selected}[/hl]`;
      }
    }
  
    const nb = [...editBlocks];
    nb[bi] = { ...nb[bi], content: before + wrapped + after };
    setEditBlocks(nb);
    setTimeout(() => {
      if (ref) {
        ref.focus();
        ref.selectionStart = start;
        ref.selectionEnd = start + wrapped.length;
      }
    }, 10);
  };
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, li) => {
      // Heading detection
      if (line.startsWith("# ")) {
        return (
          <div key={li} style={{ fontSize: 20, fontWeight: 900, color: GOLD, letterSpacing: "-0.02em", marginBottom: 10, marginTop: 14 }}>
            {parseInline(line.slice(2))}
          </div>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <div key={li} style={{ fontSize: 15, fontWeight: 700, color: TEAL, marginBottom: 8, marginTop: 12 }}>
            {parseInline(line.slice(3))}
          </div>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <div key={li} style={{ fontSize: 13, fontWeight: 700, color: PURPLE, marginBottom: 6, marginTop: 10 }}>
            {parseInline(line.slice(4))}
          </div>
        );
      }
      if (line.startsWith("^") && line.endsWith("^")) {
        return (
          <div key={li} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: 5, marginTop: 8 }}>
            {parseInline(line.slice(1, -1))}
          </div>
        );
      }
      if (line.trim() === "") return <div key={li} style={{ height: 8 }} />;
      return (
        <p key={li} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.85, marginBottom: 8 }}>
          {parseInline(line)}
        </p>
      );
    });
  };
  
  const parseInline = (text) => {
    // We'll parse tags iteratively and return an array of React elements
    const parts = [];
    // Regex to match all supported tags
    const regex = /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]|\[hl=([^\]]+)\]([\s\S]*?)\[\/hl\]|\[size=(\d+)\]([\s\S]*?)\[\/size\]|\*\*([\s\S]*?)\*\*|_([\s\S]*?)_|__([\s\S]*?)__/g;
    let last = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
      if (match[1] !== undefined) {
        parts.push(<span key={key++} style={{ color: match[1] }}>{parseInline(match[2])}</span>);
      } else if (match[3] !== undefined) {
        parts.push(<span key={key++} style={{ background: match[3], padding: "1px 4px", borderRadius: 3 }}>{parseInline(match[4])}</span>);
      } else if (match[5] !== undefined) {
        parts.push(<span key={key++} style={{ fontSize: parseInt(match[5]) }}>{parseInline(match[6])}</span>);
      } else if (match[7] !== undefined) {
        parts.push(<strong key={key++} style={{ color: "inherit", fontWeight: 700 }}>{match[7]}</strong>);
      } else if (match[8] !== undefined) {
        parts.push(<em key={key++}>{match[8]}</em>);
      } else if (match[9] !== undefined) {
        parts.push(<span key={key++} style={{ textDecoration: "underline" }}>{match[9]}</span>);
      }
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
    return parts.length ? parts : text;
  };
// blocks: [{type:'text', content:''} | {type:'table', rows:[['',...],...]]}]
  const [customContent, setCustomContent] = useState(() => store.get(KEYS.aboutSections) || {});
  const isSuperAdmin = user?.email === ADMIN_EMAIL;

  const saveEdit = (id) => {
  const updated = { ...customContent, [id]: editBlocks };
  store.set(KEYS.aboutSections, updated);
  setCustomContent(updated);
  setEditingSection(null);
  setPreviewMode(false);
  setEditBuffer("");
  setEditBlocks([]);
};

  const toggle = (id) => setOpenSection(openSection === id ? null : id);

  const SectionHeader = ({ id, label, sub }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 22px",
        borderBottom: openSection === id ? `1px solid ${BORDER}` : "none",
        background: openSection === id ? "rgba(200,169,110,0.05)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div onClick={() => toggle(id)} style={{ flex: 1, cursor: "pointer" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isSuperAdmin && openSection === id && editingSection !== id && (
          <button
          onClick={(e) => {
            e.stopPropagation();
            const existing = customContent[id];
            if (Array.isArray(existing)) {
              setEditBlocks(existing.map(b => b.type === 'table'
                ? { type: 'table', rows: b.rows.map(r => [...r]) }
                : { ...b }
              ));
            } else if (typeof existing === 'string' && existing) {
              setEditBlocks([{ type: 'text', content: existing }]);
            } else {
              setEditBlocks([{ type: 'text', content: '' }]);
            }
            setPreviewMode(false);
            setActiveTextBlock(null);
            setEditingSection(id);
          }}
            style={{ padding: "4px 12px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 6, color: GOLD, fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}
          >
            EDIT
          </button>
        )}
        <span onClick={() => toggle(id)} style={{ fontSize: 16, color: openSection === id ? GOLD : "rgba(255,255,255,0.25)", cursor: "pointer", transition: "color 0.15s" }}>
          {openSection === id ? "▲" : "▼"}
        </span>
      </div>
    </div>
  );

  const Body = ({ children }) => (
    <div style={{ padding: "22px 24px", animation: "fadeIn 0.2s ease" }}>
      {children}
    </div>
  );

  const Para = ({ children }) => (
    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.85, marginBottom: 14 }}>
      {children}
    </p>
  );

  const Heading = ({ children, color = GOLD }) => (
    <div style={{ fontSize: 10, color, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 10, marginTop: 6 }}>
      {children}
    </div>
  );

  const Bullet = ({ children, color = TEAL }) => (
    <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 6 }} />
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.75 }}>{children}</span>
    </div>
  );

  const Divider = () => (
    <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "16px 0" }} />
  );

  const sections = [
    {
      id: "what",
      label: "01 — What Ulrevix Is",
      sub: "The company defined",
      content: (
        <Body>
          <Para>
            Ulrevix is a digital-first company built around two distinct but complementary divisions: a faceless digital channel operation and a storytelling application called Lore. We are not an agency, not a studio, and not a software house in the traditional sense. We are operators — people who build systems, audiences, and products that generate value at scale without requiring our faces, personal brands, or geographic presence to be the engine.
          </Para>
          <Para>
            What makes Ulrevix unusual is the deliberate pairing of content infrastructure with product development. The channels division generates compounding revenue through strategic content ecosystems. The Lore division builds the product layer that will eventually serve creators, communities, and operators globally. Both divisions run simultaneously, and both inform each other.
          </Para>
          <Para>
            We are a small team operating with the discipline of a larger organization. Every system we build is designed to outlast its creator, every process documented, every function replaceable. The business is the product. The team is the engine.
          </Para>
        </Body>
      ),
    },
    {
      id: "operate",
      label: "02 — How We Operate",
      sub: "Structure, rhythm, and expectations",
      content: (
        <Body>
          <Para>
            Ulrevix operates as a remote-first, asynchronous organization. There are no physical offices. There are no fixed working hours mandated by a clock. What exists instead is a clear system of accountability: deliverables, deadlines, weekly reports, monthly reports, and a shared understanding that output is the currency here, not hours logged.
          </Para>
          <Heading>THE OPERATING RHYTHM</Heading>
          <Bullet>Weekly reports are submitted every last Friday of the week — covering tasks worked on, blockers encountered, and goals for the week ahead.</Bullet>
          <Bullet>Monthly reports are submitted on the last Friday of each month — covering a broader summary, key achievements, and intentions for the following month.</Bullet>
          <Bullet>Meetings are scheduled as needed, with all details (Google Meet links, file references, summaries) documented on the platform.</Bullet>
          <Bullet>Tasks are assigned through the project management system. Every task requires proof of completion — a file, a link, a deliverable — before it can be marked done.</Bullet>
          <Divider />
          <Para>
            The platform you are currently using — Ulrevix Team OS — is the operational backbone. It tracks projects, tasks, communications, performance, growth goals, and team intelligence. Using it consistently and honestly is part of the job, not optional.
          </Para>
          <Para>
            We do not micromanage. We do not send chase-up messages asking for updates that should already be visible on the platform. If something is not on the platform, it did not happen as far as the organization is concerned.
          </Para>
        </Body>
      ),
    },
    {
      id: "div1",
      label: "03 — Division I: Faceless Digital Channels",
      sub: "The revenue infrastructure",
      content: (
        <Body>
          <Heading>THE VISION</Heading>
          <Para>
            The faceless digital channel division operates on a single premise: the internet does not require your identity to reward your intellect. Platforms like YouTube, TikTok, Instagram, Pinterest, and others distribute value based on content quality, consistency, and strategic positioning — not on who you are or what you look like.
          </Para>
          <Para>
            Ulrevix builds and operates channels across multiple niches and platforms using this principle. Each channel is treated as a standalone media asset — with its own content strategy, production pipeline, monetization stack, and growth trajectory. Channels are built to compound: the older and more established they are, the more they earn with proportionally less effort.
          </Para>
          <Heading color={TEAL}>WHY FACELESS</Heading>
          <Bullet color={GOLD}>Personal brands are fragile. Faceless channels are systems. Systems scale without personality limitations.</Bullet>
          <Bullet color={GOLD}>A channel built correctly can outlast any individual team member who helped create it.</Bullet>
          <Bullet color={GOLD}>Operating multiple channels simultaneously is only possible without personal brand dependency.</Bullet>
          <Bullet color={GOLD}>The separation of identity from content allows for pivots, rebranding, and niche diversification without audience confusion.</Bullet>
          <Divider />
          <Para>
            This division is the current primary revenue driver for Ulrevix. It funds operations, compensates the team, and generates the capital that will eventually support the Lore division through to launch and beyond.
          </Para>
        </Body>
      ),
    },
    {
      id: "div2",
      label: "04 — Division II: Lore — The Storytelling Application",
      sub: "The product being built",
      content: (
        <Body>
          <Heading>WHAT LORE ACTUALLY IS</Heading>
          <Para>
            Lore is a storytelling application being developed by Ulrevix. It is not a social media platform. It is not a blogging tool. It is not a writing app with a share button added. Lore is a purpose-built environment for narrative — a space where stories are not just written but experienced, where the reader is not a passive consumer but an active participant in the unfolding of a world.
          </Para>
          <Para>
            At its core, Lore is built around the belief that storytelling is one of the oldest and most powerful human technologies, and that the tools available to modern storytellers — especially digital ones — are inadequate. Most platforms optimise for brevity, engagement metrics, and virality. Lore optimises for depth, immersion, and meaning.
          </Para>
          <Divider />
          <Heading>THE EXPERIENCE FEATURE SET</Heading>
          <Bullet>Branching narrative architecture — stories that respond to reader choices, creating genuinely divergent paths and multiple endings.</Bullet>
          <Bullet>World-building tools — the ability to build lore documents, timelines, character profiles, and location maps attached to stories.</Bullet>
          <Bullet>Atmosphere layers — ambient soundscapes, visual palettes, and pacing controls that allow authors to craft the emotional environment of their story.</Bullet>
          <Bullet>Collaborative storytelling — structures for co-authoring, shared universes, and community contributions to ongoing narratives.</Bullet>
          <Bullet>Reader memory — the platform remembers choices, state, and history so returning readers experience continuity, not repetition.</Bullet>
          <Bullet>Private and public modes — stories can be personal journals, closed community experiences, or open world releases.</Bullet>
          <Divider />
          <Heading color={PURPLE}>WHY THIS MATTERS FOR ULREVIX OPERATORS</Heading>
          <Para>
            The faceless channels division produces content. Lore produces an infrastructure for content. Every operator in the channels division is, in some capacity, a storyteller — building narratives around niches, audiences, and ideas. Lore gives those skills a product home. Team members who deeply understand content, audience psychology, and narrative structure are among the most valuable contributors to Lore's development.
          </Para>
          <Para>
            Lore is also the long-term equity play for this company. Channels generate cash. Lore, if executed correctly, generates enterprise value. Both matter. Both are real. The team that builds Ulrevix is building both simultaneously.
          </Para>
        </Body>
      ),
    },
    {
      id: "values",
      label: "05 — Values and Skills We Trade In",
      sub: "What this organisation actually runs on",
      content: (
        <Body>
          <Heading>THE VALUES</Heading>
          <Bullet color={GOLD}>Ownership without prompting — doing what needs to be done because it needs to be done, not because someone asked.</Bullet>
          <Bullet color={GOLD}>Transparency over comfort — reporting honestly, including failures, blockers, and uncertainty, rather than performing competence.</Bullet>
          <Bullet color={GOLD}>Craft over speed — producing work that is genuinely good, not merely complete.</Bullet>
          <Bullet color={GOLD}>Systems thinking — designing processes that work even when the designer is absent.</Bullet>
          <Bullet color={GOLD}>Compounding over short-termism — making decisions that sacrifice short-term ease for long-term value.</Bullet>
          <Divider />
          <Heading>THE SKILLS</Heading>
          <Para>
            Ulrevix trades in a specific set of competencies. These are not just job descriptions — they are the vocabulary of the company. People who are fluent in these areas are the people this organization is designed to work with:
          </Para>
          <Bullet>Content strategy and ideation — understanding why an audience watches, reads, or engages, and reverse-engineering that into a repeatable content system.</Bullet>
          <Bullet>Scriptwriting and narrative construction — the ability to structure information as a story, not just a presentation of facts.</Bullet>
          <Bullet>Video production and editing — the technical and aesthetic ability to bring a script to life visually.</Bullet>
          <Bullet>Graphic and visual design — creating identity, clarity, and atmosphere through visual decisions.</Bullet>
          <Bullet>Product thinking — understanding what a user needs and designing experiences around that need.</Bullet>
          <Bullet>Research and synthesis — finding what is not obvious and making it usable.</Bullet>
          <Bullet>Distribution and platform mechanics — understanding how algorithmic platforms reward or punish certain behaviours and using that knowledge strategically.</Bullet>
        </Body>
      ),
    },
    {
      id: "vision",
      label: "06 — Vision and Mission",
      sub: "Where this is going and why",
      content: (
        <Body>
          <Heading color={TEAL}>THE VISION</Heading>
          <Para>
            A world where the most interesting stories are the most accessible, where building a sustainable business does not require trading your identity for an audience, and where a small, talented, disciplined team can build something that outlasts and outperforms organizations ten times its size.
          </Para>
          <Divider />
          <Heading>THE MISSION</Heading>
          <Para>
            To build compounding digital assets through strategic content systems and to develop Lore into the definitive storytelling platform for the next generation of narrative — funding both through disciplined operations, distributing wealth to the people who make it possible, and refusing to compromise craft for convenience at any stage of the journey.
          </Para>
          <Divider />
          <Para>
            The mission is not to be the biggest. It is to be the best-built. A company with no bloat, no dead weight, no performative activity — just systems that work, people who deliver, and products that matter.
          </Para>
        </Body>
      ),
    },
    {
      id: "philosophy",
      label: "07 — Founding Philosophy",
      sub: "The beliefs this company was built on",
      content: (
        <Body>
          <Para>
            Ulrevix was founded on a set of convictions that run counter to most conventional startup thinking. They are worth stating plainly:
          </Para>
          <Bullet color={PURPLE}>The best businesses are built quietly. Visibility is not the same as value. Many of the most profitable operations in the world are entirely unknown to the general public. Ulrevix aspires to that kind of quiet, compounding excellence.</Bullet>
          <Bullet color={PURPLE}>Talent without structure is waste. Gifted individuals operating without systems, documentation, and accountability produce less than averagely talented individuals operating inside well-designed processes. Ulrevix invests in structure first.</Bullet>
          <Bullet color={PURPLE}>Equity is earned, not granted. Nobody deserves a share of something they did not help build. The people who will eventually hold meaningful stakes in what Ulrevix becomes are the people who show up now, before it is obvious, and do the work before it is rewarded.</Bullet>
          <Bullet color={PURPLE}>Remote does not mean casual. Working from anywhere is a privilege that must be protected by results. The standard for remote work at Ulrevix is higher than the standard for in-person work, not lower.</Bullet>
          <Bullet color={PURPLE}>The compound effect is the only strategy. One great video, one great feature, one great decision rarely changes anything. One thousand of them, made consistently over time, changes everything. Ulrevix plays the long game exclusively.</Bullet>
        </Body>
      ),
    },
    {
      id: "who",
      label: "08 — Who We Want on This Journey",
      sub: "The profile of a true Ulrevix operator",
      content: (
        <Body>
          <Para>
            This is not a company for everyone. That is not elitism — it is accuracy. Ulrevix works best for a specific kind of person, and being honest about that upfront saves everyone time.
          </Para>
          <Heading>THE ULREVIX OPERATOR</Heading>
          <Bullet color={GOLD}>Someone who is motivated by what they are building, not just by what they are being paid. The compensation is real and it grows — but if money alone is the driver, the slow early phase of any serious company will feel intolerable.</Bullet>
          <Bullet color={GOLD}>Someone who can operate without hand-holding. There is a manager and there is a system. There is not someone to check that you are working or remind you of your deadlines. You either function with autonomy or you do not function here.</Bullet>
          <Bullet color={GOLD}>Someone who communicates problems early. The worst thing a team member can do is go silent when things are difficult. Transparency about blockers, mistakes, and confusion is not weakness — it is the operating standard.</Bullet>
          <Bullet color={GOLD}>Someone who takes quality personally. Submitting mediocre work because a deadline was close is not acceptable. Either the work is good, or the deadline gets renegotiated before it passes, not after.</Bullet>
          <Bullet color={GOLD}>Someone who sees the larger picture. Understanding why their specific task matters to the division, and why the division matters to the company, and why the company matters to the people it will eventually serve.</Bullet>
          <Divider />
          <Para>
            We are not looking for people who are already experts. We are looking for people who are precise, honest, hungry, and capable of growth. The skills can be developed. The character traits listed above cannot be installed.
          </Para>
        </Body>
      ),
    },
    {
      id: "nonneg",
      label: "09 — The One Non-Negotiable",
      sub: "The single rule that governs everything",
      content: (
        <Body>
          <div style={{ background: `linear-gradient(135deg,${RED}12,${RED}06)`, border: `1px solid ${RED}33`, borderRadius: 12, padding: "20px 22px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: RED, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 10 }}>THE ABSOLUTE RULE</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.7, margin: 0 }}>
              Do not lie about your work. Not to the team, not to the platform, not to yourself.
            </p>
          </div>
          <Para>
            Everything else at Ulrevix is negotiable in some form. Deadlines can be moved. Roles can evolve. Strategies can pivot. Compensation can be restructured. Methods can be questioned and changed.
          </Para>
          <Para>
            But dishonesty about what you have done, what you have not done, what you understand, or what you are struggling with — that ends the relationship immediately and permanently. Not as a punitive measure, but as a structural necessity.
          </Para>
          <Para>
            This organization runs on information. Every decision made by the admin, every project allocation, every performance review, every growth plan is based on the data flowing through this platform and the reports submitted by the people on it. If that data is corrupted by misrepresentation — intentional or habitual — the entire system fails.
          </Para>
          <Para>
            A team member who says "I did not finish this" is an asset. A team member who pretends they finished it is a liability that cannot be priced or managed. The former gets support. The latter gets removed.
          </Para>
        </Body>
      ),
    },
    {
      id: "comp",
      label: "10 — Compensation: The Ulrevix Wealth Architecture",
      sub: "How value is distributed to the people who create it",
      content: (
        <Body>
          <Para>
            Compensation at Ulrevix is not a single number. It is a structure — designed to reward contribution across time, to grow alongside the company, and to eventually place meaningful wealth in the hands of the people who helped build it.
          </Para>
          <Heading>THE LAYERS</Heading>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            {[
              { label: "BASE COMPENSATION", color: GOLD, desc: "Every active team member receives a base payment tied to their role and output level. This is the floor, not the ceiling. It is reviewed periodically and increases as the company's revenue base grows and as individual performance is demonstrated over time." },
              { label: "PERFORMANCE BONUSES", color: TEAL, desc: "Specific milestones — channel revenue thresholds, product development completions, exceptional deliverable quality — trigger bonus payments. These are defined in advance, not handed out at discretion. If the milestone is hit, the bonus is paid." },
              { label: "PROFIT PARTICIPATION", color: PURPLE, desc: "As the channels division matures and Lore moves toward launch and monetization, a profit participation structure will be activated for long-standing team members. This is not equity in the legal sense — it is a contractual right to a percentage of specific revenue streams, tied to tenure and contribution level." },
              { label: "EQUITY PATHWAYS", color: RED, desc: "Formal equity — actual ownership stakes in Ulrevix or its subsidiary entities — is available to a small number of people who demonstrate sustained excellence, strategic value, and long-term alignment with the company's direction. This is not promised to everyone. It is earned by a few." },
            ].map(({ label, color, desc }) => (
              <div key={label} style={{ background: color + "08", border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 10, color, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
          <Divider />
          <Para>
            The architecture is intentional. It is designed to create alignment: the more the company earns, the more the team earns. There is no scenario in Ulrevix's roadmap where the company thrives while the people who built it are left behind. That is not charity — it is infrastructure. People who are compensated fairly build better things.
          </Para>
        </Body>
      ),
    },
    {
      id: "invite",
      label: "11 — The Ulrevix Invitation",
      sub: "What joining this team actually means",
      content: (
        <Body>
          <div style={{ background: `linear-gradient(135deg,${GOLD}12,${TEAL}06)`, border: `1px solid ${GOLD}33`, borderRadius: 14, padding: "24px 26px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em", marginBottom: 12 }}>THE INVITATION</div>
            <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.85, margin: 0, fontStyle: "italic" }}>
              "You have been invited into a company that is being built with care, ambition, and a refusal to cut corners. What you are joining is not finished. It is not safe in the way a large corporation feels safe. It is not guaranteed. What it is, however, is real — and it is being built by people who intend to see it through."
            </p>
          </div>
          <Para>
            Being on this platform means you were evaluated and chosen. Not because we needed warm bodies, but because something about your profile, your attitude, or your work suggested that you belonged in this particular room. That is worth something. Not everything — you still have to perform — but it is worth acknowledging.
          </Para>
          <Para>
            What Ulrevix offers in return for genuine contribution is not just compensation, though the compensation is real and will grow. What it offers is the experience of building something properly — of being part of a team that takes its work seriously, documents what it learns, distributes wealth to the people who create it, and one day, looks back at the systems it built from the early days and knows it was done right.
          </Para>
          <Para>
            The channels will keep growing. Lore will launch. The team will expand. The revenue will compound. And the people who are here now — who did the work before it was obvious, before it was proven, before it was celebrated — will be the ones who built it.
          </Para>
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 20px", marginTop: 8 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", marginBottom: 6 }}>ONE LAST THING</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, margin: 0 }}>
              If at any point you feel unclear about your role, your contribution, or your future here — ask. Directly. The answer will be honest. That is the only kind of answer this company gives.
            </p>
          </div>
        </Body>
      ),
    },
  ];

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      {/* Header Banner */}
      <div style={{ background: `linear-gradient(135deg,rgba(200,169,110,0.07),rgba(126,184,164,0.04))`, border: `1px solid ${GOLD}22`, borderRadius: 16, padding: "28px 32px", marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", letterSpacing: "0.14em", marginBottom: 10 }}>ULREVIX TEAM OS · COMPANY OVERVIEW</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>
          About <span style={{ color: GOLD }}>Ulrevix</span>
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, maxWidth: 620, margin: 0 }}>
          Everything you need to understand what this company is, what it is building, how it operates, and what it offers the people who choose to be part of it. Read this once. Come back to it when you need grounding.
        </p>
      </div>

      {/* Accordion Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sections.map((s) => (
          <div key={s.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${openSection === s.id ? GOLD + "44" : BORDER}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
            <SectionHeader id={s.id} label={s.label} sub={s.sub} />
            {openSection === s.id && (
  editingSection === s.id ? (
    <div style={{ padding: "20px 24px", animation: "fadeIn 0.2s ease" }}>
      {previewMode ? (
        /* ── PREVIEW / REVIEW MODE ── */
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ padding: "6px 14px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 20, fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
              PREVIEW — REVIEW BEFORE PUBLISHING
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}33`, borderRadius: 10, padding: "18px 20px", marginBottom: 18, minHeight: 80 }}>
            {editBlocks.map((block, bi) =>
              block.type === "text" ? (
                <div key={bi} style={{ marginBottom: 10 }}>{renderFormattedText(block.content)}</div>
              ) : (
                <div key={bi} style={{ overflowX: "auto", marginBottom: 18 }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                    <tbody>
                      {block.rows.map((row, ri) => (
                        <tr key={ri} style={{ background: ri === 0 ? "rgba(200,169,110,0.08)" : ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{ border: `1px solid ${BORDER}`, padding: "8px 12px", color: ri === 0 ? GOLD : "rgba(255,255,255,0.65)", fontWeight: ri === 0 ? 600 : 400, fontFamily: ri === 0 ? "'DM Mono',monospace" : "'Sora',sans-serif" }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => saveEdit(s.id)} style={{ padding: "9px 22px", fontSize: 12, background: TEAL, color: BG }}>
              ✓ Confirm & Publish
            </Btn>
            <Btn variant="secondary" onClick={() => setPreviewMode(false)} style={{ padding: "9px 16px", fontSize: 12 }}>
              ← Back to Edit
            </Btn>
            <Btn variant="danger" onClick={() => { setEditingSection(null); setPreviewMode(false); setEditBuffer(""); setEditBlocks([]); }} style={{ padding: "9px 16px", fontSize: 12 }}>
              Discard
            </Btn>
          </div>
        </div>
      ) : (
        /* ── EDIT MODE ── */
        <div>
          <div style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Mono',monospace", marginBottom: 14, letterSpacing: "0.08em" }}>
            EDITING — Select text in any block then click a toolbar button to apply formatting.
          </div>
  
          {editBlocks.map((block, bi) => (
            <div key={bi} style={{ marginBottom: 14, border: `1px solid ${activeTextBlock === bi ? GOLD + "66" : BORDER}`, borderRadius: 8, overflow: "hidden" }}>
              {/* Block type header + controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", flex: 1 }}>
                  {block.type === "text" ? `TEXT BLOCK ${bi + 1}` : `TABLE BLOCK ${bi + 1}`}
                </span>
                <button onClick={() => { const nb = [...editBlocks]; nb.splice(bi, 0, { type: "text", content: "" }); setEditBlocks(nb); }} style={{ padding: "3px 9px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 5, color: TEAL, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ TEXT</button>
                <button onClick={() => { const nb = [...editBlocks]; nb.splice(bi, 0, { type: "table", rows: [["", ""], ["", ""]] }); setEditBlocks(nb); }} style={{ padding: "3px 9px", background: PURPLE + "22", border: `1px solid ${PURPLE}44`, borderRadius: 5, color: PURPLE, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ TABLE</button>
                <button onClick={() => { const nb = editBlocks.filter((_, i) => i !== bi); setEditBlocks(nb.length ? nb : [{ type: "text", content: "" }]); }} style={{ padding: "3px 9px", background: RED + "22", border: `1px solid ${RED}44`, borderRadius: 5, color: RED, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>✕ REMOVE</button>
              </div>
  
              {block.type === "text" ? (
                <div>
                  {activeTextBlock === bi && (
                    <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}` }}>
                      <RichTextToolbar onFormat={(fmt) => applyFormat(bi, fmt)} />
                    </div>
                  )}
                  <textarea
                    ref={(el) => { textAreaRefs.current[bi] = el; }}
                    value={block.content}
                    onFocus={() => setActiveTextBlock(bi)}
                    onChange={(e) => {
                      const nb = [...editBlocks];
                      nb[bi] = { ...nb[bi], content: e.target.value };
                      setEditBlocks(nb);
                    }}
                    rows={6}
                    placeholder={`Write your text here. Select text and use the toolbar above to format it.\n\nMarkup guide:\n  # Heading 1  ## Heading 2  ### Heading 3  ^Sub-header^\n  **bold**  _italic_  __underline__\n  [color=#C8A96E]gold text[/color]\n  [hl=#7EB8A4]highlighted[/hl]\n  [size=18]large text[/size]`}
                    style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "none", color: "#fff", fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.7, display: "block", fontFamily: "'Sora',sans-serif" }}
                  />
                </div>
              ) : (
                <div style={{ overflowX: "auto", padding: "12px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{block.rows[0]?.length || 0} COLS · {block.rows.length} ROWS</span>
                    <button onClick={() => { const nb = [...editBlocks]; nb[bi] = { ...nb[bi], rows: nb[bi].rows.map(r => [...r, ""]) }; setEditBlocks(nb); }} style={{ padding: "3px 9px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 5, color: GOLD, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ COL</button>
                    <button onClick={() => { const nb = [...editBlocks]; const cols = nb[bi].rows[0]?.length || 0; if (cols <= 1) return; nb[bi] = { ...nb[bi], rows: nb[bi].rows.map(r => r.slice(0, -1)) }; setEditBlocks(nb); }} style={{ padding: "3px 9px", background: RED + "15", border: `1px solid ${RED}33`, borderRadius: 5, color: RED, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>− COL</button>
                    <button onClick={() => { const nb = [...editBlocks]; const cols = nb[bi].rows[0]?.length || 2; nb[bi] = { ...nb[bi], rows: [...nb[bi].rows, Array(cols).fill("")] }; setEditBlocks(nb); }} style={{ padding: "3px 9px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 5, color: GOLD, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ ROW</button>
                    <button onClick={() => { const nb = [...editBlocks]; if (nb[bi].rows.length <= 1) return; nb[bi] = { ...nb[bi], rows: nb[bi].rows.slice(0, -1) }; setEditBlocks(nb); }} style={{ padding: "3px 9px", background: RED + "15", border: `1px solid ${RED}33`, borderRadius: 5, color: RED, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>− ROW</button>
                  </div>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <tbody>
                      {block.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{ border: `1px solid ${BORDER}`, padding: 0 }}>
                              <input value={cell} onChange={(e) => { const nb = [...editBlocks]; nb[bi].rows[ri][ci] = e.target.value; setEditBlocks([...nb]); }} style={{ width: "100%", padding: "7px 10px", background: ri === 0 ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)", border: "none", color: ri === 0 ? GOLD : "#fff", fontSize: 12, outline: "none", fontWeight: ri === 0 ? 600 : 400, fontFamily: ri === 0 ? "'DM Mono',monospace" : "'Sora',sans-serif" }} placeholder={ri === 0 ? `Header ${ci + 1}` : `Row ${ri}, Col ${ci + 1}`} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>First row is treated as the header row.</div>
                </div>
              )}
            </div>
          ))}
  
          {/* Add block at end */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => setEditBlocks([...editBlocks, { type: "text", content: "" }])} style={{ padding: "6px 14px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 6, color: TEAL, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ Add Text Block</button>
            <button onClick={() => setEditBlocks([...editBlocks, { type: "table", rows: [["", ""], ["", ""]] }])} style={{ padding: "6px 14px", background: PURPLE + "22", border: `1px solid ${PURPLE}44`, borderRadius: 6, color: PURPLE, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ Add Table</button>
          </div>
  
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => { setPreviewMode(true); setActiveTextBlock(null); }} style={{ padding: "8px 20px", fontSize: 12, background: GOLD, color: BG }}>
              Review Before Publishing →
            </Btn>
            <Btn variant="secondary" onClick={() => { setEditingSection(null); setPreviewMode(false); setEditBuffer(""); setEditBlocks([]); setActiveTextBlock(null); }} style={{ padding: "8px 14px", fontSize: 12 }}>
              Cancel
            </Btn>
          </div>
        </div>
      )}
    </div>
  ) : (
    customContent[s.id] ? (
      <div style={{ padding: "22px 24px", animation: "fadeIn 0.2s ease" }}>
        {Array.isArray(customContent[s.id])
          ? customContent[s.id].map((block, bi) =>
              block.type === 'text' ? (
                <div key={bi} style={{ marginBottom: 10 }}>{renderFormattedText(block.content)}</div>
              ) : (
                <div key={bi} style={{ overflowX: 'auto', marginBottom: 18 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <tbody>
                      {block.rows.map((row, ri) => (
                        <tr key={ri} style={{ background: ri === 0 ? 'rgba(200,169,110,0.08)' : ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{ border: `1px solid ${BORDER}`, padding: '8px 12px', color: ri === 0 ? GOLD : 'rgba(255,255,255,0.65)', fontWeight: ri === 0 ? 600 : 400, fontFamily: ri === 0 ? "'DM Mono',monospace" : "'Sora',sans-serif", letterSpacing: ri === 0 ? '0.04em' : 'normal' }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )
          : <div>{renderFormattedText(typeof customContent[s.id] === "string" ? customContent[s.id] : "")}</div>
        }
      </div>
    ) : s.content
  )
)}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── ROLE CLARITY ────────────────────────────────────────────────────────────
const RoleClarity = ({ user }) => {
  const [openSection, setOpenSection] = useState(null);
  const [selectedMemberEmail, setSelectedMemberEmail] = useState(user.email);
  const [editingSection, setEditingSection] = useState(null);
const [editBuffer, setEditBuffer] = useState("");
const [previewMode, setPreviewMode] = useState(false);
const textAreaRef = useRef(null);
  const toggle = (id) => setOpenSection(openSection === id ? null : id);

  const isSuperAdmin = user.email === ADMIN_EMAIL;
  const viewingEmail = isSuperAdmin ? selectedMemberEmail : user.email;

  const getRoleContent = (email) => {
    const allRoleContent = store.get("ulx_role_clarity") || {};
    return allRoleContent[email] || {};
  };

  const saveRoleContent = (email, sectionId, text) => {
    const allRoleContent = store.get("ulx_role_clarity") || {};
    if (!allRoleContent[email]) allRoleContent[email] = {};
    allRoleContent[email][sectionId] = text;
    store.set("ulx_role_clarity", allRoleContent);
  };

  const RoleRichTextToolbar = ({ onFormat }) => {
  const SITE_COLORS = [
    { label: "Gold", value: GOLD },
    { label: "Teal", value: TEAL },
    { label: "Purple", value: PURPLE },
    { label: "Red", value: RED },
    { label: "Blue", value: "#7BA8C4" },
    { label: "Green", value: "#A4C47B" },
    { label: "White", value: "#ffffff" },
    { label: "Muted", value: "rgba(255,255,255,0.45)" },
  ];
  const btnStyle = (color = "rgba(255,255,255,0.5)") => ({
    padding: "4px 10px",
    background: "rgba(255,255,255,0.05)",
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: 5,
    color,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "'DM Mono',monospace",
    whiteSpace: "nowrap",
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 10 }}>
      {[{ label: "H1", tag: "h1" }, { label: "H2", tag: "h2" }, { label: "H3", tag: "h3" }].map(({ label, tag }) => (
        <button key={tag} style={btnStyle(GOLD)} onClick={() => onFormat(tag)}>{label}</button>
      ))}
      <button style={btnStyle("rgba(255,255,255,0.5)")} onClick={() => onFormat("sub")}>Sub</button>
      <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
      <button style={{ ...btnStyle(), fontWeight: 700 }} onClick={() => onFormat("bold")}><b>B</b></button>
      <button style={{ ...btnStyle(), fontStyle: "italic" }} onClick={() => onFormat("italic")}><i>I</i></button>
      <button style={{ ...btnStyle(), textDecoration: "underline" }} onClick={() => onFormat("underline")}>U̲</button>
      <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
      <button style={btnStyle()} onClick={() => onFormat("uppercase")}>AA</button>
      <button style={btnStyle()} onClick={() => onFormat("lowercase")}>aa</button>
      <button style={btnStyle()} onClick={() => onFormat("capitalize")}>Aa</button>
      <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
      {[10, 12, 13, 15, 18, 22].map(sz => (
        <button key={sz} style={btnStyle()} onClick={() => onFormat(`size_${sz}`)}>{sz}px</button>
      ))}
      <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", alignSelf: "center", fontFamily: "'DM Mono',monospace" }}>HIGHLIGHT:</span>
      {[GOLD, TEAL, PURPLE, RED, "#3a3a00"].map(c => (
        <button key={c} title={`Highlight ${c}`} onClick={() => onFormat(`highlight_${c}`)} style={{ width: 18, height: 18, borderRadius: 3, background: c, border: `2px solid rgba(255,255,255,0.15)`, cursor: "pointer", flexShrink: 0 }} />
      ))}
      <button title="Remove highlight" onClick={() => onFormat("highlight_none")} style={{ ...btnStyle(RED), fontSize: 10 }}>✕ HL</button>
      <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", alignSelf: "center", fontFamily: "'DM Mono',monospace" }}>COLOR:</span>
      {SITE_COLORS.map(({ label, value }) => (
        <button key={value} title={label} onClick={() => onFormat(`color_${value}`)} style={{ width: 18, height: 18, borderRadius: "50%", background: value, border: `2px solid rgba(255,255,255,0.15)`, cursor: "pointer", flexShrink: 0 }} />
      ))}
      <button title="Reset color" onClick={() => onFormat("color_none")} style={{ ...btnStyle("rgba(255,255,255,0.4)"), fontSize: 10 }}>✕ CLR</button>
    </div>
  );
};

const applyRoleFormat = (format) => {
  const ref = textAreaRef.current;
  if (!ref) return;
  const start = ref.selectionStart;
  const end = ref.selectionEnd;
  const selected = editBuffer.slice(start, end);
  const before = editBuffer.slice(0, start);
  const after = editBuffer.slice(end);
  let wrapped = selected;
  if (format === "bold") wrapped = `**${selected}**`;
  else if (format === "italic") wrapped = `_${selected}_`;
  else if (format === "underline") wrapped = `__${selected}__`;
  else if (format === "uppercase") wrapped = selected.toUpperCase();
  else if (format === "lowercase") wrapped = selected.toLowerCase();
  else if (format === "capitalize") wrapped = selected.replace(/\b\w/g, c => c.toUpperCase());
  else if (format === "h1") wrapped = `\n# ${selected}\n`;
  else if (format === "h2") wrapped = `\n## ${selected}\n`;
  else if (format === "h3") wrapped = `\n### ${selected}\n`;
  else if (format === "sub") wrapped = `\n^${selected}^\n`;
  else if (format.startsWith("size_")) { const sz = format.replace("size_", ""); wrapped = `[size=${sz}]${selected}[/size]`; }
  else if (format.startsWith("color_")) { const col = format.replace("color_", ""); if (col === "none") { wrapped = selected.replace(/\[color=[^\]]*\](.*?)\[\/color\]/gs, "$1"); } else { wrapped = `[color=${col}]${selected}[/color]`; } }
  else if (format.startsWith("highlight_")) { const col = format.replace("highlight_", ""); if (col === "none") { wrapped = selected.replace(/\[hl=[^\]]*\](.*?)\[\/hl\]/gs, "$1"); } else { wrapped = `[hl=${col}]${selected}[/hl]`; } }
  const newText = before + wrapped + after;
  setEditBuffer(newText);
  setTimeout(() => { if (ref) { ref.focus(); ref.selectionStart = start; ref.selectionEnd = start + wrapped.length; } }, 10);
};

const renderRoleFormattedText = (text) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, li) => {
    if (line.startsWith("# ")) return <div key={li} style={{ fontSize: 20, fontWeight: 900, color: GOLD, letterSpacing: "-0.02em", marginBottom: 10, marginTop: 14 }}>{parseRoleInline(line.slice(2))}</div>;
    if (line.startsWith("## ")) return <div key={li} style={{ fontSize: 15, fontWeight: 700, color: TEAL, marginBottom: 8, marginTop: 12 }}>{parseRoleInline(line.slice(3))}</div>;
    if (line.startsWith("### ")) return <div key={li} style={{ fontSize: 13, fontWeight: 700, color: PURPLE, marginBottom: 6, marginTop: 10 }}>{parseRoleInline(line.slice(4))}</div>;
    if (line.startsWith("^") && line.endsWith("^")) return <div key={li} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: 5, marginTop: 8 }}>{parseRoleInline(line.slice(1, -1))}</div>;
    if (line.trim() === "") return <div key={li} style={{ height: 8 }} />;
    return <p key={li} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.85, marginBottom: 8 }}>{parseRoleInline(line)}</p>;
  });
};

const parseRoleInline = (text) => {
  const parts = [];
  const regex = /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]|\[hl=([^\]]+)\]([\s\S]*?)\[\/hl\]|\[size=(\d+)\]([\s\S]*?)\[\/size\]|\*\*([\s\S]*?)\*\*|_([\s\S]*?)_|__([\s\S]*?)__/g;
  let last = 0; let match; let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    if (match[1] !== undefined) parts.push(<span key={key++} style={{ color: match[1] }}>{parseRoleInline(match[2])}</span>);
    else if (match[3] !== undefined) parts.push(<span key={key++} style={{ background: match[3], padding: "1px 4px", borderRadius: 3 }}>{parseRoleInline(match[4])}</span>);
    else if (match[5] !== undefined) parts.push(<span key={key++} style={{ fontSize: parseInt(match[5]) }}>{parseRoleInline(match[6])}</span>);
    else if (match[7] !== undefined) parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[7]}</strong>);
    else if (match[8] !== undefined) parts.push(<em key={key++}>{match[8]}</em>);
    else if (match[9] !== undefined) parts.push(<span key={key++} style={{ textDecoration: "underline" }}>{match[9]}</span>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
};

  const sections = [
    {
      id: "whatitis",
      label: "01 — What This Role Actually Is",
      sub: "The honest definition",
    },
    {
      id: "dailyreality",
      label: "02 — What You Would Do: Your Daily Reality",
      sub: "A day in this role, plainly described",
    },
    {
      id: "scorecard",
      label: "03 — What Success Looks Like: Your Scorecard",
      sub: "How your performance will be measured",
    },
    {
      id: "nonneg",
      label: "04 — What Is Expected From You: The Non-Negotiable",
      sub: "The baseline that is not optional",
    },
    {
      id: "notresponsible",
      label: "05 — What You Are Not Responsible For: Protect Your Focus",
      sub: "The boundaries of your role",
    },
    {
      id: "arc",
      label: "06 — The 30-60-90 Day Arc",
      sub: "Your ramp from new to embedded",
    },
    {
      id: "whatyouget",
      label: "07 — What You Get: The Compensation and Growth Architecture",
      sub: "How value flows back to you",
    },
    {
      id: "finalfilter",
      label: "08 — The Final Filter",
      sub: "The last question before you commit",
    },
  ];

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      {/* Header Banner */}
      <div
        style={{
          background: `linear-gradient(135deg,rgba(155,142,196,0.10),rgba(126,184,164,0.05))`,
          border: `1px solid ${PURPLE}33`,
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: PURPLE,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "0.14em",
            marginBottom: 10,
          }}
        >
          ULREVIX TEAM OS · ROLE DOCUMENTATION
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-0.03em",
            marginBottom: 10,
          }}
        >
          Role <span style={{ color: PURPLE }}>Clarity</span>
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.8,
            maxWidth: 620,
            margin: 0,
          }}
        >
          Everything you need to understand what your role is, what is expected
          of you, how you will be measured, and what you will receive in return.
          Read this carefully. It is not boilerplate — it is your operating
          contract.
        </p>
      </div>

      {/* Member selector — admin only */}
      {isSuperAdmin && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", flexShrink: 0 }}>
            EDITING FOR:
          </div>
          <select
            value={selectedMemberEmail}
            onChange={(e) => { setSelectedMemberEmail(e.target.value); setOpenSection(null); setEditingSection(null); setEditBuffer(""); }}
            style={{ padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }}
          >
            {Object.entries(store.get(KEYS.users) || {}).map(([em, u]) => (
              <option key={em} value={em}>{u.name || em}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: PURPLE, fontFamily: "'DM Mono',monospace" }}>
            {(store.get(KEYS.users) || {})[selectedMemberEmail]?.name || selectedMemberEmail}
          </div>
        </div>
      )}

      {/* Accordion Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sections.map((s) => {
          const savedContent = getRoleContent(viewingEmail)[s.id] || "";
          const isEditing = editingSection === s.id;
          return (
            <div
              key={s.id}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${openSection === s.id ? PURPLE + "55" : BORDER}`,
                borderRadius: 12,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Section Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 22px",
                  borderBottom: openSection === s.id ? `1px solid ${BORDER}` : "none",
                  background: openSection === s.id ? "rgba(155,142,196,0.05)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <div onClick={() => toggle(s.id)} style={{ flex: 1, cursor: "pointer" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.label}</div>
                  {s.sub && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.sub}</div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isSuperAdmin && openSection === s.id && !isEditing && (
                    <button
                    onClick={(e) => { e.stopPropagation(); setEditingSection(s.id); setEditBuffer(savedContent); setPreviewMode(false); }}
                      style={{ padding: "4px 12px", background: PURPLE + "22", border: `1px solid ${PURPLE}44`, borderRadius: 6, color: PURPLE, fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}
                    >
                      EDIT
                    </button>
                  )}
                  <span
                    onClick={() => toggle(s.id)}
                    style={{ fontSize: 16, color: openSection === s.id ? PURPLE : "rgba(255,255,255,0.25)", transition: "color 0.15s", cursor: "pointer" }}
                  >
                    {openSection === s.id ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* Section Body */}
              {openSection === s.id && (
                <div style={{ padding: "22px 26px", animation: "fadeIn 0.2s ease", minHeight: 100 }}>
                  {isEditing && isSuperAdmin ? (
  previewMode ? (
    /* Preview / Review mode */
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ padding: "6px 14px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 20, fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
          PREVIEW — REVIEW BEFORE PUBLISHING
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${PURPLE}33`, borderRadius: 10, padding: "18px 20px", marginBottom: 18, minHeight: 80 }}>
        {renderRoleFormattedText(editBuffer)}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn
          onClick={() => {
            saveRoleContent(viewingEmail, s.id, editBuffer);
            addNotif(viewingEmail, "task", `Your Role Clarity section "${s.label}" has been updated by the admin.`);
            setEditingSection(null);
            setEditBuffer("");
            setPreviewMode(false);
          }}
          style={{ padding: "8px 20px", fontSize: 12, background: TEAL, color: BG }}
        >
          ✓ Confirm & Publish
        </Btn>
        <Btn variant="secondary" onClick={() => setPreviewMode(false)} style={{ padding: "8px 16px", fontSize: 12 }}>
          ← Back to Edit
        </Btn>
        <Btn variant="danger" onClick={() => { setEditingSection(null); setEditBuffer(""); setPreviewMode(false); }} style={{ padding: "8px 16px", fontSize: 12 }}>
          Discard
        </Btn>
      </div>
    </div>
  ) : (
    /* Edit mode with toolbar */
    <div>
      <div style={{ fontSize: 10, color: PURPLE, fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.08em" }}>
        EDITING — {s.label} — for {(store.get(KEYS.users) || {})[viewingEmail]?.name || viewingEmail}
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>
        Select text then click a toolbar button to apply formatting.
      </div>
      <RoleRichTextToolbar onFormat={applyRoleFormat} />
      <textarea
        ref={textAreaRef}
        value={editBuffer}
        onChange={(e) => setEditBuffer(e.target.value)}
        rows={10}
        placeholder={`Write content here. Select text and use the toolbar to format it.\n\nMarkup guide:\n  # Heading 1   ## Heading 2   ### Heading 3   ^Sub-header^\n  **bold**   _italic_   __underline__\n  [color=#C8A96E]gold text[/color]\n  [hl=#7EB8A4]highlighted[/hl]\n  [size=18]large text[/size]`}
        style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${PURPLE}44`, borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.7, fontFamily: "'Sora',sans-serif", marginBottom: 14 }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={() => setPreviewMode(true)} style={{ padding: "8px 20px", fontSize: 12, background: GOLD, color: BG }}>
          Review Before Publishing →
        </Btn>
        <Btn variant="secondary" onClick={() => { setEditingSection(null); setEditBuffer(""); setPreviewMode(false); }} style={{ padding: "8px 14px", fontSize: 12 }}>
          Cancel
        </Btn>
      </div>
    </div>
  )
) : savedContent ? (
  /* Published content — visible to the assigned member */
  <div>
    {renderRoleFormattedText(savedContent)}
  </div>
                  ) : (
                    /* Empty placeholder */
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: PURPLE + "08", border: `1px dashed ${PURPLE}44`, borderRadius: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: PURPLE, flexShrink: 0, animation: "pulse 2s infinite" }} />
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                        {isSuperAdmin
                          ? "This section has not been filled in yet. Click EDIT to add content."
                          : "This section has not been filled in yet. The admin will populate this content."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [launched, setLaunched] = useState(true); // UI always loads; launch state tracked separately via localStorage
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [showNotif, setShowNotif] = useState(false);
  const [globalCall, setGlobalCall] = useState(null);

useEffect(() => {
  if (!user) return;
  const pollGlobalCalls = () => {
    const calls = store.get("ulx_calls") || {};
    const myCall = calls[user.email];
    if (myCall && myCall.status === "ringing" && myCall.callerEmail !== user.email) {
      setGlobalCall(prev => {
        if (prev && prev.callId === myCall.callId) return prev;
        return { type: "incoming", ...myCall };
      });
    } else {
  setGlobalCall(prev => {
    if (!prev) return prev;
    if (!myCall || myCall.callId !== prev.callId) return null;
    if (myCall.status === "cancelled" || myCall.status === "declined") return null;
    return prev;
  });
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
  // Mark as declined so caller detects it
  if (calls[user.email]) {
    calls[user.email].status = "declined";
    store.set("ulx_calls", calls);
  }
  if (callerEmail && calls[`outgoing_${callerEmail}`]) {
    calls[`outgoing_${callerEmail}`].status = "declined";
    store.set("ulx_calls", calls);
  }
  setTimeout(() => {
    const c2 = store.get("ulx_calls") || {};
    delete c2[user.email];
    if (callerEmail) delete c2[`outgoing_${callerEmail}`];
    store.set("ulx_calls", c2);
  }, 2000);
  setGlobalCall(null);
};

  const [timer, setTimer] = useState(INACTIVITY_LIMIT);
const inactivityRef = useRef(null);
  const timerRef = useRef(null);

  // ── auto-logout ──
  const resetInactivity = useCallback(() => {
    setTimer(INACTIVITY_LIMIT);
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      if (user) updatePresence(user.email, false);
      setUser(null);
    }, INACTIVITY_LIMIT);
  }, []);

  useEffect(() => {
    if (!user) return;
    resetInactivity();
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((e) => window.addEventListener(e, resetInactivity));
    timerRef.current = setInterval(
      () => setTimer((t) => Math.max(0, t - 1000)),
      1000
    );

    // Heartbeat: update presence every 60 seconds while logged in
    const heartbeat = setInterval(() => {
      updatePresence(user.email, true);
    }, 60000);

    // Mark offline when tab is closed without signing out
    const handleUnload = () => {
      updatePresence(user.email, false);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivity));
      clearInterval(timerRef.current);
      clearTimeout(inactivityRef.current);
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user, resetInactivity]);

  // ── unread notifs ──
  const unreadNotifs = user
    ? (store.get(KEYS.notifs) || []).filter(
        (n) => n.forEmail === user.email && !n.read
      ).length
    : 0;
  const unreadMsgs = user
    ? (store.get(KEYS.messages) || []).filter(
        (m) => m.to === user.email && !(m.readBy || []).includes(user.email)
      ).length
    : 0;

  const doLaunch = () => {
    if (store.get(KEYS.launched)) return; // already launched, do nothing
    // Save admin password before wiping — so admin doesn't get locked out
    const adminPw = (store.get(KEYS.passwords) || {})[ADMIN_EMAIL];
    const adminUser = (store.get(KEYS.users) || {})[ADMIN_EMAIL];
    // Clear ALL pre-launch test data
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    // Restore admin credentials so they stay logged in after launch
    if (adminPw) {
      store.set(KEYS.passwords, { [ADMIN_EMAIL]: adminPw });
    }
    if (adminUser) {
      store.set(KEYS.users, { [ADMIN_EMAIL]: adminUser });
    }
    // Set launch date to NOW — Week 1 / Day 1 starts here
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

  const viewTitles = {
    dashboard: "Dashboard",
    projects: "Projects",
    tasks: "My Tasks",
    team: "Team",
    analytics: "Analytics",
    reports: "Reports",
    meetings: "Meetings",
    activity: "Activity & Chat",
    ai: "AI Insights",
    issues: "Issues",
    performance: "Performance",
    spotlight: "Member Spotlight",
    growth: "Growth & Development",
    roleClarity: "Role Clarity",
    about: "About Ulrevix",
    profile: "My Profile",
    admin: "Admin Panel",
  };

  if (!user)
    return (
      <>
        <style>{css}</style>
        <Auth
  onLogin={(u) => {
    setUser(u);
    updatePresence(u.email, true);
    resetInactivity();
    const allSigned = store.get(KEYS.confidentialitySigned) || {};
    setAgreementSigned(!!allSigned[u.email]);
  }}
/>
      </>
    );

  if (user && !agreementSigned && user.role !== "admin") {
    return (
      <>
        <style>{css}</style>
        <ConfidentialityGate user={user} onSigned={() => setAgreementSigned(true)} />
      </>
    );
  }

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard user={user} />;
      case "projects":
        return <Projects user={user} />;
      case "tasks":
        return <MyTasks user={user} />;
      case "team":
        return <Team user={user} />;
      case "analytics":
        return <Analytics />;
      case "reports":
        return <Reports user={user} />;
        case "meetings":
        return <Meetings user={user} />;
      case "activity":
        return <ActivityChat user={user} />;
      case "ai":
        return <AIInsights user={user} />;
        case "issues":
  return <Issues user={user} />;
      case "performance":
        return <Performance user={user} />;
        case "roleClarity":
  return <RoleClarity user={user} />;
        case "about":
  return <AboutUlrevix user={user} />;
      case "profile":
        return <Profile user={user} onUserUpdate={setUser} />;
      case "admin":
        return user.role === "admin" ? (
          <AdminPanel
            user={user}
            onLaunch={() => {
              doLaunch();
              setView("dashboard");
            }}
          />
        ) : null;
        case "spotlight":
  return <MemberSpotlight currentUser={user} />;
  case "growth":
  return <Growth user={user} />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        background: BG,
        minHeight: "100vh",
        fontFamily: "'Sora',sans-serif",
        color: "#fff",
      }}
    >
      <style>{css}</style>
      <Sidebar
        view={view}
        setView={setView}
        user={user}
        unreadCount={unreadNotifs + unreadMsgs}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: "100vh",
        }}
      >
        <TopBar
          title={viewTitles[view]}
          user={user}
          onSignOut={signOut}
          notifCount={unreadNotifs}
          onNotif={() => setShowNotif(!showNotif)}
          timer={timer}
        />
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {renderView()}
        </div>
      </div>
      {showNotif && (
        <NotifPanel user={user} onClose={() => setShowNotif(false)} />
      )}
      {globalCall && view !== "activity" && (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
    zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(8px)",
  }}>
    <div style={{
      width: 340, background: "#111118", border: `1px solid ${BORDER}`,
      borderRadius: 20, padding: "36px 28px", textAlign: "center",
      boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
    }}>
      {globalCall.type === "incoming" ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 1s infinite" }}>
            {globalCall.callType === "video" ? "🎥" : "📞"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>
            INCOMING {globalCall.callType?.toUpperCase()} CALL
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 24 }}>
            {globalCall.callerName || globalCall.callerEmail}
            {globalCall.isGroup && <div style={{ fontSize: 13, color: PURPLE, fontWeight: 400, marginTop: 4 }}>Group: {globalCall.groupName}</div>}
          </div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button onClick={handleGlobalEndCall} style={{ width: 56, height: 56, borderRadius: "50%", background: RED, border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
            <button onClick={handleGlobalAcceptCall} style={{ width: 56, height: 56, borderRadius: "50%", background: TEAL, border: "none", fontSize: 22, cursor: "pointer" }}>✓</button>
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace" }}>TAP ✓ TO ACCEPT · ✕ TO DECLINE</div>
        </>
      ) : globalCall.type === "active" ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {globalCall.callType === "video" ? "🎥" : "📞"}
          </div>
          <div style={{ fontSize: 13, color: TEAL, marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>
            {globalCall.callType?.toUpperCase()} CALL CONNECTED
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
            {globalCall.callerName || globalCall.callerEmail}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: TEAL + "22", border: `1px solid ${TEAL}44`, borderRadius: 20, marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 10, color: TEAL, fontFamily: "'DM Mono',monospace" }}>LIVE — BOTH ENDS CONNECTED</span>
          </div>
          <Btn variant="danger" onClick={handleGlobalEndCall} style={{ width: "100%", padding: "11px" }}>End Call</Btn>
        </>
      ) : null}
    </div>
  </div>
)}
    </div>
  );
}


