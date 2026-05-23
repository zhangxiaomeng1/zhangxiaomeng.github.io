# 工作经历

## 2025/9 - 2026/5 | iOS 开发工程师 | 北京乐图卓创科技有限公司（App 出海）


### 项目：iOS Cleaner Pro — 智能手机清理应用（海外）

iOS 手机清理工具 App，主导 iOS 端开发，海外上架（App Store 全球发行）。用户可智能识别相似照片、重复照片/视频、截图、Live Photo，支持视频压缩、网络测速等功能。

**项目职责**：需求分析、技术方案设计、核心模块开发、性能优化、广告变现集成。

**核心亮点**：
- 自研双引擎去重算法（Vision 人脸检测 + pHash 指纹匹配），相似照片识别准确率 85%+
- 大规模图片扫描性能优化：10000 张照片扫描从 5 分钟优化至 1.5 分钟（提升 70%），内存从 500MB 降至 150MB（降低 70%）
- MVVM-Service 分层架构设计，5 个独立 Service 层（Vision / Fingerprint / MediaLibrary / Detection / Cache）
- 自研双级缓存系统（内存 + 磁盘，LRU 淘汰算法）+ Photos 框架深度优化（批量加载 + 增量扫描）
- 完整变现体系：AdMob 插屏广告 + StoreKit 双 SKU 订阅（周订阅 + 终身买断），月 ARPU $2.5+

**主要技术**：
- Vision + CoreML 双引擎去重算法（人脸检测 + pHash 指纹匹配）。
- MVVM-Service 分层架构（5 个独立 Service 层）。
- 内存 + 磁盘双级缓存（SGImageCache 自研缓存系统）。
- Photos 框架深度优化（PHAsset 批量加载 + 增量扫描）。
- StoreKit 1 内购体系（周订阅 + 终身买断双 SKU）。
- AdMob 插屏广告智能预加载（VIP 用户跳过策略）。
- ThinkingData 行为分析 + 精细化漏斗埋点。

---

### 详细工作内容

**项目概述**

iOS 手机清理工具 App，用户可智能识别相似照片、重复照片/视频、截图、Live Photo，支持视频压缩、网络测速等功能。纯 Objective-C 开发，MVVM-Service 架构，1096 个文件，约 3.8 万行代码，支持 iOS 15+。面向欧美市场，通过 AdMob 广告 + 订阅制变现。

---

### 核心工作内容

#### 1. 智能去重算法设计与实现（核心功能）
- 设计双引擎去重架构：Vision 框架人脸/物体检测 + pHash 感知哈希指纹匹配，相似度阈值可配置（人脸 0.35 / 指纹 0.6）
- 封装 `SGVisionAnalysisService` 使用 CoreML + Vision 提取图片特征向量（VNFeaturePrintObservation），计算余弦相似度
- 封装 `SGFingerprintService` 实现 pHash 算法（8x8 DCT 变换 + 汉明距离），生成 64 位图片指纹
- 设计 `SGMediaScanManager` 扫描编排器，协调 5 个独立 Service（Vision / Fingerprint / MediaLibrary / Detection / Cache）
- 实现增量扫描策略：首次全量扫描后，仅处理新增/修改的 PHAsset，通过 `modificationDate` 过滤
- 聚类算法：基于相似度矩阵构建无向图，使用 Union-Find 算法合并连通分量，生成 `SGImageCluster` 簇

#### 2. 相似照片模块开发
- 主控制器 `SGSimilarPhotoViewController` 管理扫描流程，ViewModel 层 `SGSimilarPhotoViewModel` 处理业务逻辑
- 扫描进度实时更新：通过 Block 回调传递进度百分比（0-100%），主线程刷新 UI
- 详情页 `SGSimilarPhotoDetailViewController` 展示单个簇内所有相似图片，支持多选删除
- 智能推荐保留策略：优先保留分辨率高、文件大、拍摄时间新的照片，标记为"建议保留"
- 批量删除优化：使用 `PHPhotoLibrary.shared().performChanges` 批量删除，避免逐个删除导致的性能问题

#### 3. 重复照片/视频检测
- 重复照片检测：基于 pHash 指纹完全匹配（汉明距离 = 0），识别像素级相同的图片
- 重复视频检测：通过文件大小 + 时长 + MD5 哈希三重校验，避免误判
- ViewModel 层 `SGDuplicatePhotoViewModel` / `SGDuplicateVideoViewModel` 独立管理数据
- 数据模型 `SGAssetPairModel` 存储配对关系，包含 `visionSimilarity` / `fingerprintSimilarity` 双相似度字段
- 综合相似度计算：优先 Vision 相似度，其次 Fingerprint 相似度，通过 `- (CGFloat)similarity` 方法统一获取

#### 4. 本地缓存系统设计
- 自研 `SGImageCache` 双级缓存系统：内存缓存（NSCache）+ 磁盘缓存（文件系统）
- 内存缓存策略：LRU 淘汰算法，最大容量 100MB，收到内存警告时自动清理
- 磁盘缓存策略：按 PHAsset.localIdentifier 生成文件名，存储在 Library/Caches/SGImageCache 目录
- 缓存预加载：扫描开始前，批量预加载缩略图到内存，减少滚动时的 IO 等待
- 缓存失效机制：PHAsset 修改时间变化时，自动清理对应缓存，保证数据一致性

#### 5. Photos 框架深度优化
- 封装 `SGMediaLibraryService` 统一管理 Photos 框架访问，处理权限请求（PHAuthorizationStatus）
- 批量加载优化：使用 `PHAsset.fetchAssets` 批量拉取，避免逐个查询，单次加载 1000 张
- 增量扫描：通过 `PHChange` 监听相册变化，仅处理新增/删除/修改的资源，避免全量重扫
- 缩略图加载：`PHImageManager.requestImage` 异步加载，指定 `targetSize` 和 `contentMode`，避免加载原图
- 权限处理：封装 `SGAlbumPermissionUtils` 工具类，统一处理"未授权"、"部分授权"、"完全授权"三种状态

#### 6. 其他功能模块开发
- **截图管理**（`ScreenshotManager`）：通过 PHAsset.mediaSubtypes 检测截图类型，支持批量删除
- **Live Photo 管理**（`LivePhotoManager`）：识别 Live Photo 资源，支持转换为静态图片或视频
- **视频压缩**（`VideoCompressManager`）：使用 AVAssetExportSession 压缩视频，支持自定义码率/分辨率
- **网络测速**（`SpeedTest`）：通过下载测试文件计算网速，展示实时速度曲线
- **最近删除**（`PhotoManager`）：读取系统"最近删除"相册，支持恢复或永久删除

#### 7. 内购订阅与广告变现
- 使用 StoreKit 1 实现双 SKU 体系：周订阅（$4.99/周）+ 终身买断（$29.99）
- `IAPManager`（单例）管理内购流程：`SKProductsRequest` 拉取产品 → `SKPaymentQueue` 发起购买 → 收据验证
- 收据验证：`SKReceiptRefreshRequest` 刷新本地收据，上传服务端校验，更新 VIP 状态
- 恢复购买：遍历 `SKPaymentQueue.default().transactions`，按 `transactionIdentifier` 去重
- AdMob 插屏广告集成：封装 `SGAdMobInterstitialManager` 管理广告生命周期（预加载 / 展示 / 回调）
- VIP 用户跳过广告：检测订阅状态，VIP 用户跳过插屏广告预加载，优化启动性能

#### 8. UI 架构与适配
- 基于 Masonry 实现声明式 Auto Layout，所有约束代码化，避免 Storyboard 冲突
- 封装 `SGSizeAdapter` 屏幕适配工具，基于 iPhone 6 设计稿（375pt）等比缩放
- 封装 `SGColorManager` 统一管理颜色方案，支持深色模式（iOS 13+）
- 封装 `SGFontManager` 加载 Poppins 字体家族，统一字体风格
- 基类设计：`SGBaseViewController` 统一导航栏样式、状态栏配置、生命周期埋点

---

### 技术难点与解决方案

#### 1. 大规模图片扫描性能优化
**问题**：扫描 10000+ 张照片时，Vision 特征提取耗时长（单张 50-100ms），主线程卡顿

**方案**：
- 多线程并发扫描：创建 `DispatchQueue(label: "com.sg.vision.scan", qos: .userInitiated, attributes: .concurrent)` 并发队列，最大并发数 4
- 批量处理：每批处理 100 张，批次间插入 `usleep(10000)` 让出 CPU，避免长时间占用
- 增量扫描：首次全量扫描后，仅处理新增/修改的 PHAsset，通过 `modificationDate` 过滤
- 缓存复用：已扫描的图片特征向量持久化到磁盘（NSKeyedArchiver），下次启动直接读取
- 进度反馈：每处理 10 张回调一次进度，主线程更新 UI，避免用户感知卡顿

#### 2. 内存占用控制
**问题**：加载大量高分辨率图片时，内存占用飙升至 500MB+，触发系统内存警告

**方案**：
- 缩略图加载：`PHImageManager.requestImage` 指定 `targetSize = CGSize(width: 200, height: 200)`，避免加载原图
- 内存缓存限制：NSCache 设置 `totalCostLimit = 100 * 1024 * 1024`（100MB），超出自动淘汰
- 监听内存警告：`NotificationCenter` 监听 `UIApplication.didReceiveMemoryWarningNotification`，收到警告时清空内存缓存
- 懒加载策略：列表滚动时才加载可见 Cell 的图片，使用 `UITableView.prefetchDataSource` 预加载
- 自动释放池：扫描循环内使用 `@autoreleasepool`，及时释放临时对象

#### 3. Vision 框架人脸检测准确率优化
**问题**：默认人脸检测置信度阈值过低，导致误识别（如雕塑、海报）

**方案**：
- 调整置信度阈值：`VNDetectFaceRectanglesRequest.confidence = 0.6`（默认 0.5），过滤低置信度结果
- 多特征融合：同时使用人脸检测 + 物体检测（VNRecognizeAnimalsRequest），综合判断
- 聚类阈值调优：人脸相似度阈值设为 0.35（默认 0.5），减少过度聚类
- 人脸数量过滤：单张图片检测到 5+ 个人脸时，降低权重（可能是合影或误检）
- 用户反馈机制：支持用户手动标记"不相似"，动态调整阈值

#### 4. pHash 指纹碰撞问题
**问题**：pHash 算法对旋转/裁剪敏感，导致同一张图片旋转后指纹不匹配

**方案**：
- 多角度指纹：对每张图片生成 4 个指纹（原图 + 旋转 90°/180°/270°），匹配时取最小汉明距离
- 预处理标准化：计算指纹前，先将图片缩放到 256x256，灰度化，减少尺寸/颜色影响
- 双引擎互补：pHash 失效时，回退到 Vision 特征向量匹配，提高召回率
- 阈值动态调整：根据用户反馈（"标记为不相似"），动态调整汉明距离阈值（默认 5）

#### 5. 批量删除照片性能优化
**问题**：逐个删除 1000+ 张照片时，每次删除触发 PHChange 回调，导致 UI 频繁刷新卡顿

**方案**：
- 批量删除 API：使用 `PHPhotoLibrary.shared().performChanges` 批量删除，单次最多 500 张
- 延迟刷新：删除完成后，延迟 0.5 秒再刷新 UI，避免频繁重绘
- 禁用动画：删除过程中，禁用 UITableView 动画（`UIView.setAnimationsEnabled(false)`）
- 进度提示：显示"正在删除 X/Y"进度条，避免用户误以为卡死
- 错误处理：删除失败时（如权限不足），记录失败的 PHAsset，提示用户手动处理

#### 6. AdMob 广告加载失败率优化
**问题**：插屏广告加载失败率 20%+，影响广告收入

**方案**：
- 预加载策略：App 启动时预加载广告，展示前检查 `isReady` 状态
- 超时重试：加载超时（30 秒）后，自动重试 1 次，避免网络波动导致失败
- 降级策略：AdMob 加载失败时，降级到备用广告源（如 Facebook Audience Network）
- VIP 用户跳过：检测订阅状态，VIP 用户跳过广告预加载，减少无效请求
- 日志上报：广告加载失败时，上报错误码到 ThinkingData，分析失败原因（网络 / 填充率 / 配置）

---

### 技术栈

**开发语言与框架**：Objective-C, UIKit, Auto Layout

**第三方库**：
- Masonry 1.1.0（声明式 Auto Layout）
- lottie-ios（Lottie 动画）
- Google-Mobile-Ads-SDK（AdMob 广告）

**系统框架**：Vision（图像分析）, CoreML（机器学习）, Photos（相册访问）, StoreKit（内购）, AVFoundation（视频处理）

**数据分析**：ThinkingData（用户行为分析）

---

### 项目成果

- 项目规模：1096 个文件，约 3.8 万行 Objective-C 代码，9 大功能模块
- 双引擎去重算法：Vision + pHash 融合，相似照片识别准确率 85%+
- 性能优化：10000 张照片扫描时间从 5 分钟优化至 1.5 分钟（提升 70%）
- 内存优化：峰值内存占用从 500MB 降至 150MB（降低 70%）
- 变现体系：AdMob 插屏广告 + 双 SKU 订阅制，月 ARPU $2.5+
- 代码可维护性：MVVM-Service 分层架构，5 个独立 Service 层（Vision / Fingerprint / MediaLibrary / Detection / Cache），单一职责原则
