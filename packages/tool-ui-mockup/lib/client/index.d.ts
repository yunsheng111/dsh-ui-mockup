/**
 * ui_mockup 客户端半区：keyed 工具卡片 + 设置面板（M3）+ 双语字典。
 * 面板注册进 DSH 设置窗口的 settings.section 列表槽；偏好由 LocalPrefScope
 * 本地持久化（0.2.x 宿主无 settingsScope），历史/锚点/测试连接走 /ui-mockup 私有 RPC 通道。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * 客户端半区硬依赖：卡片与设置槽注册、语言切换、connection 通道。
 * 0.2.x 起宿主不再提供 settingsScope 服务，偏好由 LocalPrefScope 本地持久化。
 */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
