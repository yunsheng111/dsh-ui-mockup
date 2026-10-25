import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { type NS } from './locales.js';
type Props = ToolCallViewProps & PropsLocale<typeof NS> & {
    anchor?: ToolviewAnchorFace;
};
/** 卡片锚点注入面：由注册方闭包捕获 connection 提供，直连 RPC 不经 agent。 */
export interface ToolviewAnchorFace {
    set(file: string, cwd?: string): Promise<{
        anchorFile: string;
        hint?: string;
    }>;
}
export declare function UiMockupToolview({ block, inputActions, cwd, t, anchor }: Props): import("react").JSX.Element;
export {};
