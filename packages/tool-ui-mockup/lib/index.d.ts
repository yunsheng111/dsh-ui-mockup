import type { Context } from '@deepseek-ai/cordis';
import { type MockupPrefs } from './prefs.js';
import { buildPrompt } from './prompt.js';
export declare const name = "ui-mockup";
/** 硬依赖：工具注册与使用规则注入是本插件的全部职责，等待这些服务出现。 */
export declare const inject: string[];
/** 与 dsh-host-apiproxy 的 RpcResult 同构的最小形状（避免宿主半区引入该依赖）。 */
export type RpcResultLike<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: {
        code: string;
        message: string;
        details: Record<string, unknown>;
    };
};
/** 插件 Config：设置命名空间的组合 base 层；未配置的字段取内置默认。 */
export interface MockupPluginConfig {
    defaultFidelity?: 'wireframe' | 'high-fidelity';
    defaultPlatform?: 'web' | 'mobile';
    defaultCount?: number;
    /** 已由设计资产库接管，配置不再生效；保留仅为兼容旧用户层数据。 */
    outputDir?: string;
    pollTimeoutMinutes?: number;
    wireframeModel?: string;
    highFidelityModel?: string;
    defaultSize?: string;
}
export declare const Config: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<{
    defaultFidelity: import("@deepseek-ai/schemastery").default<"wireframe" | "high-fidelity", "wireframe" | "high-fidelity">;
    defaultPlatform: import("@deepseek-ai/schemastery").default<"web" | "mobile", "web" | "mobile">;
    defaultCount: import("@deepseek-ai/schemastery").default<number, number>;
    outputDir: import("@deepseek-ai/schemastery").default<string, string>;
    pollTimeoutMinutes: import("@deepseek-ai/schemastery").default<number, number>;
    wireframeModel: import("@deepseek-ai/schemastery").default<string, string>;
    highFidelityModel: import("@deepseek-ai/schemastery").default<string, string>;
    draftModel: import("@deepseek-ai/schemastery").default<string, string>;
    defaultSize: import("@deepseek-ai/schemastery").default<string, string>;
}>, Schemastery.ObjectT<{
    defaultFidelity: import("@deepseek-ai/schemastery").default<"wireframe" | "high-fidelity", "wireframe" | "high-fidelity">;
    defaultPlatform: import("@deepseek-ai/schemastery").default<"web" | "mobile", "web" | "mobile">;
    defaultCount: import("@deepseek-ai/schemastery").default<number, number>;
    outputDir: import("@deepseek-ai/schemastery").default<string, string>;
    pollTimeoutMinutes: import("@deepseek-ai/schemastery").default<number, number>;
    wireframeModel: import("@deepseek-ai/schemastery").default<string, string>;
    highFidelityModel: import("@deepseek-ai/schemastery").default<string, string>;
    draftModel: import("@deepseek-ai/schemastery").default<string, string>;
    defaultSize: import("@deepseek-ai/schemastery").default<string, string>;
}>>;
/** 给 Agent 的稳定语义引用；隐藏资产库物理位置，避免为了复用生成图而复制文件。 */
export declare function agentImageReference(name: string): string;
/**
 * 成功消息里告警段的起始标记：客户端卡片凭标记截取告警区展示
 * （src/client/shared.ts 持同值副本 RESULT_NOTICE_MARKERS，改动需同步）。
 */
export declare const RESULT_NOTICE_MARKERS: readonly [" 注意: ", " 其中 "];
/** 「部分下载失败」告警段：前缀是客户端截取的定位标记，勿改。 */
export declare function buildFailuresNotice(failures: readonly string[]): string;
/** 「附件超限」告警段：前缀是客户端截取的定位标记，勿改。 */
export declare function buildOversizeNotice(oversize: number): string;
/** 历史追加失败是非致命降级：图片保留，但必须让用户知道本次不会出现在历史页。 */
export declare function buildHistoryWriteFailureNotice(): string;
/**
 * $DSH_HOME：与宿主 resolveDshHome 同口径——环境变量优先、默认 ~/.dsh；
 * 纯空白值视为未设置（避免把 home 解析成 cwd 下的怪目录），前导 ~ 展开为 home。
 */
declare function dshHome(): string;
/** 偏好生效值：settings 服务可用时以命名空间 resolved 值为准；
 * 缺席（纯内存部署）时退化为 cordis.yml 配置层覆盖内置默认。 */
export declare function effectivePrefs(scope: {
    get(): MockupPrefs;
} | undefined, config: MockupPluginConfig): MockupPrefs;
/**
 * 追加一条历史记录。已有坏尾行不改写，只在缺少换行时补一个分隔符，
 * 确保本次合法 JSON 不会和半截旧内容粘成同一行。
 */
export declare function appendHistoryLine(path: string, line: string): Promise<void>;
export declare function apply(ctx: Context, config?: MockupPluginConfig): void;
/** DSH home 用户层 patch 文件（launcher 实时 watch，编辑后组合热重载）。 */
export declare const HOME_PATCH_FILENAME = "cordis.patch.yml";
/** 供单元测试引用的内部实现。 */
export { buildPrompt, dshHome };
export { mergeProviderSwitchRows } from './providers.js';
export { sanitizeOutputDir, clampCount, parseHistoryLine, filterHistory, DEFAULT_PREFS, } from './prefs.js';
