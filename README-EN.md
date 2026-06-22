> 🧪 Current branch：[`ai-feature-test`](https://github.com/liujh5913/CNQuake2/tree/ai-feature-test) — intended to implement planned features (AI features, etc.).

[简体中文](README.md) | [繁體中文](README-TW.md) | **English**

<div align="center">

<img src="img/icon512.png" alt="Logo" width="80" height="80">

# CNQuake2

[![Stars](https://img.shields.io/github/stars/liujh5913/CNQuake2?style=flat&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHBhdGggZD0iTTggLjI1YS43NS43NSAwIDAgMSAuNjczLjQxOGwxLjg4MiAzLjgxNSA0LjIxLjYxMmEuNzUuNzUgMCAwIDEgLjQxNiAxLjI3OWwtMy4wNDYgMi45Ny43MTkgNC4xOTJhLjc1MS43NTEgMCAwIDEtMS4wODguNzkxTDggMTIuMzQ3bC0zLjc2NiAxLjk4YS43NS43NSAwIDAgMS0xLjA4OC0uNzlsLjcyLTQuMTk0TC44MTggNi4zNzRhLjc1Ljc1IDAgMCAxIC40MTYtMS4yOGw0LjIxLS42MTFMNy4zMjcuNjY4QS43NS43NSAwIDAgMSA4IC4yNVoiIGZpbGw9IiNlYWM1NGYiLz48L3N2Zz4=&logoSize=auto&label=stars&labelColor=444444&color=eac54f)](https://github.com/liujh5913/CNQuake2/)
[![Bilibili](https://img.shields.io/badge/动态-bilibili-00A4DB?style=flat&labelColor=444444&logo=bilibili)](https://space.bilibili.com/3493093166811354/dynamic)
[![Issues](https://img.shields.io/github/issues/liujh5913/CNQuake2?style=flat&label=issues&labelColor=444444&color=1F883D&logo=github)](https://github.com/liujh5913/CNQuake2/issues)
[![License](https://img.shields.io/github/license/liujh5913/CNQuake2?style=flat&labelColor=444444&color=blue)](LICENSE) <br />

[Submit Issue](https://github.com/liujh5913/CNQuake2/issues/new)

</div>

CNQuake2 is a [`PWA`](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) application built with modern Web technologies for visualizing earthquake information in China. It provides real-time earthquake early warnings, historical earthquake queries, seismic wave visualization, and more.

If the content of this project infringes upon your rights, please contact us via [Issue](https://github.com/liujh5913/CNQuake2/issues/new) or email liujh5913@petalmail.com, and we will address it as soon as possible.

## 🚀 Running Notes

This application must run in an **HTTPS** environment with a properly configured SSL certificate. Due to Tencent Maps CORS cross-origin policy restrictions, please do not open it directly using the `file://` protocol, otherwise the map icons will fall back to the default Marker style.

## 💻 Supported Platforms

| Operating System | Support Status | Environment Requirements |
|---|---|---|
| Windows / macOS / Linux | ✅ Fully Supported | Modern browsers (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+) |
| iOS / Android | ✅ Fully Supported | System built-in browser or modern mobile browsers |
| Legacy Browsers | ⚠️ Should work, support at discretion | Browsers supporting ES6+ |

**✅ Fully Supported**: Provides full feature support, including PWA installation, real-time warning push, etc.

**⚠️ Should work**: Basic functions are available, but some modern features may be limited.

## 🎯 Planned Features

- Support for custom local intensity trigger thresholds
- Multi-earthquake event concurrent adaptation
- Redraw seismic wave rendering logic, replacing the official [`MultiCircle`](https://lbs.qq.com/webApi/javascriptGL/glDoc/glDocVector#13) solution to make waveforms better fit the Earth's curved surface
- **Community contributions for the above features are welcome**

## ⚠️ Known Issues

- The circles drawn by Tencent Maps are standard geometric circles without curvature fitting for the Earth. In high-latitude regions, the seismic wave propagation paths on the map exhibit visual distortion and are for reference only; for actual warnings, please refer to the countdown panel in the bottom-right corner.
- Since Tencent Maps circle objects do not support the `getCircleBounds()` method, `getWaveBounds()` is self-implemented. When the map zoom level decreases, the view center will shift northward.
- Tencent Maps circles have a maximum radius limit. When the P-wave propagation distance exceeds this limit, the console will output out-of-bounds longitude/latitude warnings, and the waveform animation will freeze at the maximum radius.

## 📊 Data Source Information

~~Wolfx Disaster Prevention API~~

Since 25H1, this project's warning data source has been switched to **FAN Studio - API** (`https://api.fanstudio.tech/`). This interface was selected based on measured performance in domestic network environments, offering advantages in response latency and connection stability to better ensure the timeliness of warning information.

> [!WARNING]
> Any third-party data service may change. This project's data source selection always follows technical adaptation principles, with actual operational performance as the sole measure. If this interface experiences service quality fluctuations or availability changes in the future, the project will evaluate and adjust the data source configuration as appropriate to ensure continued service reliability.

## 📜 Disclaimer

This software is for reference only. Please do not use it as the sole basis for decision-making. The author assumes no legal responsibility for any direct or indirect losses resulting from reliance on this software, including but not limited to personal, property, or data losses.

## 🔒 License

This project is open-sourced under the [GPL-v3](LICENSE) license.

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

## 🌟 Statistics

![Alt](https://repobeats.axiom.co/api/embed/efc5f8a0b9e2dbc2d48d36d46bceb367f1fa4114.svg "Repobeats analytics image")

[![Star History Chart](https://api.star-history.com/svg?repos=liujh5913/CNQuake2&type=Date)](https://www.star-history.com/#liujh5913/CNQuake2&Date)
