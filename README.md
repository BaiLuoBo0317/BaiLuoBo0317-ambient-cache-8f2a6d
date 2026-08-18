# BaiLuoBo0317 资料索引

已实现：

- 站内搜索及搜索结果翻页
- 最近更新、新作、热门、完结和地区频道
- 漫画详情、作者、分类、状态、简介
- 完整章节目录
- 阅读页图片解析
- 图片 CDN 的 HTTP 到 HTTPS 升级及 Referer 请求头

## 导入

Venera 的“图源列表”需要一个可公开访问的 JSON 地址，不能直接填写漫画详情页地址。

1. 把本目录中的 `index.json` 和 `ffppt.js` 原样放到同一公网 HTTPS 目录。
2. 在 Venera 的图源管理中添加该 `index.json` 的公网直链。
3. 刷新图源列表，安装“BaiLuoBo0317 资料索引”。

如果使用 GitHub 仓库，可填写类似：

```text
https://raw.githubusercontent.com/BaiLuoBo0317/BaiLuoBo0317-ambient-cache-8f2a6d/main/index.json
```

更新时，将脚本与 `index.json` 中的版本号同步递增。

## 已验证的页面结构

- 详情页：`/novel{id}/`
- 章节页：`/novel{id}/chapter{chapterId}.html`
- 分类翻页：`/{channel}/index_{page}.html`
- 图片：阅读页 `.chapter-content img[data-original]`

本图源按提供者确认的合法再分发授权制作。站点模板或 CDN 规则变化后，可能需要同步更新选择器。
