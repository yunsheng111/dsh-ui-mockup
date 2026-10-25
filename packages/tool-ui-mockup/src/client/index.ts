/**
 * ui_mockup 客户端半区：keyed 工具卡片 + 设置面板（M3）+ 双语字典。
 * 面板注册进 DSH 设置窗口的 settings.section 列表槽；偏好由 LocalPrefScope
 * 本地持久化（0.2.x 宿主无 settingsScope），历史/锚点/测试连接走 /ui-mockup 私有 RPC 通道。
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { callPanel, type ConnectionFace, LocalPrefScope } from './shared.js'
import { UiMockupToolview, type ToolviewAnchorFace } from './toolview.js'
import { UiMockupSection, type PanelPrefs, type UiMockupPanelInjected } from './settings-panel.js'
import { en, NS, zh } from './locales.js'

/**
 * 客户端半区硬依赖：卡片与设置槽注册、语言切换、connection 通道。
 * 0.2.x 起宿主不再提供 settingsScope 服务，偏好由 LocalPrefScope 本地持久化。
 */
export const inject = ['slots', 'locale', 'connection']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-mockup: dictionaries')

  const prefs = new LocalPrefScope<PanelPrefs>()
  const connection = ctx.get('connection') as ConnectionFace

  /**
   * 卡片锚点入口：设锚动作发生在「刚看完这版图」的瞬间，注入窄面
   * set/unset 闭包捕获 connection，直连 RPC 不绕 agent 消息流。
   */
  const anchorFace: ToolviewAnchorFace = {
    set: (file: string, cwd?: string) =>
      callPanel<{ anchorFile: string; hint?: string }>(connection, 'anchor/set', { file, cwd }),
  }

  ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register(
      {
        name: 'tool.call.toolview',
        key: 'ui_mockup',
        locale: NS,
        inject: () => ({ anchor: anchorFace }),
      },
      UiMockupToolview,
    ),
  )

  const panelInjected = (): UiMockupPanelInjected => ({ prefs, connection })

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'ui-mockup',
        order: 100,
        label: () => ctx.locale.bind(NS)('panel.nav'),
        locale: NS,
        inject: panelInjected,
      },
      UiMockupSection,
    ),
  )
}
