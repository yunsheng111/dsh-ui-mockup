import { type AnnotationMark } from '../annotation.js';
/** 标注颜色：固定三色（默认红），不跟主题——标注需要在任何配色界面上醒目。 */
export type AnnotationColor = 'red' | 'yellow' | 'blue';
/** 弹窗用到的文案键并集：宿主注入的 t 按 ui-mockup 命名空间收窄类型。 */
export type AnnotateModalTextKey = 'annotate.title' | 'annotate.hintPan' | 'annotate.hintDraw' | 'annotate.toolPan' | 'annotate.toolRect' | 'annotate.toolBrush' | 'annotate.toolArrow' | 'annotate.color' | 'annotate.undo' | 'annotate.clear' | 'annotate.zoomLabel' | 'annotate.zoomFit' | 'annotate.canvasLabel' | 'annotate.selectedMark' | 'annotate.deleteSelected' | 'annotate.deleteSelectedLabel' | 'annotate.deleteShortcut' | 'annotate.cancel' | 'annotate.imageLoadFailed' | 'card.feedbackPlaceholder' | 'card.feedbackSubmit' | 'card.openOriginal';
export interface AnnotateModalProps {
    /** 被标注图的文件名（资产库语义）。 */
    readonly name: string;
    /** 会话工作区（图片路由查询参数）。 */
    readonly cwd?: string;
    readonly t: (key: AnnotateModalTextKey, params?: Record<string, string | number>) => string;
    readonly onClose: () => void;
    /** 提交：意见 + 标注（原图像素坐标）+ 图像固有尺寸。空标注允许提交（退化为纯文字意见）。 */
    readonly onSubmit: (opinion: string, marks: readonly AnnotationMark[], imageWidth: number, imageHeight: number) => void;
}
export declare function AnnotateModal({ name, cwd, t, onClose, onSubmit }: AnnotateModalProps): import("react").JSX.Element;
