/**
 * 设置面板与历史数据的纯逻辑层：设置命名空间的 schema 与默认值、
 * 输出目录/数量校验、锚点文件名校验、历史行解析与过滤。
 * 无 IO、无 ctx 依赖，宿主半区与单元测试共用同一实现，避免两端口径漂移。
 */
import z from '@deepseek-ai/schemastery';
/** 偏好默认值：与已确认线框一致（线框/Web/2 张/design/images/10 分钟），模型空 = Provider 自决。 */
export const DEFAULT_PREFS = {
    defaultFidelity: 'wireframe',
    defaultPlatform: 'web',
    defaultCount: 2,
    outputDir: 'design/images',
    pollTimeoutMinutes: 10,
    wireframeModel: '',
    highFidelityModel: '',
    draftModel: '',
    defaultSize: '',
};
/**
 * 设置命名空间 schema：设置服务用它解析用户层并合成最终值，
 * 同一份 envelope 随 describe 到达浏览器端做客户端校验。
 */
export const PrefsSchema = z
    .object({
    defaultFidelity: z.union(['wireframe', 'high-fidelity']).default('wireframe'),
    defaultPlatform: z.union(['web', 'mobile']).default('web'),
    defaultCount: z.number().min(1).max(4).step(1).default(2),
    outputDir: z.string().default('design/images'),
    pollTimeoutMinutes: z.number().min(1).max(60).default(10),
    wireframeModel: z.string().default(''),
    highFidelityModel: z.string().default(''),
    draftModel: z.string().default(''),
    defaultSize: z.string().default(''),
})
    .description('UI 草图偏好');
/** 把输出目录规范为「相对工作区根的子路径」；非法输入返回 null（由 UI 拒绝保存）。 */
export function sanitizeOutputDir(input) {
    const trimmed = input.trim().replace(/^\.\//, '').replace(/\/+$/, '');
    if (trimmed === '')
        return null;
    // 绝对路径与任何形式的向上逃逸都拒绝：落盘根必须锁定在会话工作区内
    if (/^([A-Za-z]:[\\/]|\/)/.test(input.trim()))
        return null;
    if (trimmed.split('/').includes('..'))
        return null;
    return trimmed;
}
/** 把任意输入钳制为合法的数量 1–4；非数值回退默认。 */
export function clampCount(value) {
    const n = typeof value === 'number' && Number.isFinite(value)
        ? Math.round(value)
        : DEFAULT_PREFS.defaultCount;
    return Math.min(4, Math.max(1, n));
}
const IMAGE_EXT_PATTERN = /\.(png|jpe?g|webp|gif)$/i;
/**
 * 校验锚点引用的是 design/images/ 下的纯文件名（无路径分隔符）：
 * 锚点文件名最终拼进落盘路径并可能进入参考图请求，这里先挡掉路径逃逸。
 * @returns 规范化的文件名；不合法返回 null。
 */
export function sanitizeAnchorFileName(input) {
    if (typeof input !== 'string')
        return null;
    const name = input.trim();
    if (name === '' || name !== name.replace(/[\\/]/g, ''))
        return null;
    if (name === '.' || name === '..')
        return null;
    if (!name.startsWith('mockup-'))
        return null;
    if (!IMAGE_EXT_PATTERN.test(name))
        return null;
    return name;
}
/** 解析一行历史 JSON；损坏行静默丢弃（历史只读展示，坏行不应拖垮整个面板）。 */
export function parseHistoryLine(line) {
    const trimmed = line.trim();
    if (trimmed === '')
        return null;
    try {
        const raw = JSON.parse(trimmed);
        if (typeof raw.time !== 'string' || typeof raw.description !== 'string')
            return null;
        if (!Array.isArray(raw.files))
            return null;
        const files = raw.files.filter((item) => typeof item === 'string');
        return {
            time: raw.time,
            description: raw.description,
            files,
            model: typeof raw.model === 'string' ? raw.model : undefined,
            fidelity: typeof raw.fidelity === 'string' ? raw.fidelity : undefined,
            platform: typeof raw.platform === 'string' ? raw.platform : undefined,
            size: typeof raw.size === 'string' && raw.size !== '' ? raw.size : undefined,
            status: typeof raw.status === 'string' ? raw.status : undefined,
            fastPreview: raw.fastPreview === true ? true : undefined,
        };
    }
    catch {
        return null;
    }
}
/** 按描述子串过滤历史条目；查询词大小写不敏感、空白忽略。 */
export function filterHistory(entries, query) {
    const needle = (query ?? '').trim().toLowerCase();
    if (needle === '')
        return entries;
    return entries.filter((entry) => entry.description.toLowerCase().includes(needle));
}
/** 历史分页默认每页条数（宿主与客户端共用同一常量）。 */
export const HISTORY_PAGE_SIZE = 5;
/** 钳制每页条数到 [1, 50]，防异常/恶意值；非有限数回退默认。 */
export function clampPageSize(value) {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : HISTORY_PAGE_SIZE;
    return Math.min(50, Math.max(1, n));
}
/** 钳制页码到 [1, totalPages]；非有限数回退第 1 页。 */
export function clampPage(value, totalPages) {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 1;
    return Math.min(totalPages, Math.max(1, n));
}
/** 锚点在过滤后列表中的索引 → 所在页码（1-based）；无锚点(-1)返回 null。 */
export function anchorPageOf(anchorIndex, pageSize) {
    return anchorIndex < 0 ? null : Math.floor(anchorIndex / pageSize) + 1;
}
//# sourceMappingURL=prefs.js.map