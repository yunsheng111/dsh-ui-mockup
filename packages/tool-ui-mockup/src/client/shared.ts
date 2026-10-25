/** 工具卡片与设置面板共享的客户端最小面：图片路由 URL 与 RPC 调用折叠。 */

/** 图片文件名 → webServer 路由 URL（host 半区 /ui-mockup/images 服务资产库图片）。 */
export function imageUrl(name: string, cwd?: string): string {
  const base = `/ui-mockup/images/${encodeURIComponent(name)}`
  return cwd !== undefined && cwd !== '' ? `${base}?cwd=${encodeURIComponent(cwd)}` : base
}

/** connection 服务的客户端结构面（本包只用 rpc.call 与 isLoopback）。 */
export interface ConnectionFace {
  readonly isLoopback: boolean
  readonly rpc: {
    call(
      channel: string,
      endpoint: string,
      payload?: unknown,
      signal?: AbortSignal,
    ): Promise<RpcResultLike<unknown>>
  }
}

/** 与宿主半区同构的 RPC 结果形状。 */
export type RpcResultLike<T> =
  { ok: true; value: T } | { ok: false; error: { code: string; message: string } }

/**
 * 把 RPC 结果折叠成「值或抛错」：错误信息面向用户可读，
 * 错误码保留在消息前缀便于排障。
 * 注意：宿主信封校验要求 payload 必填（clientRequestSchema 的 payload 为
 * z.unknown() 非可选），JSON.stringify 会丢弃值为 undefined 的字段，因此
 * 无参端点（overview / test-connection）也必须发送一个 {}。
 *
 * 0.1.5 起面板端点挂在共享 /api 通道上（宿主 connection.rpc.handle 注册专属通道
 * 在 cordis 隔离下拿不到 webServer 会静默失败）；这里改走 /api，端点名加 ui-mockup/ 前缀。
 */
export async function callPanel<T>(
  connection: ConnectionFace,
  endpoint: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const result = await connection.rpc.call('/api', `ui-mockup/${endpoint}`, payload ?? {})
  if (!result.ok) throw new Error(`[${result.error.code}] ${result.error.message}`)
  return result.value as T
}

/**
 * settings 域的客户端结构面（0.1.x 由 ui-settings 插件在运行时提供）；
 * 面板经由它把同名命名空间镜像绑到本插件 fiber。
 *
 * 0.2.x 起宿主设置域整个重写（connection 上不再有 settings 通道，
 * settingsScope 服务消失），本插件的偏好只有模型选择等纯客户端字段，
 * 因此改为 LocalPrefScope 本地持久化，契约与 0.1.x 的 PrefScope 保持一致。
 */
export interface SettingsScopeBinderFace {
  bind<T>(spec: { namespace: string }): PrefScope<T>
}

export interface ScopeSnapshot<T> {
  status: 'loading' | 'ready' | 'unavailable'
  value: T | undefined
  user: unknown
  base: unknown
  revision: number | undefined
  writable: boolean
  mode: 'host' | 'memory'
}

export interface PrefScope<T> {
  getSnapshot(): ScopeSnapshot<T>
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
  unset(field: string): Promise<void>
}

/** localStorage 键：面板偏好按整体 JSON 存储（字段级 set/unset 后写回）。 */
const PREFS_STORAGE_KEY = 'ui-mockup:prefs'

/**
 * localStorage 版 PrefScope：以 mode:'host' + writable:true 报告，
 * 面板按可写渲染；写入后同步重建快照并通知订阅者，
 * 保证 confirmApplied 风格的「写后立刻读回」能看到新值。
 */
export class LocalPrefScope<T extends object> implements PrefScope<T> {
  private listeners = new Set<() => void>()
  private snapshot: ScopeSnapshot<T>

  constructor() {
    this.snapshot = this.readSnapshot()
  }

  /** 从 localStorage 组装快照；存储不可用/损坏时按空偏好处理。 */
  private readSnapshot(): ScopeSnapshot<T> {
    let value: T | undefined
    try {
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY)
      if (raw !== null) value = JSON.parse(raw) as T
    } catch {
      // 隐私模式/配额/JSON 损坏：退回空偏好，不影响面板其余功能
    }
    return {
      status: 'ready',
      value,
      user: undefined,
      base: undefined,
      revision: undefined,
      writable: true,
      mode: 'host',
    }
  }

  getSnapshot(): ScopeSnapshot<T> {
    return this.snapshot
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async set(field: string, value: unknown): Promise<void> {
    this.update((current) => ({ ...current, [field]: value }))
  }

  async unset(field: string): Promise<void> {
    this.update((current) => {
      const next = { ...current }
      delete (next as Record<string, unknown>)[field]
      return next
    })
  }

  /** 应用字段变更：落 localStorage → 重建快照 → 通知订阅者。 */
  private update(mutate: (current: T) => T): void {
    const current = (this.snapshot.value ?? {}) as T
    const next = mutate(current)
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // 写不进去就只保留内存态：面板本次会话内仍然一致
    }
    this.snapshot = {
      ...this.snapshot,
      value: next,
      revision: (this.snapshot.revision ?? 0) + 1,
    }
    for (const listener of this.listeners) listener()
  }
}

/**
 * 历史分页每页条数——与宿主 prefs.ts 的 HISTORY_PAGE_SIZE 必须保持一致
 * （两端各持一份纯常量，避免客户端 import 宿主模块带入 schemastery 等依赖）。
 */
export const HISTORY_PAGE_SIZE = 5

/**
 * 成功消息里告警段的起始标记——与宿主 index.ts 的 RESULT_NOTICE_MARKERS 必须
 * 保持一致（同 HISTORY_PAGE_SIZE 的双副本约定）；工具卡片凭标记截取告警区展示。
 */
export const RESULT_NOTICE_MARKERS = [' 注意: ', ' 其中 '] as const

/** 锚点在过滤后列表中的索引 → 所在页码（1-based）；无锚点(-1)返回 null。 */
export function anchorPageOf(anchorIndex: number, pageSize: number): number | null {
  return anchorIndex < 0 ? null : Math.floor(anchorIndex / pageSize) + 1
}
