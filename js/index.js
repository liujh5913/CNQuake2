const version = "v2.0.260620 SP3";

// 全局配置对象
const GlobalConfig = {
    longitude: 116.404269,
    latitude: 39.915826,
    location: "北京市",
    intensityThreshold: 4
};

// 默认配置
const DefaultConfig = {
    longitude: 116.404269,
    latitude: 39.915826,
    location: "北京市",
    intensityThreshold: 4
};

// 时间同步相关变量
let nowCNtimeStamp = {
    CST: Date.now(),  // 当前中国标准时间
    ndDelta: 0        // 与服务器的时间偏差
};
let fastIntervalId = null;
let hasSwitched = false;
let isPageVisible = true;
let pingTime = 0;      // 发送ping的时间
let networkRTT = 0;     // 网络延迟

// 全局页面可见性监听器，合并时间同步和预警倒计时逻辑
document.addEventListener("visibilitychange", () => {
    isPageVisible = !document.hidden;
    console.log("[时间同步] 页面可见性: - index.js:33", isPageVisible);

    // 预警倒计时恢复逻辑：当页面从后台回到前台时重新计算倒计时
    if (document.visibilityState === "visible" && eewBounds) {
        if (!hasExecuted) {
            console.log("[预警是否在前台] 回到了前台，重新计算倒计时 - index.js:38");
            hasExecuted = true;
        } else {
            console.log("[预警是否在前台] 在前台(忽略了) - index.js:41")
        }
    } else {
        console.log("[预警是否在前台] 不在前台(在后台) - index.js:44");
        hasExecuted = false;
    }
});

document.addEventListener("keydown", function (event) {
    // 禁用/放宽F12和Ctrl+Shift+I以及其他常见的调试快捷键
    if (
        event.key === "F12" ||
        (event.ctrlKey && event.shiftKey && (event.key === "I" || event.key === "C" || event.key === "J"))
    ) {
        // event.preventDefault();
        toastr.warning("开发者模式已打开，请自重");
    }
});

async function isMobile() {
    const loadScript = async (src) => {
        return new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.append(script);
        });
    }
    const isMobile1 = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile1) {
        try {
            await loadScript("https://cdn.jsdelivr.net/npm/eruda");
            eruda.init();
        } catch (error) {
            try {
                await loadScript("https://eruda.liriliri.io/eruda.js");
                eruda.init();
            } catch (fallbackError) {
                console.error("[添加eruda控制台] 脚本加载错误 => - index.js:80", error, fallbackError);
            }
        }
    }
    return isMobile1;
}

isMobile().then(isMobile1 => {
    if (!isMobile1) document.addEventListener("contextmenu", event => event.preventDefault());
});
$("#vsiontext").text(version);

function loadSettingsFromStorage() {
    try {
        const savedSettings = localStorage.getItem("earthquakeWarningSettings");
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            GlobalConfig.longitude = parsed.longitude ?? DefaultConfig.longitude;
            GlobalConfig.latitude = parsed.latitude ?? DefaultConfig.latitude;
            GlobalConfig.location = parsed.location ?? DefaultConfig.location;
            GlobalConfig.intensityThreshold = parsed.intensityThreshold ?? DefaultConfig.intensityThreshold;
            console.log("[配置加载] 从LocalStorage加载配置成功 - index.js:101");
        } else {
            Object.assign(GlobalConfig, DefaultConfig);
            console.log("[配置加载] 使用默认配置 - index.js:104");
        }
    } catch (error) {
        console.error("[配置加载] LocalStorage读取失败，使用默认配置: - index.js:107", error);
        Object.assign(GlobalConfig, DefaultConfig);
    }
    homeLat = String(GlobalConfig.latitude);
    homeLon = String(GlobalConfig.longitude);
    homeLocte = GlobalConfig.location;
}

loadSettingsFromStorage();

// 显示自定义通知
function showCustomNotification(title, message) {
    // 检查浏览器是否支持Notification API
    if ("Notification" in window) {
        // 请求通知权限
        Notification.requestPermission().then(permission => {
            // 如果用户授予了权限
            if (permission === "granted") {
                // 直接显示通知
                new Notification(title, {
                    body: message,
                    icon: "./img/icon512.png",
                    data: {
                        url: "./"
                    }
                });
            } else {
                console.log("[通知显示] 用户拒绝了通知权限。 - index.js:134");
            }
        }).catch(error => {
            console.error("[通知显示] 请求通知权限时发生错误： - index.js:137", error);
        });
    }
}

// 天气预警气泡
let weatherBubbleTimer = null;
let weatherNotifyAudio = null;

function showWeatherBubble(data) {
    if (!data) return;
    const bubble = document.getElementById("weather-bubble");
    if (!bubble) return;
    const icon = bubble.querySelector(".weather-bubble-icon");
    const titleEl = bubble.querySelector(".weather-bubble-title");
    const timeEl = bubble.querySelector(".weather-bubble-time");
    if (!icon || !titleEl || !timeEl) return;

    const { id, title, headline, effective, type } = data;

    // 去重：与上次显示的预警ID比较，相同则跳过
    const lastWeatherId = localStorage.getItem("lastWeatherWarningId");
    if (id && lastWeatherId === id) return;
    if (id) localStorage.setItem("lastWeatherWarningId", id);

    const displayTitle = title || headline || "天气预警";
    const displayTime = effective || "";

    // 提示音
    if (!weatherNotifyAudio) {
        weatherNotifyAudio = new Audio("./audio/alert.wav");
    }
    weatherNotifyAudio.currentTime = 0;
    weatherNotifyAudio.play().catch(() => {});

    // 根据预警类型设置图标和颜色
    let iconText = "⚠️";
    let colorClass = "warn-default";
    if (type) {
        if (type.includes("红") || headline?.includes("红")) {
            iconText = "🔴";
            colorClass = "warn-red";
        } else if (type.includes("橙") || headline?.includes("橙")) {
            iconText = "🟠";
            colorClass = "warn-orange";
        } else if (type.includes("黄") || headline?.includes("黄")) {
            iconText = "🟡";
            colorClass = "warn-yellow";
        } else if (type.includes("蓝") || headline?.includes("蓝")) {
            iconText = "🔵";
            colorClass = "warn-blue";
        }
    } else if (headline) {
        if (headline.includes("红")) { iconText = "🔴"; colorClass = "warn-red"; }
        else if (headline.includes("橙")) { iconText = "🟠"; colorClass = "warn-orange"; }
        else if (headline.includes("黄")) { iconText = "🟡"; colorClass = "warn-yellow"; }
        else if (headline.includes("蓝")) { iconText = "🔵"; colorClass = "warn-blue"; }
    }

    icon.textContent = iconText;
    icon.className = "weather-bubble-icon " + colorClass;
    titleEl.textContent = displayTitle;
    timeEl.textContent = displayTime;

    clearTimeout(weatherBubbleTimer);
    bubble.classList.add("show");

    weatherBubbleTimer = setTimeout(() => {
        bubble.classList.remove("show");
    }, 8000);
}

const intColor = {
    "1": {
        color: "white",
        backgroundColor: "#9e9e9e",
        oright: "#cecece",
    },
    "2": {
        color: "black",
        backgroundColor: "#9dc3e6",
        oright: "#5299db",
    },
    "3": {
        color: "white",
        backgroundColor: "#009cf4",
        oright: "#026fae",
    },
    "4": {
        color: "white",
        backgroundColor: "#115ff1",
        oright: "#0344bb",
    },
    "5": {
        color: "white",
        backgroundColor: "#46bc67",
        oright: "#308c4a"
    },
    "6": {
        color: "black",
        backgroundColor: "#ffc33f",
        oright: "#ca8f0f"
    },
    "7": {
        color: "white",
        backgroundColor: "#ff8400",
        oright: "#b05d05",
    },
    "8": {
        color: "white",
        backgroundColor: "#fa5151",
        oright: "#d64a4a",
    },
    "9": {
        color: "white",
        backgroundColor: "#ff5b27",
        oright: "#c2370d",
    },
    "10": {
        color: "white",
        backgroundColor: "#fe0007",
        oright: "#b50309"
    },
    "11": {
        color: "white",
        backgroundColor: "#c10004",
        oright: "#f70007"
    },
    "12": {
        color: "black",
        backgroundColor: "#fd00bd",
        oright: "#ab0281"
    }
};

//初始化地图
const map = new TMap.Map("map", {
    center: new TMap.LatLng(37.093496518166944, 107.79942839007867), //设置中心点坐标
    zoom: 4,
    mapStyleId: "style2"
});

// 监听用户操作地图：用户拖拽/缩放时不自动恢复视野，停止操作10秒后恢复
map.on('panstart', () => {
    userTouchingMap = true;
    clearTimeout(userTouchTimeout);
});
map.on('zoomstart', () => {
    userTouchingMap = true;
    clearTimeout(userTouchTimeout);
});
map.on('panend', () => {
    userTouchTimeout = setTimeout(() => {
        userTouchingMap = false;
        // 10秒后仍在地震轮播中，自动归位到所有地震波
        if (!eewHidden && activeEarthquakes.length > 0) {
            fitAllEqBounds();
        }
    }, 10000);
});
map.on('zoomend', () => {
    userTouchTimeout = setTimeout(() => {
        userTouchingMap = false;
        if (!eewHidden && activeEarthquakes.length > 0) {
            fitAllEqBounds();
        }
    }, 10000);
});

// 卫星图
const imageTileLayer = new TMap.ImageTileLayer({
    getTileUrl: function (x, y, z) {
        return "https://bgn1.gpstool.com/maps/vt?lyrs=s&v=982&gl=cn&x=" + x + "&y=" + y + "&z=" + z;
    },
    tileSize: 256,
    minZoom: 10,
    maxZoom: 20,
    visible: true,
    zIndex: 0,
    opacity: 0.95,
    map: map,
});

// 获取数据的函数
async function fetchWeatherData() {
    try {
        const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await response.json();

        if (!data.radar || !data.radar.past || data.radar.past.length === 0) {
            console.error("[rainviewer] API响应中没有雷达数据: - index.js:327", data);
            return null;
        }

        // 从 radar.past 中获取最新的时间戳数据
        const latestRadarData = data.radar.past.reduce((latest, current) => {
            return (current.time > latest.time) ? current : latest;
        });

        // 返回最新的时间戳和host信息
        return {
            timestamp: latestRadarData.time,
            host: data.host,
            path: latestRadarData.path
        };
    } catch (error) {
        console.error("[rainviewer] 获取天气数据时出错 => - index.js:343", error);
        return null;
    }
}

let rainviewerLayer;
// 创建图层的函数
async function createImageTileLayer() {
    const weatherData = await fetchWeatherData();

    if (weatherData) {
        if (rainviewerLayer) {
            rainviewerLayer.destroy();
            rainviewerLayer = null;
        }
        // 创建新的图层
        rainviewerLayer = new TMap.ImageTileLayer({
            getTileUrl: function (x, y, z) {
                // 使用API返回的host和path构建URL
                // color=2 是 Universal Blue（唯一可用的配色方案）
                // options=1_1 表示平滑+显示雪
                return `${weatherData.host}${weatherData.path}/512/${z}/${x}/${y}/2/1_1.png`;
            },
            tileSize: 256,
            minZoom: 0,
            maxZoom: 7, // API变更：最大缩放级别改为7
            visible: true,
            zIndex: 0,
            opacity: 0.35,
            map: map,
        });
        console.log("[创建天气图层] 成功，时间戳: - index.js:374", weatherData.timestamp);
    } else {
        console.error("[创建天气图层] 无法获取最新的时间戳。 - index.js:376");
    }
}

// 调用函数以创建图层
createImageTileLayer();
// 每 2 分钟更新一次图层
setInterval(createImageTileLayer, 120000); // 2分钟

const cencstyle = {
    "cencStyle1": new TMap.MarkerStyle({
        "width": 40,
        "height": 40,
        "anchor": {
            x: 20,
            y: 20
        },
        "src": "./img/history0.png"
    }),
    "cencStyle2": new TMap.MarkerStyle({
        "width": 35,
        "height": 35,
        "anchor": {
            x: 17.5,
            y: 17.5
        },
        "src": "./img/history1.png"
    }),
    "cencStyle3": new TMap.MarkerStyle({
        "width": 30,
        "height": 30,
        "anchor": {
            x: 15,
            y: 15
        },
        "src": "./img/historyF.png"
    }),
    "cencStyle": new TMap.MarkerStyle({
        "width": 25,
        "height": 25,
        "anchor": {
            x: 12.5,
            y: 12.5
        },
        "src": "./img/historyT.png"
    }),
}

const psWaveStyles = {
    ["pWave"]: new TMap.CircleStyle({
        "color": "rgba(41,91,255,0.16)",
        "showBorder": true,
        "borderColor": "rgba(41,91,255,1)",
        "borderWidth": 3,
    }),
    ["sWave"]: new TMap.CircleStyle({
        "color": "rgba(255, 165, 0, 0.16)",
        "showBorder": true,
        "borderColor": "rgba(255, 165, 0, 1)",
        "borderWidth": 3,
    }),
    ["sWaveX"]: new TMap.CircleStyle({
        "color": "rgba(255,0,0,0.16)",
        "showBorder": true,
        "borderColor": "rgba(255,0,0,1)",
        "borderWidth": 3,
    }),
}

const converter = OpenCC.Converter({
    from: "tw",
    to: "cn"
});
let cencmd51, S波倒计时, oneAudio = false,
    spokenEventIds = new Set(), // 记录已播报的事件ID，避免重复播报
    CurrentTime, 更新秒数, cencMarkers = null,
    maxIntmarker = null,
    dingWern = false,
    eewBounds = false,
    scSta = false,
    twSta = false,
    seeScDepICL = false,
    eewHidden = false,
    // 多地震支持
    activeEarthquakes = [],    // 活跃地震列表
    currentEqIndex = 0,        // 当前显示的地震索引
    displayRotationTimer = null, // 轮播定时器
    userTouchingMap = false,    // 用户是否正在操作地图
    userTouchTimeout = null,    // 用户停止操作后的10秒计时器
    marker = null,
    epicenteral = null,
    homeMarker = null,
    psWaveCircle = null,
    currentClickHandler = null,
    cencPopups = [],
    audioCENC = new Audio("./audio/CENC update.wav"),
    timeCs = true,
    currentTimestamp = Date.now();
const warnJPcenters = ["台湾付近", "与那国島近海", "石垣島北西沖", "石垣島南方沖", "西表島付近", "石垣島近海", "宮古島近海"];

class HEQC {
    static SLOPE = [0.23335281, 0.23347212, 0.23335606, 0.23335613, 0.23335539, 0.23335367, 0.23335291];
    static INTERCEPT = [8.567052, 7.5333714, 6.667651, 8.562906, 7.877903, 7.191011, 6.5055184];
    static ARRAY = [
        [
            0.0, 22.264, 44.527, 66.79, 89.053, 111.314, 133.573, 155.832, 178.088, 200.342, 222.594,
            244.842, 267.088, 289.331, 311.57, 333.806, 356.037, 378.264, 400.486, 422.704, 444.916, 467.123,
            489.324, 511.519, 533.708, 555.891, 578.066, 600.235, 622.396, 644.55, 666.696, 688.834, 710.963,
            733.084, 755.196, 777.299, 799.392, 821.475, 843.548, 865.612, 887.664, 909.706, 931.737,
            953.756, 975.764, 997.759, 1019.743, 1041.714, 1063.673, 1085.618, 1107.551, 1129.469, 1151.375,
            1173.266, 1195.142, 1217.005, 1238.852, 1260.684, 1282.501, 1304.302, 1326.088, 1347.857, 1369.61,
            1391.346, 1413.065, 1434.767, 1456.452, 1478.118, 1499.767, 1521.397, 1543.009, 1564.602,
            1586.176, 1607.731, 1629.266, 1650.782, 1672.277, 1693.751, 1715.206, 1736.639, 1758.051,
            1779.442, 1800.811, 1822.158, 1843.482, 1864.785, 1886.064, 1907.321, 1928.554, 1949.764,
            1970.951, 1992.113, 2013.251, 2034.364, 2055.452, 2076.516, 2097.554, 2118.567, 2139.554,
            2160.514, 2181.449
        ],
        [
            0.0, 6.619, 13.238, 19.857, 26.476, 33.095, 39.714, 46.333, 51.444, 56.545, 61.646, 66.747,
            71.848, 76.949, 82.05, 87.15, 92.251, 97.352, 102.453, 107.554, 112.655, 117.756, 122.857,
            127.957, 133.058, 138.159, 143.26, 148.361, 153.462, 158.563, 163.663, 168.764, 173.865, 178.966,
            184.067, 189.168, 194.269, 199.37, 204.47, 209.571, 214.672, 219.773, 224.874, 229.975, 235.076,
            240.176, 245.277, 250.378, 255.479, 260.58, 265.681, 270.782, 275.882, 280.983, 286.084, 291.185,
            296.286, 301.387, 306.488, 311.589, 316.689, 321.79, 326.891, 331.992, 337.093, 342.194, 347.295,
            352.396, 357.496, 362.597, 367.698, 372.799, 377.9, 383.001, 388.102, 393.202, 398.303, 403.404,
            408.505, 413.606, 418.707, 423.808, 428.909, 434.009, 439.11, 444.211, 449.312, 454.413, 459.514,
            464.615, 469.716, 474.816, 479.917, 485.018, 490.119, 495.22, 500.321, 505.422, 510.523, 515.624,
            520.725
        ],
        [
            1.488, 6.807, 13.346, 19.911, 26.515, 33.11, 39.745, 45.417, 50.488, 55.613, 60.684, 65.8,
            70.917, 76.021, 81.095, 86.182, 91.322, 96.399, 101.49, 106.582, 111.681, 116.818, 121.929,
            126.99, 132.1, 137.192, 142.301, 147.404, 152.503, 157.606, 162.737, 167.834, 172.9, 178.001,
            183.117, 188.208, 193.3, 198.412, 203.502, 208.624, 213.713, 218.84, 223.942, 229.021, 234.134,
            239.244, 244.333, 249.427, 254.511, 259.628, 264.712, 269.821, 274.944, 280.043, 285.113,
            290.226, 295.319, 300.438, 305.562, 310.665, 315.765, 320.832, 325.938, 331.029, 336.156,
            341.256, 346.37, 351.454, 356.525, 361.647, 366.738, 371.866, 376.964, 382.067, 387.136, 392.269,
            397.362, 402.467, 407.557, 412.675, 417.757, 422.883, 427.936, 433.063, 438.138, 443.259, 448.36,
            453.482, 458.554, 463.648, 468.78, 473.872, 478.945, 484.079, 489.15, 494.257, 500.321, 505.422,
            510.523, 515.624, 520.725
        ],
        [
            2.976, 7.259, 13.567, 20.069, 26.647, 33.213, 39.344, 44.424, 49.543, 54.634, 59.775, 64.86,
            69.955, 75.037, 80.128, 85.261, 90.342, 95.439, 100.544, 105.649, 110.746, 115.884, 120.963,
            126.043, 131.172, 136.266, 141.386, 146.47, 151.554, 156.656, 161.748, 166.873, 171.985, 177.062,
            182.191, 187.259, 192.364, 197.497, 202.568, 207.661, 212.771, 217.892, 222.952, 228.06, 233.166,
            238.263, 243.393, 248.495, 253.575, 258.688, 263.798, 268.864, 273.986, 279.094, 284.164,
            289.287, 294.388, 299.51, 304.603, 309.694, 314.779, 319.886, 325.016, 330.118, 335.206, 340.312,
            345.408, 350.504, 355.625, 360.721, 365.82, 370.915, 376.025, 381.111, 386.203, 391.311, 396.402,
            401.523, 406.604, 411.716, 416.814, 421.893, 427.016, 432.121, 437.217, 442.3, 447.421, 452.517,
            457.61, 462.705, 467.796, 472.935, 478.007, 483.127, 488.235, 493.307, 498.446, 503.519, 508.616,
            513.739, 518.848
        ],
        [
            4.464, 7.978, 13.939, 20.351, 26.823, 33.387, 39.971, 46.348, 51.456, 56.542, 61.646, 66.762,
            71.841, 76.933, 82.047, 87.147, 92.235, 97.359, 102.459, 107.537, 112.663, 117.759, 122.861,
            127.945, 133.04, 138.142, 143.259, 148.341, 153.47, 158.54, 163.654, 168.788, 173.86, 178.971,
            184.047, 189.159, 194.289, 199.348, 204.467, 209.595, 214.678, 219.796, 224.858, 229.963,
            235.055, 240.158, 245.26, 250.393, 255.494, 260.602, 265.697, 270.77, 275.865, 280.979, 286.091,
            291.196, 296.281, 301.402, 306.487, 311.594, 316.679, 321.807, 326.899, 331.974, 337.077,
            342.209, 347.299, 352.403, 357.497, 362.59, 367.694, 372.785, 377.919, 382.976, 388.104, 393.188,
            398.307, 403.425, 408.527, 413.611, 418.688, 423.805, 428.92, 434.001, 439.118, 444.203, 449.331,
            454.404, 459.512, 464.596, 469.716, 474.804, 479.921, 485.044, 490.136, 495.232, 500.339,
            505.444, 510.501, 515.627, 520.723
        ],
        [
            5.801, 8.719, 14.355, 20.592, 27.027, 33.577, 40.088, 45.633, 50.735, 55.874, 60.958, 66.056,
            71.175, 76.238, 81.356, 86.451, 91.545, 96.677, 101.776, 106.861, 111.959, 117.053, 122.182,
            127.277, 132.358, 137.465, 142.576, 147.671, 152.797, 157.879, 162.983, 168.072, 173.199,
            178.289, 183.402, 188.458, 193.593, 198.668, 203.778, 208.906, 213.961, 219.093, 224.179,
            229.275, 234.363, 239.47, 244.581, 249.679, 254.802, 259.878, 265.009, 270.093, 275.203, 280.304,
            285.409, 290.513, 295.596, 300.688, 305.817, 310.901, 315.995, 321.105, 326.216, 331.322,
            336.409, 341.53, 346.613, 351.706, 356.801, 361.914, 367.015, 372.132, 377.223, 382.335, 387.417,
            392.51, 397.608, 402.718, 407.824, 412.931, 418.029, 423.111, 428.244, 433.316, 438.437, 443.516,
            448.631, 453.748, 458.812, 463.938, 469.022, 474.119, 479.24, 484.321, 489.419, 494.531, 499.638,
            504.737, 509.822, 514.944, 520.047
        ],
        [
            7.138, 9.589, 14.811, 20.862, 27.254, 33.734, 39.859, 44.984, 50.063, 55.148, 60.277, 65.397,
            70.479, 75.593, 80.666, 85.772, 90.857, 95.98, 101.062, 106.197, 111.292, 116.378, 121.482,
            126.578, 131.684, 136.789, 141.889, 146.99, 152.107, 157.194, 162.278, 167.404, 172.494, 177.603,
            182.698, 187.8, 192.879, 197.994, 203.095, 208.187, 213.277, 218.388, 223.494, 228.579, 233.704,
            238.813, 243.884, 248.998, 254.086, 259.189, 264.295, 269.385, 274.508, 279.594, 284.694,
            289.786, 294.935, 299.997, 305.096, 310.226, 315.296, 320.427, 325.512, 330.6, 335.72, 340.821,
            345.939, 351.023, 356.113, 361.199, 366.33, 371.445, 376.536, 381.624, 386.74, 391.85, 396.929,
            402.02, 407.151, 412.231, 417.325, 422.422, 427.513, 432.653, 437.76, 442.832, 447.955, 453.027,
            458.129, 463.224, 468.338, 473.436, 478.559, 483.661, 488.749, 493.868, 498.952, 504.027,
            509.167, 514.241, 519.359
        ],
        [
            8.475, 10.59, 15.353, 21.238, 27.517, 33.895, 39.203, 44.303, 49.377, 54.485, 59.586, 64.68,
            69.77, 74.896, 79.985, 85.081, 90.177, 95.275, 100.376, 105.489, 110.597, 115.697, 120.81,
            125.899, 131.022, 136.118, 141.173, 146.301, 151.4, 156.487, 161.586, 166.699, 171.792, 176.914,
            181.987, 187.127, 192.205, 197.301, 202.388, 207.502, 212.632, 217.719, 222.807, 227.919,
            232.995, 238.098, 243.221, 248.296, 253.402, 258.528, 263.606, 268.735, 273.841, 278.913,
            283.999, 289.118, 294.237, 299.331, 304.438, 309.539, 314.621, 319.727, 324.834, 329.95, 335.052,
            340.137, 345.242, 350.317, 355.446, 360.53, 365.656, 370.721, 375.816, 380.937, 386.029, 391.14,
            396.238, 401.34, 406.453, 411.565, 416.633, 421.769, 426.872, 431.96, 437.038, 442.14, 447.249,
            452.349, 457.469, 462.556, 467.64, 472.739, 477.865, 482.954, 488.063, 493.141, 498.281, 503.366,
            508.466, 513.553, 518.649
        ]
    ];

    // 静态方法计算倒计时秒数
    static getCountDownSeconds(depth, distance) {
        // 如果深度或距离小于0，则返回0
        if (depth < 0.0 || distance < 0.0) {
            return 0.0;
        }
        // 根据深度计算索引i，如果i大于6，则i设为6
        let i = Math.floor(depth / 5.0); // 假设深度为10 10/5=2 i=2
        if (i > 6) i = 6;
        // 获取数组ARRAY，并根据i获取对应的两个数组fArr2和fArr3
        let fArr = this.ARRAY;
        let i2 = 0;
        let fArr2 = fArr[0];
        let fArr3 = fArr[i + 1]; // 假设为2+1=3
        let length = fArr2.length - 1; // 总数？
        // 如果距离大于fArr2的最后一个元素，则使用斜率和截距计算倒计时
        if (distance > fArr2[length]) return (this.SLOPE[i] * distance) + this.INTERCEPT[i];
        // 如果距离与fArr2的最后一个元素之差小于0，则返回fArr3的最后一个元素
        if (Math.abs(distance - fArr2[length]) < 0.0) return fArr3[length];
        // 循环查找距离在fArr2中的位置
        while (i2 < length && distance >= fArr2[i2]) i2++;
        let i3 = i2 - 1;
        let i4 = i3 + 1;
        // 使用线性插值计算倒计时
        return fArr3[i3] + ((fArr3[i4] - fArr3[i3]) * ((distance - fArr2[i3]) / (fArr2[i4] - fArr2[i3])));
    }
}
let socket;

// 发送 ping 并记录时间，用于计算 RTT
function sendPing() {
    if (isPageVisible) {
        pingTime = Date.now();
        socket.send("ping");
    } else {
        console.log("[时间同步] 不在前台，跳过时间校准 - index.js:614");
    }
}

async function getAllData() {
    // 关闭并清理旧的 socket 连接，避免内存泄漏和重复事件监听
    if (socket) {
        socket.close();
        socket = null;
    }
    socket = new WebSocket("wss://ws.fanstudio.tech/all");

    socket.addEventListener("open", (allOpen) => {
        // 重置状态
        hasSwitched = false;
        pingTime = 0;
        startTimeInterval();
        console.log("[WebSocket消息] 已连接到 WebSocket. - index.js:631");
        toastr.success("已连接到 WebSocket.");

        // setTimeout(() => {
        //     socket.send("query");
        // }, 2000)

    });

    socket.addEventListener("message", (allMessage) => {
        let json = JSON.parse(allMessage.data);

        console.log("[WebSocket消息] fanstudio => - index.js:643", json);

        if (json.type == "heartbeat") {
            // heartbeat 只用于保持连接活跃，不用于计算 RTT
            // 收到 heartbeat 后发送 ping
            sendPing();
        }

        // 处理 pong 响应（用于计算真实的 RTT）
        if (json.type == "pong") {
            const receiveTime = Date.now();
            const serverTimestamp = json.timestamp;

            // 计算网络延迟（RTT）
            if (pingTime > 0) {
                networkRTT = receiveTime - pingTime;
                console.log(`[时间同步] 网络延迟: ${networkRTT}ms - index.js:659`);

                // 显示RTT和颜色
                const rttHand = document.getElementById("time-rtt-hand");
                if (rttHand) {
                    rttHand.innerText = `${networkRTT}ms`;
                    // 根据延迟改变颜色
                    if (networkRTT <= 100) {
                        rttHand.style.color = '#4ade80'; // 绿色
                    } else if (networkRTT <= 300) {
                        rttHand.style.color = '#facc15'; // 黄色
                    } else {
                        rttHand.style.color = '#f87171'; // 红色
                    }
                }

                // 如果延迟过长，跳过时间校准
                if (networkRTT > 1000) {
                    console.log(`[时间同步] 跳过时间校准，RTT过长: ${networkRTT}ms - index.js:677`);
                    pingTime = 0;
                    return;
                }

                // 计算时间偏差
                const halfRTT = networkRTT / 2;
                const localTime = receiveTime - halfRTT;
                const timeDelta = localTime - serverTimestamp;

                nowCNtimeStamp.ndDelta = timeDelta;
                hasSwitched = false;
                console.log(`[时间同步] 已同步校准时间，时间偏差: ${timeDelta}ms; 网络RTT: ${networkRTT}ms - index.js:689`);
            }
        }

        // 处理初始数据和查询响应
        if (json.type == "initial_all") {
            // 处理CENC预警数据（单个最新事件，用于预警）
            if (json.cenc && json.cenc.Data) {
                // 只用于预警，不更新列表
                const cencData = json.cenc.Data;
                if (cencData && !Array.isArray(cencData)) {
                    // 判断正式测定/自动测定
                    const rawType = cencData.infoTypeName || "";
                    const cleanType = rawType.replace(/\s+/g, "").trim();
                    const cencType = cleanType === "[自动测定]" ? "自动测定" : "正式测定";
                    // 单个预警事件
                    eew("cenc", cencData.shockTime, cencData.placeName, cencData.latitude, cencData.longitude, cencData.magnitude, cencType, null, cencData.depth, null);
                    // 收到预警数据后，发送 cenclist 请求获取完整列表
                    socket.send("cenclist");
                }
            }
            // 处理CEA数据
            if (json.cea && json.cea.Data) {
                processCeaData(json.cea.Data);
            }
            // 处理CWA-EEW数据
            if (json["cwa-eew"] && json["cwa-eew"].Data) {
                processCwaEewData(json["cwa-eew"].Data);
            }
            // 处理JMA数据
            if (json.jma && json.jma.Data) {
                processJmaData(json.jma.Data);
            }
            // 处理天气预警数据
            if (json.weather && json.weather.Data) {
                showWeatherBubble(json.weather.Data);
            }
            sendPing();
        }

        // 处理增量更新
        if (json.type == "update") {
            sendPing();
            const source = json.source;
            const data = json.Data;

            switch (source) {
                case "cenc":
                    // CENC更新只用于预警，不更新列表
                    if (data && !Array.isArray(data)) {
                        // 判断正式测定/自动测定
                        const rawType = data.infoTypeName || "";
                        const cleanType = rawType.replace(/\s+/g, "").trim();
                        const cencType = cleanType === "[自动测定]" ? "自动测定" : "正式测定";
                        eew("cenc", data.shockTime, data.placeName, data.latitude, data.longitude, data.magnitude, cencType, null, data.depth, null);
                        // 收到预警更新后，重新请求列表
                        socket.send("cenclist");
                    }
                    break;
                case "cea":
                    processCeaData(data);
                    break;
                case "cwa-eew":
                    processCwaEewData(data);
                    break;
                case "jma":
                    processJmaData(data);
                    break;
                case "weather":
                    if (data) showWeatherBubble(data);
                    break;
            }
        }

        // 处理CENC列表响应
        if (json.type == "cenclist_response") {
            console.log("[WebSocket消息] 收到 cenclist_response，数据数量: - index.js:765", json.Data?.length);
            if (json.Data && Array.isArray(json.Data)) {
                // 使用第一个事件的 createTime 作为 md5 校验
                const newMd5 = json.Data[0]?.createTime;
                if (newMd5 && newMd5 !== cencmd51) {
                    cencmd51 = newMd5;
                    cencEventList = json.Data;
                    console.log("[WebSocket消息] cenclist_response 数据已更新到 cencEventList，md5: - index.js:772", newMd5);
                    displayCencList();
                } else {
                    console.log("[WebSocket消息] cenclist_response md5未变化，跳过更新 - index.js:775");
                }
            } else {
                console.error("[WebSocket消息] cenclist_response 数据格式错误: - index.js:778", json);
            }
        }

        // 处理天气预警独立消息
        if (json.type == "weather_warning") {
            if (json.Data) {
                showWeatherBubble(json.Data);
            }
        }

        // // 处理query_response（与initial_all相同结构）
        // if (json.type == "query_response") {
        //     // 处理CENC预警数据（单个最新事件，用于预警）
        //     if (json.cenc && json.cenc.Data) {
        //         const cencData = json.cenc.Data;
        //         if (cencData && !Array.isArray(cencData)) {
        //             // 单个预警事件
        //             eew("cenc", cencData.shockTime, cencData.placeName, cencData.latitude, cencData.longitude, cencData.magnitude, "正式测定", null, cencData.depth, null);
        //         }
        //     }
        //     // 处理CEA数据
        //     if (json.cea && json.cea.Data) {
        //         processCeaData(json.cea.Data);
        //     }
        //     // 处理CWA-EEW数据
        //     if (json["cwa-eew"] && json["cwa-eew"].Data) {
        //         processCwaEewData(json["cwa-eew"].Data);
        //     }
        //     // 处理JMA数据
        //     if (json.jma && json.jma.Data) {
        //         processJmaData(json.jma.Data);
        //     }
        // }
    });

    socket.addEventListener("error", (allError) => {
        console.error(`[WebSocket消息] 未能连接到 WebSocket. Code => ${allError.code} - index.js:815`);
        toastr.error("Code => " + allError.code, "未能连接到 WebSocket.");
    });

    socket.addEventListener("close", (allClose) => {
        console.error(`[WebSocket消息] 正在尝试重新连接到 WebSocket... Code => ${allClose.code} - index.js:820`);
        toastr.info("Code => " + allClose.code, "正在尝试重新连接到 WebSocket...");
        setTimeout(getAllData, 5000);
    });
}

const justTimeColor = () => $("#serverTime").css("color", timeCs ? "white" : "#f51c15");

let lastUpdateAt, lastUpdates, lastUpdateAtCea, lastUpdatesCea; // 用于存储上次更新的时间戳，以便比较是否有新的更新

// 维护CENC历史事件列表
let cencEventList = [];

// 处理中国地震台网数据
function processCencData(data) {
    if (!data) return;

    // 如果是数组（来自cenclist_response），直接更新列表
    if (Array.isArray(data)) {
        cencEventList = data;
        displayCencList();
        return;
    }

    // 如果是单个对象（来自update），检查是否已存在
    const existingIndex = cencEventList.findIndex(item => item.id === data.id);
    if (existingIndex !== -1) {
        // 更新现有事件
        cencEventList[existingIndex] = data;
    } else {
        // 添加新事件到列表开头
        cencEventList.unshift(data);
    }

    // 保持最多50个事件
    if (cencEventList.length > 50) {
        cencEventList.pop();
    }

    // 使用修改后的cencRun逻辑显示列表
    displayCencList();
}

// 显示CENC地震列表
function displayCencList() {
    if (!cencEventList || cencEventList.length === 0) {
        console.log("[displayCencList] cencEventList为空 - index.js:866");
        return;
    }

    console.log(`[displayCencList] 开始处理 ${cencEventList.length} 个事件 - index.js:870`);

    // 清除旧的标记和弹窗
    if (cencMarkers) {
        cencMarkers.setMap(null);
        cencMarkers = null;
        cencPopups.forEach(popup => popup.destroy());
        cencPopups = [];
    }

    // 清空现有列表并重新生成
    const container = $("#cencList");
    container.empty();

    // 动态生成列表元素
    for (let i = 1; i <= cencEventList.length; i++) {
        const listBarHTML = `
            <div id="list_Bar${i}" class="listBar">
                <span class="listTime" id="listTime${i}">01月01日 00:00</span>
                <span class="listDistance" id="listDistance${i}">距离:100km</span>
                <span class="listEpicenter" id="listEpicenter${i}">载入中</span>
                <span class="listType" id="listType${i}">坤坤测定</span>
                <span class="listMagnitude" id="listMagnitude${i}">M0.0</span>
                <span class="listDepth" id="listDepth${i}">深度:10Km</span>
                <div class="listMaxInt" id="listMaxInt${i}">-</div>
            </div>`;
        container.append(listBarHTML);
    }

    const cencGeometries = [];

    for (let i = 0; i < cencEventList.length; i++) {
        try {
            const data = cencEventList[i];

            const {
                infoTypeName: type,
                depth,
                placeName: location,
                magnitude,
                latitude,
                longitude,
                shockTime: time
            } = data;

            // 处理infoTypeName可能包含换行和空格的情况
            const cleanType = type ? type.replace(/\s+/g, "").trim() : "正式测定";
            const listMaxInt = calcMaxInt(magnitude, depth, location);
            const listMaxInt2 = Math.floor(listMaxInt);
            const listDistance = Math.floor(getDistance(latitude, longitude, homeLat, homeLon));
            const listType = cleanType === "[自动测定]" ? "自动测定" : "正式测定";

            const displayIndex = i + 1;

            // 检查元素是否存在
            const listBar = document.getElementById(`list_Bar${displayIndex}`);
            if (!listBar) {
                console.warn(`[displayCencList] 元素 list_Bar${displayIndex} 不存在，跳过 - index.js:927`);
                continue;
            }

            calclistEpicenterTopSize(location, displayIndex);
            $(`#listDistance${displayIndex}`).text(`${listDistance}km`);
            $(`#listDepth${displayIndex}`).text(`深度:${depth}km`);
            $(`#listEpicenter${displayIndex}`).text(location);
            const magColor = getMagnitudeColor(magnitude);
            $(`#listMagnitude${displayIndex}`).text(`M${magnitude}`).css("color", magColor);
            const thisbggcolor = intColor[listMaxInt2].oright;
            $(`#listMaxInt${displayIndex}`).text(listMaxInt2).css({
                "background-color": intColor[listMaxInt2].backgroundColor,
                "color": intColor[listMaxInt2].color,
                "border": `3px solid ${thisbggcolor}`
            });
            const listTimeDisply = cencTimeDisply(time);
            $(`#listTime${displayIndex}`).text(listTimeDisply);

            listBar.style.border = (displayIndex === 1 ? "2px solid " : "1px solid ") + thisbggcolor;
            if (clickHandlers[`No${displayIndex}`]) listBar.removeEventListener("click", clickHandlers[`No${displayIndex}`]);
            clickHandlers[`No${displayIndex}`] = createClickHandler(new TMap.LatLng(latitude, longitude));
            listBar.addEventListener("click", clickHandlers[`No${displayIndex}`]);

            if (displayIndex === 1) handleFirstItem(data.id, listType, time, listTimeDisply, location, latitude, longitude, magnitude, depth, listMaxInt);
            else $(`#listType${displayIndex}`).text(`No.${displayIndex}`);

            const popup = createPopup(displayIndex, thisbggcolor, listType, time, location, latitude, longitude, magnitude, depth, listMaxInt);
            cencPopups.push(popup);

            const cencGeo = {
                "id": `cencMarker_${displayIndex}`,
                "styleId": `cencStyle${displayIndex <= 3 ? displayIndex : ""}`,
                "position": new TMap.LatLng(latitude, longitude),
                "properties": {
                    "title": "cencMarker"
                }
            };
            cencGeometries.push(cencGeo);
        } catch (error) {
            console.error(`[displayCencList] 处理第 ${i + 1} 个事件时出错: - index.js:967`, error);
        }
    }

    // 创建所有标记
    if (cencGeometries.length > 0) {
        cencMarkers = new TMap.MultiMarker({
            map: map,
            styles: cencstyle,
            geometries: cencGeometries
        }).on("click", function (e) {
            const index = cencGeometries.findIndex(g => g.id === e.geometry.id);
            if (index !== -1) cencPopups[index].open();
        });
    }

    console.log(`[displayCencList] 完成，共处理 ${cencGeometries.length} 个标记 - index.js:983`);
}

// 处理中国地震预警网数据
function processCeaData(data) {
    if (!data) return;
    const {
        shockTime: timeCEA,
        placeName: centerCEA,
        latitude: latCEA,
        longitude: lonCEA,
        magnitude: zhenjiCEA,
        updates: whatbaoCEA
    } = data;
    let depCEA = data.depth ?? 0;
    const currentUpdateAt = data.id;
    if (lastUpdateAtCea !== currentUpdateAt || whatbaoCEA !== lastUpdatesCea) {
        console.log("[执行CEA] 调用eew - index.js:1000");
        lastUpdateAtCea = currentUpdateAt;
        lastUpdatesCea = whatbaoCEA;
        eew("cea", timeCEA, centerCEA, latCEA, lonCEA, Number(zhenjiCEA), whatbaoCEA, null, depCEA);
    }
    if (!timeCs) {
        timeCs = true;
        justTimeColor();
    }
}

// 处理台湾气象署地震预警数据
function processCwaEewData(data) {
    if (!data) return;
    const {
        shockTime: timeTaiwan,
        placeName: centerTaiwan,
        latitude: latTaiwan,
        longitude: lonTaiwan,
        magnitude: zhenjiTaiwan,
        depth: depTaiwan,
        updates: whatbaoTaiwan
    } = data;
    eew("cwa_eew", timeTaiwan, centerTaiwan, latTaiwan, lonTaiwan, zhenjiTaiwan, whatbaoTaiwan, null, depTaiwan);
}

// 处理日本气象厅地震预警数据
function processJmaData(data) {
    if (!data) return;
    const {
        shockTime: timeJP,
        placeName: centerJP,
        latitude: latJP,
        longitude: lonJP,
        magnitude: zhenjiJP,
        depth: depJP,
        updates: whatbaoJP,
        epiIntensity: maxIntJP,
        final: isFinalJP,
        cancel: isCancelJP,
        infoTypeName: biaotiJP
    } = data;

    // 判断是否为预警（予報为预报，不是预警）
    const isWarnJP = biaotiJP !== "予報";

    // 处理取消预警的公共逻辑
    function handleCancelJP() {
        eewToastr(false, timeJP, centerJP, latJP, lonJP, zhenjiJP, whatbaoJP, depJP, maxIntJP, biaotiJP, isCancelJP, isFinalJP);
        eewCancel();
    }

    // 根据原有逻辑处理JMA数据
    if (scSta || twSta) {
        eewToastr(false, timeJP, centerJP, latJP, lonJP, zhenjiJP, whatbaoJP, depJP, maxIntJP, biaotiJP, isCancelJP, isFinalJP);
    } else if (isWarnJP) {
        if (isCancelJP) {
            handleCancelJP();
        } else {
            eew("jma_eew", timeJP, centerJP, latJP, lonJP, zhenjiJP, whatbaoJP, maxIntJP, depJP, isFinalJP);
            eewToastr(true, null, centerJP, null, null, null, null, depJP, null, null, null, null);
        }
    } else if (warnJPcenters.includes(centerJP)) {
        centerJP = centerJP == "宮古島近海" ? "琉球群岛附近" : "中国台湾附近";
        if (isCancelJP) {
            handleCancelJP();
        } else {
            eew("jma_tw_eew", timeJP, centerJP, latJP, lonJP, zhenjiJP, whatbaoJP, maxIntJP, depJP, isFinalJP);
            eewToastr(true, timeJP, centerJP, null, null, null, null, depJP, null, null, null, null);
        }
    } else {
        eewToastr(false, timeJP, centerJP, latJP, lonJP, zhenjiJP, whatbaoJP, depJP, maxIntJP, biaotiJP, isCancelJP, isFinalJP);
    }
}



$(document).ready(() => {
    getAllData();
});

const clickHandlers = {};

function createClickHandler(listCoor) {
    return function () {
        map.easeTo({
            center: listCoor,
            zoom: 7
        });
    };
}

function getMagnitudeColor(magnitude) {
    if (magnitude < 3.5) return "#B2D4F2";
    if (magnitude < 4) return "#4fa6f3";
    if (magnitude < 5) return "#fec118";
    if (magnitude < 6) return "#fb8a23";
    return "#f7455c";
}

function handleFirstItem(eventId, listType, listTime, listTimeDisply, location, latitude, longitude, magnitude, depth, listMaxInt) {
    $("#listType1").text(listType);
    if (!oneAudio) {
        oneAudio = true;
        showCustomNotification("📩 通知已开启", "如果看到此信息，表明预警信息推送已开启。");
    } else if (eventId && !spokenEventIds.has(eventId)) {
        spokenEventIds.add(eventId);
        audioCENC.play();
        const cencType = `中国地震台网 ${listType}`;
        const cencShow = `${listTimeDisply} 在 ${location} 发生${magnitude}级地震，震源深度${depth}km，预估最大烈度${listMaxInt}度`;
        showCustomNotification(`${listType == "正式测定" ? "🔔" : "📨"} ${cencType}`, cencShow);
        const cencTTS = `中国地震台网${listType}${location}发生${magnitude}级地震，震源深度${depth}千米，最大烈度${listMaxInt}度`;
        tts(null, null, null, cencTTS);
    }
    eew("cenc", listTime, location, parseFloat(latitude), parseFloat(longitude), parseFloat(magnitude), listType, null, parseFloat(depth), null, !oneAudio);
}

function createPopup(i, thisbggcolor, listType, time, location, latitude, longitude, magnitude, depth, listMaxInt) {
    const popup = new TMap.InfoWindow({
        map: map,
        enableCustom: true,
        position: new TMap.LatLng(latitude, longitude),
        offset: {
            x: 0,
            y: -15
        },
        content: `
            <div class="popup-content" style="border: 2px solid ${thisbggcolor}">
                <div style="text-align: center; font-size: 18px; padding-top: 16px;">中国地震台网 ${listType}${i > 1 ? "#" + i : "⚡"}</div>
                <p>时间：${time}</p>
                <p>震中：${location}</p>
                <p>纬度：${latitude}</p>
                <p>经度：${longitude}</p>
                <p>震级：${magnitude} 级</p>
                <p>深度：${depth} km</p>
                <p>预估最大烈度：${listMaxInt}</p>
            </div>
        `
    });
    popup.close();
    return popup;
}

function calcMaxInt(Magnitude, Depth, Location = null) {
    Magnitude = Number(Magnitude);
    Depth = Number(Depth);

    // 定义默认常量
    let a = 3.944,
        b = 1.071,
        c = 1.2355678010148,
        d = 7;

    // 特定位置的处理
    if (Location) {
        if (Location.includes("四川") || Location.includes("西藏") || Location.includes("青海")) {
            a = 3.6113;
            b = 1.4347;
            c = 1.6710348780191;
            d = 13;
        } else if (Location.includes("新疆")) {
            a = 3.3682;
            b = 1.2746;
            c = 1.4383398946154;
            d = 9;
        }

        // 针对特定城市的额外调整
        if (Location.includes("内江市") || Location.includes("宜宾市")) {
            a = 3.6588;
            b = 1.3626;
            c = 1.5376630426267;
            d = 13;
        }
    }

    // 计算最大烈度
    const logTerm = Math.log(d * (Depth + 25) / 40),
        maxInt = (a + b * Magnitude - c * logTerm + 0.2).toFixed(1);

    // Math.floor();
    return maxInt;
}

function Rad(d) {
    return d * Math.PI / 180;
}

function getDistance(lat1, lng1, lat2, lng2) {
    let radLat1 = Rad(lat1);
    let radLat2 = Rad(lat2);
    let a = radLat1 - radLat2;
    let b = Rad(lng1) - Rad(lng2);
    let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math
        .sin(b / 2), 2)));
    s = s * 6378.137;
    s = Math.round(s * 10000) / 10000;
    return s;
}

function formatDateTime(dateObj, format) {
    const padZero = (num) => (num < 10 ? "0" + num : String(num));

    const year = dateObj.getFullYear();
    const month = padZero(dateObj.getMonth() + 1);
    const day = padZero(dateObj.getDate());
    const hours = padZero(dateObj.getHours());
    const minutes = padZero(dateObj.getMinutes());
    const seconds = padZero(dateObj.getSeconds());
    const milliseconds = String(dateObj.getMilliseconds()).padStart(3, "0");

    return format
        .replace("YYYY", year)
        .replace("MM", month)
        .replace("DD", day)
        .replace("hh", hours)
        .replace("mm", minutes)
        .replace("ss", seconds)
        .replace(".SSS", milliseconds);
}

function timeaddz(time, z) {
    if (!time) return null;

    // 将 YYYY/MM/DD 或 YYYY-MM-DD 格式统一转换为 YYYY-MM-DD
    let isoTime = time.replace(/\//g, "-");

    // 确保格式是 YYYY-MM-DD HH:mm:ss
    const match = isoTime.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})$/);
    if (!match) return null;

    // 转换为标准 ISO 8601 格式：在日期和时间之间添加 T
    const [, year, month, day, timePart] = match;
    return `${year}-${month}-${day}T${timePart}+0${z}:00`;
}

function cencTimeDisply(cenctime) {
    const timeObj = timeaddz(cenctime, 8);
    if (!timeObj) return "";
    let dateObj = new Date(timeObj);
    return formatDateTime(dateObj, "MM月DD日 hh:mm");
}

function eewTimeDisplay(type, eewTime, epucenter = null) {
    if (epucenter && epucenter.length >= 9) type = "bf_eew";
    let dateObj = new Date(eewTime);
    switch (type) {
        case "cn_eew":
            return formatDateTime(dateObj, "hh时mm分ss秒");
        case "bf_eew":
            return formatDateTime(dateObj, "hh:mm:ss");
        case "inform":
            return formatDateTime(dateObj, "hh:mm");
        default:
            console.log(`[格式化eew时间] 无效的时间 => ${type}, ${eewTime} - index.js:1254`);
            return null;
    }
}

function currentTimeDisplay(timestamp) {
    let dateObj = new Date(timestamp);
    return formatDateTime(dateObj, "YYYY/MM/DD hh:mm:ss");
}

/**
 * 更新右下角时间显示
 */
function updateTime() {
    // 计算当前显示时间（应用时区偏移）
    const dateObj = new Date(Date.now() - nowCNtimeStamp.ndDelta);
    nowCNtimeStamp.CST = dateObj.getTime();
    currentTimestamp = nowCNtimeStamp.CST;

    // 格式化时间（包含毫秒）
    const fullTimeString = formatDateTime(dateObj, "YYYY/MM/DD hh:mm:ss");
    const milliseconds = String(dateObj.getMilliseconds()).padStart(3, "0");
    // 使用HTML格式显示，毫秒用小字号
    document.getElementById("serverTime").innerHTML = `${fullTimeString}<span style="font-size: 0.7em;">.${milliseconds}</span>`;

    if (!hasSwitched) {
        const ms = dateObj.getMilliseconds();
        if (ms >= 985 || ms <= 211) {
            if (fastIntervalId) {
                clearInterval(fastIntervalId);
                fastIntervalId = null;
            }

            fastIntervalId = setInterval(updateTime, 1000);
            hasSwitched = true;

            console.log(`[时间精度控制] ${fullTimeString}.${milliseconds} - index.js:1290`);
        }
    }
}

function startTimeInterval() {
    if (fastIntervalId) {
        clearInterval(fastIntervalId);
        fastIntervalId = null;
        hasSwitched = false;
    }
    // 使用RTT作为更新时间间隔，确保显示精度
    const interval = Math.max(networkRTT, 100);
    fastIntervalId = setInterval(updateTime, interval);
}

function calclistEpicenterTopSize(epicenter, locate) {
    epicenter.length >= 12 ? $("#listEpicenter" + locate).css("top", "23px") : $("#listEpicenter" + locate).css("top", "26px");
}

// 隐藏 tooltip 并在鼠标离开按钮后恢复 hover 效果
function hideTooltipAndReset(button) {
    const tooltip = button.nextElementSibling;
    if (tooltip && tooltip.classList.contains('main-tooltip')) {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        
        // 鼠标离开按钮后清除内联样式，让 CSS hover 重新生效
        button.addEventListener('mouseleave', function resetTooltip() {
            tooltip.style.opacity = '';
            tooltip.style.visibility = '';
            button.removeEventListener('mouseleave', resetTooltip);
        }, { once: true });
    }
}

function easeTo() {
    hideTooltipAndReset(document.getElementById('set-EaseTo'));
    if (!eewBounds) {
        map.easeTo({
            center: new TMap.LatLng(37.093496518166944, 107.79942839007867),
            zoom: 4
        })
    } else {
        fitAllEqBounds()
    }
}

const closeCencPopups = () => {
    hideTooltipAndReset(document.getElementById('cencPopupsclose'));
    cencPopups.forEach(popup => {
        if (popup) popup.close();
    });
};

function eewToastr(warn, timeJP, centerJP, latJP, lonJP, zhenjiJP, whatbaoJP, depJP, maxIntJP, biaotiJP, isCancelJP, isFinalJP) {
    const timeObj = timeaddz(timeJP, 9);
    if (!timeObj) return;
    const timeTimestamp = new Date(timeObj).getTime();
    if (currentTimestamp - timeTimestamp > 300000) return;
    timeJP = eewTimeDisplay("bf_eew", timeTimestamp);

    if (!warn) {
        const reportType = isFinalJP ? `最终第${whatbaoJP}报` : isCancelJP ? `取消第${whatbaoJP}报` : `第${whatbaoJP}报`;
        const message = `
            ${biaotiJP} ${reportType}<br>
            ${timeJP} 发生<br>
            震中: ${centerJP}（${latJP}, ${lonJP}）<br>
            震级: M${zhenjiJP}<br>
            深度: ${depJP}km<br>
            最大震度: ${maxIntJP}
        `;
        toastr.info(message, "日本气象厅预警");
    } else {
        const message = `${centerJP} 深度${depJP}km`;
        toastr.info(message, "深度");
    }

}

// 凌晨 Sep 9, 2024 本来想class EpicenterMarker extends TMap.DOMOverlay但是最终效果还是不如官方的
function EpicenterMarker(options) {
    let epicenterDom;
    TMap.DOMOverlay.call(this, options);
}
EpicenterMarker.prototype = new TMap.DOMOverlay();

// 初始化
EpicenterMarker.prototype.onInit = function (options) {
    this.position = options.position;
}

// 创建
EpicenterMarker.prototype.createDOM = function () {
    epicenterDom = document.createElement("img"); // 新建一个img的dom
    epicenterDom.src = "./img/Source-Copy.png";
    epicenterDom.style.cssText = `
            position: absolute;
            width: 70px;
            height: 70px;
    `; // 这里改了改
    epicenterDom.classList.add("fade"); // 这里也改了改
    return epicenterDom;
}

// 更新DOM元素，在地图移动/缩放后执行
EpicenterMarker.prototype.updateDOM = function () {
    if (!this.map) return; // 我缩写成了一行
    let pixel = this.map.projectToContainer(this.position); // 经纬度坐标转容器像素坐标
    let left = pixel.getX() - this.dom.clientWidth / 2 + "px";
    let top = pixel.getY() - this.dom.clientHeight / 2 + "px";
    // 使用top/left将DOM元素定位到指定位置
    this.dom.style.top = top;
    this.dom.style.left = left;
}

let hasExecuted = false;

// 本预警函数特地典型使用中文变量名，清晰易懂awa
function eew(类型, 发震时间, 震中, lat, lon, 震级, 多少报, 最大烈度, 深度 = null, 最终 = null, isOneCENC = true) {
    if (类型 !== "icl" && 类型 !== "jma_eew" && 类型 !== "jma_tw_eew") {
        const timeObj = timeaddz(发震时间, 8);
        if (timeObj) 发震时间 = new Date(timeObj).getTime();
    } else if (类型 == "jma_eew" || 类型 == "jma_tw_eew") {
        const timeObj = timeaddz(发震时间, 9);
        if (timeObj) 发震时间 = new Date(timeObj).getTime();
    }

    let 时差 = currentTimestamp - 发震时间;
    console.log(`[eew] 时差 => ${时差} - index.js:1419`);

    if (时差 <= 300000 || (eewBounds && 类型 == "cenc")) {
        if (类型 == "icl" && scSta || 类型 == "icl" && twSta) {
            console.log(`[eew] 省地震局正在预警，ICL无需插手 => ${类型} ${震中} ${深度}km - index.js:1423`);
            if (scSta) {
                let 距离 = getDistance(lat, lon, homeLat, homeLon);
                S波倒计时 = countdown(距离, 深度, 时差 / 1000);
                toastr.info(`#${多少报} ${震中} M${震级} 深度 ${深度}km`, "中国地震预警网");
                seeScDepICL = 深度;
            }
            return;
        }

        震级 = 震级.toFixed(1);
        if (类型 == "cwa_eew") 震中 = "台湾" + converter(震中);
        if (类型 == "fj_eew" && 震中.length > 10) 震中 = 震中.replace("附近海域", "近海");
        let 距离 = getDistance(lat, lon, homeLat, homeLon),
            本地烈度 = calcHomeMaxInt(震级, 距离),
            格式化发震时间 = eewTimeDisplay("cn_eew", 发震时间, 震中),
            sourceText,
            通知时间 = eewTimeDisplay("inform", 发震时间),
            message = `${通知时间} ${震中} 附近发生${震级}级左右地震，震中距你${距离.toFixed(0)}km，本地预估烈度${本地烈度}`;
            
        currentLocalIntensity = parseFloat(本地烈度);
        
        // 阈值判断：低于阈值则静默，不执行任何弹窗、TTS、地震波等操作
        const threshold = GlobalConfig.intensityThreshold ?? 0;
        if (currentLocalIntensity < threshold) {
            console.log(`[预警判断] 本地烈度 ${currentLocalIntensity} < 阈值 ${threshold}，静默不弹窗 - index.js:1448`);
            return;
        }
        console.log(`[预警判断] 本地烈度 ${currentLocalIntensity} >= 阈值 ${threshold}，触发预警 - index.js:1451`);
        eewHidden = false; // 新地震重置隐藏状态

        switch (类型) {
            case "sc_eew":
                sourceText = `四川地震局预警 第${多少报}报`;
                playAudio(scSta ? "更新" : "alert");
                scSta = true;
                break;
            case "fj_eew":
            case "cwa_eew":
                sourceText = 类型 === "fj_eew" ? `福建地震局预警 ${最终 ? "最终第" : "第"}${多少报}报` : `台湾气象署预警 ${最终 ? "最终第" : "第"}${多少报}报`;
                playAudio(twSta ? "更新" : "alert");
                twSta = true;
                break;
            case "icl":
                sourceText = `中国地震预警网 第${多少报}报`;
                playAudio(eewBounds ? "更新" : "alert");
                break;
            case "cea":
                sourceText = `中国地震局预警 第${多少报}报`;
                playAudio(eewBounds ? "更新" : "alert");
                break;
            case "cenc":
                sourceText = `中国地震台网 ${多少报}`;
                break;
            case "jma_tw_eew":
                sourceText = `日本气象厅预警 ${最终 ? "最终第" : "第"}${多少报}报`;
                playAudio("更新");
                break;
            case "jma_eew":
                sourceText = `日本气象厅警报 ${最终 ? "最终第" : "第"}${多少报}报`;
                playAudio("更新");
                break;
            default:
                console.error(`[eew] 类型不对 => ${类型} - index.js:1486`);
                break;
        }

        $("#eew_source").text(sourceText);
        if (isOneCENC) showCustomNotification(`${本地烈度 > 0 ? "🚨" : "⚠️"} ${sourceText}`, message);

        if (最大烈度 == null) 最大烈度 = "约" + calcMaxInt(震级, 10, 震中);

        const 信息2 = (类型 == "fj_eew" || 类型 == "sc_eew") ?
            "震中烈度" + 最大烈度 + "度" :
            (类型 == "jma_eew" || 类型 == "jma_tw_eew") ?
                "最大震度" + 最大烈度 :
                "震源深度" + 深度.toFixed(0) + "km",
            size = 震中.length >= 12 ? "p2" : "p1";

        // 构建预警信息HTML
        let textWarn, bgcolorRGB, warnLevel, infoHTML;
        if (本地烈度 >= 3) {
            if (本地烈度 < 5) {
                textWarn = "震感强烈";
                bgcolorRGB = "rgba(250, 211, 10, 0.77)";
                warnLevel = "黄色预警";
            } else if (本地烈度 < 7) {
                textWarn = "可能有破坏";
                bgcolorRGB = "rgb(254, 135, 30, 0.77)";
                warnLevel = "橙色预警";
            } else {
                textWarn = "强破坏";
                bgcolorRGB = "rgba(249, 70, 91, 0.77)";
                warnLevel = "红色预警";
            }
            infoHTML = `<div style="display: flex; justify-content: space-between;"><${size}>${震中}</${size}>${格式化发震时间} </div>
		  	发生<b>${震级}级</b>地震, ${信息2} <br>
		  	<b>本地烈度${本地烈度}度, ${textWarn}</b>`;
        } else {
            infoHTML = `<div style="display: flex; justify-content: space-between;"><${size}>${震中}</${size}>${格式化发震时间} </div>
           发生<b>${震级}级</b>地震, ${信息2} <br>
           <b>本地烈度${本地烈度}度, ${本地烈度 == 0 ? "无震感" : (本地烈度 < 2 ? "可能有震感" : "震感轻微")}</b>`;
            bgcolorRGB = `rgba(82, 165, 243, ${本地烈度 == 0 ? 0.28 : 0.77})`;
        }

        const positions = new TMap.LatLng(lat, lon),
            S波的样式 = 震级 < 5 ? "sWave" : "sWaveX";

        // 检查是否为已有地震的更新报
        // 条件：相同类型、震中位置相近（经纬度差<0.5度）
        const isUpdate = (existing, newLat, newLon, newType, newTime, newMag, newReport) => {
            if (existing.类型 !== newType) return false;
            if (Math.abs(existing.lat - newLat) > 0.5 || Math.abs(existing.lon - newLon) > 0.5) return false;
            // 更新报数变小 → 判断为两个独立地震
            if (newReport < existing.多少报) return false;
            // 震级相差≤2级 且 时间差>1分钟 → 判断为两个独立地震
            const magDiff = Math.abs(newMag - existing.震级);
            const timeDiff = Math.abs(newTime - existing.发震时间);
            if (magDiff <= 2 && timeDiff > 60000) return false;
            return true;
        };

        let existingEq = null;
        for (const eq of activeEarthquakes) {
            if (isUpdate(eq, lat, lon, 类型, 发震时间, 震级, 多少报)) {
                existingEq = eq;
                break;
            }
        }

        if (existingEq) {
            // 更新已有地震信息
            console.log(`[更新报] 更新地震: ${震中} M${震级} 第${多少报}报 (原第${existingEq.多少报}报) - index.js:1555`);
            existingEq.震级 = 震级;
            existingEq.多少报 = 多少报;
            existingEq.深度 = 深度 || existingEq.深度;
            existingEq.最终 = 最终;
            existingEq.sourceText = sourceText;
            existingEq.infoHTML = infoHTML;
            existingEq.bgcolorRGB = bgcolorRGB;
            existingEq.warnLevel = warnLevel;
            existingEq.textWarn = textWarn;
            existingEq.dingWern = warnLevel || false;
            existingEq.本地烈度 = 本地烈度;
            existingEq.距离 = 距离;
            existingEq.信息2 = 信息2;
            existingEq.size = size;
            // 更新弹窗显示
            if (existingEq === activeEarthquakes[currentEqIndex]) {
                displayEqOnBar(currentEqIndex);
            }
            updateMaxIntForAll();
            if (!eewHidden && !userTouchingMap) fitAllEqBounds();
            return;
        }

        // 创建地震对象
        const eq = {
            id: Date.now() + '_' + Math.random().toString(36).slice(2),
            发震时间, 震中, lat, lon, 震级, 深度, 最终, 类型, isOneCENC,
            多少报,
            距离, 本地烈度, sourceText, message, 格式化发震时间, 信息2, size,
            textWarn, bgcolorRGB, warnLevel, dingWern: warnLevel || false,
            infoHTML, positions, S波的样式,
            psWaveCircle: null, epicenteral: null,
            更新秒数: null, S波倒计时: null,
        };

        // 创建地震波圆圈（超过5分钟的地震不生成地震波）
        if (时差 <= 300000) {
            eq.psWaveCircle = new TMap.MultiCircle({
                map,
                styles: psWaveStyles,
                geometries: [{
                    styleId: "pWave", center: positions, radius: 7
                }, {
                    styleId: S波的样式, center: positions, radius: 4
                }],
            });

            // 创建震中标记
            eq.epicenteral = new EpicenterMarker({ map, position: positions });
        }

        // 第一个地震才调用 locteMaxint（避免标记重叠）
        if (activeEarthquakes.length === 0) {
            locteMaxint(lon, lat, 震级);
        }
        if (scSta && twSta) toastr.warning("四川和台湾同时预警，我们不知所措");

        // 启动倒计时定时器（每个地震独立）
        eq.S波倒计时 = null;
        eq.更新秒数 = setInterval(() => {
            const 实时时差 = currentTimestamp - eq.发震时间,
                发震时间减去秒数 = 实时时差 / 1000;

            eq.S波倒计时 = eq.S波倒计时 ? eq.S波倒计时 - 1 : countdown(eq.距离, eq.深度, 发震时间减去秒数);
            const 计算好的P波半径 = calcWaveDistance(true, eq.深度, 发震时间减去秒数) * 1000,
                计算好的S波半径 = calcWaveDistance(false, eq.深度, 发震时间减去秒数) * 1000;

            // 始终更新波半径（即使不显示）
            setSmoothRadius(eq.psWaveCircle, 计算好的P波半径, 计算好的S波半径, eq.positions, eq.S波的样式);

            // 只有当前显示的地震才更新DOM和播放音频
            const isCurrent = (eq === activeEarthquakes[currentEqIndex]);
            if (isCurrent && !eewHidden) {
                if (eq.S波倒计时 <= 0) {
                    $("#eew_countdown").text("到达");
                    $("#eew_wavedown").text(`地震横波已到达 ${homeLocte}`);
                    $("#miaohou").css("visibility", "hidden");
                } else {
                    $("#eew_countdown").text(eq.S波倒计时);
                    $("#eew_wavedown").text(`地震横波将到达 ${homeLocte}`);
                    $("#miaohou").css("visibility", "visible");
                }

                if (eq.本地烈度 > 0) {
                    if (eq.S波倒计时 > 0 && eq.S波倒计时 < 100) {
                        playAudio(eq.S波倒计时);
                    } else if (Object.is(eq.S波倒计时, 0)) {
                        playAudio("抵达");
                    } else if (eq.S波倒计时 >= -10 && eq.S波倒计时 < 0) {
                        if (!eq.dingWern) {
                            playAudio("ding");
                        } else if (eq.S波倒计时 == -1 || eq.S波倒计时 == -6) {
                            playAudio("wearing");
                        }
                    }
                }

                if (eq.S波倒计时 % 4 == 0 && !userTouchingMap) fitAllEqBounds();
            }

            // 超时清除
            if (实时时差 >= 300000 && eq.S波倒计时 <= -10) removeEarthquake(eq);
        }, 1000);

        // 加入活跃列表
        activeEarthquakes.push(eq);

        // 超过5分钟的地震不生成弹窗
        if (时差 <= 300000) {
            // 首个地震：显示弹窗、启动轮播
            if (activeEarthquakes.length === 1) {
                eewBounds = true;
                $("#eew_Bar, #mapLegend").css("visibility", "visible");
                if (本地烈度 > 0) addHomeToMap();
                currentEqIndex = 0;
                displayEqOnBar(0);
                startDisplayRotation();
                eq.S波倒计时 = countdown(距离, 深度, 时差 / 1000);
                $("#eew_countdown").text(eq.S波倒计时);
                if (isOneCENC && (本地烈度 == 0 || eq.S波倒计时 > 35 || eq.S波倒计时 < 0)) {
                    const cencMaxInt = calcMaxInt(震级, 深度, 震中);
                    tts(null, null, null, `中国地震台网${多少报}${震中}发生${震级}级地震震源深度${深度}千米最大烈度${cencMaxInt}度`, eq);
                }
                else if (isOneCENC && eq.S波倒计时 > 0) toastr.warning("时间紧迫，请立即采取措施！", "请注意");
                eq.S波倒计时 = null;
                setTimeout(() => fitWaveBounds(本地烈度), 1000);
            } else {
                // 非首个地震：更新分页、启动轮播、TTS播报
                updatePagination();
                startDisplayRotation(); // 触发轮播（此时 length >= 2，轮播会真正启动）
                const eqCD = countdown(距离, 深度, 时差 / 1000);
                if (isOneCENC && (本地烈度 == 0 || eqCD > 35 || eqCD < 0)) {
                    const cencMaxInt = calcMaxInt(震级, 深度, 震中);
                    tts(null, null, null, `中国地震台网${多少报}${震中}发生${震级}级地震震源深度${深度}千米最大烈度${cencMaxInt}度`, eq);
                }
                else if (isOneCENC && eqCD > 0) toastr.warning("时间紧迫，请立即采取措施！", "请注意");
                toastr.info(`${震中} M${震级}`, "新增地震预警");
            }
        }
    } else {
        类型 == "icl" ?
            console.log(`[eew] 预警发震时间超过5分钟，预警信息无效。${currentTimeDisplay(发震时间)}发生，调用请输入 => eew("${类型}", ${发震时间}, "${震中}", ${lat}, ${lon}, ${震级}, ${多少报}, ${最大烈度}, ${深度}) - index.js:1697`) :
            console.log(`[eew] 预警发震时间超过5分钟，预警信息无效。调用请输入 => eew("${类型}", "${currentTimeDisplay(发震时间)}", "${震中}", ${lat}, ${lon}, ${震级}, ${多少报}, ${最大烈度}, ${深度}, ${最终}) - index.js:1698`);
    }
}

// ========== 多地震管理函数 ==========

// 在弹窗上显示指定索引的地震信息，并移动地图到该地震波位置
function displayEqOnBar(index) {
    if (activeEarthquakes.length === 0) return;
    if (index < 0) index = activeEarthquakes.length - 1;
    if (index >= activeEarthquakes.length) index = 0;
    currentEqIndex = index;
    const eq = activeEarthquakes[index];
    $("#eew_source").text(eq.sourceText);
    $("#eew_Information").html(eq.infoHTML);
    $("#eew_Bar").css("background", `linear-gradient(${eq.bgcolorRGB}, #00000000)`);
    if (!eewHidden) {
        if (eq.S波倒计时 <= 0) {
            $("#eew_countdown").text("到达");
            $("#eew_wavedown").text(`地震横波已到达 ${homeLocte}`);
            $("#miaohou").css("visibility", "hidden");
        } else {
            $("#eew_countdown").text(eq.S波倒计时);
            $("#eew_wavedown").text(`地震横波将到达 ${homeLocte}`);
            $("#miaohou").css("visibility", "visible");
        }
    }
    updatePagination();
    // 轮播切换时移动地图视野到当前地震波位置，并切换烈度标记
    // 用户操作地图时不强制恢复，等10秒后自动归位
    if (!eewHidden && activeEarthquakes.length > 1) {
        if (!userTouchingMap) fitAllEqBounds();
        updateMaxIntForAll();
    }
}

// 启动显示轮播（每4秒切换）
function startDisplayRotation() {
    clearInterval(displayRotationTimer);
    if (activeEarthquakes.length <= 1) return;
    displayRotationTimer = setInterval(() => {
        if (activeEarthquakes.length <= 1) return;
        const nextIndex = (currentEqIndex + 1) % activeEarthquakes.length;
        displayEqOnBar(nextIndex);
    }, 4000);
}

// 更新分页显示
function updatePagination() {
    const total = activeEarthquakes.length;
    if (total <= 1) {
        $("#eew_pagination").hide();
    } else {
        $("#eew_pagination").text(`${currentEqIndex + 1}/${total}`).show();
    }
}

// 移除单个地震
function removeEarthquake(eq) {
    const idx = activeEarthquakes.indexOf(eq);
    if (idx === -1) return;
    
    console.log(`[多震管理] 移除地震: ${eq.震中} M${eq.震级} - index.js:1760`);
    
    // 清除定时器
    clearInterval(eq.更新秒数);
    // 销毁波和标记
    if (eq.psWaveCircle) { eq.psWaveCircle.destroy(); eq.psWaveCircle = null; }
    if (eq.epicenteral) { eq.epicenteral.destroy(); eq.epicenteral = null; }
    
    // 从列表移除
    activeEarthquakes.splice(idx, 1);
    
    if (activeEarthquakes.length === 0) {
        // 没有地震了，清除一切
        clearInterval(displayRotationTimer);
        displayRotationTimer = null;
        $("#eew_Bar, #mapLegend, #miaohou").css("visibility", "hidden");
        $("#eew_pagination").hide();
        eewBounds = false;
        eewHidden = false;
        twSta = false;
        scSta = false;
        seeScDepICL = false;
        if (maxIntmarker) { maxIntmarker.destroy(); maxIntmarker = null; }
        easeTo();
    } else {
        // 调整当前索引
        if (currentEqIndex >= activeEarthquakes.length) {
            currentEqIndex = activeEarthquakes.length - 1;
        }
        displayEqOnBar(currentEqIndex);
        if (activeEarthquakes.length <= 1) {
            clearInterval(displayRotationTimer);
            displayRotationTimer = null;
        }
    }
}

// 清除所有地震（完整取消）
function eewCancel() {
    console.log("[多震管理] 清除所有地震 - index.js:1799");
    // 清除所有地震的定时器和波
    for (const eq of activeEarthquakes) {
        clearInterval(eq.更新秒数);
        if (eq.psWaveCircle) { eq.psWaveCircle.destroy(); eq.psWaveCircle = null; }
        if (eq.epicenteral) { eq.epicenteral.destroy(); eq.epicenteral = null; }
    }
    activeEarthquakes = [];
    clearInterval(displayRotationTimer);
    displayRotationTimer = null;
    currentEqIndex = 0;
    
    $("#eew_Bar, #mapLegend, #miaohou").css("visibility", "hidden");
    $("#eew_pagination").hide();
    eewBounds = false;
    eewHidden = false;
    twSta = false;
    scSta = false;
    seeScDepICL = false;
    setTimeout(() => {
        if (maxIntmarker) { maxIntmarker.destroy(); maxIntmarker = null; }
    }, 1000);
    easeTo();
}

function countdown(distance, depth, ctime) {
    depth = depth ?? 10;
    const cds = HEQC.getCountDownSeconds(depth, distance),
        countdowns = cds - ctime;
    return Math.floor(countdowns);
    // parseInt((distance + depth) / 4 - ctime);
}

function calcWaveDistance(isPWave, depth, time) {
    depth = depth ?? 10;
    const {
        depths,
        distances
    } = travelTimes;
    const data = isPWave ? travelTimes.p_times : travelTimes.s_times;

    // 使用二分查找找到合适的深度索引
    let depthIndex = binarySearch(depths, depth);

    const times = data[depthIndex];
    const timesLength = times.length;

    // 如果时间小于等于第一个时间点，直接返回结果
    if (time <= times[0]) {
        const reach = times[0] - time;
        const waveType = isPWave ? "P" : "S";
        toastr.info(`距离该波到达地表还有 ${reach}s`, `${waveType}波还没到地表`);
        console.log(`[计算波的半径] ${waveType}波还没到地表 => 距离到达地表还有 ${reach}s - index.js:1851`);
        return 0;
    }

    // 使用二分查找找到合适的时间索引
    let timeIndex = binarySearch(times, time);

    // 计算距离
    const k = (distances[timeIndex] - distances[timeIndex - 1]) / (times[timeIndex] - times[timeIndex - 1]);
    const b = distances[timeIndex] - k * times[timeIndex];
    const distance = k * time + b;

    return distance;
}

// 二分查找函数
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }

    // 返回最接近但不超过目标值的索引
    return left - 1;
}

const MAX_DIFF = 50000;
const ANIMATION_DURATION = 1000; // 动画时长1秒，基于实际时间而非帧数

function setSmoothRadius(psWaveCircle, pWaveRadius, sWaveRadius, centers, sWaveStyle) {
    if (!psWaveCircle) {
        console.log(`[平滑震波] ${psWave} 不在了 => - index.js:1887`, circle);
        return;
    }

    const geometries = psWaveCircle.getGeometries();
    let pWaveNowRadius = geometries[0].radius,
        sWaveNowRadius = geometries[1].radius;

    const diffp = pWaveRadius - pWaveNowRadius;
    const diffs = sWaveRadius - sWaveNowRadius;

    // 如果差值太大，直接设置目标半径而不进行平滑过渡
    if (Math.abs(diffp) > MAX_DIFF || Math.abs(diffs) > MAX_DIFF) {
        psWaveCircle.setGeometries([{
            styleId: "pWave",
            center: centers,
            radius: pWaveRadius
        },
        {
            styleId: sWaveStyle,
            center: centers,
            radius: sWaveRadius
        }
        ]);
        return;
    }

    // 基于时间的动画：记录起始值，根据实际经过时间计算进度
    const startTime = performance.now();
    const startPRadius = pWaveNowRadius;
    const startSRadius = sWaveNowRadius;

    const updateRadius = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

        const currentPRadius = startPRadius + (pWaveRadius - startPRadius) * progress;
        const currentSRadius = startSRadius + (sWaveRadius - startSRadius) * progress;

        if (psWaveCircle) {
            psWaveCircle.setGeometries([{
                styleId: "pWave",
                center: centers,
                radius: currentPRadius
            },
            {
                styleId: sWaveStyle,
                center: centers,
                radius: currentSRadius
            }
            ]);
        }

        if (progress < 1) {
            requestAnimationFrame(updateRadius);
        }
    };

    requestAnimationFrame(updateRadius);
}

function calcHomeMaxInt(震级, 距离) {
    let 本地烈度 = ((震级 * 1.363) + 2.941) - (Math.log(距离 + 7.0) * 1.494);
    // 本地烈度可视化
    本地烈度 = 本地烈度 < 0 ? "0.0" : 本地烈度 >= 0 && 本地烈度 < 12 ? 本地烈度.toFixed(1) : 本地烈度 >= 12 ? "12" : null;
    return 本地烈度;
}

function locteMaxint(lon, lat, magnitude) {
    if (maxIntmarker) {
        maxIntmarker.destroy();
        maxIntmarker = null;
    }

    let distanceGround = Math.exp(((magnitude * 1.363) + 2.941) / 1.494) - 7.0; // 受灾区域
    let geometries = []; // 用于存储所有标记的几何信息

    for (let i = 0; i < locte.data.length; i++) {
        let Longround = locte.data[i].longitude;
        let Latground = locte.data[i].latitude;
        let groundDistance = getDistance(lat, lon, Latground, Longround); // 与震中的距离
        // 城市是否在受灾区域里?在的话就标记:不在的话我没标记啊哈哈哈哈
        if (groundDistance < distanceGround) {
            geometries.push(createGeometry(Longround, Latground, magnitude, groundDistance));
        }
    }

    if (geometries.length > 0) addIntToMap(geometries);
}

function createGeometry(Longround, Latground, magnitude, groundDistance) {
    let maxInt = calcHomeMaxInt(magnitude, groundDistance);
    return {
        "id": "markerInt_" + Longround + "_" + Latground,
        "styleId": "markerInt_" + parseInt(maxInt), // 根据 maxInt 生成不同的 styleId
        "position": new TMap.LatLng(Latground, Longround),
        "properties": {
            "title": "烈度" + parseInt(maxInt)
        }
    };
}

function addIntToMap(geometries) {
    let maxInt = Math.max(...geometries.map(geo => parseInt(geo.styleId.split("_")[1])));
    let styles = {};
    for (let i = 0; i <= maxInt; i++) {
        styles["markerInt_" + i] = new TMap.MarkerStyle({
            "width": 24,
            "height": 24,
            "anchor": {
                x: 12,
                y: 12
            },
            "src": `./img/${i}.png`
        });
    }

    maxIntmarker = new TMap.MultiMarker({
        map: map,
        styles: styles,
        geometries: geometries
    });
}

// 计算所有活跃地震中震级最大的那个，显示其烈度标记（不轮播）
function updateMaxIntForAll() {
    if (activeEarthquakes.length === 0) return;
    let maxMagEq = activeEarthquakes[0];
    for (const eq of activeEarthquakes) {
        if (eq.震级 > maxMagEq.震级) maxMagEq = eq;
    }
    locteMaxint(maxMagEq.lon, maxMagEq.lat, maxMagEq.震级);
}

// 设置代码
let settingsIcon = document.getElementById("settings-icon");
let settingsBox = document.getElementById("settings-box");
let saveButton = document.getElementById("save-settings");
let cancelButton = document.getElementById("cancel-settings");
let longitudeInput = document.getElementById("longitude");
let latitudeInput = document.getElementById("latitude");
let locationInput = document.getElementById("location");
let intensityThresholdSlider = document.getElementById("intensity-threshold");
let thresholdValueDisplay = document.getElementById("threshold-value");

// 全局tooltip元素
const globalTooltip = document.getElementById("global-tooltip");
const helpTip = document.querySelector(".help-tip");
let tooltipMouseHandler = null;

if (helpTip && globalTooltip) {
    tooltipMouseHandler = function (e) {
        const text = helpTip.getAttribute("data-tooltip");
        if (!text) return;
        globalTooltip.textContent = text;
        globalTooltip.classList.add("show");
        // 定位：优先显示在问号上方，空间不够则显示在下方
        const tipRect = globalTooltip.getBoundingClientRect();
        let left = e.clientX - tipRect.width / 2;
        let top = e.clientY - tipRect.height - 12;
        // 防止超出屏幕边界
        if (left < 8) left = 8;
        if (left + tipRect.width > window.innerWidth - 8) left = window.innerWidth - tipRect.width - 8;
        if (top < 8) top = e.clientY + 16;
        globalTooltip.style.left = left + "px";
        globalTooltip.style.top = top + "px";
    };
}

let originalSettings = {};

// iOS 玻璃高光：根据鼠标位置更新径向渐变（考虑滚动偏移）
function settingsSpotlight(e) {
    const rect = settingsBox.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top + settingsBox.scrollTop) / settingsBox.scrollHeight) * 100;
    settingsBox.style.setProperty('--mouse-x', x + '%');
    settingsBox.style.setProperty('--mouse-y', y + '%');
}

function openSettings() {
    settingsIcon.classList.add("active");
    settingsBox.classList.add("active");
    
    // iOS 玻璃高光：鼠标移动时更新径向渐变位置
    settingsBox.addEventListener('mousemove', settingsSpotlight);
    
    // tooltip事件绑定
    if (helpTip && tooltipMouseHandler) {
        helpTip.addEventListener("mouseenter", tooltipMouseHandler);
        helpTip.addEventListener("mousemove", tooltipMouseHandler);
        helpTip.addEventListener("mouseleave", () => globalTooltip.classList.remove("show"));
    }
    
    longitudeInput.value = String(GlobalConfig.longitude);
    latitudeInput.value = String(GlobalConfig.latitude);
    locationInput.value = GlobalConfig.location;
    intensityThresholdSlider.value = GlobalConfig.intensityThreshold;
    thresholdValueDisplay.src = `./img/${GlobalConfig.intensityThreshold}.png`;
    updateSliderDots(GlobalConfig.intensityThreshold);
    
    originalSettings = {
        longitude: longitudeInput.value,
        latitude: latitudeInput.value,
        location: locationInput.value,
        intensityThreshold: intensityThresholdSlider.value
    };
}

function closeSettings() {
    settingsIcon.classList.remove("active");
    settingsBox.classList.remove("active");
    // 移除高光事件监听
    settingsBox.removeEventListener('mousemove', settingsSpotlight);
    // 移除tooltip事件并隐藏
    if (helpTip && tooltipMouseHandler) {
        helpTip.removeEventListener("mouseenter", tooltipMouseHandler);
        helpTip.removeEventListener("mousemove", tooltipMouseHandler);
    }
    globalTooltip.classList.remove("show");
}

function updateSliderDots(value) {
    const dots = document.querySelectorAll('.slider-dot');
    dots.forEach((dot, index) => {
        if (index <= value) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function validateSliderValue(value) {
    const min = parseInt(intensityThresholdSlider.min);
    const max = parseInt(intensityThresholdSlider.max);
    let validatedValue = parseInt(value);
    
    if (isNaN(validatedValue)) {
        validatedValue = min;
    } else if (validatedValue < min) {
        validatedValue = min;
        triggerReboundFeedback();
    } else if (validatedValue > max) {
        validatedValue = max;
        triggerReboundFeedback();
    }
    
    return validatedValue;
}

function triggerReboundFeedback() {
    const slider = document.getElementById('intensity-threshold');
    slider.classList.add('rebound');
    setTimeout(() => {
        slider.classList.remove('rebound');
    }, 300);
}

intensityThresholdSlider.addEventListener("input", function () {
    const validatedValue = validateSliderValue(this.value);
    
    if (parseInt(this.value) !== validatedValue) {
        this.value = validatedValue;
    }
    
    thresholdValueDisplay.src = `./img/${validatedValue}.png`;
    updateSliderDots(validatedValue);
});

intensityThresholdSlider.addEventListener("change", function () {
    const validatedValue = validateSliderValue(this.value);
    
    if (parseInt(this.value) !== validatedValue) {
        this.value = validatedValue;
        thresholdValueDisplay.src = `./img/${validatedValue}.png`;
        updateSliderDots(validatedValue);
    }
});

function saveSettingsToStorage(config) {
    try {
        localStorage.setItem("earthquakeWarningSettings", JSON.stringify(config));
        console.log("[配置保存] 设置已保存到LocalStorage - index.js:2170");
        return true;
    } catch (error) {
        console.error("[配置保存] LocalStorage写入失败: - index.js:2173", error);
        toastr.error("配置保存失败，请检查浏览器存储权限");
        return false;
    }
}

function handleSaveSettings() {
    let longitudeValue = longitudeInput.value.trim();
    let latitudeValue = latitudeInput.value.trim();
    let locationValue = locationInput.value.trim();
    let thresholdValue = parseInt(intensityThresholdSlider.value);

    if (longitudeValue === "" || latitudeValue === "" || locationValue === "") {
        toastr.warning("请填写完整信息");
        return;
    }

    if (locationValue.length > 20) {
        toastr.warning("地名长度不能超过20个字符");
        return;
    }

    let longitudeFloat = parseFloat(longitudeValue);
    let latitudeFloat = parseFloat(latitudeValue);
    
    if (isNaN(longitudeFloat) || longitudeFloat < -180 || longitudeFloat > 180) {
        toastr.warning("经度必须在-180至180之间");
        return;
    }
    
    if (isNaN(latitudeFloat) || latitudeFloat < -90 || latitudeFloat > 90) {
        toastr.warning("纬度必须在-90至90之间");
        return;
    }
    
    if (isNaN(thresholdValue) || thresholdValue < 0 || thresholdValue > 12) {
        toastr.warning("烈度阈值必须在0-12之间");
        return;
    }

    GlobalConfig.longitude = longitudeFloat;
    GlobalConfig.latitude = latitudeFloat;
    GlobalConfig.location = locationValue;
    GlobalConfig.intensityThreshold = thresholdValue;

    if (saveSettingsToStorage(GlobalConfig)) {
        homeLat = String(GlobalConfig.latitude);
        homeLon = String(GlobalConfig.longitude);
        homeLocte = GlobalConfig.location;
        addHomeToMap();
        console.log(`[设置] 已设置新的家 => 纬度:${homeLat} 经度:${homeLon} 地名:${homeLocte} 烈度阈值:${GlobalConfig.intensityThreshold} - index.js:2223`);
        
        closeSettings();
        toastr.success("设置已保存", "", { timeOut: 2000 });
        
        dispatchEvent(new Event('configUpdated'));
        
        checkEarthquakeWarning();
    }
}

function handleCancelSettings() {
    longitudeInput.value = originalSettings.longitude;
    latitudeInput.value = originalSettings.latitude;
    locationInput.value = originalSettings.location;
    intensityThresholdSlider.value = originalSettings.intensityThreshold;
    thresholdValueDisplay.src = `./img/${originalSettings.intensityThreshold}.png`;
    
    closeSettings();
}

settingsIcon.addEventListener("click", function () {
    hideTooltipAndReset(settingsIcon);
    if (settingsBox.classList.contains("active")) {
        closeSettings();
    } else {
        openSettings();
    }
});

saveButton.addEventListener("click", handleSaveSettings);
cancelButton.addEventListener("click", handleCancelSettings);

function checkEarthquakeWarning() {
    const threshold = GlobalConfig.intensityThreshold ?? 4;
    console.log(`[预警判断] 当前阈值: ${threshold}，活跃地震数: ${activeEarthquakes.length} - index.js:2258`);
    
    if (activeEarthquakes.length === 0) {
        console.log("[预警判断] 无活跃地震，跳过判断 - index.js:2261");
        return;
    }
    
    // 遍历所有活跃地震，移除低于新阈值的
    const toRemove = activeEarthquakes.filter(eq => parseFloat(eq.本地烈度) < threshold);
    const toKeep = activeEarthquakes.filter(eq => parseFloat(eq.本地烈度) >= threshold);
    
    if (toRemove.length > 0) {
        console.log(`[预警判断] 移除 ${toRemove.length} 个低于阈值的地震 - index.js:2270`);
        for (const eq of toRemove) {
            removeEarthquake(eq);
        }
    }
    
    if (toKeep.length > 0) {
        console.log(`[预警判断] 保留 ${toKeep.length} 个达到阈值的地震 - index.js:2277`);
        showEarthquakeWarning();
    }
}

function showEarthquakeWarning() {
    eewHidden = false;
    $("#eew_Bar").css("visibility", "visible");
    $("#eew_Bar").css("z-index", "1000000");
    $("#mapLegend").css("visibility", "visible");
    // 弹窗与地震波绑定：显示所有活跃地震的波
    for (const eq of activeEarthquakes) {
        if (eq.psWaveCircle) eq.psWaveCircle.setMap(map);
        if (eq.epicenteral) eq.epicenteral.setMap(map);
    }
    if (maxIntmarker) maxIntmarker.setMap(map);
    updatePagination();
}

function hideEarthquakeWarning() {
    // 弹窗与地震波绑定：隐藏所有波（不销毁，不停止定时器）
    eewHidden = true;
    $("#eew_Bar, #mapLegend, #miaohou").css("visibility", "hidden");
    $("#eew_pagination").hide();
    for (const eq of activeEarthquakes) {
        if (eq.psWaveCircle) eq.psWaveCircle.setMap(null);
        if (eq.epicenteral) eq.epicenteral.setMap(null);
    }
    if (maxIntmarker) maxIntmarker.setMap(null);
    easeTo(); // 恢复地图默认视角
}

let currentLocalIntensity = null;

document.addEventListener("click", function (event) {
    if (!event.target.closest("#settings-container")) {
        closeSettings();
    }
});

function addHomeToMap() {
    if (homeMarker !== null) {
        homeMarker.setMap(null);
        homeMarker = null;
    }

    homeMarker = new TMap.MultiMarker({
        map: map,
        styles: {
            "marker": new TMap.MarkerStyle({
                "width": 25,
                "height": 25,
                "anchor": {
                    x: 12.5,
                    y: 12.5
                }, // 描点位置
                "src": "./img/home_awa.svg"
            })
        },

        geometries: [{
            "id": "demo",
            "styleId": "marker",
            "position": new TMap.LatLng(homeLat, homeLon),
            "properties": {
                "title": "marker"
            }
        }]
    })
}

addHomeToMap();

function getWaveBounds(latitude, longitude, radius) {
    // 地球半径，单位为米
    const earthRadius = 6371e3;

    // 转换为弧度
    const lat = latitude * Math.PI / 180;
    const lon = longitude * Math.PI / 180;

    // 计算半径对应的角度（弧度）
    const angularDistance = radius / earthRadius;

    // 计算东北角坐标
    const northeastLat = Math.asin(Math.sin(lat) * Math.cos(angularDistance) +
        Math.cos(lat) * Math.sin(angularDistance) * Math.cos(0));
    const northeastLon = lon + Math.atan2(Math.sin(0) * Math.sin(angularDistance) * Math.cos(lat),
        Math.cos(angularDistance) - Math.sin(lat) * Math.sin(northeastLat));

    // 计算西南角坐标
    const southwestLat = Math.asin(Math.sin(lat) * Math.cos(angularDistance) +
        Math.cos(lat) * Math.sin(angularDistance) * Math.cos(Math.PI));
    const southwestLon = lon + Math.atan2(Math.sin(Math.PI) * Math.sin(angularDistance) * Math.cos(lat),
        Math.cos(angularDistance) - Math.sin(lat) * Math.sin(southwestLat));

    // 转换回角度
    const northeast = {
        latitude: northeastLat * 180 / Math.PI,
        longitude: northeastLon * 180 / Math.PI
    };

    const southwest = {
        latitude: southwestLat * 180 / Math.PI,
        longitude: southwestLon * 180 / Math.PI
    };

    // 处理超出范围的问题
    northeast.latitude = Math.min(90, Math.max(-90, northeast.latitude));
    northeast.longitude = ((northeast.longitude + 540) % 360) - 180;
    southwest.latitude = Math.min(90, Math.max(-90, southwest.latitude));
    southwest.longitude = ((southwest.longitude + 540) % 360) - 180;

    return {
        northeast,
        southwest
    };
}

function fitWaveBounds(localInt = null) {
    if (activeEarthquakes.length === 0) return;
    fitAllEqBounds();
}

// 将地图视野移动到当前显示地震的波位置（轮播时调用）
function fitCurrentEqBounds() {
    if (activeEarthquakes.length === 0) return;
    const eq = activeEarthquakes[currentEqIndex];
    if (!eq || !eq.psWaveCircle) return;
    const wave = eq.psWaveCircle;
    const pWavelat = wave.geometries[0].center.lat,
        pWavelon = wave.geometries[0].center.lng,
        pWaveradius = wave.geometries[0].radius,
        Bounds = getWaveBounds(pWavelat, pWavelon, pWaveradius);

    map.fitBounds(
        new TMap.LatLngBounds(
            new TMap.LatLng(Bounds.southwest.latitude - 1, Bounds.southwest.longitude - 1),
            new TMap.LatLng(Bounds.northeast.latitude + 1, Bounds.northeast.longitude + 1)
        ), {
        ease: {
            duration: 2000
        }
    }
    );
}

// 将地图视野移动到所有地震波都能在视窗内看到的位置
function fitAllEqBounds() {
    if (activeEarthquakes.length === 0) return;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let hasValidWave = false;

    for (const eq of activeEarthquakes) {
        if (!eq.psWaveCircle) continue;
        const wave = eq.psWaveCircle;
        const pWavelat = wave.geometries[0].center.lat,
            pWavelon = wave.geometries[0].center.lng,
            pWaveradius = wave.geometries[0].radius,
            Bounds = getWaveBounds(pWavelat, pWavelon, pWaveradius);

        minLat = Math.min(minLat, Bounds.southwest.latitude);
        maxLat = Math.max(maxLat, Bounds.northeast.latitude);
        minLng = Math.min(minLng, Bounds.southwest.longitude);
        maxLng = Math.max(maxLng, Bounds.northeast.longitude);
        hasValidWave = true;
    }

    if (!hasValidWave) return;

    map.fitBounds(
        new TMap.LatLngBounds(
            new TMap.LatLng(minLat - 1, minLng - 1),
            new TMap.LatLng(maxLat + 1, maxLng + 1)
        ), {
        ease: {
            duration: 2000
        }
    }
    );
}

const audioFiles = {
    "alert": "./audio/alert.wav",
    "更新": "./audio/eew update.wav",
    "ding": "./audio/ding.ogg",
    "wearing": "./audio/wearing.wav",
    "抵达": "./audio/arrive.mp3",
    "didi": "./audio/didi.mp3",
    "di": "./audio/di.mp3"
};

const digitAudioFiles = {
    "0": "./audio/0.mp3",
    "1": "./audio/1.mp3",
    "2": "./audio/2.mp3",
    "3": "./audio/3.mp3",
    "4": "./audio/4.mp3",
    "5": "./audio/5.mp3",
    "6": "./audio/6.mp3",
    "7": "./audio/7.mp3",
    "8": "./audio/8.mp3",
    "9": "./audio/9.mp3",
    "10": "./audio/10.mp3",
    "12": "./audio/12.mp3",
    "14": "./audio/14.mp3",
    "16": "./audio/16.mp3",
    "18": "./audio/18.mp3",
    "20": "./audio/20.mp3",
    "22": "./audio/22.mp3",
    "24": "./audio/24.mp3",
    "26": "./audio/26.mp3",
    "28": "./audio/28.mp3",
    "30": "./audio/30.mp3",
    "40": "./audio/40.mp3",
    "50": "./audio/50.mp3",
    "60": "./audio/60.mp3",
    "70": "./audio/70.mp3",
    "80": "./audio/80.mp3",
    "90": "./audio/90.mp3",
    "100": "./audio/100.mp3"
};

let speakingEq = null; // 当前正在TTS的地震对象（null=无，'global'=全局阻塞所有地震音频）

function playAudio(number) {
    if (typeof number === "string" && audioFiles[number]) {
        playAudioFile(audioFiles[number]);
        return;
    }

    // 仅当当前显示的地震正在TTS时阻塞该地震的音频，不影响其他地震
    const currentEq = activeEarthquakes[currentEqIndex];
    if (speakingEq === 'global') return;
    if (speakingEq && speakingEq === currentEq && number % 10 !== 0) return;

    if (typeof number !== "number" || isNaN(number)) {
        console.error(`[音频播放] 输入的数字无效 => ${number} - index.js:2514`);
        return;
    }

    let numberStr = number.toString();

    if (numberStr.length === 1) playSingleDigit(numberStr);
    else if (numberStr.length === 2 || numberStr === "100") playTwoDigits(numberStr);
    else console.error(`[音频播放] 发生了不可能发生的错误 > 怎么回事？ - index.js:2522`);
}

function playAudioFile(audioFile) {
    const audio = new Audio(audioFile);
    audio.play();
}

function playSingleDigit(digit) {
    if (digitAudioFiles[digit]) {
        playAudioFile(digitAudioFiles[digit]);
    } else {
        console.error(`[音频播放单数字] 未找到数字 ${digit} 的音频文件。 - index.js:2534`);
    }
}

function playTwoDigits(numberStr) {
    const number = parseInt(numberStr, 10);
    const currentEq = activeEarthquakes.length > 0 ? activeEarthquakes[currentEqIndex] : null;
    const currentWarn = currentEq ? currentEq.dingWern : false;

    if (number >= 10 && number < 30) {
        if (number % 2 === 0) playAudioFile(digitAudioFiles[numberStr]);
        else if (currentWarn) playWarningAudio(currentWarn);
    } else if (number >= 30) {
        if (number % 10 === 0) playAudioFile(digitAudioFiles[numberStr]);
        else if (currentWarn) dingWernTts(currentWarn);
    } else {
        console.error(`[音频播放双数字] 未找到数字 ${digit} 的音频文件。 - index.js:2550`);
    }
}

function playWarningAudio(warningType) {
    const warnAudio = warningType === "橙色预警" || warningType === "红色预警" ? "didi" : "di";
    playAudioFile(audioFiles[warnAudio]);
}

function dingWernTts(warnLevel) {
    const messages = {
        "黄色预警": "强有感地震，请注意防范",
        "橙色预警": "破坏性地震，请立即避险",
        "红色预警": "严重破坏性地震，请紧急避险"
    };

    if (messages[warnLevel]) tts(null, null, null, messages[warnLevel]);
}

let ttsCallId = 0; // TTS调用计数器，防止旧utterance的onend误清标志

function tts(biaoti, location, magnitude, cenc = null, eq = null) {
    // 取消上一次TTS，确保只有最新的一条在播放
    window.speechSynthesis.cancel();
    ttsCallId++;
    const myCallId = ttsCallId;
    // 追踪正在TTS的地震：eq为null表示全局阻塞（如CENC列表播报），否则阻塞指定地震
    speakingEq = eq || 'global';
    let textToSpeak = (location !== null) ? (biaoti + "，" + location + magnitude + "级") : cenc;
    let utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.onend = function () {
        // 只有最新的一次TTS调用才能清除标记，防止旧utterance误清
        if (ttsCallId === myCallId) speakingEq = null;
    };
    // 安全兜底：10秒后强制清除标记，防止onend回调未触发导致音频永久阻塞
    setTimeout(() => {
        if (ttsCallId === myCallId) speakingEq = null;
    }, 10000);
    window.speechSynthesis.speak(utterance);
}