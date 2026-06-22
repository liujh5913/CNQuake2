> 🧪 目前分支：[`ai-feature-test`](https://github.com/liujh5913/CNQuake2/tree/ai-feature-test) — 旨在實現規劃中的功能。

[简体中文](README.md) | **繁體中文** | [English](README-EN.md)

<div align="center">

<img src="img/icon512.png" alt="Logo" width="80" height="80">

# CNQuake2

[![Stars](https://img.shields.io/github/stars/liujh5913/CNQuake2?style=flat&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHBhdGggZD0iTTggLjI1YS43NS43NSAwIDAgMSAuNjczLjQxOGwxLjg4MiAzLjgxNSA0LjIxLjYxMmEuNzUuNzUgMCAwIDEgLjQxNiAxLjI3OWwtMy4wNDYgMi45Ny43MTkgNC4xOTJhLjc1MS43NTEgMCAwIDEtMS4wODguNzkxTDggMTIuMzQ3bC0zLjc2NiAxLjk4YS43NS43NSAwIDAgMS0xLjA4OC0uNzlsLjcyLTQuMTk0TC44MTggNi4zNzRhLjc1Ljc1IDAgMCAxIC40MTYtMS4yOGw0LjIxLS42MTFMNy4zMjcuNjY4QS43NS43NSAwIDAgMSA4IC4yNVoiIGZpbGw9IiNlYWM1NGYiLz48L3N2Zz4=&logoSize=auto&label=stars&labelColor=444444&color=eac54f)](https://github.com/liujh5913/CNQuake2/)
[![嗶哩嗶哩](https://img.shields.io/badge/動態-bilibili-00A4DB?style=flat&labelColor=444444&logo=bilibili)](https://space.bilibili.com/3493093166811354/dynamic)
[![Issues](https://img.shields.io/github/issues/liujh5913/CNQuake2?style=flat&label=issues&labelColor=444444&color=1F883D&logo=github)](https://github.com/liujh5913/CNQuake2/issues)
[![License](https://img.shields.io/github/license/liujh5913/CNQuake2?style=flat&labelColor=444444&color=blue)](LICENSE) <br />

[提交問題](https://github.com/liujh5913/CNQuake2/issues/new)

</div>

CNQuake2 是一個基於現代 Web 技術構建的中國地震資訊可視化 [`PWA`](https://developer.mozilla.org/zh-CN/docs/Web/Progressive_web_apps) 應用，提供即時地震預警、歷史地震查詢、地震波可視化等功能。

如本專案內容侵犯了您的權益，請透過 [Issue](https://github.com/liujh5913/CNQuake2/issues/new) 或郵件 liujh5913@petalmail.com 聯繫，我將會盡快處理。

## 🚀 執行須知

本應用需在 **HTTPS** 環境下執行，並正確配置 SSL 證書。受騰訊地圖 CORS 跨域策略限制，請勿以 `file://` 協定直接開啟，否則地圖圖示將回退為預設 Marker 樣式。

## 💻 支援平臺

| 作業系統 | 支援情況 | 環境要求 |
|---|---|---|
| Windows / macOS / Linux | ✅ 完整支援 | 現代瀏覽器（Chrome 90+、Firefox 88+、Edge 90+、Safari 14+） |
| iOS / Android | ✅ 完整支援 | 系統內建瀏覽器或現代行動瀏覽器 |
| 舊版瀏覽器 | ⚠️ 理論能跑，酌情提供支援 | 支援 ES6+ 的瀏覽器 |

**✅ 完整支援**：提供完整功能支援，包括 PWA 安裝、即時預警推播等。

**⚠️ 理論能跑**：基本功能可用，但部分現代特性可能受限。

## 🎯 規劃中的功能

- 支援自定義本地烈度觸發閾值
- 多地震事件並行適配
- 重繪地震波渲染邏輯，替代官方 [`MultiCircle`](https://lbs.qq.com/webApi/javascriptGL/glDoc/glDocVector#13) 方案，使波形更貼合地球曲面
- **以上功能歡迎社群貢獻程式碼**

## ⚠️ 已知問題

- 騰訊地圖繪製的圓形為標準幾何圓，未做地球曲率貼合處理。在高緯度區域，地圖上的地震波傳播路徑存在視覺畸變，僅供示意參考，實際預警請以右下角倒數計時面板為準。
- 由於騰訊地圓形物件不支援 `getCircleBounds()` 方法，`getWaveBounds()` 為自行實現，當地圖縮放級別降低時，視角中心會向北偏移。
- 騰訊地圖圓形存在最大半徑上限，當 P 波傳播距離超出該限制後，控制台將輸出經緯度越界警告，波形動畫將在最大半徑處靜止。

## 📊 資料來源說明

~~Wolfx 防災 API~~

自 25H1 後，本專案預警資料來源調整為 **FAN Studio - API**（`https://api.fanstudio.tech/`）。選用該介面係基於國內網路環境下的實測表現，其在回應延遲與連線穩定性方面具備一定優勢，能夠更好地保障預警資訊的時效性。

> [!WARNING]
> 任何第三方資料服務均可能存在變動。本專案的資料來源選擇始終遵循技術適配原則，以實際執行效果為唯一衡量標準。如該介面後續出現服務品質波動或可用性變化，專案將視情評估並調整資料來源配置，以確保服務的持續可靠。

## 📜 免責聲明

本軟體僅供參考，請勿作為唯一決策依據。因依賴本軟體所產生的任何直接或間接損失，包括但不限於人身、財產、資料損失，作者概不承擔法律責任。

## 🔒 授權條款

本專案基於 [GPL-v3](LICENSE) 協議開源。

```
    China Quake 2 (CNQuake2)
    Copyright (C) 2024 - 2026  HomoOS

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

## 🌟 統計資料

![Alt](https://repobeats.axiom.co/api/embed/efc5f8a0b9e2dbc2d48d36d46bceb367f1fa4114.svg "Repobeats analytics image")

[![Star History Chart](https://api.star-history.com/svg?repos=liujh5913/CNQuake2&type=Date)](https://www.star-history.com/#liujh5913/CNQuake2&Date)
