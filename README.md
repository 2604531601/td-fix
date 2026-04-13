# td-fix

`td-fix` 是一个面向 GitLab + TD 流程的 AI 修复 skill 仓库骨架。

当前仓库目标：

- 复用已有 `td-query` skill 获取 TD 信息
- 复用已有 `create-mr` skill 创建 GitLab MR
- 在中间补齐上下文构建、分支创建、代码修改、自测与结果汇总流程

## 当前目录

- `SKILL.md`: 主 skill 入口说明
- `config/default.config.json`: 仓库级默认规则模板
- `scripts/`: 供 skill 调用的脚本骨架
- `templates/`: 后续放计划、MR 描述、review 修复模板
- `references/`: 流程约定和补充文档

## 下一步建议

1. 把你们现有 `td-query` 与 `create-mr` 的输入输出契约补进脚本。
2. 为目标仓库补一份 `.td-fix.json`。
3. 把 `build_context.js` 接到文档知识库和代码索引上。
4. 把 `verify_runner.js` 接到真实 lint/test/typecheck 命令上。

## 已接入方式

`td-fix` 当前支持通过配置或环境变量调用外部 skill：

- `TD_FIX_TD_QUERY_CMD`
- `TD_FIX_CREATE_MR_CMD`

也可以写在 `.td-fix.json` 中：

```json
{
  "integrations": {
    "tdQuery": {
      "command": "your-td-query-command"
    },
    "createMr": {
      "command": "your-create-mr-command"
    }
  }
}
```

可参考样例：

- `E:\ai-projects\2026\td-fix\examples\repo.td-fix.json:1`

约定如下：

- `tdQuery.command`：命令执行时，TD 编号会作为最后一个参数追加，命令必须把 JSON 输出到 stdout
- `createMr.command`：命令执行时，MR payload JSON 会通过 stdin 传入，命令必须把 JSON 输出到 stdout
