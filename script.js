const sourceInput = document.querySelector("#sourceInput");
const mockOutput = document.querySelector("#mockOutput");
const recordCount = document.querySelector("#recordCount");
const outputShape = document.querySelector("#outputShape");
const seedInput = document.querySelector("#seedInput");
const customFormats = document.querySelector("#customFormats");
const nullableFields = document.querySelector("#nullableFields");
const prettyJson = document.querySelector("#prettyJson");
const openButton = document.querySelector("#openButton");
const fileInput = document.querySelector("#fileInput");
const generateButton = document.querySelector("#generateButton");
const copyButton = document.querySelector("#copyButton");
const saveButton = document.querySelector("#saveButton");
const clearButton = document.querySelector("#clearButton");
const status = document.querySelector("#status");
const stats = document.querySelector("#stats");
const inputCount = document.querySelector("#inputCount");
const outputCount = document.querySelector("#outputCount");
const ruleRows = document.querySelector("#ruleRows");
const ruleCount = document.querySelector("#ruleCount");
const releaseStamp = document.querySelector("#releaseStamp");

const appRelease = "20260614-1011";

const samplePayload = {
  id: 1024,
  contractNumber: "1234567",
  policyNumber: "0459821",
  claimNumber: "old",
  name: "Ada Lovelace",
  email: "ada@example.com",
  status: "active",
  role: "admin",
  createdAt: "2026-06-10T14:22:00Z",
  profile: {
    company: "Lizard Labs",
    city: "Cincinnati",
    plan: "pro"
  },
  metrics: {
    score: 87,
    active: true
  },
  tags: ["api", "mock", "test"]
};

const firstNames = ["Ada", "Grace", "Linus", "Margaret", "Alan", "Katherine", "Edsger", "Radia", "Tim", "Barbara"];
const lastNames = ["Lovelace", "Hopper", "Torvalds", "Hamilton", "Turing", "Johnson", "Dijkstra", "Perlman", "Berners-Lee", "Liskov"];
const companies = ["Lizard Labs", "Northwind API", "Signal Forge", "Greenfield Systems", "Packet & Pine", "Bright River"];
const cities = ["Cincinnati", "Seattle", "Austin", "Chicago", "Denver", "Boston", "Portland", "Atlanta"];
const statuses = ["active", "pending", "disabled", "archived"];
const roles = ["admin", "editor", "viewer", "developer", "operator"];
const plans = ["free", "starter", "pro", "team", "enterprise"];
const words = ["lizard", "mock", "api", "payload", "client", "server", "debug", "fixture", "sample", "schema"];

let currentRules = [];

sourceInput.value = JSON.stringify(samplePayload, null, 2);
renderReleaseStamp();
generateMockData();

openButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", openSelectedFile);
generateButton.addEventListener("click", generateMockData);
copyButton.addEventListener("click", copyOutput);
saveButton.addEventListener("click", saveOutput);
clearButton.addEventListener("click", clearAll);
sourceInput.addEventListener("input", handleSourceInput);
recordCount.addEventListener("change", generateMockData);
outputShape.addEventListener("change", generateMockData);
seedInput.addEventListener("input", generateMockData);
customFormats.addEventListener("input", generateMockData);
nullableFields.addEventListener("change", generateMockData);
prettyJson.addEventListener("change", generateMockData);

function handleSourceInput() {
  updateCounts();
  setStatus("Ready", "idle");
}

async function openSelectedFile() {
  const [file] = fileInput.files;
  fileInput.value = "";

  if (!file) {
    return;
  }

  try {
    sourceInput.value = await file.text();
    generateMockData();
    setStatus(`Opened ${file.name}`, "valid");
  } catch {
    setStatus("Could not open file", "error");
  }
}

function generateMockData() {
  let sample;

  try {
    sample = JSON.parse(sourceInput.value);
  } catch (error) {
    mockOutput.value = "";
    currentRules = [];
    renderRules();
    updateCounts();
    setStatus(`Sample JSON: ${error.message}`, "error");
    return;
  }

  const template = Array.isArray(sample) ? sample[0] : sample;

  if (!isPlainObject(template)) {
    mockOutput.value = "";
    currentRules = [];
    renderRules();
    updateCounts();
    setStatus("Sample must be a JSON object or an array with an object first item.", "error");
    return;
  }

  const count = outputShape.value === "single" ? 1 : getRecordCount();
  const formatOverrides = parseFormatOverrides(customFormats.value);
  const random = createRandom(`${seedInput.value || "lizard"}:${JSON.stringify(template)}:${count}:${outputShape.value}:${customFormats.value}`);
  currentRules = inferRules(template, "$", formatOverrides);
  const records = Array.from({ length: count }, (_, index) => generateValue(template, "$", index, random, formatOverrides));
  const output = wrapOutput(records, count);
  mockOutput.value = JSON.stringify(output, null, prettyJson.checked ? 2 : 0);
  renderRules();
  updateCounts();
  setStatus(`Generated ${count} ${count === 1 ? "record" : "records"}`, "valid");
}

function getRecordCount() {
  const value = Number.parseInt(recordCount.value, 10);

  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 1), 500);
}

function wrapOutput(records, count) {
  if (outputShape.value === "single") {
    return records[0] || {};
  }

  if (outputShape.value === "paginated") {
    return {
      data: records,
      page: 1,
      pageSize: count,
      total: Math.max(count * 6, count)
    };
  }

  return records;
}

function inferRules(value, path, formatOverrides) {
  const rules = [];

  function visit(current, currentPath) {
    if (Array.isArray(current)) {
      rules.push(makeRule(currentPath, "array", getGeneratorName(currentPath, current, formatOverrides), current));

      if (current.length) {
        visit(current[0], `${currentPath}[0]`);
      }

      return;
    }

    if (isPlainObject(current)) {
      if (currentPath !== "$") {
        rules.push(makeRule(currentPath, "object", "object", current));
      }

      Object.keys(current).forEach((key) => visit(current[key], `${currentPath}.${escapePathKey(key)}`));
      return;
    }

    rules.push(makeRule(currentPath, getType(current), getGeneratorName(currentPath, current, formatOverrides), current));
  }

  visit(value, path);
  return rules;
}

function makeRule(path, type, generator, example) {
  return {
    path,
    type,
    generator,
    example: formatExample(example)
  };
}

function generateValue(value, path, index, random, formatOverrides) {
  if (Array.isArray(value)) {
    const itemTemplate = value.length ? value[0] : "";
    const length = Math.max(1, Math.min(4, value.length + randomInt(random, 0, 2)));
    return Array.from({ length }, (_, itemIndex) => generateValue(itemTemplate, `${path}[${itemIndex}]`, index + itemIndex, random, formatOverrides));
  }

  if (isPlainObject(value)) {
    const output = {};
    Object.keys(value).forEach((key) => {
      output[key] = generateValue(value[key], `${path}.${escapePathKey(key)}`, index, random, formatOverrides);
    });
    return output;
  }

  if (getFormatOverride(path, formatOverrides) || (typeof value === "string" && isNumericString(value))) {
    return mockPrimitive(value, path, index, random, formatOverrides);
  }

  if (nullableFields.checked && value === null) {
    return random() < 0.55 ? null : mockPrimitive("", path, index, random, formatOverrides);
  }

  if (nullableFields.checked && random() < 0.03) {
    return null;
  }

  return mockPrimitive(value, path, index, random, formatOverrides);
}

function mockPrimitive(value, path, index, random, formatOverrides) {
  const name = path.toLowerCase();
  const field = normalizeFieldName(path);
  const customPattern = getFormatOverride(path, formatOverrides);

  if (customPattern) {
    return applyFormatPattern(customPattern, random);
  }

  if (typeof value === "boolean") {
    return random() > 0.5;
  }

  if (typeof value === "number") {
    return mockNumber(value, name, index, random);
  }

  if (value === null) {
    return null;
  }

  if (field === "id" || field.endsWith("id") || field.includes("userid")) {
    return 1000 + index + randomInt(random, 1, 9000);
  }

  if (field.includes("email")) {
    const first = pick(firstNames, random).toLowerCase();
    const last = pick(lastNames, random).toLowerCase().replace(/[^a-z]/g, "");
    return `${first}.${last}${index + 1}@example.com`;
  }

  if (field.includes("phone") || field.includes("mobile") || field.includes("telephone")) {
    return mockPhoneNumber(random);
  }

  if (typeof value === "string" && isNumericString(value)) {
    return mockNumericString(value.length, random);
  }

  if (field.includes("firstname")) {
    return pick(firstNames, random);
  }

  if (field.includes("lastname")) {
    return pick(lastNames, random);
  }

  if (field.includes("name") || field.includes("owner")) {
    return `${pick(firstNames, random)} ${pick(lastNames, random)}`;
  }

  if (field.includes("company") || field.includes("organization")) {
    return pick(companies, random);
  }

  if (field.includes("city")) {
    return pick(cities, random);
  }

  if (field.includes("status")) {
    return pick(statuses, random);
  }

  if (field.includes("role")) {
    return pick(roles, random);
  }

  if (field.includes("plan")) {
    return pick(plans, random);
  }

  if (field.includes("date") || field.includes("time") || field.endsWith("at")) {
    return mockIsoDate(index, random);
  }

  if (typeof value === "string" && value.includes("@")) {
    return `user${index + randomInt(random, 10, 999)}@example.com`;
  }

  if (typeof value === "string" && looksLikeIsoDate(value)) {
    return mockIsoDate(index, random);
  }

  return mockText(value, random);
}

function mockNumber(value, name, index, random) {
  if (name.endsWith(".id") || name === "$.id") {
    return Math.max(1, Math.round(value) + index + randomInt(random, 1, 9));
  }

  if (name.includes("price") || name.includes("amount") || name.includes("total")) {
    return Number((randomInt(random, 1000, 25000) / 100).toFixed(2));
  }

  if (name.includes("count") || name.includes("quantity")) {
    return randomInt(random, 1, 150);
  }

  if (Number.isInteger(value)) {
    return Math.max(0, Math.round(value + index + randomInt(random, -8, 16)));
  }

  return Number((value + random() * 10 - 3).toFixed(2));
}

function mockText(value, random) {
  const text = String(value || "");

  if (text.length <= 3) {
    return pick(words, random);
  }

  if (text.includes("-")) {
    return `${pick(words, random)}-${pick(words, random)}`;
  }

  return `${capitalize(pick(words, random))} ${capitalize(pick(words, random))}`;
}

function parseFormatOverrides(input) {
  const overrides = {
    exact: new Map(),
    field: new Map()
  };

  input.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = findFormatSeparator(trimmed);

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const pattern = trimmed.slice(separatorIndex + 1).trim();

    if (!key || !pattern) {
      return;
    }

    if (key.startsWith("$")) {
      overrides.exact.set(key, pattern);
    } else {
      overrides.field.set(normalizeFormatKey(key), pattern);
    }
  });

  return overrides;
}

function findFormatSeparator(value) {
  const equals = value.indexOf("=");
  const colon = value.indexOf(":");

  if (equals === -1) {
    return colon;
  }

  if (colon === -1) {
    return equals;
  }

  return Math.min(equals, colon);
}

function getFormatOverride(path, overrides) {
  if (!overrides) {
    return "";
  }

  return overrides.exact.get(path) || overrides.field.get(normalizeFieldName(path)) || "";
}

function applyFormatPattern(pattern, random) {
  return Array.from(pattern, (char) => {
    if (char === "#") {
      return String(randomInt(random, 0, 9));
    }

    if (char === "?") {
      return String.fromCharCode(65 + randomInt(random, 0, 25));
    }

    return char;
  }).join("");
}

function mockNumericString(length, random) {
  return Array.from({ length }, () => randomInt(random, 0, 9)).join("");
}

function mockPhoneNumber(random) {
  const area = randomInt(random, 200, 989);
  const prefix = randomInt(random, 200, 999);
  const line = String(randomInt(random, 0, 9999)).padStart(4, "0");
  return `(${area}) ${prefix}-${line}`;
}

function getGeneratorName(path, value, formatOverrides) {
  const name = path.toLowerCase();
  const field = normalizeFieldName(path);
  const customPattern = getFormatOverride(path, formatOverrides);

  if (Array.isArray(value)) {
    return "array";
  }

  if (isPlainObject(value)) {
    return "object";
  }

  if (customPattern) {
    return `format ${customPattern}`;
  }

  if (field === "id" || field.endsWith("id") || field.includes("userid")) {
    return "id";
  }

  if (field.includes("email")) {
    return "email";
  }

  if (field.includes("phone") || field.includes("mobile") || field.includes("telephone")) {
    return "phone";
  }

  if (typeof value === "string" && isNumericString(value)) {
    return `${value.length}-digit string`;
  }

  if (field.includes("name")) {
    return "name";
  }

  if (field.includes("date") || field.includes("time") || field.endsWith("at") || looksLikeIsoDate(value)) {
    return "iso date";
  }

  if (field.includes("status")) {
    return "status";
  }

  if (field.includes("role")) {
    return "role";
  }

  if (field.includes("price") || field.includes("amount") || field.includes("total")) {
    return "money";
  }

  return getType(value);
}

function renderRules() {
  ruleRows.textContent = "";

  if (!currentRules.length) {
    const empty = document.createElement("div");
    empty.className = "empty-rules";
    empty.textContent = "No fields inferred yet.";
    ruleRows.append(empty);
    ruleCount.textContent = "0 fields";
    return;
  }

  const fragment = document.createDocumentFragment();

  currentRules.forEach((rule) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    row.setAttribute("role", "row");
    row.append(
      makeCell(rule.path, "Path"),
      makeCell(rule.type, "Type"),
      makeCell(rule.generator, "Generator", "rule-generator"),
      makeCell(rule.example, "Example")
    );
    fragment.append(row);
  });

  ruleRows.append(fragment);
  ruleCount.textContent = `${currentRules.length} ${currentRules.length === 1 ? "field" : "fields"}`;
}

function makeCell(value, label, className) {
  const cell = document.createElement("span");
  cell.setAttribute("role", "cell");
  cell.dataset.label = label;
  cell.textContent = value;

  if (className) {
    cell.classList.add(className);
  }

  return cell;
}

async function copyOutput() {
  if (!mockOutput.value) {
    setStatus("Nothing to copy yet", "error");
    return;
  }

  try {
    if (!navigator.clipboard) {
      throw new Error("Clipboard API unavailable");
    }

    await navigator.clipboard.writeText(mockOutput.value);
    setStatus("Copied mock JSON", "valid");
  } catch {
    if (copyTextFallback(mockOutput.value)) {
      setStatus("Copied mock JSON", "valid");
    } else {
      setStatus("Could not copy output", "error");
    }
  }
}

function copyTextFallback(text) {
  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  scratch.style.position = "fixed";
  scratch.style.inset = "0 auto auto 0";
  scratch.style.opacity = "0";
  document.body.append(scratch);
  scratch.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    scratch.remove();
  }
}

function saveOutput() {
  if (!mockOutput.value) {
    setStatus("Nothing to save yet", "error");
    return;
  }

  const blob = new Blob([mockOutput.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mock-lizard-output.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Saved mock JSON", "valid");
}

function clearAll() {
  sourceInput.value = "";
  mockOutput.value = "";
  currentRules = [];
  renderRules();
  updateCounts();
  setStatus("Ready", "idle");
}

function updateCounts() {
  inputCount.textContent = `${sourceInput.value.length} chars`;
  outputCount.textContent = `${mockOutput.value.length} chars`;
  const count = mockOutput.value ? (outputShape.value === "single" ? 1 : getRecordCount()) : 0;
  stats.textContent = `${count} ${count === 1 ? "record" : "records"} · ${currentRules.length} ${currentRules.length === 1 ? "field" : "fields"}`;
}

function setStatus(message, type) {
  status.textContent = message;
  status.className = `status-pill status-${type}`;
}

function renderReleaseStamp() {
  releaseStamp.textContent = `Version: ${appRelease}`;
}

function getType(value) {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

function formatExample(value) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return JSON.stringify(value);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function normalizeFieldName(path) {
  const match = path.match(/(?:\.|\$)(?:"([^"]+)"|([^.[\]]+))(?:\[\d+\])?$/);
  const key = match ? (match[1] || match[2]) : path;
  return normalizeFormatKey(key);
}

function normalizeFormatKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isNumericString(value) {
  return /^\d+$/.test(value);
}

function mockIsoDate(index, random) {
  const base = Date.UTC(2026, 0, 1, 12, 0, 0);
  const offset = (index * 86400000) + randomInt(random, 0, 90) * 86400000 + randomInt(random, 0, 86400) * 1000;
  return new Date(base + offset).toISOString();
}

function escapePathKey(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function pick(items, random) {
  return items[randomInt(random, 0, items.length - 1)];
}

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createRandom(seed) {
  let state = hashSeed(seed);

  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hashSeed(seed) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
