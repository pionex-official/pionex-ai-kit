# Tasks: .mcpb Claude Desktop Installer

## Task 1: 完善 packages/mcpb 包结构
**产出**: `packages/mcpb/` 下所有文件就绪，可独立 build
**验证**: `npm run build --workspace=@pionex/pionex-mcp` 成功

- [x] `packages/mcpb/manifest.json` — 已创建
- [x] `packages/mcpb/package.json` — 已创建
- [x] `packages/mcpb/tsup.config.ts` — 已创建
- [x] `packages/mcpb/tsconfig.json` — 已创建
- [x] `packages/mcpb/.mcpbignore` — 已创建
- [x] `packages/mcpb/src/index.ts` — 已创建
- [x] `packages/mcpb/src/server.ts` — 已创建（SERVER_NAME 改为 "pionex-mcp"）

## Task 2: 更新 root package.json 构建顺序
**产出**: `npm run build` 包含 mcpb 包
**验证**: root `npm run build` 全部成功

- [ ] 在 root `package.json` build script 末尾追加 `&& npm run build --workspace=@pionex/pionex-mcp`

## Task 3: 安装依赖并验证 build
**产出**: 所有包可正常编译
**验证**: `npm install && npm run build` 无报错

- [ ] 在 mcpb 目录运行 `npm install`（会从 root workspace 继承）
- [ ] 运行 root `npm run build` 验证全量构建通过

## Task 4: 验证 mcpb pack
**产出**: 生成 `pionex-mcp.mcpb` 文件
**验证**: 文件存在且可用 `unzip -l` 查看内容

- [ ] 在 `packages/mcpb/` 运行 `npx mcpb pack`
- [ ] 确认输出 `pionex-mcp.mcpb`
- [ ] `unzip -l pionex-mcp.mcpb` 检查包含 `manifest.json` + `dist/index.js`

## Task 5: GitHub Actions workflow
**产出**: `.github/workflows/release-mcpb.yml` 就绪
**验证**: workflow YAML 语法正确

- [x] `.github/workflows/release-mcpb.yml` — 已创建
- [ ] 检查 workflow 构建步骤是否包含 mcpb pack

## Task 6: 更新 README
**产出**: root README 新增 `.mcpb` 安装说明
**验证**: Markdown 渲染正确，链接指向正确

- [ ] root `README.md` — Quick Start 区域新增 "Claude Desktop (one-click .mcpb)" 段落
- [ ] `packages/mcp/README.md` — 新增一行指向主 README 的 mcpb 提示

## Task 7: 更新 docs/ 汇总文档
**产出**: `docs/tech-arch-overview.md`、`docs/tech-memory-overview.md` 反映新包
**验证**: 文档内容准确

- [ ] `docs/tech-arch-overview.md` — 新增 mcpb 分发路径图
- [ ] `docs/tech-memory-overview.md` — 追加本次迭代记录
