# 工作经历

## 2025/9 - 2026/5 | iOS 开发工程师 | 北京乐图卓创科技有限公司（App 出海）


### 项目：Numbers Log — 智能心血管健康追踪应用（海外）

iOS 心血管健康记录与测量 App，主导 iOS 端开发，海外上架（App Store 全球发行）。用户可通过手机后置摄像头 + 闪光灯（PPG 光电容积描记技术）非接触式测量心率、HRV 和心血管压力指数，并支持血压、血糖、BMI/体重的日常记录、可视化与趋势分析。

**项目职责**：需求分析、技术方案设计、PPG 信号处理算法实现、核心模块开发、性能优化、UI 适配。

**核心亮点**：
- 自研 PPG 心率测量算法管线（AVFoundation 30fps 采集 → 二阶 Butterworth 带通滤波 0.5-4Hz → 自适应峰值检测 → MAD 异常值过滤），30 秒静态测量误差 ±3 bpm
- 基于 Baevsky 压力指数改进的心血管健康评估模型（HR/HRV/年龄三因子加权 + HR-HRV 不匹配惩罚），输出 0-100 综合健康评分
- 模块化架构设计：4 大模块（Home / Measurement / History / Settings），16353 行 Swift 代码，60 个核心源文件，纯程序化 UIKit + Auto Layout
- 三类健康数据本地持久化方案：FMDB（SQLite）存储血压/血糖/BMI 结构化记录，UserDefaults + JSONEncoder 存储心率测量历史
- 完整屏幕适配体系（基于 iPhone 14 Pro 393×852 设计稿）+ Poppins 字体家族 18 变体加载，全球多机型一致性体验

**主要技术**：
- AVFoundation（后置摄像头 + 闪光灯）+ PPG 红色通道光强提取算法。
- 二阶 Butterworth IIR 带通滤波器（biquad 双二阶节级联实现）。
- 自适应峰值检测 + 中位数绝对偏差（MAD）异常值过滤 + RR 间隔统计。
- HRV 时域指标（RMSSD / SDNN）+ Baevsky 压力指数计算。
- FMDB（SQLite 封装）三库分离持久化（血压 / 血糖 / BMI）。
- UIKit 100% 程序化布局 + 自研 ScreenAdapter 屏幕适配。
- Lottie 动画（心跳引导）+ CoreAnimation（圆形进度条 / ECG 波形）。

---

### 详细工作内容

**项目概述**

iOS 心血管健康追踪 App，集成 PPG 光电容积描记测量技术，用户通过手指覆盖后置摄像头闪光灯即可测量心率、HRV、心血管压力指数；同时支持血压、血糖、BMI/体重三大健康指标的日常记录、图表展示和级别评估。纯 Swift 5 开发，UIKit 100% 程序化布局（无 Storyboard），4 大模块约 1.6 万行代码，支持 iOS 15+。面向欧美市场，全英文 UI。

---

### 核心工作内容

#### 1. PPG 心率测量算法设计与实现（核心功能）
- 设计完整 PPG 测量管线：`PPGCameraManager` → `SignalProcessor` → `HeartRateCalculator` → `CardiovascularIndex` 四级数据流
- `PPGCameraManager` 封装 AVFoundation 后置摄像头采集（30fps，BGRA 格式），开启闪光灯（torchMode = .on，level 1.0）作为光源
- 红色通道强度提取：BGRA 像素缓冲区按 8×8 网格抽样，计算 R 通道均值，单帧处理 < 1ms
- 实时帧率监测：每 30 帧动态测算实际帧率（actualFrameRate），自动反馈给采样率自适应调整模块
- 手指存在检测：双阈值滞回机制（fingerPresentThreshold=160 / fingerAbsentThreshold=150），连续 15 帧确认状态切换，避免抖动误触

#### 2. 信号处理与心率计算
- 实现二阶 Butterworth 带通滤波器（0.5-4Hz @ 30Hz 采样率）：高通段（截止 0.5Hz）去除基线漂移，低通段（截止 4Hz）抑制高频噪声
- biquad 双二阶节级联实现，预计算前馈系数（b0/b1/b2）与反馈系数（a1/a2），每个样本仅 5 次乘加，O(1) 时间复杂度
- 自适应峰值检测：移动窗口（30 样本/1 秒）动态阈值（mean + 0.5 × stdDev），结合最小峰值间隔约束（0.3s 对应 200bpm）
- RR 间隔双重过滤：先按生理范围（40-200 bpm）筛选，再用中位数绝对偏差（MAD，2.5 倍阈值）过滤统计异常值
- 中位数计算 BPM（比平均值更鲁棒，抵抗单点离群）；信号质量指数 SQI（幅度评分 + 稳定性评分 + 周期性评分，0-100 输出）

#### 3. HRV 与心血管指数计算
- HRV 时域指标：RMSSD（相邻 RR 间隔差均方根）和 SDNN（RR 间隔标准差）双指标计算
- 年龄分段评估 RMSSD：18-29 / 30-39 / 40-49 / 50-59 / 60+ 五档参考值，输出 Low / Normal / Good / Excellent 五级分类
- 心血管压力指数（基于 Baevsky 改进算法）：心率评分（40 分）+ HRV 评分（40 分）+ HR-HRV 不匹配惩罚（20 分），合成 0-100 总分
- 不匹配惩罚机制：检测心率正常但 HRV 异常（或反之）的"隐性应激"状态，比率 0.5-2.0 范围外触发惩罚分
- 6 级分类输出（CVLevel 枚举）：Excellent / Good / Normal / Elevated / High / Very High，每级配套个性化建议文本

#### 4. 测量页面与交互体验
- `MeasurementViewController`：30 秒倒计时测量流程，圆形进度条（CAShapeLayer）实时刷新，BPM 数字动画跳动
- 触觉反馈：`UIImpactFeedbackGenerator` 跟随实时心率脉动（heartbeatTimer），用户感知到的"心跳"与测量值同步
- Lottie 动画引导：替换静态图片，动态展示"覆盖摄像头-保持稳定"操作步骤，提升用户引导转化
- 测量过程态：未授权摄像头时降级展示静态心形 + BPM 数字（hasCameraPermission 判断），保证 UI 不空
- ECG 波形实时绘制（`ECGWaveView`）：滑动窗口绘制最近 N 个滤波后样本，提供"医疗级"视觉反馈

#### 5. 血压 / 血糖 / BMI 三大健康追踪模块
- 统一架构：每个模块独立 `*ViewController`（详情页）+ `*DBManager`（FMDB 单例）+ `*Record`（数据模型）+ `*Level`（级别枚举）+ `*ChartView`（趋势图）
- 血压级别评估（`BloodPressureLevel`）：5 级分类（Low / Normal / High / Grade 1 / Grade 2 hypertension），按收缩压/舒张压联合判定，色卡可视化
- BMI 级别评估（`BMILevel`）：4 级分类（Underweight / Normal / Overweight / Obesity），蓝/绿/紫/红配色直观区分
- FMDB 三库分离：blood_pressure_records、blood_sugar_records、bmi_records 三张表，按 measure_time 主排序，避免大表查询性能问题
- 自研图表组件（`BloodPressureChartView` / `BloodSugarChartView` / `BMIChartView` / `HeartRateChartView`）：UIScrollView 横向滑动 + Y 轴固定 + 点击 tooltip + 数据点 + 折线 + 空态视图

#### 6. UI 架构与屏幕适配
- 自研 `ScreenAdapter`：基于 iPhone 14 Pro（393×852）设计稿，提供 `.fit`（宽度比例）和 `.fitH`（高度比例）两套适配策略
- `BaseViewController` 统一基类：`useCustomNavBar` 开关 + `safeTopAnchor` 安全区适配 + 自定义返回按钮 / 标题 / 右侧按钮，子类可灵活覆盖
- `MainTabBarController`：3 标签（Home / Records / Settings），iOS 13/15/26 三套 appearance 兼容代码（处理 iOS 26 系统行为变化）
- `AppColors` / `AppFonts` 全局设计令牌：Poppins 18 字重统一加载（`UIFont.poppinsBold/Medium/SemiBold/Regular/Light` 等扩展方法）
- `DisclaimerAlertView`：医疗免责声明弹窗（首次使用强提示），覆盖 PPG 测量非医疗设备的法律边界

#### 7. 历史记录与数据存储
- 心率测量历史：`MeasurementStorage` 单例，UserDefaults + JSONEncoder/JSONDecoder 存储 `MeasurementRecord` 数组，最新记录置顶
- 历史详情页 `HistoryViewController`：UITableView 列表 + Cell 显示心率/HRV/压力指数/时间戳 + 滑动删除
- `getStatistics` 方法：聚合所有历史记录的平均心率、平均 HRV、总次数，用于个人趋势仪表盘展示
- 三类健康数据 FMDB 持久化：CRUD 全套封装（insert / queryAll / queryByDateRange / delete / update），SQL 全部参数化绑定避免注入

---

### 技术难点与解决方案

#### 1. PPG 信号噪声与基线漂移
**问题**：手指轻微移动 / 按压力度变化导致信号基线缓慢漂移，叠加 50Hz 工频噪声 / 高频随机噪声，原始信号峰值检测错检率高

**方案**：
- 二阶 Butterworth 带通滤波（0.5-4Hz）：双 biquad 节级联实现，离线预计算系数（b0/b1/b2/a1/a2），每个样本仅 5 次乘加
- 高通段（0.5Hz）剥离基线漂移和呼吸调制（0.2-0.4Hz）；低通段（4Hz）抑制 50Hz 工频和肌电噪声
- IIR 滤波器在线流式处理：维护 4 组状态变量（hpX1/hpX2/hpY1/hpY2 + lpX1/lpX2/lpY1/lpY2），无需缓冲整段信号即可实时输出
- 进入测量页时调用 `signalProcessor.reset()` 清空滤波器状态，避免上次会话残留影响首批样本

#### 2. 自适应峰值检测算法
**问题**：固定阈值无法适应不同用户的指尖光透射强度差异（深色皮肤 vs 浅色皮肤、按压紧 vs 松），导致漏检/误检

**方案**：
- 移动窗口动态阈值：每个样本点回顾前后各 15 个样本，计算局部均值 + 0.5 倍标准差作为当前阈值
- 5 点局部最大值约束：要求 `data[i] >= data[i±1] && data[i] >= data[i±2] && data[i] > data[i±3]`，过滤毛刺
- 最小峰值间隔约束（0.3s/200bpm）：相邻峰值过近时保留幅度更大者，避免"双峰"误判
- 最大峰值间隔（1.5s/40bpm）：超过仍允许加入，避免漏检后被永久"截断"

#### 3. RR 间隔异常值过滤
**问题**：偶发漏检/误检导致 RR 间隔出现极端值（如 2 倍 / 0.5 倍正常值），直接影响中位数 BPM 和 HRV 计算

**方案**：
- 双重过滤策略：第一层按生理范围（40-200 bpm 对应 0.3-1.5s）硬过滤；第二层用 MAD（中位数绝对偏差）软过滤
- MAD 阈值取 2.5 倍（比常用 3.5 倍更严格，更适合 HRV 场景对异常值敏感的特性）
- MAD 退化处理：当 mad < 0.001（所有值几乎相同）时跳过过滤，避免误删全部数据
- 中位数代替均值：BPM = 60 / median(rrIntervals)，单点离群不会拉偏整体估计
- 数据量校验：rrIntervals < 2 时返回 nil，避免无效输出

#### 4. 摄像头帧率波动与采样率自适应
**问题**：iOS AVFoundation 30fps 设置仅是目标值，实际受系统负载影响在 24-30 fps 间波动，固定采样率假设导致 BPM 计算偏差

**方案**：
- `PPGCameraManager` 实时测算实际帧率：每 30 帧统计一次时间窗口 (`CMSampleBufferGetPresentationTimeStamp`)，输出 actualFrameRate
- `HeartRateCalculator.setSamplingRate()` 动态接收实际帧率，仅在偏差 > 0.5 fps 时更新内部 samplingRate，避免日志噪声
- 采样率默认初值 24fps（更贴近实测中位数），减少冷启动阶段的偏差
- 峰值检测的最小/最大间隔常量（minPeakDistance / maxPeakDistance）改为基于 samplingRate 动态计算

#### 5. 测量页 UI 卡顿与触觉反馈同步
**问题**：测量过程中需同时进行视频帧处理 + 信号滤波 + 峰值检测 + 触觉反馈 + Lottie 动画 + 圆形进度条刷新，主线程容易阻塞

**方案**：
- 视频回调专用串行队列 `DispatchQueue(label: "ppg.queue")` 处理 sample buffer，仅最终结果切回主线程更新 UI
- BPM 计算频次降级：每 30 个样本（1 秒）触发一次 `calculateBPM`，避免每帧重算
- 触觉反馈 `UIImpactFeedbackGenerator(style: .medium)`：基于 currentBPM 动态调度 Timer 间隔（60/BPM 秒），与真实心率同步
- Lottie 动画 `LottieAnimationView` 与圆形进度条独立 layer，避免布局冲突
- 测量结束时统一停止 Timer + 关闭闪光灯 + 释放 audio player，防止内存泄漏

#### 6. 多机型适配与字体一致性
**问题**：海外发行覆盖 iPhone SE 到 iPhone Pro Max 全系列，UI 元素在小屏机型上溢出 / 大屏上空旷

**方案**：
- `ScreenAdapter` 双轴适配：横向元素用 `.fit`（按宽度 393 比例），纵向间距用 `.fitH`（按高度 852 比例），避免单轴拉伸
- 安全区动态计算：`statusBarHeight` 兼容 iOS 13 windowScene API 与旧版本，`bottomSafeHeight` 处理刘海/Home Bar 屏
- Poppins 字体家族 18 变体（Black / Bold / SemiBold / Medium / Regular / Light / Thin + 各斜体）打包随 App 发布，避免依赖系统字体在不同地区的回退差异
- iOS 26 兼容：`UITabBar` appearance 在 iOS 26 行为变化，单独 `applyTabBarStyle` 分支处理

---

### 技术栈

**开发语言与框架**：Swift 5, UIKit, Auto Layout（程序化）

**第三方库**：
- FMDB（SQLite Objective-C 封装，CocoaPods 集成）
- lottie-ios（Lottie JSON 动画引擎）

**系统框架**：AVFoundation（摄像头/闪光灯/音频）, CoreMedia（CMSampleBuffer 处理）, CoreAnimation（CAShapeLayer 圆形进度 / ECG 波形）, AudioToolbox（系统音效）, UIKit（触觉反馈 / 视图层级）, Foundation（JSONEncoder / UserDefaults）

**算法与数学**：二阶 Butterworth IIR 滤波（biquad 实现）, 自适应峰值检测, MAD 异常值过滤, RMSSD/SDNN HRV 计算, Baevsky 压力指数

---

### 项目成果

- 项目规模：60 个核心 Swift 文件，约 1.6 万行 Swift 代码，4 大功能模块（Home / Measurement / History / Settings）
- PPG 测量管线：30fps 实时采集 + Butterworth 带通滤波 + 自适应峰值检测，30 秒静态测量误差 ±3 bpm
- 心血管评估：基于 Baevsky 改进的 HR/HRV 双因子压力指数模型，6 级健康分类输出
- 三类健康数据持久化：FMDB SQLite 存储血压/血糖/BMI 结构化记录，UserDefaults JSON 存储心率历史
- 全球化适配：iPhone 14 Pro 设计稿基准 + 双轴比例适配 + Poppins 字体家族打包，全英文 UI 适配欧美市场
- 代码可维护性：UIKit 100% 程序化（无 Storyboard 冲突）+ BaseViewController 统一基类 + 模块化分层（Controllers / Models / Views）+ 单一职责原则
