import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { type ConnectionFace, type PrefScope } from './shared.js';
import type { NS } from './locales.js';
/** 偏好形状的客户端本地副本（不引入宿主 prefs 模块，避免把 schemastery 打进浏览器包）。 */
export interface PanelPrefs {
    defaultFidelity: 'wireframe' | 'high-fidelity';
    defaultPlatform: 'web' | 'mobile';
    defaultCount: number;
    outputDir: string;
    pollTimeoutMinutes: number;
    wireframeModel: string;
    highFidelityModel: string;
    /** 方向稿模型（fastPreview）；面板本地默认须与宿主 DEFAULT_PREFS 同步。 */
    draftModel: string;
    defaultSize: string;
}
/**
 * settings 域的客户端结构面（bind 由 ui-settings 插件在运行时提供）。
 * 面板经由它把同名命名空间镜像绑到本插件 fiber；ScopeSnapshot/PrefScope
 * 定义见 ./shared.js，客户端本地不再重复。
 */
/** 注入给面板组件的运行时句柄。 */
export interface UiMockupPanelInjected {
    prefs: PrefScope<PanelPrefs>;
    connection: ConnectionFace;
}
type PanelProps = PropsLocale<typeof NS> & UiMockupPanelInjected;
export declare function UiMockupSection({ t, prefs, connection }: PanelProps): import("react").JSX.Element;
/** 面板用的凭据状态（与宿主 CredentialStatus 同构）：只有三个事实，永不携带值。 */
export interface PanelCredential {
    configured: boolean;
    source?: string;
    writable: boolean;
}
export {};
