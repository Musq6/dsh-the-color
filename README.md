# dsh-the-color

[English](duwo.md) | 中文

一键统一 DeepSeek Harness 主题色的 dsh 插件：在设置中新增与"通用设置"**平级**的 **主题色** 栏目，内置六个预置色块和一个自选色板（原生取色器），点击/选色立即切换。颜色覆盖 `@deepseek-ai/dsh-client-ui-theme` 基础色板中的 deepseek 蓝色家族，让发送按钮、运行状态动画与文字、激活工作区文件夹、链接、气泡等所有蓝色表面一次联动。

**默认零差异**：选择"默认"（或未设置主色）时不叠加任何覆盖层，界面与原色板逐字节一致，装了跟没装一样。



![](preview.png)

## 使用

设置（左侧导航）→ **主题色**：

- **预设色**：默认 / 紫罗兰 / 青绿 / 绿色 / 琥珀 / 玫红，点击色块立即应用；"默认"恢复原色板
- **自选颜色**：圆形色板按钮，点击打开原生取色器，选色即时生效
- 通过控制台设置的自定义色会以一个额外的"自定义"色块显示在预设行

自定义色（控制台/脚本）：`localStorage.setItem('dsh-the-color:accent', '#7c3aed')` 后刷新；`removeItem` 即恢复默认。

## 覆盖范围

| 组        | 变量                                                                                                            | 影响的界面                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 家族       | `--dsw-static-deepseek-50/100/200/300/400/450/500/800/900`                                                    | 发送/停止按钮、运行鲸鱼与"深度求索中"文字（含 shimmer 混色）、链接、激活文件夹、用户气泡与高亮、侧栏激活底纹、business 状态点、文件类型默认图标、Toast 图标 |
| 混色伙伴     | `--dsw-static-blue-950`、`--dsw-static-blue-300`（"深潜"与 shimmer 的混色）、`--dsw-static-blue-450`（ContextMeter 消息色段） | 运行状态动画配色、上下文用量环                                                                             |
| 漏网 alias | `--dsw-alias-brand-primary-new-colorprimary-new-color`（原亮色为硬编码值，不跟色板）                                         | dockkit 背景、设置页更新提示、账户提示图标、轨迹格渐变                                                             |

明确不覆盖：`--dsw-static-blue-500`（文档选区、轨迹图渐变）、`--dsw-static-blue-900`（HeroShell 标题）、桌面壳静态页（`apps/desktop/renderer/*.css` 中的硬编码 `#4d6bfe`）、ANSI 终端色（语义功能色）。

## 安装

```sh
dsh plugin --profile <profile> add xxxx\dsh-the-color
```

重启应用（或等待 HMR）生效；卸载 `dsh plugin --profile <profile> remove dsh-the-color` 即完全还原。

## 机制

- **覆盖层走官方通道**：`ctx.theme.overrideTokens('dsh-the-color', tokens)`（ui-theme 提供的 token 覆盖层），由 ui-layout 的 presenter 以 **body 内联 CSS 变量** 写入并自行收回——天然压过一切样式表定义，切换主题/亮暗自动处理；重复调用同源替换整层，卸载时经 `ctx.effect` 释放。
- **默认无层**：不设置主色时不调用覆盖层，界面零差异。
- **色阶推导**：家族统一取主色色相；`deepseek-500` 为主色原样（核心面逐字节等于所选色）；其余档位按固定明度档 + 饱和度系数推导（原色板为校准基准，主色取原版 500 时 deepseek 家族最大通道偏差 Δ7；`blue-*` 混色伙伴原值色相略不同，统一色相后偏差稍大，属预期）。
- **设置栏目**：注册进 `settings.section` 插槽（`id: theme-color`，`order: 5`，紧跟通用设置 0、早于模型 10），导航标签用 `label: () => t('themeColor.nav')` thunk 随语言刷新；页面样式经 `ctx.effect` 注入并由 `data-dsh-theme-color-page` 作用域隔离；文案经 `ctx.locale`（`settings.theme-color` 命名空间，中英字典）注册。

## 结构

```
dsh-the-color/
├── package.json        # dsh.bundle.patch（cordis.patch.yml）+ dsh.client(web) + icon + locale 导出
├── cordis.patch.yml    # 插入 Loader 行 id: theme-color
├── index.js            # Host 半区：惰性行（供 client-modules 发现清单）
├── client.js           # 浏览器半区：预构建惰性模块（ctx.theme 覆盖层 + 设置栏目组件）
├── icon.svg            # 插件管理页图标（36×36 三色轮：蓝/琥珀/紫罗兰）
├── locale/             # 插件管理页展示元数据（zh/en，meta.title + meta.description）
└── tools/check-client.mjs
```

客户端半区按仓库 `clientBundle` 预设的动态包格式手写（`window.__ModuleLoader__.load({id, factory})` CJS 闭包），宿主按行扫描 `dsh.client` 清单并原样服务该文件；组件通过模块表基线外部依赖 `require('react')`，业务能力经 `inject` 面传入，文案经 `ctx.locale` 注册。
