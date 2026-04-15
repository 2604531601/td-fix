const VALID_CATEGORIES = new Set(["business", "technical", "testing", "repository", "general"]);
const VALID_APPLIES_TO = new Set([
  "业务异常",
  "流程定位",
  "模块初筛",
  "接口异常",
  "字段缺失",
  "配置排查",
  "测试补充",
  "回归分析",
  "外部接入排查",
  "数据结构定位"
]);
const FORBIDDEN_MODULES = new Set([
  "业务知识库",
  "技术知识库",
  "测试知识库",
  "doc",
  "kb",
  "general"
]);
const FORBIDDEN_KEYWORDS = new Set([
  "doc",
  "kb",
  "md",
  "本文档",
  "说明",
  "重要说明",
  "介绍",
  "概述"
]);

function hasMarkdownNoise(value) {
  return /^#/.test(value) || /\[[^\]]+\]\([^)]+\)/.test(value) || /\.md\b/i.test(value);
}

function validateDocument(document, index) {
  const issues = [];
  const pathLabel = document?.path || `documents[${index}]`;

  if (!document || typeof document !== "object") {
    issues.push({ level: "error", path: pathLabel, field: "document", message: "Document entry must be an object." });
    return issues;
  }

  if (!document.path || typeof document.path !== "string") {
    issues.push({ level: "error", path: pathLabel, field: "path", message: "Missing document path." });
  }
  if (!document.title || typeof document.title !== "string") {
    issues.push({ level: "error", path: pathLabel, field: "title", message: "Missing document title." });
  }
  if (!VALID_CATEGORIES.has(document.category)) {
    issues.push({ level: "error", path: pathLabel, field: "category", message: `Invalid category: ${document.category}` });
  }
  if (!document.module || typeof document.module !== "string") {
    issues.push({ level: "error", path: pathLabel, field: "module", message: "Missing module." });
  } else if (FORBIDDEN_MODULES.has(document.module.trim())) {
    issues.push({ level: "warning", path: pathLabel, field: "module", message: `Module is too generic: ${document.module}` });
  }

  if (!document.summary || typeof document.summary !== "string") {
    issues.push({ level: "error", path: pathLabel, field: "summary", message: "Missing summary." });
  } else {
    const summary = document.summary.trim();
    if (summary.length < 20) {
      issues.push({ level: "warning", path: pathLabel, field: "summary", message: "Summary is too short to be useful." });
    }
    if (summary.length > 260) {
      issues.push({ level: "warning", path: pathLabel, field: "summary", message: "Summary exceeds 260 characters." });
    }
    if (hasMarkdownNoise(summary)) {
      issues.push({ level: "warning", path: pathLabel, field: "summary", message: "Summary still contains markdown or file-name noise." });
    }
  }

  if (!Array.isArray(document.keywords) || document.keywords.length < 3) {
    issues.push({ level: "warning", path: pathLabel, field: "keywords", message: "At least 3 high-signal keywords are recommended." });
  } else {
    for (const keyword of document.keywords) {
      if (typeof keyword !== "string" || !keyword.trim()) {
        issues.push({ level: "error", path: pathLabel, field: "keywords", message: "Keyword must be a non-empty string." });
        continue;
      }
      if (FORBIDDEN_KEYWORDS.has(keyword.trim())) {
        issues.push({ level: "warning", path: pathLabel, field: "keywords", message: `Low-value keyword detected: ${keyword}` });
      }
    }
  }

  if (!Array.isArray(document.applies_to) || document.applies_to.length === 0) {
    issues.push({ level: "warning", path: pathLabel, field: "applies_to", message: "At least one applies_to scenario is required." });
  } else {
    for (const item of document.applies_to) {
      if (!VALID_APPLIES_TO.has(item)) {
        issues.push({ level: "warning", path: pathLabel, field: "applies_to", message: `Unknown applies_to value: ${item}` });
      }
    }
  }

  if (!Array.isArray(document.related_code_hints)) {
    issues.push({ level: "warning", path: pathLabel, field: "related_code_hints", message: "related_code_hints should be an array." });
  }

  if (typeof document.confidence !== "number" || Number.isNaN(document.confidence)) {
    issues.push({ level: "error", path: pathLabel, field: "confidence", message: "confidence must be a number between 0 and 1." });
  } else if (document.confidence < 0 || document.confidence > 1) {
    issues.push({ level: "error", path: pathLabel, field: "confidence", message: "confidence must be between 0 and 1." });
  } else if (document.confidence < 0.6) {
    issues.push({ level: "warning", path: pathLabel, field: "confidence", message: "confidence is below the recommended threshold of 0.6." });
  }

  return issues;
}

export function validateDocsIndex(index) {
  const issues = [];

  if (!index || typeof index !== "object") {
    return {
      ok: false,
      errors: [{ level: "error", path: "root", field: "index", message: "docs-index must be an object." }],
      warnings: [],
      issueCount: 1
    };
  }

  if (!Array.isArray(index.documents)) {
    issues.push({ level: "error", path: "root", field: "documents", message: "docs-index.documents must be an array." });
  } else {
    index.documents.forEach((document, docIndex) => {
      issues.push(...validateDocument(document, docIndex));
    });
  }

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    issueCount: issues.length
  };
}
