# v0.4.14 README 分步介绍 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做五段彼此独立、动作／结果均可见的 v0.4.14 README 匿名合成介绍，保留旧演示素材与已发布主分支。

**Architecture:** 一个固定虚构资料的离线 HTML 阶段预览器以 `window.renderStep(step, phase)` 暴露每步 before/after 状态；独立 Chrome profile 只截图静态起终帧；README 以文字、轻量静态对照和原版视频补充组织内容。动画与 MP4 是独立后续工作：HyperFrames 通用工作流因 GitHub HTTPS manifest 不可访问，不以旧合同冒险创作视频。

**Tech Stack:** 原生 HTML/CSS/JS、JSDOM/Node 内置测试、Chrome CDP、ffmpeg/cwebp（仅静态图优化）、Markdown。

## Global Constraints

- 功能证据 `lib/client.js`、`README.md`、`docs/releases/v0.4.14.md`；插件代码、Host 配置、原录屏、旧 GIF 与 Release 包不改；工作仅 `feat/readme-modular-demo-v0414`。
- 合成虚构界面标注“匿名合成示意，不是实际 DSH 录屏”；实体遥控器未实拍。两个原生命令 `defaults: {}`，不得画成预设键位。
- 五步：折叠／按需三栏／聚焦行整理与 2×3 色标／导航 Enter 与无线麦映射／macOS 独立去 Logo。rc.1 整理独立按钮不点宿主三点；rc.5 使用 Fold 自有兼容菜单。Quiet 只改视觉。
- 当前用户允许独立步骤而非连续成片；对未经现场验收的模拟稿不宣称正式 DSH GUI 验收。

---

### Task 1: 五步可确定性预览状态

**Files:** Create `docs/readme-demo-v0414/preview.html`; Test `test/readme-demo.test.js`.

**Interfaces:** `window.renderStep(step, phase)` accepts `step ∈ {'fold','views','organize','navigate','logo'}` and `phase ∈ {'before','after'}`, returns `{step,phase,folded,tabsVisible,topGroup,colorStripe,focused,opened,logoHidden,synthetic}`; `window.renderStep` updates visible DOM without timers or network.

- [ ] **Step 1: Write the failing test**: in `test/readme-demo.test.js` use JSDOM `{runScripts:'dangerously'}` to load the HTML and assert `renderStep('views','before').tabsVisible === false`, `renderStep('views','after').tabsVisible === true`, `renderStep('organize','after').topGroup === true`, `renderStep('navigate','before').opened === false`, `renderStep('navigate','after').opened === true`, `renderStep('logo','after').logoHidden === true`, `document.body.textContent` contains `匿名合成`, and all 3 tabs contain SVG; also assert `renderStep('logo','after').tabsVisible === false`.
- [ ] **Step 2: Run**: `node --test test/readme-demo.test.js` → FAIL: missing HTML or `renderStep`.
- [ ] **Step 3: Implement minimal preview**: page defines five independent stage captions, DSH-like left sidebar using existing `lib/client.js` SVG paths and real text hierarchy, scene-specific before/after groups, honest cursor/key/action state, visually distinct synthetic footer, optional fixed-size desktop and responsive narrow layout. `renderStep` updates DOM via class/data attributes and returns the exact state object in Interfaces; organize after visibly moves focused row to top and shows selected cold 3px stripe, menu on middle phase if needed. Avoid external media and actual DSH profile.
- [ ] **Step 4: Run**: `node --test test/readme-demo.test.js` and inspect all ten deterministic states → PASS.
- [ ] **Step 5: Commit**: `git add docs/readme-demo-v0414/preview.html test/readme-demo.test.js && git commit -m 'feat: build faithful modular README stage preview'`.

### Task 2: 十张起终帧与视觉核查

**Files:** Create `docs/readme-demo-v0414/render-stills.mjs`; create `docs/images/readme-v0414/{fold,views,organize,navigate,logo}-{before,after}.webp`; Test `test/readme-demo.test.js`.

**Interfaces:** renderer opens local `preview.html` in headless Chrome with new temporary profile, calls `renderStep(step,phase)`, takes PNG snapshots then converts each to optimized WebP; never accesses logged-in DSH.

- [ ] **Step 1: Extend failing test** to require ten images by joining the five identifiers and two phases, check each image signature is RIFF/WEBP and size > 10 KB, and invoke `renderStep` for every combination; `node --test test/readme-demo.test.js` → FAIL: missing image.
- [ ] **Step 2: Implement renderer** using CDP bootstrap proven in `artifacts/drafts/v0413-homepage-demo/render.mjs:12-37`; for each `(step,phase)` call `Runtime.evaluate(window.renderStep(...))`, assert returned `synthetic===true`, capture screenshot, convert with `cwebp -q 84 -resize 960 540 <png> -o <target.webp>`. Use `mkdtemp` for scratch, no delete or move of existing files; before overwriting generated outputs verify resolved target paths are the intended `docs/images/readme-v0414` ten files.
- [ ] **Step 3: Run**: `node docs/readme-demo-v0414/render-stills.mjs; node --test test/readme-demo.test.js`; use image reader on representative before/after, fix visual hierarchy or factual errors; record total asset bytes.
- [ ] **Step 4: Commit**: `git add docs/readme-demo-v0414/render-stills.mjs docs/images/readme-v0414 test/readme-demo.test.js && git commit -m 'docs: render five independent before-after demos'`.

### Task 3: README 候选与复审

**Files:** Modify `README.md:1-35` only for hero and modular intro; Test `test/client.test.js`, `test/host-config.test.js`, `test/readme-demo.test.js`.

- [ ] **Step 1: Write failing README test** in `test/readme-demo.test.js`: assert README includes five section labels `收起导航`, `按需三栏`, `活跃整理`, `会话导航`, `隐藏顶部 Logo`, exactly ten local image links, `匿名合成`, no claimed default combo, retains `v0.4.14.tgz` release URL and old `docs/images/demo.gif` historical link. Run `node --test test/readme-demo.test.js` → FAIL on missing sections.
- [ ] **Step 2: Edit README**: rewrite first-screen proposition into one line plus an annotated static hero, follow with five independent small before/after sections each explaining one action and result; preserve old GIF/MP4 in historical note; installation and detailed compatibility copy stay factual. Avoid replacing existing old asset bytes.
- [ ] **Step 3: Verify**: `npm test` → 145+ tests pass; `node --check docs/readme-demo-v0414/render-stills.mjs`; `git diff --check`; `npm pack --dry-run --json` still six files, no preview images or source code in release pack; independent content review and visual read of all five pairs.
- [ ] **Step 4: Commit and deliver branch preview**: `git add README.md test/readme-demo.test.js && git commit -m 'docs: show v0.4.14 as five independent README steps'`; present preview and image files locally, do not merge/push main or alter tag/Release without a later user request.

## Self-review

Coverage: product and privacy boundaries are global constraints; five steps in Task 1, static visual verification in Task 2, README usability and release preservation in Task 3. No planned change to plugin behavior or installed DSH. If HyperFrames online workflow returns, video clips require their own approved implementation task; static README task is independently useful without them.
