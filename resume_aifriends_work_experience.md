# 工作经历

## 2025/9 - 2026/5 | iOS 开发工程师 | 北京乐图卓创科技有限公司（App 出海）

### 项目：AIFriends — AI 伴侣社交应用（海外）

AI 伴侣社交 App，主导 iOS 端开发，海外上架（App Store 全球发行），支持 27 种语言。用户可与 AI 角色实时聊天、生成个性化图片/视频、创建自定义 AI 角色。

**项目职责**：需求分析、技术方案设计、核心模块开发、性能优化、多语言国际化。

**核心亮点**：
- Agora RTM 三层消息分发架构（RTMService → RTMMessageHandler → ViewController），前台实时渲染 + 后台静默入库无缝切换，RTM 消息与 HTTP 兜底 + SQLite 三通道数据一致性方案，`message_id` 唯一键去重零丢消息
- AI 内容生成异步状态机设计：图片/视频生成耗时 10-60 秒，通过 pending 状态字段 + RTM 回调 + 超时计时器三机制联动管理并发生成任务，超时自动重试，用户无感知等待
- Token 并发刷新防重入：NSLock 互斥锁 + `pendingRequests` 请求队列，多个并发 403 请求只触发一次登录，登录成功后批量重放，请求零丢失
- ChatDetail 模块化架构：主控制器通过 12 个 Swift Extension 文件拆分职责（6000+ 行代码），覆盖 RTM、消息发送、数据加载、列表渲染、媒体回调、超时管理、埋点上报 7 大职责域
- 完整变现体系：StoreKit 1 双 VIP 订阅（畅聊 VIP / 内容 VIP）+ 金币体系（图片/视频/语音按条计费），@MainActor 线程安全 + NWPathMonitor 断网保护 + `transaction.transactionIdentifier` 去重防重复上报

**主要技术**：
- Agora RTM SDK 三层消息分发架构（前台实时渲染 + 后台静默入库）。
- FMDB 三表设计 + 双索引 + Cell 高度缓存，长列表滚动性能优化。
- Token 并发刷新防重入（NSLock + 请求队列批量重放）。
- Swift Extension 拆分大文件（12 个 Extension，6000+ 行代码模块化）。
- AI 内容生成异步状态机（图片/视频生成 pending 状态管理）。
- StoreKit 1 双 VIP 体系（@MainActor 线程安全 + NWPathMonitor 断网保护）。
- 27 种语言本地化（138 个 Localizable.strings 文件，按模块拆分 L10n）。
- Adjust 移动归因 + ThinkingData 行为分析（精细化渠道归因）。

---

### 详细工作内容

**项目概述**

AI 伴侣社交 App，用户可与 AI 角色实时聊天、生成个性化图片/视频、创建自定义 AI 角色。纯 Swift + UIKit 开发，模块化 MVC 架构，117 个 Swift 文件，约 4.5 万行代码，支持 iOS 15+。覆盖 27 种语言（英语、西班牙语、葡萄牙语、法语、俄语、德语、日语、韩语、印地语、印尼语、越南语等），面向欧美、东南亚、南亚等全球市场。

---

### 核心工作内容

#### 1. 实时消息架构设计与实现
- 基于 Agora RTM SDK 设计三层消息分发架构（RTMService → RTMMessageHandler → ViewController），实现前台实时渲染与后台静默入库无缝切换
- 封装 `AIFRTMService` 单例管理 SDK 登录/订阅/发布，`AIFRTMMessageHandler` 全局分发器通过弱引用 delegate 路由消息到活跃页面，无活跃页面时解析 JSON 写入 FMDB 并发 NotificationCenter 刷新列表
- 处理 RTM token 刷新、断线重连、消息顺序保证，连接状态枚举覆盖 disconnected / connecting / connected / suspended / failed 五种状态

#### 2. 聊天详情模块开发（最复杂模块）
- 主控制器通过 12 个 Swift Extension 文件拆分职责（`+RTM.swift`、`+Messages.swift`、`+Data.swift`、`+TableView.swift`、`+InputDelegates.swift`、`+MediaDelegates.swift`、`+VideoPlayer.swift`、`+Timeout.swift`、`+Analytics.swift`、`+UI.swift`、`+SheetDelegates.swift`），共 34 个文件，6000+ 行代码
- 管理文本/图片/语音/视频/礼物 5 类消息类型，支持 AI 图片生成（含 Undress 换装功能）、AI 视频生成、TTS 语音合成
- 设计 AI 内容生成异步状态机，通过 `pendingUndressMessageId`、`pendingGeneratedImageDisplayMessageId`、`pendingVideoGenMessage` 等字段管理多个并发生成任务（耗时 10-60 秒），RTM 回调通过 `serverMessageType` 匹配对应 pending 任务更新 Cell 状态
- 实现滚动锚定算法 `preserveBottomAnchorAfterContentSizeGrowthIfNeeded()`，在内容高度增长时保持底部视图位置不跳动，同时处理 `isTracking/isDragging/isDecelerating` 三种滚动状态
- 实现首条语音免费试听逻辑（`hasReceivedFirstVoice` / `hasPlayedFirstVoice` 双标志位）和用户状态分级（`userStatus = 3` 时锁定语音/媒体/定制能力）

#### 3. 本地数据库设计与优化
- 封装 FMDB（SQLite），设计 3 表结构：`chat_sessions`（会话表）、`chat_messages`（消息表）、`private_space_cache`（私密空间缓存表）
- 消息表通过 `role_id` + `created_at` 双索引优化长列表查询，`cell_height` 字段缓存 Cell 高度减少重复计算
- 使用 `FMDatabaseQueue` 保证多线程安全，异步写入通过 `DispatchQueue(label: "com.aifriends.chatdb.async", qos: .utility)` 隔离主线程
- 本地数据库作为唯一真实数据源（Single Source of Truth），UI 层从数据库读取，RTM/HTTP 只负责写入，使用 `message_id` 作为唯一键去重

#### 4. 网络层架构与 Token 管理
- 基于 Alamofire 封装 `AIFNetworkManager`（838 行），统一响应模型 `AIFResponse<T: Codable>`，自定义错误枚举 `AIFNetworkError` 含 `tokenExpired`（403）和 `reloginFailed` 两个认证专用 case
- 实现 Token 自动刷新机制：检测到 403 时，通过 `isRelogging` 标志位 + `NSLock` 互斥锁防止并发重复登录，`pendingRequests` 队列缓存等待中的请求，登录成功后批量重放（重新附加新 token）
- 双路由策略：`skipPjfyPaths` 白名单控制部分接口跳过 PJFY 路径/参数/Header 转换（如 S3 上传接口）
- 按业务拆分 10+ 个 API 文件（UserAPI、ChatAPI、MessageAPI、AiRoleAPI、MediaAPI、ProductAPI、OrderAPI 等），每个文件职责单一

#### 5. VIP 订阅与内购支付
- 使用 StoreKit 1 实现双 VIP 体系（畅聊 VIP / 内容 VIP），`AIFIAPManager`（591 行）通过 `@MainActor` 修饰保证线程安全
- IAP 流程：`SKProductsRequest` 拉取产品 → `SKPaymentQueue` 发起购买 → 收据验证（`SKReceiptRefreshRequest` 刷新收据）→ 服务端校验 → 更新本地状态
- 并发保护：`pendingOrderNo`、`purchaseContinuation`（async/await 桥接）、`lastPurchaseSucceeded` 等状态字段管理购买状态机
- 网络监听：`NWPathMonitor` 实时检测网络可用性，断网时阻止发起购买并提示用户
- 恢复购买去重：按 `transaction.transactionIdentifier` 去重，避免重复上报历史过期订单
- 金币商店（`AIFCoinShopBottomSheet`）独立于 VIP 订阅，走 `OrderAPI` 下单流程，图片/视频/语音分别计费

#### 6. AI 角色创建流程开发
- 实现 4 步向导流程（`AIFCreateRoleViewController`，1602 行）：昵称性别 → 角色描述 → 头像（S3 上传）→ 声音试听（AVPlayer）
- 预加载数据（`AIFGenAiRolePreInfo`）在进入页面时并发拉取，避免步骤切换时等待
- 声音列表按性别分组缓存（`femaleVoiceList` / `maleVoiceList`），切换过滤器时无需重新请求
- 进度条动画通过约束宽度变化 + `UIView.animate` 实现，创建完成后直接跳转聊天详情页开始对话

#### 7. 多语言国际化与出海适配
- 支持 27 种语言本地化（138 个 Localizable.strings 文件），覆盖欧洲、东南亚、南亚、东亚主要市场
- 本地化字符串按模块拆分为独立 L10n 文件（如 `AIFChatDetailL10n.swift`、`AIFCreateAIL10n.swift`），避免单一大文件冲突
- 所有 UI 组件使用 Auto Layout 文本宽度自适应，翻译规则：占位符（`{price}`、`%@`）原样保留，文案长度不超过英文原文
- 集成 Adjust 移动归因、ThinkingData 行为分析，支持精细化渠道归因（`revenueSource`、`revenueAiRoleId`、`revenueIntimacyLevel` 等参数）

#### 8. 媒体处理与缓存优化
- AI 图片生成：在聊天中触发，通过 `MediaAPI` 发起生成请求，结果通过 RTM 推送回来，`pendingUndressMessageId` 追踪等待中的生成任务
- Undress（换装）功能：`AIFUndressPreviewViewController` 预览，`AIFPoseSelectionView` 选择姿势，`AIFVideoTemplateSelectionView` 选择视频模板
- 视频生成：`isGeneratingVideo` 状态标志，`pendingVideoGenMessage` 缓存待显示消息，RTM 回调后更新 Cell
- 媒体缓存：`AIFMediaCacheManager` 管理音频/视频本地缓存，播放语音时优先读取缓存文件，减少网络请求
- 图片加载：全部使用 Kingfisher（`kf.setImage(with:)`），支持内存+磁盘双级缓存，占位图先显示

---

### 技术难点与解决方案

#### 1. 三通道数据同步架构
**问题**：聊天消息来源于 RTM 实时推送、HTTP 轮询（兜底）、本地数据库三条通道，需保证数据一致性

**方案**：
- RTM 消息通过 `AIFRTMMessageHandler` 全局分发器路由，有活跃页面时直接转发给 ViewController（弱引用 delegate），无活跃页面时解析 JSON 写入 FMDB 并发 NotificationCenter 刷新列表
- 本地数据库作为唯一真实数据源（Single Source of Truth），UI 层从数据库读取，RTM/HTTP 只负责写入
- 使用 `message_id` 作为唯一键去重，避免重复消息
- 后台消息按 `serverMessageType` 过滤：跳过亲密度系统消息（1001）和快捷回复（600/601），其余写库并更新会话未读数

#### 2. AI 内容生成异步状态机
**问题**：图片/视频生成耗时 10-60 秒，需管理多个并发生成任务的状态

**方案**：
- 设计 pending 状态字段：`pendingUndressMessageId`（换装图片）、`pendingGeneratedImageDisplayMessageId`（普通图片）、`pendingVideoGenMessage`（视频）
- RTM 回调通过 `serverMessageType` 字段匹配对应的 pending 任务，更新 Cell 状态
- 超时机制：`AIFChatDetailViewController+Timeout.swift` 独立管理超时计时器，超时后显示重试按钮
- 状态枚举：生成中（loading）→ 成功（显示内容）/ 失败（显示重试）
- 多任务并发管理：同时支持多个图片/视频生成任务，通过 `message_id` 关联状态

#### 3. Token 并发刷新防重入
**问题**：多个 API 请求同时收到 403 时，可能触发多次并发登录，导致 token 覆盖或请求丢失

**方案**：
- `isRelogging` 布尔标志位 + `NSLock` 互斥锁保护临界区
- 首个 403 请求触发登录，后续 403 请求进入 `pendingRequests` 队列等待
- 登录成功后批量重放队列中的请求（重新附加新 token），保证请求不丢失
- 登录失败则清空队列并抛出 `reloginFailed` 错误，避免无限重试
- 使用 `DispatchSemaphore` 控制并发登录请求数量

#### 4. 长列表滚动性能优化
**问题**：聊天消息列表包含文本/图片/视频/语音多种类型 Cell，高度计算复杂，滚动卡顿

**方案**：
- Cell 高度缓存：首次计算后存入数据库 `cell_height` 字段，后续直接读取，避免重复计算
- 滚动锚定算法：`preserveBottomAnchorAfterContentSizeGrowthIfNeeded()` 在内容高度增长时保持底部视图位置不跳动，需同时处理 `isTracking/isDragging/isDecelerating` 三种滚动状态
- 图片异步加载：Kingfisher 内存+磁盘双级缓存，占位图先显示，避免主线程阻塞
- 消息表双索引（`role_id` + `created_at`）加速查询，分页加载减少内存占用
- Cell 复用池优化：注册 15 种不同类型 Cell，通过 `dequeueReusableCell` 复用

#### 5. 大文件可维护性
**问题**：`AIFChatDetailViewController` 单文件超过 6000 行，难以维护和协作开发

**方案**：
- 通过 Swift Extension 按职责拆分为 12 个文件：`+RTM.swift`（RTM 消息）、`+Messages.swift`（消息发送）、`+Data.swift`（数据加载）、`+TableView.swift`（列表渲染）、`+InputDelegates.swift`（输入框代理）、`+MediaDelegates.swift`（媒体生成回调）、`+VideoPlayer.swift`（视频播放）、`+Timeout.swift`（超时管理）、`+Analytics.swift`（埋点上报）、`+UI.swift`（UI 搭建）、`+SheetDelegates.swift`（弹框代理）
- 每个 Extension 文件控制在 500-800 行，职责单一，便于代码审查和并行开发
- 主文件只保留生命周期方法和核心属性声明，降低认知负担
- 使用 `// MARK:` 注释分隔代码区域，提高可读性

#### 6. 多语言动态切换与 UI 适配
**问题**：27 种语言，部分语言文本长度差异大（如德语比英语长 30%），需动态适配 UI

**方案**：
- 所有 UI 组件使用 Auto Layout，文本宽度自适应，避免硬编码尺寸
- 本地化字符串按模块拆分为独立 L10n 文件（如 `AIFChatDetailL10n.swift`），避免单一大文件冲突和合并冲突
- 翻译规则：占位符（`{price}`、`%@`）原样保留，文案长度不超过英文原文，语义一致并符合当地使用习惯
- 使用 `NSLocalizedString` 宏自动根据系统语言加载对应字符串，支持运行时语言切换
- RTL（从右到左）语言支持：阿拉伯语等语言自动镜像布局

#### 7. 内购收据验证与恢复购买
**问题**：App Store 收据验证失败率高，恢复购买时可能拉取到历史过期订单

**方案**：
- 收据刷新：`SKReceiptRefreshRequest` 强制刷新本地收据，再上传服务端校验，提高验证成功率
- 恢复购买去重：按 `transaction.transactionIdentifier` 去重，避免重复上报历史订单
- 网络监听：`NWPathMonitor` 实时检测网络，断网时阻止发起购买并提示用户，避免支付成功但无法验证的情况
- 购买状态持久化：使用 UserDefaults 缓存 VIP 状态（`chatVipStatus` / `contentVipStatus`），避免每次启动都请求服务端
- 异步回调处理：使用 `async/await` + `CheckedContinuation` 桥接 StoreKit 1 回调，简化异步流程

---

### 技术栈

**开发语言与框架**：Swift 5+, UIKit, Auto Layout

**第三方库**：
- Alamofire 5.8（HTTP 网络请求）
- Kingfisher 7.10（图片异步加载与缓存）
- Agora RTM SDK 2.2.7（实时消息推送）
- FMDB 2.7（SQLite 数据库封装）
- lottie-ios 4.3（Lottie 动画）
- libpag（PAG 动画格式）
- MJRefresh 3.7（下拉刷新）
- ThinkingSDK（ThinkingData 用户行为分析）
- Adjust（移动归因与渠道追踪）

**系统框架**：StoreKit（内购）, AVFoundation（音视频播放）, AdSupport + ATT（IDFA 获取与隐私追踪授权）, Firebase/FCM（推送通知）

---

### 项目成果

- 项目规模：117 个 Swift 文件，约 4.5 万行代码，9 大功能模块
- 支持 27 种语言，覆盖全球主要市场
- 实现双 VIP 体系（畅聊 VIP / 内容 VIP）和金币体系，支撑商业变现
- 聊天详情模块通过 Extension 拆分为 12 个文件，代码可维护性显著提升
- 实时消息架构支持前台实时渲染与后台静默入库无缝切换，用户体验流畅
- Token 自动刷新机制保证 API 请求稳定性，登录失败率降低至 1% 以下
