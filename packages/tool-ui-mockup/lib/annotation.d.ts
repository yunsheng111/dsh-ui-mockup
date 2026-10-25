/**
 * 标注反馈纯逻辑层：标记几何（原图像素坐标）、归一化包围盒、文本投影、
 * 编号、弹窗显示坐标映射（自适应/固定缩放、devicePixelRatio）与反馈消息模板。
 * 无 IO、无 DOM、无 ctx 依赖，客户端标注叠层与单元测试共用同一实现，
 * 避免两端口径漂移（对齐 prefs.ts 的分层风格）。
 */
/** 标注工具类型：矩形圈选、自由画笔、箭头。 */
export type AnnotationTool = 'pan' | 'rect' | 'brush' | 'arrow';
/** 矩形圈选标记：左上角 + 宽高，原图像素坐标。 */
export interface RectMark {
    readonly tool: 'rect';
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}
/** 画笔笔迹标记：有序点列，原图像素坐标。 */
export interface BrushMark {
    readonly tool: 'brush';
    readonly points: ReadonlyArray<readonly [x: number, y: number]>;
}
/** 箭头标记：起点指向终点，原图像素坐标。 */
export interface ArrowMark {
    readonly tool: 'arrow';
    readonly from: readonly [x: number, y: number];
    readonly to: readonly [x: number, y: number];
}
/** 一条标注（按创建顺序编号 ①②③）。 */
export type AnnotationMark = RectMark | BrushMark | ArrowMark;
/** 判断原图坐标点是否命中一条已有标记；线状标记使用调用方给出的原图像素容差。 */
export declare function hitTestMark(mark: AnnotationMark, point: {
    x: number;
    y: number;
}, tolerance: number): boolean;
/** 从后向前命中：后绘制的标记视觉上位于上层，应优先被选中。 */
export declare function findTopmostMark(marks: readonly AnnotationMark[], point: {
    x: number;
    y: number;
}, tolerance: number): number | null;
/** 归一化包围盒：各边 [0,1]，坐标原点在图像左上角。 */
export interface NormalizedBox {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
}
/**
 * 计算标记的归一化包围盒（保留全精度，供编号布局与投影共用）。
 * 退化标记（空笔迹）与非法图像尺寸返回 null。
 */
export declare function markBounds(mark: AnnotationMark, imageWidth: number, imageHeight: number): NormalizedBox | null;
/** 序号 → 编号字符：1~20 用带圈数字，超出退回 `(n)`（字体不再保证有带圈字形）。 */
export declare function numberLabel(n: number): string;
/**
 * 单条标记的文本投影（纯文本反馈通道的语义载体，按工具类型区分）。
 * 编号 1 基；退化标记与非法图像尺寸返回 null（编号位次不受影响）。
 */
export declare function projectMark(index: number, mark: AnnotationMark, imageWidth: number, imageHeight: number): string | null;
/** 按创建顺序投影全部标记；退化标记跳过但编号位次保持。 */
export declare function projectMarks(marks: readonly AnnotationMark[], imageWidth: number, imageHeight: number): string[];
/** 弹窗固定缩放档位；适合窗口由组件根据可用区域计算实际比例。 */
export type ZoomLevel = 0.5 | 1 | 1.5 | 2;
/** 弹窗缩放模式：适合窗口或固定比例。 */
export type ZoomMode = 'fit' | ZoomLevel;
/**
 * 完整显示整张图所需比例：同时受可用宽高约束，小图不放大超过 100%。
 * 尺寸不可用时回退 100%，避免初次测量期间产生 0/NaN 画布。
 */
export declare function fitZoom(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): number;
/** 固定比例切换后保持同一图像位置位于视口中心，结果不允许出现负滚动量。 */
export declare function centeredScrollOffset(scrollOffset: number, viewportSize: number, fromZoom: number, toZoom: number): number;
/** 给定缩放档下的显示尺寸（CSS 像素）。 */
export declare function displaySize(imageWidth: number, imageHeight: number, zoom: number): {
    width: number;
    height: number;
};
/**
 * canvas 后备存储尺寸：CSS 尺寸 × devicePixelRatio，向上取整，
 * 避免高 DPI 下绘制边缘发虚。
 */
export declare function backingSize(cssWidth: number, cssHeight: number, devicePixelRatio: number): {
    width: number;
    height: number;
};
/**
 * 指针位置（相对显示区域左上角，CSS 像素）→ 原图像素坐标，钳在图像边界内。
 * 所有缩放模式共用同一映射：显示尺寸是原图的 zoom 倍，故除以 zoom。
 */
export declare function pointerToImage(pointerX: number, pointerY: number, zoom: number, imageWidth: number, imageHeight: number): {
    x: number;
    y: number;
};
/**
 * 编号徽标绘制锚点（原图像素坐标）：默认落在包围盒左上角；
 * 靠近图像边缘时钳回图内，避免徽标溢出不可见。
 * @returns 锚点中心与建议绘制半径（随短边自适应）。
 */
export declare function badgeAnchor(box: NormalizedBox, imageWidth: number, imageHeight: number): {
    x: number;
    y: number;
    radius: number;
};
/**
 * 标注反馈时间戳格式：固定 ISO 8601 UTC（与 history.jsonl 的 toISOString 口径一致）。
 * 模型可见文本禁止 toLocaleString 等随环境漂移的格式；会话消息本身时序有序，
 * 时间戳的真实价值是上下文压缩后仍可消歧多轮标注，不承担排序主键职责。
 */
export declare function formatAnnotationTimestamp(time: Date): string;
/** 组装标注反馈消息：文件名 + 时间戳 + 编号投影 + 用户意见。 */
export declare function buildAnnotationFeedbackMessage(params: {
    readonly name: string;
    readonly time: Date;
    readonly projections: readonly string[];
    readonly opinion: string;
}): string;
