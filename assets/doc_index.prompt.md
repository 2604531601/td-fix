# Docs Index AI Enrichment Prompt

You are enriching repository knowledge-base documents into a high-quality `docs-index.json` entry for `td-fix`.

## Goal

Turn each knowledge document into a repair-oriented index record that is useful for TD fixing.

The result must help answer:

- What kind of TD is this document useful for?
- Which business or technical module does it belong to?
- What code areas should the repair agent inspect next?

## Input

You will receive a single document candidate with these fields:

- `path`
- `title`
- `category`
- `module_hint`
- `tags`
- `excerpt`

## Output Rule

Return JSON only.

Use this exact shape:

```json
{
  "path": "doc/kb/业务知识库/业务流程索引.md",
  "title": "业务流程索引",
  "category": "business",
  "module": "hci-upgrade-navigation",
  "module_hint": "业务知识库",
  "tags": ["business", "workflow-index"],
  "summary": "概览升级导航插件的核心业务流程，适合用于定位业务入口和主流程代码。",
  "keywords": ["升级导航", "业务流程", "插件核心流程", "代码定位"],
  "applies_to": ["业务异常", "流程定位", "模块初筛"],
  "related_code_hints": ["plugin", "upgrade", "navigation"],
  "confidence": 0.88,
  "generation": {
    "method": "ai-enriched",
    "status": "ready"
  }
}
```

## Field Rules

### `module`

- Use a real business or technical domain when possible.
- Do not simply repeat directory labels such as `业务知识库`, `技术知识库`, `测试知识库`, `doc`, or `kb`.
- Prefer module names that help narrow code search.

### `summary`

- Write one concise sentence.
- Explain what the document is about and why it is useful for TD fixing.
- Remove markdown noise, headings, and filler phrases such as `本文档介绍了`.

### `keywords`

- Keep 3 to 8 high-signal phrases.
- Prefer business entities, technical concepts, or code-search hints.
- Do not include `doc`, `kb`, `md`, `本文档`, `说明`, or generic filler phrases.

### `applies_to`

Choose 1 to 4 values from:

- `业务异常`
- `流程定位`
- `模块初筛`
- `接口异常`
- `字段缺失`
- `配置排查`
- `测试补充`
- `回归分析`
- `外部接入排查`
- `数据结构定位`

### `related_code_hints`

- Add short code-search hints that may help locate related files or symbols.
- Prefer 1 to 5 concise hints.

### `confidence`

- Use `0.8` and above when the module and use-case are clear from the document.
- Use `0.6` to `0.79` when partially inferred.
- Use below `0.6` only when the document is too vague.

## Quality Rules

- Be specific rather than generic.
- Optimize for downstream repair accuracy, not for pretty summaries.
- Do not output explanatory text outside the JSON object.
