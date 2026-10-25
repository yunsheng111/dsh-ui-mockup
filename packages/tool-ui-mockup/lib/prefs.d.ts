/**
 * 设置面板与历史数据的纯逻辑层：设置命名空间的 schema 与默认值、
 * 输出目录/数量校验、锚点文件名校验、历史行解析与过滤。
 * 无 IO、无 ctx 依赖，宿主半区与单元测试共用同一实现，避免两端口径漂移。
 */
import z from '@deepseek-ai/schemastery';
/** 生成偏好：设置命名空间 `ui-mockup` 的 section 结构。 */
export interface MockupPrefs {
    /** 未显式指定时的草图精度（工具调用 fidelity 为必填项，此值用于提示词建议）。 */
    defaultFidelity: 'wireframe' | 'high-fidelity';
    /** 未显式指定时的目标平台。 */
    defaultPlatform: 'web' | 'mobile';
    /** 未显式指定时一次生成的方案数量。 */
    defaultCount: number;
    /** 生成图落盘目录：已由设计资产库接管（$DSH_HOME/mockups/<工作区>/images），
     * 该偏好不再生效；字段保留仅为兼容旧用户层设置数据。 */
    outputDir: string;
    /** 任务轮询总时限（分钟），经 spec.pollTimeoutMs 下传 Provider。 */
    pollTimeoutMinutes: number;
    /** 线框图默认模型；空串表示交由 Provider 按其配置决定。 */
    wireframeModel: string;
    /** 高保真默认模型；空串同上。 */
    highFidelityModel: string;
    /** 方向稿模型（fastPreview=true 时使用）；空串回落线框档模型，再空则
     * 交由 Provider 内置分层默认。独立于线框档：面板档位标签语义不同，
     * 混用会产生低质方向稿与难以解释的历史。 */
    draftModel: string;
    /** 默认画幅，如 "1280*720"；空串表示按平台默认。 */
    defaultSize: string;
}
/** 偏好默认值：与已确认线框一致（线框/Web/2 张/design/images/10 分钟），模型空 = Provider 自决。 */
export declare const DEFAULT_PREFS: MockupPrefs;
/**
 * 设置命名空间 schema：设置服务用它解析用户层并合成最终值，
 * 同一份 envelope 随 describe 到达浏览器端做客户端校验。
 */
export declare const PrefsSchema: z<Schemastery.ObjectS<{
    defaultFidelity: z<"wireframe" | "high-fidelity", "wireframe" | "high-fidelity">;
    defaultPlatform: z<"web" | "mobile", "web" | "mobile">;
    defaultCount: z<number, number>;
    outputDir: z<string, string>;
    pollTimeoutMinutes: z<number, number>;
    wireframeModel: z<string, string>;
    highFidelityModel: z<string, string>;
    draftModel: z<string, string>;
    defaultSize: z<string, string>;
}>, Schemastery.ObjectT<{
    defaultFidelity: z<"wireframe" | "high-fidelity", "wireframe" | "high-fidelity">;
    defaultPlatform: z<"web" | "mobile", "web" | "mobile">;
    defaultCount: z<number, number>;
    outputDir: z<string, string>;
    pollTimeoutMinutes: z<number, number>;
    wireframeModel: z<string, string>;
    highFidelityModel: z<string, string>;
    draftModel: z<string, string>;
    defaultSize: z<string, string>;
}>>;
/** 把输出目录规范为「相对工作区根的子路径」；非法输入返回 null（由 UI 拒绝保存）。 */
export declare function sanitizeOutputDir(input: string): string | null;
/** 把任意输入钳制为合法的数量 1–4；非数值回退默认。 */
export declare function clampCount(value: unknown): number;
/**
 * 校验锚点引用的是 design/images/ 下的纯文件名（无路径分隔符）：
 * 锚点文件名最终拼进落盘路径并可能进入参考图请求，这里先挡掉路径逃逸。
 * @returns 规范化的文件名；不合法返回 null。
 */
export declare function sanitizeAnchorFileName(input: unknown): string | null;
/** 单条生成历史（history.jsonl 一行的结构化形态）。 */
export interface HistoryEntry {
    time: string;
    description: string;
    files: string[];
    model?: string;
    fidelity?: string;
    platform?: string;
    size?: string;
    status?: string;
    /** 方向稿标记（0.2.0 起，纯增量字段；旧行缺字段照常解析为 undefined）。 */
    fastPreview?: boolean;
}
/** 解析一行历史 JSON；损坏行静默丢弃（历史只读展示，坏行不应拖垮整个面板）。 */
export declare function parseHistoryLine(line: string): HistoryEntry | null;
/** 按描述子串过滤历史条目；查询词大小写不敏感、空白忽略。 */
export declare function filterHistory(entries: HistoryEntry[], query: string | undefined): HistoryEntry[];
/** 历史分页默认每页条数（宿主与客户端共用同一常量）。 */
export declare const HISTORY_PAGE_SIZE = 5;
/** 钳制每页条数到 [1, 50]，防异常/恶意值；非有限数回退默认。 */
export declare function clampPageSize(value: unknown): number;
/** 钳制页码到 [1, totalPages]；非有限数回退第 1 页。 */
export declare function clampPage(value: unknown, totalPages: number): number;
/** 锚点在过滤后列表中的索引 → 所在页码（1-based）；无锚点(-1)返回 null。 */
export declare function anchorPageOf(anchorIndex: number, pageSize: number): number | null;
