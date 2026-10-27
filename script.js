const API_BASE = "http://127.0.0.1:8000";
const HISTORY_KEY = "mindscope_prediction_history";
const THEME_KEY = "mindscope_theme";
const MAX_HISTORY = 50;

const $ = (id) => document.getElementById(id);

const form = $("predict-form");
const submitBtn = $("submit-btn");
const resetBtn = $("reset-btn");
const formError = $("form-error");

const states = {
  idle: $("state-idle"),
  loading: $("state-loading"),
  result: $("state-result"),
  error: $("state-error")
};

let lastValidSubmission = null;
let latestResult = null;
let requestInProgress = false;

function showState(name) {
  Object.entries(states).forEach(([key, element]) => {
    element.hidden = key !== name;
  });
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearFormError() {
  formError.textContent = "";
  formError.hidden = true;
}

function setLoading(isLoading) {
  requestInProgress = isLoading;
  submitBtn.disabled = isLoading;
  resetBtn.disabled = isLoading;
  submitBtn.classList.toggle("is-loading", isLoading);
  submitBtn.querySelector(".button-text").textContent = isLoading
    ? "Generating prediction..."
    : "Generate my prediction";
}

function selectStressLevel(value) {
  $("stress_level").value = value;

  document.querySelectorAll(".stress-option").forEach((button) => {
    const selected = button.dataset.value === value;
    button.setAttribute("aria-pressed", String(selected));
  });
}

document.querySelectorAll(".stress-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectStressLevel(button.dataset.value);
    clearFormError();
  });
});

function collectData() {
  return {
    age: Number($("age").value),
    gender: $("gender").value,
    country: $("country").value.trim(),
    academic_Level: $("academic_level").value,
    most_Used_Platform: $("most_used_platform").value,
    purpose_Of_Use: $("purpose_of_use").value,
    avg_Daily_Usage_Hours: Number($("avg_daily_usage_hours").value),
    daily_Unlocks: Number($("daily_unlocks").value),
    study_Hours: Number($("study_hours").value),
    physical_Activity_Hours: Number($("physical_activity_hours").value),
    sleep_Hours_Per_Night: Number($("sleep_hours_per_night").value),
    stress_Level: $("stress_level").value
  };
}

function validateData(data) {
  const requiredValues = [
    ["Age", data.age],
    ["Gender", data.gender],
    ["Country", data.country],
    ["Academic level", data.academic_Level],
    ["Most-used platform", data.most_Used_Platform],
    ["Main purpose", data.purpose_Of_Use],
    ["Daily social media usage", data.avg_Daily_Usage_Hours],
    ["Daily phone unlocks", data.daily_Unlocks],
    ["Study hours", data.study_Hours],
    ["Physical activity", data.physical_Activity_Hours],
    ["Sleep hours", data.sleep_Hours_Per_Night],
    ["Stress level", data.stress_Level]
  ];

  for (const [label, value] of requiredValues) {
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      (typeof value === "number" && !Number.isFinite(value))
    ) {
      return `${label} is required. Please complete all fields.`;
    }
  }

  if (!Number.isInteger(data.age) || data.age < 10 || data.age > 100) {
    return "Age must be a whole number between 10 and 100.";
  }

  if (!Number.isInteger(data.daily_Unlocks) || data.daily_Unlocks < 0) {
    return "Daily phone unlocks must be a non-negative whole number.";
  }

  if (
    data.avg_Daily_Usage_Hours < 0 ||
    data.avg_Daily_Usage_Hours > 24
  ) {
    return "Daily social media usage must be between 0 and 24 hours.";
  }

  if (data.study_Hours < 0 || data.study_Hours > 24) {
    return "Study hours must be between 0 and 24.";
  }

  if (
    data.physical_Activity_Hours < 0 ||
    data.physical_Activity_Hours > 2
  ) {
    return "Physical activity must be between 0 and 2 hours.";
  }

  if (
    data.sleep_Hours_Per_Night < 0 ||
    data.sleep_Hours_Per_Night > 24
  ) {
    return "Sleep hours must be between 0 and 24.";
  }

  if (!["Male", "Female"].includes(data.gender)) {
    return "Please select a valid gender.";
  }

  if (
    !["Undergraduate", "Graduate", "High School"].includes(
      data.academic_Level
    )
  ) {
    return "Please select a valid academic level.";
  }

  if (
    ![
      "Facebook", "LinkedIn", "Instagram", "Snapchat",
      "Twitter", "YouTube", "TikTok", "LINE",
      "KakaoTalk", "VKontakte", "WhatsApp", "WeChat"
    ].includes(data.most_Used_Platform)
  ) {
    return "Please select a valid platform.";
  }

  if (
    !["Networking", "Education", "Entertainment", "News"].includes(
      data.purpose_Of_Use
    )
  ) {
    return "Please select a valid main purpose.";
  }

  if (!["Low", "Medium", "High", "Very High"].includes(data.stress_Level)) {
    return "Please select your stress level.";
  }

  return "";
}

function getHabitFeedback(data) {
  const suggestions = [];

  if (data.sleep_Hours_Per_Night < 7) {
    suggestions.push({
      title: "Sleep routine",
      message:
        "You entered less than 7 hours of sleep. If possible, create a consistent bedtime and allow enough time for rest."
    });
  } else if (data.sleep_Hours_Per_Night >= 7 && data.sleep_Hours_Per_Night <= 9) {
    suggestions.push({
      title: "Sleep routine",
      message:
        "Your reported sleep falls within a commonly recommended 7–9 hour range for many adults. Consistency can also matter."
    });
  } else if (data.sleep_Hours_Per_Night > 9) {
    suggestions.push({
      title: "Sleep routine",
      message:
        "You entered more than 9 hours of sleep. Sleep needs vary; consider how rested you feel and whether your schedule is consistent."
    });
  } else {
    suggestions.push({
      title: "Sleep routine",
      message:
        "You entered zero hours of sleep. If this reflects your actual recent routine, prioritise rest and seek support if sleep difficulties persist."
    });
  }

  if (data.avg_Daily_Usage_Hours > 5) {
    suggestions.push({
      title: "Digital balance",
      message:
        "You reported more than 5 hours of daily social media use. Consider reviewing your screen-time breakdown and scheduling offline breaks."
    });
  } else if (data.avg_Daily_Usage_Hours >= 0 && data.avg_Daily_Usage_Hours <= 2) {
    suggestions.push({
      title: "Digital balance",
      message:
        "You reported up to 2 hours of daily social media use. Notice whether your digital routine leaves enough time for rest, study and connection."
    });
  } else {
    suggestions.push({
      title: "Digital balance",
      message:
        "Consider checking whether your social media use supports your goals and taking short breaks when you need them."
    });
  }

  if (data.physical_Activity_Hours < 0.5) {
    suggestions.push({
      title: "Movement",
      message:
        "You reported less than 30 minutes of physical activity. If suitable for you, try adding a short walk or gentle movement break to your day."
    });
  } else {
    suggestions.push({
      title: "Movement",
      message:
        "You reported some daily physical activity. Choose a sustainable routine that fits your energy, abilities and schedule."
    });
  }

  if (data.stress_Level === "High" || data.stress_Level === "Very High") {
    suggestions.push({
      title: "Stress and support",
      message:
        "You selected a high stress level. Consider breaking tasks into smaller steps, taking restorative breaks and speaking with someone you trust."
    });
  } else if (data.stress_Level === "Medium") {
    suggestions.push({
      title: "Stress and support",
      message:
        "You selected a medium stress level. Regular breaks, realistic study goals and time away from screens may help you manage your routine."
    });
  } else {
    suggestions.push({
      title: "Stress and support",
      message:
        "You selected a low stress level. Keep checking in with yourself and maintain the routines that work for you."
    });
  }

  if (data.daily_Unlocks > 100) {
    suggestions.push({
      title: "Phone habits",
      message:
        "You reported more than 100 daily phone unlocks. If interruptions bother you, try batching notifications or keeping your phone away during focused study."
    });
  }

  if (data.study_Hours > 10) {
    suggestions.push({
      title: "Study routine",
      message:
        "You reported more than 10 study hours a day. Consider scheduling breaks, meals and recovery time alongside your study goals."
    });
  }

  return suggestions;
}

function renderFeedback(data) {
  const suggestions = getHabitFeedback(data);
  const list = $("feedback-list");

  list.replaceChildren();

  suggestions.forEach((suggestion) => {
    const item = document.createElement("li");
    item.textContent = `${suggestion.title}: ${suggestion.message}`;
    list.appendChild(item);
  });

  $("feedback-title").textContent = "Your habit notes";
  $("feedback-icon").textContent = "✳";
  $("feedback-intro").textContent =
    "These general suggestions are based on your reported habits, not on the predicted score or a diagnosis.";
}

function formatScore(score) {
  return Number(score).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

function renderResult(score, data, timestamp, id) {
  latestResult = {
    id,
    score,
    data: { ...data },
    timestamp
  };

  $("score-number").textContent = formatScore(score);
  $("score-band").textContent = "Model output";
  $("score-context").textContent =
    "This is the numeric score returned by your model. Its scale and direction have not yet been configured, so no good/bad classification is shown.";

  renderFeedback(data);
  showState("result");
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) =>
      item &&
      typeof item.id === "string" &&
      Number.isFinite(item.score) &&
      typeof item.timestamp === "string" &&
      item.data &&
      typeof item.data === "object"
    );
  } catch (error) {
    console.warn("Could not read MindScope history:", error);
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, MAX_HISTORY))
    );
    return true;
  } catch (error) {
    console.error("Could not save MindScope history:", error);
    return false;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function savePrediction(score, data) {
  const record = {
    id: makeId(),
    score,
    data: { ...data },
    timestamp: new Date().toISOString()
  };

  const history = loadHistory();
  history.unshift(record);

  const saved = saveHistory(history);
  renderHistory();

  if (!saved) {
    showFormError(
      "Prediction succeeded, but browser history could not be saved. Check your browser storage settings."
    );
  }

  return record;
}

function renderHistory() {
  const history = loadHistory();
  const list = $("history-list");
  const chart = $("history-chart");

  $("history-count").textContent =
    `${history.length} ${history.length === 1 ? "record" : "records"}`;

  list.replaceChildren();
  chart.replaceChildren();

  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = "No saved predictions yet.";
    list.appendChild(empty);

    const emptyChart = document.createElement("div");
    emptyChart.className = "empty-chart";

    const symbol = document.createElement("span");
    symbol.textContent = "↗";

    const message = document.createElement("p");
    message.textContent =
      "Your trend chart will appear after your first prediction.";

    emptyChart.append(symbol, message);
    chart.appendChild(emptyChart);
    return;
  }

  history.slice(0, 10).forEach((record) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const details = document.createElement("div");
    const date = document.createElement("div");
    date.className = "history-item-date";
    date.textContent = formatDate(record.timestamp);

    const label = document.createElement("span");
    label.className = "history-item-label";
    label.textContent = "Model output";

    const score = document.createElement("div");
    score.className = "history-item-score";
    score.textContent = formatScore(record.score);

    details.append(date, score, label);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Delete";
    removeButton.setAttribute("aria-label", "Delete this saved prediction");
    removeButton.addEventListener("click", () => {
      const remaining = loadHistory().filter(
        (entry) => entry.id !== record.id
      );
      saveHistory(remaining);
      renderHistory();
    });

    item.append(details, removeButton);
    list.appendChild(item);
  });

  renderChart(history.slice(0, 20).reverse());
}

function renderChart(records) {
  const chart = $("history-chart");
  const width = 600;
  const height = 250;
  const left = 55;
  const right = 20;
  const top = 20;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const values = records.map((record) => record.score);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const padding = range === 0 ? Math.max(Math.abs(minimum) * 0.1, 1) : range * 0.15;
  const low = minimum - padding;
  const high = maximum + padding;

  const x = (index) =>
    records.length === 1
      ? left + plotWidth / 2
      : left + (index / (records.length - 1)) * plotWidth;

  const y = (value) =>
    top + ((high - value) / (high - low)) * plotHeight;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Line chart of saved prediction scores over time");

  const addSvgElement = (tag, attributes, textContent) => {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      tag
    );

    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });

    if (textContent !== undefined) {
      element.textContent = textContent;
    }

    svg.appendChild(element);
    return element;
  };

  for (let i = 0; i < 4; i++) {
    const gridY = top + (i / 3) * plotHeight;
    addSvgElement("line", {
      x1: left,
      y1: gridY,
      x2: width - right,
      y2: gridY,
      class: "chart-grid-line"
    });
  }

  const points = records.map((record, index) => ({
    x: x(index),
    y: y(record.score),
    score: record.score,
    timestamp: record.timestamp
  }));

  if (points.length > 1) {
    const pathData = points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");

    addSvgElement("path", {
      d: pathData,
      class: "chart-line"
    });
  }

  points.forEach((point) => {
    const circle = addSvgElement("circle", {
      cx: point.x,
      cy: point.y,
      r: 5,
      class: "chart-point"
    });

    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title"
    );

    title.textContent =
      `${formatDate(point.timestamp)}: ${formatScore(point.score)}`;
    circle.appendChild(title);
  });

  const firstLabel = formatShortDate(records[0].timestamp);
  const lastLabel = formatShortDate(records[records.length - 1].timestamp);

  addSvgElement("text", {
    x: left,
    y: height - 10,
    class: "chart-label",
    "text-anchor": "start"
  }, firstLabel);

  addSvgElement("text", {
    x: width - right,
    y: height - 10,
    class: "chart-label",
    "text-anchor": "end"
  }, lastLabel);

  addSvgElement("text", {
    x: 5,
    y: top + 5,
    class: "chart-label",
    "text-anchor": "start"
  }, formatScore(high));

  addSvgElement("text", {
    x: 5,
    y: top + plotHeight,
    class: "chart-label",
    "text-anchor": "start"
  }, formatScore(low));

  chart.appendChild(svg);
}

function formatShortDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadReport() {
  if (!latestResult) return;

  const { score, data, timestamp } = latestResult;
  const feedback = getHabitFeedback(data);

  const lines = [
    "MINDSCOPE - STUDENT WELLNESS SNAPSHOT",
    "",
    `Generated: ${formatDate(timestamp)}`,
    `Predicted mental health score: ${formatScore(score)}`,
    "Score interpretation: Not configured; no good/bad classification is provided.",
    "",
    "REPORTED INPUTS",
    `Age: ${data.age}`,
    `Gender: ${data.gender}`,
    `Country: ${data.country}`,
    `Academic level: ${data.academic_Level}`,
    `Most-used platform: ${data.most_Used_Platform}`,
    `Purpose of use: ${data.purpose_Of_Use}`,
    `Daily social media usage (hours): ${data.avg_Daily_Usage_Hours}`,
    `Daily phone unlocks: ${data.daily_Unlocks}`,
    `Study hours: ${data.study_Hours}`,
    `Physical activity hours: ${data.physical_Activity_Hours}`,
    `Sleep hours per night: ${data.sleep_Hours_Per_Night}`,
    `Stress level: ${data.stress_Level}`,
    "",
    "GENERAL HABIT SUGGESTIONS",
    ...feedback.map((item) => `${item.title}: ${item.message}`),
    "",
    "LIMITATIONS",
    "This report is for educational self-reflection only, not diagnosis or treatment.",
    "The model's target range and score direction have not been configured in the interface.",
    "Habit suggestions are general guidance based on the submitted inputs.",
    "This report is not a medical record."
  ];

  downloadBlob(
    lines.join("\n"),
    `MindScope_Report_${new Date(timestamp).toISOString().slice(0, 10)}.txt`,
    "text/plain;charset=utf-8"
  );
}

function exportHistoryCsv() {
  const history = loadHistory();

  if (history.length === 0) {
    alert("There are no saved predictions to export.");
    return;
  }

  const headers = [
    "Timestamp",
    "Predicted Score",
    "Age",
    "Gender",
    "Country",
    "Academic Level",
    "Most Used Platform",
    "Purpose Of Use",
    "Daily Usage Hours",
    "Daily Unlocks",
    "Study Hours",
    "Physical Activity Hours",
    "Sleep Hours",
    "Stress Level"
  ];

  const rows = history.map((record) => {
    const data = record.data;

    return [
      record.timestamp,
      record.score,
      data.age,
      data.gender,
      data.country,
      data.academic_Level,
      data.most_Used_Platform,
      data.purpose_Of_Use,
      data.avg_Daily_Usage_Hours,
      data.daily_Unlocks,
      data.study_Hours,
      data.physical_Activity_Hours,
      data.sleep_Hours_Per_Night,
      data.stress_Level
    ].map(csvEscape).join(",");
  });

  downloadBlob(
    [headers.map(csvEscape).join(","), ...rows].join("\r\n"),
    "MindScope_History.csv",
    "text/csv;charset=utf-8"
  );
}

function applyTheme(theme) {
  const dark = theme === "dark";

  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("theme-icon").textContent = dark ? "☀" : "☾";
  $("theme-label").textContent = dark ? "Light mode" : "Dark mode";
  $("theme-toggle").setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode"
  );

  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch (error) {
    console.warn("Theme preference could not be saved.");
  }
}

function initializeTheme() {
  let savedTheme = "light";

  try {
    savedTheme = localStorage.getItem(THEME_KEY) || "light";
  } catch (error) {
    savedTheme = "light";
  }

  applyTheme(savedTheme);
}

$("theme-toggle").addEventListener("click", () => {
  const current = document.documentElement.dataset.theme;
  applyTheme(current === "dark" ? "light" : "dark");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (requestInProgress) return;

  clearFormError();

  if (!form.reportValidity()) return;

  const data = collectData();
  const validationError = validateData(data);

  if (validationError) {
    showFormError(validationError);
    return;
  }

  lastValidSubmission = { ...data };
  await requestPrediction(data);
});

async function requestPrediction(data) {
  if (requestInProgress) return;

  clearFormError();
  setLoading(true);
  showState("loading");

  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    let result;

    try {
      result = await response.json();
    } catch (error) {
      throw new Error("The server returned an unreadable response.");
    }

    if (!response.ok) {
      let detail = "The server rejected the submitted information.";

      if (Array.isArray(result.detail)) {
        detail = result.detail
          .map((item) => item.msg || "Invalid field")
          .join(" ");
      } else if (typeof result.detail === "string") {
        detail = result.detail;
      }

      throw new Error(detail);
    }

    const score = result.predicted_mental_health_score;

    if (typeof score !== "number" || !Number.isFinite(score)) {
      throw new Error(
        "The response did not contain a valid predicted_mental_health_score."
      );
    }

    const record = savePrediction(score, data);
    renderResult(score, data, record.timestamp, record.id);
  } catch (error) {
    console.error("MindScope prediction error:", error);

    $("error-label").textContent = "Prediction unavailable";

    if (error instanceof TypeError) {
      $("error-copy").textContent =
        "Could not reach the API. Check that FastAPI is running at " +
        `${API_BASE} and that CORS is enabled.`;
    } else {
      $("error-copy").textContent =
        error.message || "Something went wrong. Please try again.";
    }

    showState("error");
  } finally {
    setLoading(false);
  }
}

$("error-retry-btn").addEventListener("click", async () => {
  if (!lastValidSubmission || requestInProgress) return;
  await requestPrediction({ ...lastValidSubmission });
});

$("new-prediction-btn").addEventListener("click", () => {
  showState("idle");
  $("assessment").scrollIntoView({ behavior: "smooth" });
  $("age").focus({ preventScroll: true });
});

$("download-report-btn").addEventListener("click", downloadReport);

$("export-history-btn").addEventListener("click", exportHistoryCsv);

$("clear-history-btn").addEventListener("click", () => {
  const history = loadHistory();

  if (history.length === 0) {
    alert("There is no saved history to clear.");
    return;
  }

  const confirmed = confirm(
    "Delete all saved MindScope predictions from this browser? This cannot be undone."
  );

  if (!confirmed) return;

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    alert("Could not clear browser history. Check your browser settings.");
    return;
  }

  renderHistory();
});

form.addEventListener("reset", () => {
  if (requestInProgress) return;

  setTimeout(() => {
    selectStressLevel("");
    clearFormError();
    lastValidSubmission = null;
    latestResult = null;
    showState("idle");
  }, 0);
});

initializeTheme();
renderHistory();
showState("idle");