/** 构建工具提示词所需的最小入参。 */
export interface PromptArgs {
    readonly description: string;
    readonly fidelity: 'wireframe' | 'high-fidelity';
    readonly platform: 'web' | 'mobile';
    readonly style?: string;
}
/**
 * 组装正向提示词：线框图走无品牌的黑白手绘线框 + 中文区块标注；
 * 高保真走风格词 + 中文文案完整性约束；参考图模式额外要求与基准图保持一致。
 * @param args - 工具入参。
 * @param hasReference - 是否携带参考图（I2I 风格一致）。
 * @returns 完整提示词。
 */
export declare function buildPrompt(args: PromptArgs, hasReference: boolean): string;
