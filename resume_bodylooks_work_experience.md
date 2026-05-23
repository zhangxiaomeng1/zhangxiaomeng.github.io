# 工作经历

## 2025/9 - 2026/5 | iOS 开发工程师 | 北京乐图卓创科技有限公司（App 出海）


### 项目：BodyLooks — AI 身体面部编辑应用（海外）

iOS 身体和面部编辑工具 App，主导 iOS 端开发，海外上架（App Store 全球发行）。用户可对照片/视频进行身体塑形（瘦身、丰胸、提臀、瘦腿）、面部重塑（V 脸、瘦颧骨、眼鼻唇精修）、液化变形、皮肤平滑、AI 换发型/发色、肌肉贴纸、滤镜调色。

**项目职责**：需求分析、技术方案设计、GPU 滤镜与 Shader 开发、AI 关键点集成、视频处理、性能优化、变现集成。

**核心亮点**：
- 自研 7 条 GPUImage 滤镜链（Transform / Warp / Shape / BodySkin / Adjust / Effect / Blend），370KB+ GLSL Fragment Shader 实现 60+ 个身体/面部变形参数实时渲染
- MediaPipe 双引擎关键点检测：身体 33 点 + 面部 478 点，封闭多边形射线法判断脸部区域，8 个种子点实时计算平均肤色
- 视频处理卡尔曼滤波平滑：胸部/手部分区参数（过程噪声 0.08 / 测量噪声 64.0），异常值检测（3σ）+ 变化率限制（每帧≤1.3%），消除关键点抖动
- 自研液化算法：RG16F 半浮点纹理存储 XY 偏移，6 种工具模式（优化 / 重塑 / 大小 / 恢复 / 冻结 / 擦除），冻结边界两阶段二分搜索（粗 50 次 + 细 30 次）
- 黑眼圈去除算法 v2：18+15 点眼周闭环 + 半边脸亮度权重，向平均肤色定向混合（强度 0.55），替换旧版相对暗度提亮方案，避免过曝
- 6 类数据类型撤销/重做系统（参数 / 图片 / 液化数据 / 贴纸模型 / 视频时间范围效果），支持 200 步历史

**主要技术**：
- GPUImage + OpenGL ES 2.0/3.0 自定义滤镜链（OC + GLSL Shader）。
- MediaPipe Tasks Vision（人体姿态 33 点 + 面部 478 点检测）。
- 卡尔曼滤波器（视频关键点平滑，分区参数调优）。
- 自研液化算法（GPUImageRawDataInput + GL_RGBA16F 偏移纹理）。
- AVAssetWriter 视频导出 + AVPlayer 实时预览。
- 三级 JSON 菜单驱动架构（keyValueMap → Filter → GLSL uniform）。
- 透视变换 + CIPinchDistortion 贴纸渲染（径向渐变笔刷遮罩）。
- StoreKit 内购 + 付费墙 + LTThinkingSDK 行为分析。

---

### 详细工作内容

**项目概述**

iOS 身体面部美型工具 App，覆盖身体塑形、面部重塑、液化变形、发型发色、滤镜调色五大场景。Swift + Objective-C 混编，MVC + 滤镜链架构，519 个源文件，约 7 万行代码（不含 GLSL），支持 iOS 14+。GPU 端基于 GPUImage 与 OpenGL ES 2.0/3.0，AI 端基于 MediaPipe。面向欧美市场，通过 IAP 订阅 + 付费墙变现。

---

### 核心工作内容

#### 1. GPUImage 滤镜链架构设计与实现（核心）
- 设计 7 条串联 GPU 滤镜：`BLTransformFilter`（身体变形）→ `BLWarpFilter`（液化）→ `BLShapeFilter`（贴纸）→ `BLBodySkinFilter`（皮肤平滑）→ `BLAdjustFilter`（亮度对比度饱和度）→ `EffectFilter`（预设滤镜）→ `BLBlendFilter`（原图对比混合）
- 滤镜统一通过 `setKeyValueMap:` 接收参数字典，参数自动映射到 GLSL `uniform` 变量，支持 60+ 参数（waistIntensity、chestIntensity、buttockIntensity、faceWidthIntensity、eyeSizeIntensity、noseBridgeIntensity 等）
- 渲染输入支持 `GPUImagePicture`（图片）和 `GPUImageMovie`（视频）双链路，输出 `GPUImageView` 实时显示，导出走 `GPUImageMovieWriter` / `AVAssetWriter`
- 宽高比校正：所有 Shader 内对采样坐标和关键点都乘以 `aspect_ratio = textureSize.x / textureSize.y`，避免非正方形纹理变形失真
- 单一 transform_fragment_shader.frag 体量达 370KB+，覆盖身体（瘦腰、瘦肚、肩颈、丰胸、提臀、长腿、四肢、沙漏腰、腰曲线）+ 面部比例（颅顶 / 上中下庭 / 人中）+ 脸型（脸宽 / 脸颊 / 窄脸 / 下颌 / 下巴 / V 脸 / 发际线 / 太阳穴）+ 眼鼻嘴眉细节调整

#### 2. MediaPipe 关键点检测与封装
- 封装 `BLLandmarkerManager`（约 3200 行）统一管理 MediaPipe Tasks Vision，支持人体姿态 33 点 + 面部 478 点检测，图片模式 / 视频模式自动切换
- 身体关键点驱动：肩 11/12 + 髋 23/24 + 膝 25/26 + 踝 27/28 + 手指 17-22，作为 Shader uniform 输入定位变形区域
- 面部封闭多边形构建：使用 36 点路径（10、338、297、332、284、251、389、356、454、323、361、288、397、365、379、378、400、377、152、148、176、149、150、136、172、58、132、93、234、127、162、21、54、103、67、109）构成脸部轮廓，Shader 内射线法判断像素是否在脸部区域
- 实时肤色采样：在脸部 8 个安全位置（f36、f101、f50、f205、f330、f266、f425、f280）采样，计算平均肤色作为磨皮 / 黑眼圈算法的参考色
- 关键点批量传递：合并所有索引到 `NSMutableSet` 去重后，统一以 `f<index>` 格式 setUniform，单次 50+ 关键点传递耗时 < 1ms

#### 3. 自研液化算法（BLWarpFilter + BLWarpView）
- 液化视图 `BLWarpView`（1845 行）维护与图像同尺寸的 Float32 偏移缓冲区（RG 通道 = XY 偏移，B 通道 = 冻结标记），手势触发径向衰减偏移叠加
- 6 种工具模式参数差异化：`optimize`（半径 60 / 强度 0.3，平滑变形）、`reshape`（半径 120 / 强度 0.5，主要变形工具）、`size`（圆形控制器拖动 / 缩放，放大缩小局部）、`restore`（恢复原图）、`freeze`（冻结锁定区域）、`erase`（擦除已变形）
- GPU 端通过 `GPUImageRawDataInput` 上传 `GL_RGBA16F`（半浮点）偏移纹理到滤镜第二个纹理通道，避免精度损失
- 冻结边界两阶段搜索：Shader 内先粗搜索（步长 0.003-0.01，最多 50 次）定位冻结边界附近，再细搜索（步长 0.0005，最多 30 次）精确定位，保证冻结区域不被变形穿透
- 平滑临时缓冲复用：`smoothTmpBuffer` / `smoothTmpCapacity` 静态分配避免逐帧 malloc，2K 图像滑动操作 60 fps 稳定
- 背景保护：通过 `onBackgroundProtectionIntensityUpdated` 回调动态调节背景区域偏移衰减，避免主体液化时背景跟随畸变

#### 4. 卡尔曼滤波器实现（视频关键点平滑）
- 自研 `BLKalmanFilter`，每个关键点独立维护状态（`x` / `p` 协方差），逐帧执行预测-更新循环：`p = p + q`、`k = p / (p + r)`、`x = x + k * (measurement - x)`、`p = (1 - k) * p`
- 标准参数：过程噪声 0.125 / 测量噪声 32.0；针对易抖动部位调优：胸部（0.08 / 64.0 / 最大变化率 1.3% / 异常平滑因子 0.75）、手部（0.1 / 48.0 / 最大变化率 2% / 异常平滑因子 0.6）
- 异常值检测：维护历史 5 帧滑动窗口，计算均值 + 标准差，单帧变化超 3σ 视为异常，使用 `output = lastOutput * smoothFactor + measurement * (1 - smoothFactor)` 混合
- 变化率限制：单帧位移超过部位最大变化率时，钳制为 `lastOutput ± maxChangeRate`，防止网络模型偶发抖动产生肉眼可见跳变

#### 5. 皮肤平滑与黑眼圈去除（BLBodySkinFilter）
- 957 行 GLSL Fragment Shader 实现 4 类美肤功能：身体平滑（smoothIntensity）、面部磨皮（faceSmoothIntensity）、黑眼圈去除（blackEyeIntensity）、肤色均匀（averageIntensity）
- 磨皮算法：3x3 高斯模糊核 [1,2,1; 2,4,2; 1,2,1]/16 配合保边采样，权重和归一化后与原图按 maskValue 加权混合
- 黑眼圈去除 v2 算法（替换旧版）：右眼 18 点闭环（f22-26、f110-112、f117-121、f128、f143、f226、f244、f245）+ 左眼 15 点闭环（f252-256、f340-341、f346-350、f357、f372、f464、f465）+ 眼睛中心 f468/f473
- 半边脸整体亮度权重：`avgLuma = dot(avgColor, vec3(0.299, 0.587, 0.114))`，`facebrightness = smoothstep(0.2, 0.5, avgLuma)`，整体偏暗时降低混合力度避免发灰
- 统一向平均肤色混合：`blendStrength = skinColorWeight * facebrightness * 0.55`，`resultColor = mix(originalColor, avgColor, blendStrength)`，相比旧版"相对暗度提亮"算法，避免肤色过曝和不自然亮斑
- 脸部区域检测：射线法 + 36 点封闭多边形，从当前像素向右发射射线，统计与多边形边的交点数，奇数次交点 = 在脸部内部

#### 6. 肌肉贴纸视图（BLShapeView）
- 1112 行 Swift 实现贴纸图层管理，单图支持四点透视变换（topLeft / topRight / bottomRight / bottomLeft）+ 中心点变形（CIPinchDistortion）+ 水平/垂直翻转 + 透明度（0-1）+ 亮度（-1~1）+ 遮罩擦除
- 径向渐变笔刷：`drawRadialGradient` 生成"中心实、四周由实变模糊"的圆形笔刷 CGImage，使用 `kCGBlendModeDestinationOut` 实现遮罩擦除
- 贴纸数据通过 `BLShapeFilter` 渲染到字节缓冲（`performRenderToBuffer`），交由 GPU shape_fragment_shader 与底图混合，支持遮罩通道实现贴纸边缘平滑过渡
- 多贴纸叠加：`BLShapeView` 维护 `BLShapeModel` 数组，按层级渲染到独立纹理后传入 GPU 主滤镜链
- 预设贴纸库：Firm 系列（01-04）、Power 系列（01-05）、Man 系列（01-04）、Hot 系列（01-04），按身体部位分组展示

#### 7. 三级菜单驱动架构（JSON 配置）
- 设计三级 JSON 菜单结构：`menu_level_1.json`（主功能：Body / Face / Reshape / Hair / Effect / Adjust）→ `menu_level_2.json`（子功能：Slim Down / Breast / Hips / Belly / Arms / Legs 等）→ `menu_level_3.json`（参数：min/max/default + key 字段）
- 数据流闭环：用户拖动滑块 → `keyValueMap[key] = value` → `Filter.setKeyValueMap()` → GLSL `uniform float` → Shader 实时计算
- 菜单元数据驱动 UI：`recognition` 字段标识需要的检测类型（body / face / hair）、`onlyImage` 标识仅图片支持、`disableRecord` 控制是否记录撤销、`pro` 标识付费功能、`autoShow` 控制自动展开
- 新增功能零代码改造：通过添加 JSON 配置 + 新增 GLSL uniform，即可上架新参数，避免硬编码

#### 8. 视频处理特性
- 时间范围效果 `BLVideoRangeEffect`：单视频可设置多个时间段（startTime / endTime / keyValueMap），不同段使用不同变形参数
- 帧级检测可配置：`BLLandmarkerManager` 支持自定义检测帧率（每 N 帧检测一次），平衡精度与性能
- 实时预览：`AVPlayer` + `GPUImageMovie` 联动，时间轴拖动实时刷新滤镜参数
- 导出：`AVAssetWriter` 自定义分辨率 / 帧率 / 码率，导出过程显示进度条，支持后台导出
- 卡尔曼滤波关键点平滑器在每帧检测后立即应用，参数已上传到 GPU 才进入下一帧渲染

#### 9. 撤销/重做与文件管理
- `BLRecordManager` 设计 6 类数据类型（`map` 参数字典 / `image` 图片 / `videoeffects` 视频时间范围 / `warpData` 液化偏移 / `warpImage` 液化遮罩 / `shapeModel` 贴纸完整数据），最多保留 200 步历史
- 索引管理：`currentIndex` 维护当前位置，新增记录时丢弃后续 redo 链；超出 200 条时丢弃最早记录并同步 currentIndex
- `BLFileManager` 统一管理临时文件、导出目录、缓存清理，避免编辑器频繁创建临时文件占满磁盘
- AI 发型/发色集成：`AIFramework` 本地库 + 模型文件，提供 `aiHairColor` / `aiHairStyle` 接口，识别后生成新发型图作为图层叠加

---

### 技术难点与解决方案

#### 1. 大体积 GLSL Fragment Shader 维护性
**问题**：`transform_fragment_shader.frag` 单文件 370KB+，覆盖身体 + 面部 + 眼鼻嘴眉 60+ 个变形参数，编译耗时长、可读性差

**方案**：
- 分函数模块化：每个变形参数独立函数（`applyWaist`、`applyChest`、`applyFaceWidth`、`applyEyeSize`），主函数顺序调用
- 关键点统一接口：所有关键点以 `vec4 f<index>` 命名（`xy = 坐标`、`z = 深度`、`w = visibility`），避免命名冲突
- 宽高比校正集中处理：进入主函数后立刻对 `sample_coordinate` 和所有关键点做 `aspect_ratio` 校正，避免每个变形函数重复计算
- 启动时一次性编译：App 启动时预编译所有 Shader 到 Program 缓存，避免首次进入编辑器卡顿
- 强度参数 0 时短路：`if (waistIntensity < 0.001) skip;` 避免无效计算，2K 图像渲染保持 60fps

#### 2. 视频关键点抖动
**问题**：MediaPipe 对视频逐帧检测时，相同物体相邻帧关键点存在 1-3px 的微小抖动，叠加变形后画面剧烈晃动

**方案**：
- 卡尔曼滤波：标准参数过程噪声 0.125 / 测量噪声 32.0，每个关键点独立状态
- 部位差异化参数：胸部抖动最敏感，使用更小过程噪声（0.08）+ 更大测量噪声（64.0）+ 变化率限制（1.3%/帧）
- 异常值检测：滑动窗口 5 帧 + 3σ 阈值，单帧突变识别为异常，使用混合因子 0.75 倾向上一帧
- 变化率硬限制：超过部位最大变化率时强制钳制，避免网络模型偶发误识别造成跳变
- 视频导出前预先批量平滑所有帧，避免实时预览与导出结果不一致

#### 3. 液化偏移精度与性能
**问题**：偏移缓冲使用 `Float32` 占用 16MB+（2K 图），逐手势上传 GPU 卡顿；使用 `Uint8` 又精度不够，多次操作后偏移累积失真

**方案**：
- GPU 端使用 `GL_RGBA16F`（半浮点）纹理，精度足够且体积减半
- CPU 端 `offsetFloatBuffer` 仍保持 Float32（保证多次叠加无精度损失），上传 GPU 时转换为 half-float
- 增量上传：仅触摸点周围影响区域上传到纹理，使用 `glTexSubImage2D` 局部更新避免整图上传
- 平滑缓冲复用：`smoothTmpBuffer` 复用避免逐帧 malloc/free，结合 `OFFSET_MAX = 0.5` 钳制防止偏移失控
- 冻结区域两阶段搜索：粗 50 次定位 + 细 30 次精修，相比单阶段全图搜索性能提升 5x

#### 4. 黑眼圈去除自然度
**问题**：旧版"相对暗度提亮"算法（`relativeDarkness = (avgLuma - originalLuma) / avgLuma`，`resultColor = originalColor * (1 + brightenStrength)`）在浓黑眼圈下产生过曝亮斑，肤色与脸颊不连续

**方案**：
- 改为肤色定向混合：`resultColor = mix(originalColor, avgColor, 0.55)`，不区分像素亮暗，统一向脸部平均肤色偏移
- 半边脸亮度权重：`avgLuma = dot(avgColor, vec3(0.299, 0.587, 0.114))`，`smoothstep(0.2, 0.5, avgLuma)` 整体偏暗时降低混合力度，保留肤色层次
- 多权重叠加：`regionWeight`（是否在眼周闭环内）× `skinColorWeight`（与平均肤色相似度）× `facebrightness`（亮度权重）共同决定混合强度
- 双眼独立处理：右眼 18 点闭环 + 左眼 15 点闭环分开计算，避免互相干扰
- 边缘渐变：通过到眼睛中心 `f468/f473` 的距离 `smoothstep` 渐变过渡，避免硬边缘

#### 5. 多滤镜串联性能
**问题**：7 条滤镜串联渲染，每个滤镜都需要从 FBO 读取 + 绘制到下一个 FBO，2K 图像总耗时 30ms+，无法保持 60fps

**方案**：
- 强度为 0 的滤镜整体跳过：`isPipelineEnabled = NO` 时滤镜直接将上一级输出 passthrough，避免无效采样
- 共享 FBO 池：`GPUImageFramebufferCache` 复用 FBO，减少纹理分配开销
- Shader uniform 增量更新：仅在 `keyValueMap` 实际变化时调用 `setFloat:forUniform:`，避免逐帧重复传输
- 检测帧率降级：视频实时预览时检测帧率降到 15fps，导出时再用 30fps 完整检测，体感无差异
- 异步关键点检测：检测线程与渲染线程解耦，检测尚未完成时使用上一帧关键点 + 卡尔曼预测填补

#### 6. 滤镜参数与撤销链路一致性
**问题**：液化数据 16MB+、贴纸图片几 MB、参数字典几百字节，统一保存到撤销链路时内存爆炸

**方案**：
- 6 类数据分别处理：`map` 直接深拷贝、`image` / `warpImage` 引用 UIImage（CGImage 共享）、`warpData` 序列化为 NSData、`shapeModel` 拆解为 `BLShapeModelData`（不持有原图）
- 200 步上限 + 自动丢弃：超过限制时丢弃最早记录，整体内存控制在 100MB 以内
- 视频时间范围效果单独管理：`videoeffects` 记录所有时间段配置，撤销时整体替换不增量
- 贴纸遮罩 lazy 持久化：仅在 add 记录时序列化为 PNG 数据，redo 时反序列化，平时维持引用
- 关键操作合批：连续滑动滑块时使用 `throttle` 合并为单条记录，避免单次拖动产生几百条历史

---

### 技术栈

**开发语言与框架**：Swift 5+, Objective-C, UIKit, OpenGL ES 2.0/3.0, GLSL

**第三方库**：
- MediaPipeTasksVision 0.10.14（人体姿态 + 面部关键点检测）
- SnapKit 5.7.1（声明式 Auto Layout）
- Alamofire 5.10.1（网络请求）
- Kingfisher 8.1.0（图片异步加载与缓存）
- Toast-Swift 5.1.0（Toast 提示）
- lottie-ios 4.5.2（Lottie 动画）

**本地库**：
- GPUImage（图像处理滤镜框架，深度定制）
- AIFramework（AI 发型 / 发色处理）
- LTThinkingSDK（用户行为分析）

**系统框架**：AVFoundation（视频处理）, Photos（相册访问）, StoreKit（内购）, Core Image（CIPinchDistortion）, Core Graphics（径向渐变笔刷）

---

### 项目成果

- 项目规模：519 个源文件，约 7 万行 Swift + Objective-C 代码（不含 GLSL Shader），6 大功能模块
- GPU 滤镜链：7 条自研滤镜串联，370KB+ GLSL Shader 实现 60+ 个身体/面部变形参数
- AI 检测精度：MediaPipe 双引擎（身体 33 点 + 面部 478 点），36 点封闭多边形脸部区域识别
- 视频稳定性：卡尔曼滤波分区参数调优（胸部/手部独立配置），消除关键点抖动
- 黑眼圈算法迭代：从"相对暗度提亮"升级为"肤色定向混合"，自然度显著提升
- 撤销/重做体系：支持 6 类数据类型 200 步历史，覆盖图片 / 液化数据 / 贴纸 / 视频时间范围
- 三级 JSON 菜单架构：新增功能零代码改造（添加配置 + uniform 即可上架）
