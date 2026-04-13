# td-fix

## 目标

当用户在 AI CLI 中表达“修 TD”时，按统一流程完成：

1. 查询 TD
2. 构建上下文
3. 生成修复计划
4. 创建分支
5. 修改代码
6. 运行验证
7. 汇总 MR 信息
8. 创建 GitLab MR

## 触发条件

以下表达可触发本 skill：

- `修 TD-1234`
- `处理 TD-1234`
- `帮我修这个 TD`
- `按照标准流程修复这个缺陷单`

## 执行规则

必须遵守以下顺序：

1. 先调用 TD 查询能力，拿到结构化任务信息。
2. 再构建本次修复的上下文包，不允许直接跳到改代码。
3. 先创建修复分支，再做代码修改。
4. 验证未通过时，不允许创建 MR。
5. 如果变更超出配置中的风险阈值，必须暂停并要求人工确认。

## 推荐调用顺序

1. 调用现有 `td-query` skill，获取 TD 详情。
2. 调用 `scripts/build_context.js`，生成 `Fix Context Packet`。
3. 基于 TD 与上下文生成修复计划。
4. 调用 `scripts/create_branch.js`，生成并切换到修复分支。
5. 在修复计划范围内修改代码。
6. 调用 `scripts/verify_runner.js` 运行 lint/typecheck/test。
7. 调用 `scripts/collect_mr_payload.js` 生成 MR 标题与描述。
8. 调用现有 `create-mr` skill 创建 GitLab MR。

## 失败处理

- 无法解析 TD：终止并返回原因
- 上下文不足：先返回缺失信息，不直接硬改
- 验证失败：停留在本地修复，不创建 MR
- 高风险改动：暂停等待人工确认

## 当前约定

- 默认配置文件：`config/default.config.json`
- 仓库级覆盖配置：目标仓库根目录下 `.td-fix.json`
- 脚本入口：`scripts/td_fix_entry.js`
- 外部 TD skill 接入：`integrations.tdQuery.command` 或环境变量 `TD_FIX_TD_QUERY_CMD`
- 外部 MR skill 接入：`integrations.createMr.command` 或环境变量 `TD_FIX_CREATE_MR_CMD`
