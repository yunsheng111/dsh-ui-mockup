window.__ModuleLoader__.load({
	id: "@mackwan84/dsh-tool-ui-mockup",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/shared.ts
		/** 工具卡片与设置面板共享的客户端最小面：图片路由 URL 与 RPC 调用折叠。 */
		/** 图片文件名 → webServer 路由 URL（host 半区 /ui-mockup/images 服务资产库图片）。 */
		function imageUrl(name, cwd) {
			const base = `/ui-mockup/images/${encodeURIComponent(name)}`;
			return cwd !== void 0 && cwd !== "" ? `${base}?cwd=${encodeURIComponent(cwd)}` : base;
		}
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
		async function callPanel(connection, endpoint, payload = {}) {
			const result = await connection.rpc.call("/api", `ui-mockup/${endpoint}`, payload ?? {});
			if (!result.ok) throw new Error(`[${result.error.code}] ${result.error.message}`);
			return result.value;
		}
		/** localStorage 键：面板偏好按整体 JSON 存储（字段级 set/unset 后写回）。 */
		const PREFS_STORAGE_KEY = "ui-mockup:prefs";
		/**
		* localStorage 版 PrefScope：以 mode:'host' + writable:true 报告，
		* 面板按可写渲染；写入后同步重建快照并通知订阅者，
		* 保证 confirmApplied 风格的「写后立刻读回」能看到新值。
		*/
		var LocalPrefScope = class {
			listeners = /* @__PURE__ */ new Set();
			snapshot;
			constructor() {
				this.snapshot = this.readSnapshot();
			}
			/** 从 localStorage 组装快照；存储不可用/损坏时按空偏好处理。 */
			readSnapshot() {
				let value;
				try {
					const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
					if (raw !== null) value = JSON.parse(raw);
				} catch {}
				return {
					status: "ready",
					value,
					user: void 0,
					base: void 0,
					revision: void 0,
					writable: true,
					mode: "host"
				};
			}
			getSnapshot() {
				return this.snapshot;
			}
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			async set(field, value) {
				this.update((current) => ({
					...current,
					[field]: value
				}));
			}
			async unset(field) {
				this.update((current) => {
					const next = { ...current };
					delete next[field];
					return next;
				});
			}
			/** 应用字段变更：落 localStorage → 重建快照 → 通知订阅者。 */
			update(mutate) {
				const next = mutate(this.snapshot.value ?? {});
				try {
					window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
				} catch {}
				this.snapshot = {
					...this.snapshot,
					value: next,
					revision: (this.snapshot.revision ?? 0) + 1
				};
				for (const listener of this.listeners) listener();
			}
		};
		/**
		* 成功消息里告警段的起始标记——与宿主 index.ts 的 RESULT_NOTICE_MARKERS 必须
		* 保持一致（同 HISTORY_PAGE_SIZE 的双副本约定）；工具卡片凭标记截取告警区展示。
		*/
		const RESULT_NOTICE_MARKERS = [" 注意: ", " 其中 "];
		/** 锚点在过滤后列表中的索引 → 所在页码（1-based）；无锚点(-1)返回 null。 */
		function anchorPageOf(anchorIndex, pageSize) {
			return anchorIndex < 0 ? null : Math.floor(anchorIndex / pageSize) + 1;
		}
		//#endregion
		//#region src/annotation.ts
		/** 画笔/箭头命中的点到线段距离；退化线段按端点距离处理。 */
		function distanceToSegment(point, from, to) {
			const dx = to[0] - from[0];
			const dy = to[1] - from[1];
			if (dx === 0 && dy === 0) return Math.hypot(point.x - from[0], point.y - from[1]);
			const projection = Math.min(1, Math.max(0, ((point.x - from[0]) * dx + (point.y - from[1]) * dy) / (dx * dx + dy * dy)));
			return Math.hypot(point.x - (from[0] + projection * dx), point.y - (from[1] + projection * dy));
		}
		/** 判断原图坐标点是否命中一条已有标记；线状标记使用调用方给出的原图像素容差。 */
		function hitTestMark(mark, point, tolerance) {
			if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
			const radius = Number.isFinite(tolerance) ? Math.max(0, tolerance) : 0;
			if (mark.tool === "rect") {
				const x0 = Math.min(mark.x, mark.x + mark.w);
				const x1 = Math.max(mark.x, mark.x + mark.w);
				const y0 = Math.min(mark.y, mark.y + mark.h);
				const y1 = Math.max(mark.y, mark.y + mark.h);
				return point.x >= x0 && point.x <= x1 && point.y >= y0 && point.y <= y1;
			}
			if (mark.tool === "arrow") return distanceToSegment(point, mark.from, mark.to) <= radius;
			if (mark.points.length === 1) {
				const only = mark.points[0];
				return Math.hypot(point.x - only[0], point.y - only[1]) <= radius;
			}
			for (let index = 1; index < mark.points.length; index++) if (distanceToSegment(point, mark.points[index - 1], mark.points[index]) <= radius) return true;
			return false;
		}
		/** 从后向前命中：后绘制的标记视觉上位于上层，应优先被选中。 */
		function findTopmostMark(marks, point, tolerance) {
			for (let index = marks.length - 1; index >= 0; index--) if (hitTestMark(marks[index], point, tolerance)) return index;
			return null;
		}
		const clamp01 = (value) => Math.min(1, Math.max(0, value));
		/** 投影用两位小数：文本投影稳定可读，避免浮点尾数噪音。 */
		const fmt = (value) => clamp01(value).toFixed(2);
		/**
		* 计算标记的归一化包围盒（保留全精度，供编号布局与投影共用）。
		* 退化标记（空笔迹）与非法图像尺寸返回 null。
		*/
		function markBounds(mark, imageWidth, imageHeight) {
			if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)) return null;
			if (imageWidth <= 0 || imageHeight <= 0) return null;
			let minX;
			let minY;
			let maxX;
			let maxY;
			if (mark.tool === "rect") {
				minX = mark.x;
				minY = mark.y;
				maxX = mark.x + mark.w;
				maxY = mark.y + mark.h;
			} else if (mark.tool === "arrow") {
				minX = Math.min(mark.from[0], mark.to[0]);
				minY = Math.min(mark.from[1], mark.to[1]);
				maxX = Math.max(mark.from[0], mark.to[0]);
				maxY = Math.max(mark.from[1], mark.to[1]);
			} else {
				if (mark.points.length === 0) return null;
				minX = Infinity;
				minY = Infinity;
				maxX = -Infinity;
				maxY = -Infinity;
				for (const [x, y] of mark.points) {
					if (x < minX) minX = x;
					if (y < minY) minY = y;
					if (x > maxX) maxX = x;
					if (y > maxY) maxY = y;
				}
			}
			return {
				x0: clamp01(Math.min(minX, maxX) / imageWidth),
				y0: clamp01(Math.min(minY, maxY) / imageHeight),
				x1: clamp01(Math.max(minX, maxX) / imageWidth),
				y1: clamp01(Math.max(minY, maxY) / imageHeight)
			};
		}
		const CIRCLED_NUMBERS = [
			"①",
			"②",
			"③",
			"④",
			"⑤",
			"⑥",
			"⑦",
			"⑧",
			"⑨",
			"⑩",
			"⑪",
			"⑫",
			"⑬",
			"⑭",
			"⑮",
			"⑯",
			"⑰",
			"⑱",
			"⑲",
			"⑳"
		];
		/** 序号 → 编号字符：1~20 用带圈数字，超出退回 `(n)`（字体不再保证有带圈字形）。 */
		function numberLabel(n) {
			if (Number.isInteger(n) && n >= 1 && n <= CIRCLED_NUMBERS.length) return CIRCLED_NUMBERS[n - 1];
			return `(${n})`;
		}
		/**
		* 单条标记的文本投影（纯文本反馈通道的语义载体，按工具类型区分）。
		* 编号 1 基；退化标记与非法图像尺寸返回 null（编号位次不受影响）。
		*/
		function projectMark(index, mark, imageWidth, imageHeight) {
			const label = numberLabel(index);
			if (mark.tool === "arrow") {
				if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)) return null;
				if (imageWidth <= 0 || imageHeight <= 0) return null;
				const [fx, fy] = mark.from;
				const [tx, ty] = mark.to;
				return `${label}箭头 从(${fmt(fx / imageWidth)},${fmt(fy / imageHeight)}) 指向(${fmt(tx / imageWidth)},${fmt(ty / imageHeight)})`;
			}
			const box = markBounds(mark, imageWidth, imageHeight);
			if (box === null) return null;
			const region = `x:[${fmt(box.x0)},${fmt(box.x1)}] y:[${fmt(box.y0)},${fmt(box.y1)}]`;
			return mark.tool === "rect" ? `${label}区域 ${region}` : `${label}笔迹 外接框 ${region}`;
		}
		/** 按创建顺序投影全部标记；退化标记跳过但编号位次保持。 */
		function projectMarks(marks, imageWidth, imageHeight) {
			const projections = [];
			marks.forEach((mark, index) => {
				const projection = projectMark(index + 1, mark, imageWidth, imageHeight);
				if (projection !== null) projections.push(projection);
			});
			return projections;
		}
		/**
		* 完整显示整张图所需比例：同时受可用宽高约束，小图不放大超过 100%。
		* 尺寸不可用时回退 100%，避免初次测量期间产生 0/NaN 画布。
		*/
		function fitZoom(imageWidth, imageHeight, viewportWidth, viewportHeight) {
			if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || !Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || imageWidth <= 0 || imageHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return 1;
			return Math.min(1, viewportWidth / imageWidth, viewportHeight / imageHeight);
		}
		/** 固定比例切换后保持同一图像位置位于视口中心，结果不允许出现负滚动量。 */
		function centeredScrollOffset(scrollOffset, viewportSize, fromZoom, toZoom) {
			if (!Number.isFinite(scrollOffset) || !Number.isFinite(viewportSize) || !Number.isFinite(fromZoom) || !Number.isFinite(toZoom) || viewportSize <= 0 || fromZoom <= 0 || toZoom <= 0) return Math.max(0, Number.isFinite(scrollOffset) ? scrollOffset : 0);
			const imageCenter = (scrollOffset + viewportSize / 2) / fromZoom;
			return Math.max(0, imageCenter * toZoom - viewportSize / 2);
		}
		/** 给定缩放档下的显示尺寸（CSS 像素）。 */
		function displaySize(imageWidth, imageHeight, zoom) {
			return {
				width: imageWidth * zoom,
				height: imageHeight * zoom
			};
		}
		/**
		* canvas 后备存储尺寸：CSS 尺寸 × devicePixelRatio，向上取整，
		* 避免高 DPI 下绘制边缘发虚。
		*/
		function backingSize(cssWidth, cssHeight, devicePixelRatio) {
			const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
			return {
				width: Math.ceil(cssWidth * ratio),
				height: Math.ceil(cssHeight * ratio)
			};
		}
		/**
		* 指针位置（相对显示区域左上角，CSS 像素）→ 原图像素坐标，钳在图像边界内。
		* 所有缩放模式共用同一映射：显示尺寸是原图的 zoom 倍，故除以 zoom。
		*/
		function pointerToImage(pointerX, pointerY, zoom, imageWidth, imageHeight) {
			return {
				x: Math.min(imageWidth, Math.max(0, pointerX / zoom)),
				y: Math.min(imageHeight, Math.max(0, pointerY / zoom))
			};
		}
		/**
		* 编号徽标绘制锚点（原图像素坐标）：默认落在包围盒左上角；
		* 靠近图像边缘时钳回图内，避免徽标溢出不可见。
		* @returns 锚点中心与建议绘制半径（随短边自适应）。
		*/
		function badgeAnchor(box, imageWidth, imageHeight) {
			const radius = Math.max(10, Math.round(Math.min(imageWidth, imageHeight) * .025));
			const rawX = box.x0 * imageWidth;
			const rawY = box.y0 * imageHeight;
			return {
				x: Math.min(Math.max(rawX, radius), imageWidth - radius),
				y: Math.min(Math.max(rawY, radius), imageHeight - radius),
				radius
			};
		}
		/**
		* 模型可见反馈消息模板（固定中文，不随 UI 语言切换）。
		* 参数用函数式替换插入：用户意见里的 $& / $` / $' 等组合在字符串
		* 替换串中会被当作模式解释，函数返回值则原样插入（延续 0.1.3 修复约定）。
		*/
		const ANNOTATION_FEEDBACK_TEMPLATE = "对 design/images/{name} 的标注反馈（{time}）：编号区域（归一化坐标）：{regions}。意见：{opinion}";
		/**
		* 标注反馈时间戳格式：固定 ISO 8601 UTC（与 history.jsonl 的 toISOString 口径一致）。
		* 模型可见文本禁止 toLocaleString 等随环境漂移的格式；会话消息本身时序有序，
		* 时间戳的真实价值是上下文压缩后仍可消歧多轮标注，不承担排序主键职责。
		*/
		function formatAnnotationTimestamp(time) {
			return time.toISOString();
		}
		/** 组装标注反馈消息：文件名 + 时间戳 + 编号投影 + 用户意见。 */
		function buildAnnotationFeedbackMessage(params) {
			const values = {
				name: params.name,
				time: formatAnnotationTimestamp(params.time),
				regions: params.projections.join("；"),
				opinion: params.opinion.trim()
			};
			let text = ANNOTATION_FEEDBACK_TEMPLATE;
			for (const [key, value] of Object.entries(values)) text = text.replaceAll(`{${key}}`, () => value);
			return text;
		}
		//#endregion
		//#region src/client/annotate-modal.tsx
		/**
		* 标注弹窗：点击卡片图片进入，在生成图上圈选修改区域（矩形/画笔/箭头，
		* 自动编号 ①②③），与文字意见一并提交。
		*
		* 叠层架构（提案 §4.3）：底图用 <img> 渲染（显示不需要像素），标注画在
		* 同尺寸透明 canvas 叠层上（纯几何）。提交时只发编号坐标文本 + 意见，
		* 不导出合成图（附件链路是 0.2.1 的叠加项）。
		* 组件保持纯展示：几何计算全部委托 ../annotation.js 纯函数，发送消息由
		* 父组件回调完成（slots 范式：组件不接触服务）。
		*/
		const COLOR_VALUES = {
			red: "#e53935",
			yellow: "#f9a825",
			blue: "#1e88e5"
		};
		/** 箭头头部两条短线的长度（CSS 像素）。 */
		const ARROW_HEAD = 12;
		const FIXED_ZOOM_LEVELS = [
			.5,
			1,
			1.5,
			2
		];
		const IMAGE_VIEWPORT_HORIZONTAL_PADDING = 32;
		const IMAGE_FIT_HEIGHT_VH = .52;
		const HIT_TOLERANCE_CSS_PX = 8;
		const PAN_CLICK_THRESHOLD_CSS_PX = 4;
		function drawArrowHead(ctx, fromX, fromY, toX, toY) {
			const angle = Math.atan2(toY - fromY, toX - fromX);
			for (const offset of [Math.PI / 6, -Math.PI / 6]) {
				ctx.moveTo(toX, toY);
				ctx.lineTo(toX - ARROW_HEAD * Math.cos(angle - offset), toY - ARROW_HEAD * Math.sin(angle - offset));
			}
		}
		/** 在叠层画一条标注 + 编号徽标（坐标由原图像素 × zoom 映射到 CSS 像素）。 */
		function drawMark(ctx, entry, index, zoom, imageWidth, imageHeight) {
			const { mark, color } = entry;
			ctx.strokeStyle = COLOR_VALUES[color];
			ctx.lineWidth = 3;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.beginPath();
			if (mark.tool === "rect") ctx.rect(mark.x * zoom, mark.y * zoom, mark.w * zoom, mark.h * zoom);
			else if (mark.tool === "arrow") {
				const [fx, fy] = mark.from;
				const [tx, ty] = mark.to;
				ctx.moveTo(fx * zoom, fy * zoom);
				ctx.lineTo(tx * zoom, ty * zoom);
				drawArrowHead(ctx, fx * zoom, fy * zoom, tx * zoom, ty * zoom);
			} else mark.points.forEach(([x, y], i) => {
				if (i === 0) ctx.moveTo(x * zoom, y * zoom);
				else ctx.lineTo(x * zoom, y * zoom);
			});
			ctx.stroke();
			const box = markBounds(mark, imageWidth, imageHeight);
			if (box === null) return;
			const anchor = badgeAnchor(box, imageWidth, imageHeight);
			const cx = anchor.x * zoom;
			const cy = anchor.y * zoom;
			const radius = Math.max(9, anchor.radius * zoom * .6);
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.fillStyle = COLOR_VALUES[color];
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillStyle = "#ffffff";
			ctx.font = `bold ${Math.max(10, Math.round(radius))}px system-ui, sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(String(index), cx, cy);
		}
		/** 选中态只增加虚线包围框，不覆盖标记自身颜色和编号。 */
		function drawSelection(ctx, mark, zoom, imageWidth, imageHeight) {
			const box = markBounds(mark, imageWidth, imageHeight);
			if (box === null) return;
			const padding = 6;
			const x = box.x0 * imageWidth * zoom;
			const y = box.y0 * imageHeight * zoom;
			const width = (box.x1 - box.x0) * imageWidth * zoom;
			const height = (box.y1 - box.y0) * imageHeight * zoom;
			ctx.save();
			ctx.setLineDash([6, 4]);
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#1677ff";
			ctx.strokeRect(x - padding, y - padding, width + 12, height + 12);
			ctx.restore();
		}
		/** 提交有效性门槛与退化：矩形宽高、箭头长度至少 4 原图像素，笔迹至少 2 点。 */
		function isCommitable(mark) {
			if (mark.tool === "rect") return mark.w >= 4 && mark.h >= 4;
			if (mark.tool === "arrow") {
				const dx = mark.to[0] - mark.from[0];
				const dy = mark.to[1] - mark.from[1];
				return Math.hypot(dx, dy) >= 4;
			}
			return mark.points.length >= 2;
		}
		function AnnotateModal({ name, cwd, t, onClose, onSubmit }) {
			const dialogRef = (0, react.useRef)(null);
			const containerRef = (0, react.useRef)(null);
			const canvasRef = (0, react.useRef)(null);
			const panRef = (0, react.useRef)(null);
			const [imageSize, setImageSize] = (0, react.useState)(null);
			const [imageFailed, setImageFailed] = (0, react.useState)(false);
			const [zoomMode, setZoomMode] = (0, react.useState)("fit");
			const [fitViewport, setFitViewport] = (0, react.useState)(null);
			const [tool, setTool] = (0, react.useState)("pan");
			const [color, setColor] = (0, react.useState)("red");
			const [marks, setMarks] = (0, react.useState)([]);
			const [undoStack, setUndoStack] = (0, react.useState)([]);
			const [selectedIndex, setSelectedIndex] = (0, react.useState)(null);
			const [panning, setPanning] = (0, react.useState)(false);
			const [draftMark, setDraftMark] = (0, react.useState)(null);
			const [opinion, setOpinion] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				dialogRef.current?.focus();
			}, []);
			(0, react.useEffect)(() => {
				if (imageSize === null) return void 0;
				const container = containerRef.current;
				if (container === null) return void 0;
				const update = () => {
					const width = container.clientWidth - IMAGE_VIEWPORT_HORIZONTAL_PADDING;
					const height = window.innerHeight * IMAGE_FIT_HEIGHT_VH;
					setFitViewport(width > 0 && height > 0 ? {
						width,
						height
					} : null);
				};
				update();
				window.addEventListener("resize", update);
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(() => update());
				observer?.observe(container);
				return () => {
					window.removeEventListener("resize", update);
					observer?.disconnect();
				};
			}, [imageSize]);
			const zoom = zoomMode === "fit" && imageSize !== null && fitViewport !== null ? fitZoom(imageSize.w, imageSize.h, fitViewport.width, fitViewport.height) : zoomMode === "fit" ? 1 : zoomMode;
			const applyMarks = (next) => {
				setUndoStack((previous) => [...previous, marks].slice(-50));
				setMarks(next);
				setSelectedIndex(null);
			};
			const undoMarks = () => {
				const previous = undoStack[undoStack.length - 1];
				if (previous === void 0) return;
				setMarks(previous);
				setUndoStack((history) => history.slice(0, -1));
				setSelectedIndex(null);
			};
			const deleteSelected = () => {
				if (selectedIndex === null || marks[selectedIndex] === void 0) return;
				applyMarks(marks.filter((_, index) => index !== selectedIndex));
			};
			const onKeyDown = (event) => {
				if (event.key === "Delete" || event.key === "Backspace") {
					if (event.target === canvasRef.current && selectedIndex !== null) {
						event.preventDefault();
						deleteSelected();
					}
					return;
				}
				if (event.key === "Escape") {
					event.stopPropagation();
					onClose();
					return;
				}
				if (event.key !== "Tab") return;
				const root = dialogRef.current;
				if (root === null) return;
				const focusables = Array.from(root.querySelectorAll("button, [href], textarea, select, input, [tabindex]:not([tabindex=\"-1\"])")).filter((el) => !el.hasAttribute("disabled"));
				if (focusables.length === 0) return;
				const first = focusables[0];
				const last = focusables[focusables.length - 1];
				const active = document.activeElement;
				if (event.shiftKey && active === first) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && (active === last || active === root)) {
					event.preventDefault();
					first.focus();
				}
			};
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (canvas === null || imageSize === null) return;
				const dpr = window.devicePixelRatio || 1;
				const disp = displaySize(imageSize.w, imageSize.h, zoom);
				const back = backingSize(disp.width, disp.height, dpr);
				if (canvas.width !== back.width) canvas.width = back.width;
				if (canvas.height !== back.height) canvas.height = back.height;
				const ctx = canvas.getContext("2d");
				if (ctx === null) return;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				ctx.clearRect(0, 0, disp.width, disp.height);
				(draftMark === null ? marks : [...marks, {
					mark: draftMark,
					color
				}]).forEach((entry, index) => {
					drawMark(ctx, entry, index + 1, zoom, imageSize.w, imageSize.h);
				});
				if (selectedIndex !== null && marks[selectedIndex] !== void 0) drawSelection(ctx, marks[selectedIndex].mark, zoom, imageSize.w, imageSize.h);
			}, [
				marks,
				draftMark,
				zoom,
				imageSize,
				color,
				selectedIndex
			]);
			if (imageFailed) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("annotate.title"),
				ref: dialogRef,
				tabIndex: -1,
				onKeyDown,
				style: overlayStyle,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: panelStyle,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: 16,
							fontSize: 13,
							color: "var(--dsw-alias-label-primary)"
						},
						children: t("annotate.imageLoadFailed")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							justifyContent: "flex-end",
							padding: "0 16px 16px"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							onClick: onClose,
							children: t("annotate.cancel")
						})
					})]
				})
			});
			const pointOf = (event) => {
				if (imageSize === null) return {
					x: 0,
					y: 0
				};
				const rect = event.currentTarget.getBoundingClientRect();
				return pointerToImage(event.clientX - rect.left, event.clientY - rect.top, zoom, imageSize.w, imageSize.h);
			};
			const onPointerDown = (event) => {
				if (imageSize === null) return;
				event.currentTarget.focus();
				event.currentTarget.setPointerCapture(event.pointerId);
				if (tool === "pan") {
					const container = containerRef.current;
					if (container === null) return;
					panRef.current = {
						pointerId: event.pointerId,
						startX: event.clientX,
						startY: event.clientY,
						startScrollLeft: container.scrollLeft,
						startScrollTop: container.scrollTop,
						moved: false
					};
					setPanning(true);
					return;
				}
				setSelectedIndex(null);
				const p = pointOf(event);
				if (tool === "rect") setDraftMark({
					tool: "rect",
					x: p.x,
					y: p.y,
					w: 0,
					h: 0
				});
				else if (tool === "arrow") setDraftMark({
					tool: "arrow",
					from: [p.x, p.y],
					to: [p.x, p.y]
				});
				else setDraftMark({
					tool: "brush",
					points: [[p.x, p.y]]
				});
			};
			const onPointerMove = (event) => {
				if (tool === "pan" && panRef.current !== null) {
					const container = containerRef.current;
					if (container === null) return;
					const dx = event.clientX - panRef.current.startX;
					const dy = event.clientY - panRef.current.startY;
					if (Math.hypot(dx, dy) >= PAN_CLICK_THRESHOLD_CSS_PX) panRef.current.moved = true;
					container.scrollLeft = panRef.current.startScrollLeft - dx;
					container.scrollTop = panRef.current.startScrollTop - dy;
					return;
				}
				if (draftMark === null || imageSize === null) return;
				const p = pointOf(event);
				if (draftMark.tool === "rect") {
					const x0 = Math.min(draftMark.x, p.x);
					const y0 = Math.min(draftMark.y, p.y);
					setDraftMark({
						tool: "rect",
						x: x0,
						y: y0,
						w: Math.abs(p.x - draftMark.x),
						h: Math.abs(p.y - draftMark.y)
					});
				} else if (draftMark.tool === "arrow") setDraftMark({
					...draftMark,
					to: [p.x, p.y]
				});
				else {
					const last = draftMark.points[draftMark.points.length - 1];
					if (last !== void 0 && Math.hypot(p.x - last[0], p.y - last[1]) < 2) return;
					setDraftMark({
						...draftMark,
						points: [...draftMark.points, [p.x, p.y]]
					});
				}
			};
			const onPointerUp = (event) => {
				if (tool === "pan") {
					const gesture = panRef.current;
					panRef.current = null;
					setPanning(false);
					if (gesture !== null && !gesture.moved && imageSize !== null) {
						const point = pointOf(event);
						setSelectedIndex(findTopmostMark(marks.map((entry) => entry.mark), point, HIT_TOLERANCE_CSS_PX / zoom));
					}
					return;
				}
				if (draftMark === null) return;
				if (isCommitable(draftMark)) applyMarks([...marks, {
					mark: draftMark,
					color
				}]);
				setDraftMark(null);
			};
			const onPointerCancel = () => {
				panRef.current = null;
				setPanning(false);
				setDraftMark(null);
			};
			const changeZoom = (next) => {
				const container = containerRef.current;
				const nextZoom = next === "fit" && imageSize !== null && fitViewport !== null ? fitZoom(imageSize.w, imageSize.h, fitViewport.width, fitViewport.height) : next === "fit" ? 1 : next;
				if (container !== null && container.clientWidth > 0 && container.clientHeight > 0) requestAnimationFrame(() => {
					if (next === "fit") {
						container.scrollLeft = 0;
						container.scrollTop = 0;
						return;
					}
					if (zoomMode === "fit" && imageSize !== null) {
						container.scrollLeft = Math.max(0, (imageSize.w * nextZoom - container.clientWidth) / 2);
						container.scrollTop = Math.max(0, (imageSize.h * nextZoom - container.clientHeight) / 2);
						return;
					}
					container.scrollLeft = centeredScrollOffset(container.scrollLeft, container.clientWidth, zoom, nextZoom);
					container.scrollTop = centeredScrollOffset(container.scrollTop, container.clientHeight, zoom, nextZoom);
				});
				setZoomMode(next);
			};
			const submit = () => {
				if (opinion.trim() === "" || imageSize === null) return;
				onSubmit(opinion, marks.map((entry) => entry.mark), imageSize.w, imageSize.h);
			};
			const disp = imageSize === null ? null : displaySize(imageSize.w, imageSize.h, zoom);
			const modeHint = tool === "pan" ? t("annotate.hintPan") : t("annotate.hintDraw", { tool: t(tool === "rect" ? "annotate.toolRect" : tool === "brush" ? "annotate.toolBrush" : "annotate.toolArrow") });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("annotate.title"),
				ref: dialogRef,
				tabIndex: -1,
				onKeyDown,
				style: overlayStyle,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: panelStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								alignItems: "center",
								gap: 8,
								padding: "12px 16px",
								borderBottom: "1px solid var(--dsw-alias-border-l2)"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										fontSize: 13,
										color: "var(--dsw-alias-label-primary)"
									},
									children: t("annotate.title")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										color: "var(--dsw-alias-label-tertiary)"
									},
									children: name
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
								[
									"pan",
									"rect",
									"brush",
									"arrow"
								].map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: tool === item ? "primary" : "ghost",
									size: "sm",
									"aria-pressed": tool === item,
									onClick: () => {
										setTool(item);
										if (item !== "pan") setSelectedIndex(null);
									},
									children: t(item === "pan" ? "annotate.toolPan" : item === "rect" ? "annotate.toolRect" : item === "brush" ? "annotate.toolBrush" : "annotate.toolArrow")
								}, item)),
								Object.keys(COLOR_VALUES).map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": t("annotate.color"),
									"aria-pressed": color === item,
									onClick: () => setColor(item),
									style: {
										width: 20,
										height: 20,
										borderRadius: 999,
										background: COLOR_VALUES[item],
										border: color === item ? "2px solid var(--dsw-alias-brand-primary)" : "2px solid transparent",
										cursor: "pointer",
										padding: 0
									}
								}, item)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: undoStack.length === 0,
									onClick: undoMarks,
									children: t("annotate.undo")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: marks.length === 0,
									onClick: () => applyMarks([]),
									children: t("annotate.clear")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									"aria-label": t("annotate.zoomLabel"),
									title: t("annotate.zoomLabel"),
									value: String(zoomMode),
									disabled: imageSize === null,
									onChange: (event) => {
										const value = event.target.value;
										const next = value === "fit" ? "fit" : FIXED_ZOOM_LEVELS.find((level) => String(level) === value);
										if (next !== void 0) changeZoom(next);
									},
									style: {
										height: 28,
										minWidth: 104,
										padding: "0 8px",
										borderRadius: 6,
										border: "1px solid var(--dsw-alias-border-l2)",
										background: "var(--dsw-alias-bg-layer-2)",
										color: "var(--dsw-alias-label-primary)",
										fontSize: 12
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "fit",
										children: t("annotate.zoomFit")
									}), FIXED_ZOOM_LEVELS.map((level) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
										value: String(level),
										children: [Math.round(level * 100), "%"]
									}, level))]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "minmax(0, 1fr) auto",
								alignItems: "center",
								columnGap: 8,
								boxSizing: "border-box",
								height: 44,
								padding: "8px 16px",
								fontSize: 12,
								color: "var(--dsw-alias-label-secondary)"
							},
							children: [tool === "pan" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: modeHint,
								style: {
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: modeHint
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								role: "note",
								style: {
									display: "inline-flex",
									gridColumn: "1 / -1",
									alignItems: "center",
									gap: 4,
									boxSizing: "border-box",
									minWidth: 0,
									height: 28,
									padding: "3px 8px",
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-state-warn-primary)",
									background: "var(--dsw-alias-bg-layer-2)",
									color: "var(--dsw-alias-label-secondary)"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										display: "inline-flex",
										color: "var(--dsw-alias-state-warn-primary)"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 16 })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									title: modeHint,
									style: {
										minWidth: 0,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: modeHint
								})]
							}), selectedIndex !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexWrap: "nowrap",
									alignItems: "center",
									gap: 4,
									height: 28,
									whiteSpace: "nowrap"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "status",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
											active: true,
											children: t("annotate.selectedMark", { n: numberLabel(selectedIndex + 1) })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 16 }),
										"aria-label": t("annotate.deleteSelectedLabel", { n: numberLabel(selectedIndex + 1) }),
										onClick: deleteSelected,
										style: { color: "var(--dsw-alias-state-error-primary)" },
										children: t("annotate.deleteSelected")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("kbd", {
										title: t("annotate.deleteShortcut"),
										style: {
											minWidth: 42,
											padding: "0 6px",
											border: "1px solid var(--dsw-alias-border-l2)",
											borderRadius: 4,
											background: "var(--dsw-alias-bg-layer-2)",
											color: "var(--dsw-alias-label-tertiary)",
											fontFamily: "inherit",
											fontSize: 11,
											lineHeight: "20px",
											textAlign: "center"
										},
										children: t("annotate.deleteShortcut")
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: containerRef,
							style: {
								overflow: "auto",
								padding: 16,
								background: "var(--dsw-alias-bg-layer-3)",
								minHeight: 200,
								maxHeight: "60vh"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									position: "relative",
									display: "block",
									width: disp?.width,
									height: disp?.height,
									marginInline: disp !== null && fitViewport !== null && disp.width <= fitViewport.width ? "auto" : 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									src: imageUrl(name, cwd),
									alt: name,
									onLoad: (event) => setImageSize({
										w: event.currentTarget.naturalWidth,
										h: event.currentTarget.naturalHeight
									}),
									onError: () => setImageFailed(true),
									style: imageSize === null || disp === null ? {
										display: "block",
										maxWidth: "78vw",
										maxHeight: "52vh"
									} : {
										display: "block",
										width: disp.width,
										height: disp.height
									}
								}), imageSize !== null && disp !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
									ref: canvasRef,
									tabIndex: 0,
									"aria-label": t("annotate.canvasLabel"),
									onPointerDown,
									onPointerMove,
									onPointerUp,
									onPointerCancel,
									style: {
										position: "absolute",
										inset: 0,
										width: disp.width,
										height: disp.height,
										touchAction: "none",
										cursor: tool === "pan" ? panning ? "grabbing" : "grab" : "crosshair"
									}
								})]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 8,
								padding: 16
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								value: opinion,
								onChange: (event) => setOpinion(event.target.value),
								placeholder: t("card.feedbackPlaceholder"),
								rows: 2,
								"aria-label": t("card.feedbackPlaceholder"),
								style: {
									resize: "vertical",
									padding: "6px 12px",
									border: "1px solid var(--dsw-alias-border-l2)",
									borderRadius: 8,
									background: "var(--dsw-alias-bg-layer-3)",
									font: "inherit",
									fontSize: 13,
									lineHeight: "20px",
									color: "var(--dsw-alias-label-primary)"
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 8
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: opinion.trim() === "" || imageSize === null,
										onClick: submit,
										children: t("card.feedbackSubmit")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onClick: onClose,
										children: t("annotate.cancel")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										href: imageUrl(name, cwd),
										target: "_blank",
										rel: "noreferrer",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											children: t("card.openOriginal")
										})
									})
								]
							})]
						})
					]
				})
			});
		}
		const overlayStyle = {
			position: "fixed",
			inset: 0,
			zIndex: 1e3,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			background: "rgba(0, 0, 0, 0.45)"
		};
		const panelStyle = {
			display: "flex",
			flexDirection: "column",
			width: "min(960px, 92vw)",
			maxHeight: "92vh",
			borderRadius: 12,
			background: "var(--dsw-alias-bg-layer-1)",
			border: "1px solid var(--dsw-alias-border-l2)",
			boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
			outline: "none",
			overflow: "hidden"
		};
		//#endregion
		//#region src/client/locales.ts
		/** ui_mockup 客户端 UI 文案（双语，跟随 DSH 语言切换）：工具卡片 + 设置面板。 */
		const NS = "ui-mockup";
		/** 简体中文 UI 文案。 */
		const zh = {
			"card.generating": "生成中…",
			"card.generatingSeconds": "生成中 · 已耗时 {n} 秒",
			"card.generatingMinutes": "生成中 · 已耗时 {m} 分 {s} 秒",
			"card.confirm": "确认采用这版",
			"card.select": "选用第 {n} 版",
			"card.selectPlaceholder": "选用某一版…",
			"card.openOriginal": "打开原图",
			"card.feedback": "提交修改意见",
			"card.feedbackPlaceholder": "描述要修改的地方…",
			"card.feedbackSubmit": "提交并重新生成",
			"card.feedbackCancel": "取消",
			"card.confirmMessage": "确认采用这版设计（文件：{name}）",
			"card.selectMessage": "选用第 {n} 版（文件：{name}）",
			"card.feedbackMessage": "{opinion}（基于文件：{name}，请按此意见重新生成）",
			"card.setAnchor": "设为风格锚点：此后未显式传参考图的生成将自动引用这张图保持风格一致",
			"card.setAnchorButton": "设为锚点",
			"card.setAnchorSelect": "设为锚点某一版…",
			"card.setAnchorOption": "第 {n} 版",
			"card.anchored": "风格锚点",
			"card.annotateHint": "点击放大并圈选标注要修改的区域",
			"card.refine": "按这版精修",
			"card.refineMessage": "请按 design/images/{name} 这一版方向精修：复用该方向稿原 description，调用 ui_mockup 时使用 fidelity=high-fidelity，并省略 fastPreview、reference、baseImage、editNote；文件名只用于识别方向，不作为 reference/baseImage 参数。",
			"annotate.title": "标注修改区域",
			"annotate.hintPan": "拖动画布可移动图片；单击已有标记可选择。",
			"annotate.hintDraw": "当前为{tool}工具。要选择或删除标记，请切换到「选择/移动」。",
			"annotate.toolPan": "选择/移动",
			"annotate.toolRect": "矩形",
			"annotate.toolBrush": "画笔",
			"annotate.toolArrow": "箭头",
			"annotate.color": "标注颜色",
			"annotate.undo": "撤销",
			"annotate.clear": "清空",
			"annotate.zoomLabel": "缩放比例",
			"annotate.zoomFit": "适合窗口",
			"annotate.canvasLabel": "标注画布：选择/移动工具可拖动图片、单击已有标记进行选择，按 Delete 删除",
			"annotate.selectedMark": "已选中标记 {n}",
			"annotate.deleteSelected": "删除",
			"annotate.deleteSelectedLabel": "删除选中标记 {n}",
			"annotate.deleteShortcut": "Delete",
			"annotate.cancel": "取消",
			"annotate.imageLoadFailed": "图片加载失败，无法标注。",
			"panel.models.draft": "方向稿模型（fastPreview）",
			"panel.history.draftOnly": "只看方向稿",
			"panel.history.draftTag": "方向稿",
			"panel.nav": "UI 草图",
			"panel.tab.overview": "概览",
			"panel.tab.provider": "提供方与模型",
			"panel.tab.preferences": "生成偏好",
			"panel.tab.history": "生成历史",
			"panel.loading": "加载中…",
			"panel.loadFailed": "加载失败: {error}",
			"panel.readonlyBanner": "当前连接的设置存储为进程内模式或只读，偏好修改不会持久保存。",
			"panel.testConnection": "测试连接",
			"panel.testing": "测试中…",
			"panel.overview.intro": "在研讨阶段生成 UI 线框图 / 高保真设计稿：先看图确认方向，再写实现代码，避免做完才发现界面不符合预期。",
			"panel.overview.quickTitle": "快速使用",
			"panel.overview.step1Title": "何时触发",
			"panel.overview.step1Body": "需求研讨中助手会主动提议出草图，也可以直接说「出个草图」。",
			"panel.overview.step2Title": "如何反馈",
			"panel.overview.step2Body": "点击生成图可放大并圈选标注要修改的区域；也可以在图片下方点「确认采用 / 选用第 N 版 / 提交修改意见」，或直接打字说。",
			"panel.overview.step3Title": "如何锁定",
			"panel.overview.step3Body": "确认后自动提炼进 design/spec.md，无需手动操作。",
			"panel.overview.statusLine": "当前提供方:{provider} · {credential}",
			"panel.provider.title": "提供方",
			"panel.provider.description": "选择用于生成 UI 草图的图像服务",
			"panel.provider.current": "当前使用",
			"panel.provider.dashscopeName": "阿里云百炼 DashScope",
			"panel.provider.volcengineName": "火山方舟 Volcengine",
			"panel.provider.openaiCompatName": "OpenAI 兼容网关",
			"panel.provider.unknown": "未挂载图像提供方",
			"panel.provider.fallbackActive": "默认生效（DashScope）",
			"panel.provider.unknownHint": "面板暂时读不到提供方状态（宿主可能仍是旧版本，请重启 DSH 后再试）；已按安装默认显示为 DashScope 生效。",
			"panel.provider.volcengineDisabled": "已安装未启用。点击本卡片即可切换——插件会改写 DSH 用户层 patch，组合热重载后立即生效。",
			"panel.provider.inactive": "未启用",
			"panel.provider.modelsReset": "已随切换把模型分层默认重置为「跟随提供方默认」——旧提供方的模型 ID 对新提供方无效。",
			"panel.provider.switchPending": "提供方切换尚未完成；请稍后重试，或检查 DSH 配置与日志。",
			"panel.connection.title": "连接设置",
			"panel.connection.readyStatus": "连接就绪",
			"panel.connection.incompleteStatus": "待完成配置",
			"panel.connection.checkingStatus": "正在检查配置",
			"panel.connection.baseUrlShortLabel": "网关地址",
			"panel.connection.apiKeyLabel": "API 密钥",
			"panel.connection.moreMethods": "其他配置方式",
			"panel.action.save": "保存",
			"panel.connection.baseUrlLabel": "网关地址 baseUrl",
			"panel.connection.baseUrlPlaceholder": "https://你的网关地址/v1",
			"panel.connection.baseUrlHint": "通常以 /v1 结尾；保存后几秒内生效。留空表示未配置。",
			"panel.connection.save": "保存网关地址",
			"panel.connection.saved": "网关地址已保存并生效 ✓",
			"panel.connection.pending": "网关地址已写入，热重载落位确认超时；稍后重试或检查 DSH 配置与日志。",
			"panel.connection.invalid": "地址必须以 http:// 或 https:// 开头（通常以 /v1 结尾）。",
			"panel.credential.title": "凭据（{credential}）",
			"panel.credential.ready": "凭据已配置",
			"panel.credential.missing": "未配置 {credential}",
			"panel.credential.checking": "检测中…",
			"panel.credential.howTitle": "配置方式（按读取优先级排序, 任选其一即可）:",
			"panel.credential.way1": "进程环境变量: 启动 DSH 前执行 export {credential}=sk-xxx（CI/容器同理）",
			"panel.credential.way2": "DSH 密钥存储: ~/.dsh/.credentials.yaml（可在本页下方直接写入，或在 DSH 设置 · 模型页写入）",
			"panel.credential.way3": "项目 .env: 在启动目录（通常是项目根）的 .env 文件中写 {credential}=sk-xxx",
			"panel.credential.way4": "DSH 主目录 .env: ~/.dsh/.env 中写 {credential}=sk-xxx",
			"panel.credential.readyWithSource": "凭据已配置 · 来源: {source}",
			"panel.credential.keyInputLabel": "{credential} 密钥",
			"panel.credential.source.env": "进程环境变量",
			"panel.credential.source.file": "DSH 密钥存储（~/.dsh/.credentials.yaml）",
			"panel.credential.source.project-env": "项目 .env",
			"panel.credential.source.user-env": "~/.dsh/.env",
			"panel.credential.source.ambient": "启动环境",
			"panel.credential.writePlaceholder": "输入 {credential}",
			"panel.credential.save": "保存（覆盖）",
			"panel.credential.clear": "清除已存密钥",
			"panel.credential.savedNotice": "已写入 DSH 密钥存储 ✓",
			"panel.credential.clearedNotice": "已清除 DSH 密钥存储中的 {credential} ✓",
			"panel.credential.notWritable": "当前密钥由更高优先级的来源（{source}）提供，面板写入不会生效；如需在面板管理，请先移除该来源中的同名变量。",
			"panel.test.ok": "凭据有效：鉴权通过，网关可达。",
			"panel.test.missingKey": "未找到 {credential}——请按上方「配置方式」任选其一配置后重试。",
			"panel.test.invalidKey": "网关拒绝了这把密钥（鉴权未通过）——请确认 {credential} 是否正确、是否已过期。",
			"panel.test.gatewayFail": "网关不可达: {detail}",
			"panel.test.unknown": "探测结果无法判定（{detail}）——网关行为有变化，请直接生成一张草图验证。",
			"panel.models.title": "模型分层默认",
			"panel.models.description": "留空时跟随提供方默认",
			"panel.models.recommended": "推荐：{models}",
			"panel.models.wireframe": "线框图",
			"panel.models.highFidelity": "高保真",
			"panel.models.draftShort": "方向稿",
			"panel.models.followDefault": "跟随提供方默认",
			"panel.models.options": "{label}候选",
			"panel.prefs.fidelity": "保真度偏好",
			"panel.prefs.fidelityWireframe": "线框图",
			"panel.prefs.fidelityHigh": "高保真",
			"panel.prefs.platform": "目标平台",
			"panel.prefs.count": "一次生成数量",
			"panel.prefs.pollTimeout": "轮询超时",
			"panel.prefs.minutes": "分钟",
			"panel.prefs.backoff": "限流退避策略",
			"panel.prefs.backoffFixed": "25 秒 × 2 次(自动)",
			"panel.prefs.size": "默认尺寸",
			"panel.prefs.reset": "恢复默认",
			"panel.prefs.save": "保存",
			"panel.prefs.saved": "已保存 ✓",
			"panel.prefs.writeNotApplied": "设置存储未确认本次更改，请重试。",
			"panel.prefs.writeNotAppliedField": "「{field}」未写入设置存储，保存已中止；之前的字段可能已落盘，请核对后重试。",
			"panel.history.search": "搜索",
			"panel.history.searchLabel": "搜索生成历史",
			"panel.history.searchPlaceholder": "按描述搜索…",
			"panel.history.pendingSearch": "搜索条件已更改，点击“搜索”更新结果。",
			"panel.history.clear": "清空历史",
			"panel.history.confirmClear": "确认清空?",
			"panel.history.cancelClear": "取消",
			"panel.history.empty": "暂无生成历史; 出一张草图试试。",
			"panel.history.setAnchor": "设为锚点",
			"panel.history.unsetAnchor": "解除锚点",
			"panel.history.anchorTag": "风格锚点",
			"panel.history.anchorHint": "设为锚点后, 调用 ui_mockup 未显式传 reference 时会自动引用该图保持多页风格一致。",
			"panel.history.prev": "上一页",
			"panel.history.next": "下一页",
			"panel.history.totalCount": "共 {n} 条",
			"panel.history.anchorOnPage": "风格锚点在第 {n} 页",
			"panel.history.goToAnchor": "前往",
			"panel.history.fileCount": "{n} 张图"
		};
		/** English UI copy. */
		const en = {
			"card.generating": "Generating…",
			"card.generatingSeconds": "Generating · {n}s elapsed",
			"card.generatingMinutes": "Generating · {m}m {s}s elapsed",
			"card.confirm": "Confirm this version",
			"card.select": "Use version {n}",
			"card.selectPlaceholder": "Pick a version…",
			"card.openOriginal": "Open original",
			"card.feedback": "Submit feedback",
			"card.feedbackPlaceholder": "Describe what to change…",
			"card.feedbackSubmit": "Submit & regenerate",
			"card.feedbackCancel": "Cancel",
			"card.confirmMessage": "Confirm this design (file: {name})",
			"card.selectMessage": "Use version {n} (file: {name})",
			"card.feedbackMessage": "{opinion} (based on file: {name}, regenerate accordingly)",
			"card.setAnchor": "Set as style anchor: subsequent generations without an explicit reference will reuse this image for consistent style",
			"card.setAnchorButton": "Set as anchor",
			"card.setAnchorSelect": "Set a version as anchor…",
			"card.setAnchorOption": "Version {n}",
			"card.anchored": "Style anchor",
			"card.annotateHint": "Click to zoom in and mark the regions to change",
			"card.refine": "Refine this direction",
			"card.refineMessage": "请按 design/images/{name} 这一版方向精修：复用该方向稿原 description，调用 ui_mockup 时使用 fidelity=high-fidelity，并省略 fastPreview、reference、baseImage、editNote；文件名只用于识别方向，不作为 reference/baseImage 参数。",
			"annotate.title": "Mark regions to change",
			"annotate.hintPan": "Drag to move the image; click an existing mark to select it.",
			"annotate.hintDraw": "Current tool: {tool}. To select or delete a mark, switch to Select / Move.",
			"annotate.toolPan": "Select / Move",
			"annotate.toolRect": "Rectangle",
			"annotate.toolBrush": "Brush",
			"annotate.toolArrow": "Arrow",
			"annotate.color": "Mark color",
			"annotate.undo": "Undo",
			"annotate.clear": "Clear",
			"annotate.zoomLabel": "Zoom level",
			"annotate.zoomFit": "Fit to window",
			"annotate.canvasLabel": "Annotation canvas: Select / Move drags the image and selects existing marks; press Delete to remove one",
			"annotate.selectedMark": "Mark {n} selected",
			"annotate.deleteSelected": "Delete",
			"annotate.deleteSelectedLabel": "Delete selected mark {n}",
			"annotate.deleteShortcut": "Delete",
			"annotate.cancel": "Cancel",
			"annotate.imageLoadFailed": "Failed to load the image; annotation unavailable.",
			"panel.models.draft": "Direction-draft model (fastPreview)",
			"panel.history.draftOnly": "Drafts only",
			"panel.history.draftTag": "Direction draft",
			"panel.nav": "UI Mockups",
			"panel.tab.overview": "Overview",
			"panel.tab.provider": "Provider & models",
			"panel.tab.preferences": "Preferences",
			"panel.tab.history": "History",
			"panel.loading": "Loading…",
			"panel.loadFailed": "Failed to load: {error}",
			"panel.readonlyBanner": "This connection uses in-process or read-only settings storage; preference changes will not persist.",
			"panel.testConnection": "Test connection",
			"panel.testing": "Testing…",
			"panel.overview.intro": "Generate wireframes / high-fidelity mockups during discussion: confirm direction from the picture before writing code.",
			"panel.overview.quickTitle": "Quick start",
			"panel.overview.step1Title": "When to trigger",
			"panel.overview.step1Body": "The agent offers a sketch during requirement talks; you can also just say \"sketch this\".",
			"panel.overview.step2Title": "How to give feedback",
			"panel.overview.step2Body": "Click a generated image to zoom in and mark regions to change; or click \"confirm / use version N / submit feedback\" under the image, or type it directly.",
			"panel.overview.step3Title": "How to lock it in",
			"panel.overview.step3Body": "On confirmation the design is distilled into design/spec.md automatically.",
			"panel.overview.statusLine": "Provider: {provider} · {credential}",
			"panel.provider.title": "Provider",
			"panel.provider.description": "Choose the image service used to generate UI mockups",
			"panel.provider.current": "In use",
			"panel.provider.dashscopeName": "Alibaba DashScope",
			"panel.provider.volcengineName": "Volcengine Ark",
			"panel.provider.openaiCompatName": "OpenAI-compatible gateway",
			"panel.provider.unknown": "No image provider mounted",
			"panel.provider.fallbackActive": "Active by default (DashScope)",
			"panel.provider.unknownHint": "The panel cannot read the provider status right now (the host may still be an older build; restart DSH and retry). Shown as DashScope active per the install default.",
			"panel.provider.volcengineDisabled": "Installed but disabled. Click this card to switch — the plugin rewrites the home user patch layer and DSH hot-reloads the composition.",
			"panel.provider.inactive": "Disabled",
			"panel.provider.modelsReset": "Model defaults were reset to 'follow provider default' on switch — the previous provider's model IDs are not valid here.",
			"panel.provider.switchPending": "Provider switching has not completed. Retry shortly, or check the DSH configuration and logs.",
			"panel.connection.title": "Connection settings",
			"panel.connection.readyStatus": "Connection ready",
			"panel.connection.incompleteStatus": "Setup required",
			"panel.connection.checkingStatus": "Checking configuration",
			"panel.connection.baseUrlShortLabel": "Gateway URL",
			"panel.connection.apiKeyLabel": "API key",
			"panel.connection.moreMethods": "Other configuration methods",
			"panel.action.save": "Save",
			"panel.connection.baseUrlLabel": "Gateway URL (baseUrl)",
			"panel.connection.baseUrlPlaceholder": "https://your-gateway/v1",
			"panel.connection.baseUrlHint": "Usually ends with /v1; changes take effect within seconds. Empty means unconfigured.",
			"panel.connection.save": "Save gateway URL",
			"panel.connection.saved": "Gateway URL saved and active ✓",
			"panel.connection.pending": "Gateway URL written, but hot-reload settlement timed out; retry shortly or check the DSH configuration and logs.",
			"panel.connection.invalid": "The URL must start with http:// or https:// (usually ending with /v1).",
			"panel.credential.title": "Credentials ({credential})",
			"panel.credential.ready": "API key configured",
			"panel.credential.missing": "{credential} not configured",
			"panel.credential.checking": "Checking…",
			"panel.credential.howTitle": "How to configure (checked in this order; any one is enough):",
			"panel.credential.way1": "Process environment: export {credential}=sk-xxx before launching DSH (same for CI/containers)",
			"panel.credential.way2": "DSH credential store: ~/.dsh/.credentials.yaml (written from DSH Settings · Models)",
			"panel.credential.way3": "Project .env: add {credential}=sk-xxx to the .env in the launch directory (usually the project root)",
			"panel.credential.way4": "DSH home .env: add {credential}=sk-xxx to ~/.dsh/.env",
			"panel.credential.readyWithSource": "API key configured · source: {source}",
			"panel.credential.keyInputLabel": "{credential} key",
			"panel.credential.source.env": "process environment",
			"panel.credential.source.file": "DSH credential store (~/.dsh/.credentials.yaml)",
			"panel.credential.source.project-env": "project .env",
			"panel.credential.source.user-env": "~/.dsh/.env",
			"panel.credential.source.ambient": "launch environment",
			"panel.credential.writePlaceholder": "Enter {credential}",
			"panel.credential.save": "Save (overwrite)",
			"panel.credential.clear": "Clear stored key",
			"panel.credential.savedNotice": "Written to the DSH credential store ✓",
			"panel.credential.clearedNotice": "{credential} removed from the DSH credential store ✓",
			"panel.credential.notWritable": "The key is currently supplied by a higher-priority source ({source}); panel writes would not take effect. Remove that variable first to manage it here.",
			"panel.test.ok": "Credential valid: authentication passed, gateway reachable.",
			"panel.test.missingKey": "{credential} not found — configure it via any option above, then retry.",
			"panel.test.invalidKey": "The gateway rejected this key (authentication failed) — check that {credential} is correct and not expired.",
			"panel.test.gatewayFail": "Gateway unreachable: {detail}",
			"panel.test.unknown": "Probe result inconclusive ({detail}) — gateway behavior may have changed; verify by generating a sketch.",
			"panel.models.title": "Model defaults by fidelity",
			"panel.models.description": "Leave empty to follow the provider default",
			"panel.models.recommended": "Recommended: {models}",
			"panel.models.wireframe": "Wireframe",
			"panel.models.highFidelity": "High fidelity",
			"panel.models.draftShort": "Draft",
			"panel.models.followDefault": "Follow provider default",
			"panel.models.options": "{label} suggestions",
			"panel.prefs.fidelity": "Fidelity preference",
			"panel.prefs.fidelityWireframe": "Wireframe",
			"panel.prefs.fidelityHigh": "High fidelity",
			"panel.prefs.platform": "Target platform",
			"panel.prefs.count": "Images per request",
			"panel.prefs.pollTimeout": "Polling timeout",
			"panel.prefs.minutes": "minutes",
			"panel.prefs.backoff": "Rate-limit backoff",
			"panel.prefs.backoffFixed": "25s × 2 (automatic)",
			"panel.prefs.size": "Default size",
			"panel.prefs.reset": "Reset to defaults",
			"panel.prefs.save": "Save",
			"panel.prefs.saved": "Saved ✓",
			"panel.prefs.writeNotApplied": "The settings store did not confirm this change. Please retry.",
			"panel.prefs.writeNotAppliedField": "\"{field}\" was not confirmed by the settings store; saving stopped. Earlier fields may already be applied — please verify and retry.",
			"panel.history.search": "Search",
			"panel.history.searchLabel": "Search generation history",
			"panel.history.searchPlaceholder": "Search by description…",
			"panel.history.pendingSearch": "Search criteria changed. Select Search to update the results.",
			"panel.history.clear": "Clear history",
			"panel.history.confirmClear": "Confirm clear?",
			"panel.history.cancelClear": "Cancel",
			"panel.history.empty": "No generations yet; ask for a sketch to get started.",
			"panel.history.setAnchor": "Set as anchor",
			"panel.history.unsetAnchor": "Unset anchor",
			"panel.history.anchorTag": "Style anchor",
			"panel.history.anchorHint": "Once set, ui_mockup calls without an explicit reference automatically reuse this image for consistent style.",
			"panel.history.prev": "Previous",
			"panel.history.next": "Next",
			"panel.history.totalCount": "{n} entries",
			"panel.history.anchorOnPage": "Style anchor on page {n}",
			"panel.history.goToAnchor": "Go to anchor",
			"panel.history.fileCount": "{n} images"
		};
		//#endregion
		//#region src/client/toolview.tsx
		/**
		* ui_mockup 工具卡片：生成图内嵌展示 + 确认/选用/修改意见反馈按钮。
		* 纯展示组件，接收 tool.call.toolview 的 owner payload 与框架注入的
		* `t`（i18n）和 `inputActions`（反馈按钮通过 setDraft + submit 发送消息）。
		* 视觉与 DSH 原生一致：Button 原语 + --dsw-alias-* 主题令牌。
		*/
		const ANCHOR_CHANGED_EVENT = "ui-mockup:anchor-changed";
		/** 反馈按钮发送给 agent 的消息正文（中文固定，模型可见文本不随 UI 语言切换）。 */
		function buildFeedbackMessage(name, index, opinion) {
			if (opinion !== void 0 && opinion.trim() !== "") return formatModelMessage("card.feedbackMessage", {
				opinion: opinion.trim(),
				name
			});
			return formatModelMessage("card.selectMessage", {
				n: index + 1,
				name
			});
		}
		/** 模型可见反馈固定中文；UI 控件文案仍由传入的 t 跟随当前界面语言。 */
		function formatModelMessage(key, params) {
			let text = zh[key];
			for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, () => String(value));
			return text;
		}
		/** 成功路径只显示需要用户处理的告警，不重复内部存储路径等完整工具文本。 */
		function resultNotice(message) {
			const starts = RESULT_NOTICE_MARKERS.map((marker) => message.indexOf(marker)).filter((index) => index >= 0);
			return starts.length === 0 ? "" : message.slice(Math.min(...starts)).trim();
		}
		function UiMockupToolview({ block, inputActions, cwd, t, anchor }) {
			const [showFeedback, setShowFeedback] = (0, react.useState)(false);
			const [opinion, setOpinion] = (0, react.useState)("");
			const [selected, setSelected] = (0, react.useState)("");
			const [anchorPicked, setAnchorPicked] = (0, react.useState)("");
			const [anchoredNames, setAnchoredNames] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [anchorError, setAnchorError] = (0, react.useState)("");
			const [anchorHint, setAnchorHint] = (0, react.useState)("");
			const [annotating, setAnnotating] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const onAnchorChanged = (event) => {
					const detail = event.detail;
					if (detail?.cwd !== cwd) return;
					setAnchoredNames(/* @__PURE__ */ new Set([detail.file]));
				};
				window.addEventListener(ANCHOR_CHANGED_EVENT, onAnchorChanged);
				return () => window.removeEventListener(ANCHOR_CHANGED_EVENT, onAnchorChanged);
			}, [cwd]);
			const pending = !("kind" in block);
			const [mountedAt] = (0, react.useState)(() => Date.now());
			const startedAt = pending && Number.isFinite(block.time) && block.time > 0 ? block.time : mountedAt;
			const elapsedSinceStart = () => Math.max(0, Math.round((Date.now() - startedAt) / 1e3));
			const [elapsedSeconds, setElapsedSeconds] = (0, react.useState)(elapsedSinceStart);
			(0, react.useEffect)(() => {
				if (!pending) return void 0;
				setElapsedSeconds(elapsedSinceStart());
				const timer = setInterval(() => {
					setElapsedSeconds(elapsedSinceStart());
				}, 1e3);
				return () => clearInterval(timer);
			}, [pending, startedAt]);
			const setAnchor = async (name) => {
				if (anchor === void 0) return;
				setAnchorError("");
				setAnchorHint("");
				try {
					const result = await anchor.set(name, cwd);
					window.dispatchEvent(new CustomEvent(ANCHOR_CHANGED_EVENT, { detail: {
						cwd,
						file: result.anchorFile
					} }));
					if (typeof result?.hint === "string" && result.hint !== "") setAnchorHint(result.hint);
				} catch (err) {
					setAnchorError(err instanceof Error ? err.message : String(err));
				}
			};
			if (pending) {
				const minutes = Math.floor(elapsedSeconds / 60);
				const seconds = elapsedSeconds % 60;
				const label = elapsedSeconds < 1 ? t("card.generating") : minutes < 1 ? t("card.generatingSeconds", { n: seconds }) : t("card.generatingMinutes", {
					m: minutes,
					s: seconds
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						padding: "8px 0",
						fontSize: 13,
						color: "var(--dsw-alias-label-tertiary)"
					},
					children: label
				});
			}
			const images = block.content.filter((item) => item.type === "image");
			const showRefine = (() => {
				const call = block.call;
				const argsRaw = call === null || call === void 0 ? void 0 : call.argsRaw;
				if (typeof argsRaw !== "string" || argsRaw === "") return false;
				try {
					const args = JSON.parse(argsRaw);
					return args.fidelity === "high-fidelity" && args.fastPreview === true;
				} catch {
					return false;
				}
			})();
			const message = block.content.filter((item) => item.type === "text").map((item) => item.text).join("");
			const notice = resultNotice(message);
			if (images.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: "8px 0",
					whiteSpace: "pre-wrap",
					fontSize: 13,
					lineHeight: "20px",
					color: "var(--dsw-alias-label-primary)"
				},
				children: message
			});
			const send = (text) => {
				inputActions.setDraft(text);
				inputActions.submit();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 8,
					padding: "8px 0"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							gap: 8
						},
						children: images.map((image, index) => {
							const name = image.attachment.name ?? `mockup-${index + 1}.png`;
							const anchored = anchoredNames.has(name);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
								style: { margin: 0 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setAnnotating(name),
									title: t("card.annotateHint"),
									"aria-label": `${name}: ${t("card.annotateHint")}`,
									style: {
										background: "none",
										border: "none",
										padding: 0,
										cursor: "pointer",
										display: "block"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
										src: imageUrl(name, cwd),
										alt: name,
										loading: "lazy",
										style: {
											maxWidth: 240,
											maxHeight: 240,
											borderRadius: 8,
											border: `1px solid ${anchored ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-border-l2)"}`,
											objectFit: "contain",
											background: "var(--dsw-alias-bg-layer-3)"
										}
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figcaption", {
									style: {
										fontSize: 12,
										lineHeight: "17px",
										color: "var(--dsw-alias-label-tertiary)",
										marginTop: 2
									},
									children: [name, anchored ? ` · ${t("card.anchored")}` : ""]
								})]
							}, `${name}:${index}`);
						})
					}),
					notice !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "status",
						style: {
							fontSize: 12,
							lineHeight: "18px",
							color: "var(--dsw-alias-state-warn-primary)"
						},
						children: notice
					}),
					anchorError !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 12,
							color: "var(--dsw-alias-label-error)"
						},
						children: anchorError
					}),
					anchorHint !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 12,
							color: "var(--dsw-alias-state-warn-primary)"
						},
						children: anchorHint
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							gap: 8,
							alignItems: "center"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								onClick: () => send(formatModelMessage("card.confirmMessage", { name: images[0].attachment.name ?? "mockup-1.png" })),
								children: t("card.confirm")
							}),
							showRefine && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: () => send(formatModelMessage("card.refineMessage", { name: images[0].attachment.name ?? "mockup-1.png" })),
								children: t("card.refine")
							}),
							images.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								value: selected,
								onChange: (event) => {
									const raw = event.target.value;
									if (raw === "") return;
									const index = Number(raw);
									setSelected("");
									const name = images[index].attachment.name ?? `mockup-${index + 1}.png`;
									send(buildFeedbackMessage(name, index));
								},
								style: {
									height: 28,
									padding: "0 8px",
									border: "1px solid var(--dsw-alias-border-l2)",
									borderRadius: 999,
									background: "var(--dsw-alias-bg-layer-3)",
									font: "inherit",
									fontSize: 13,
									color: "var(--dsw-alias-label-primary)"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									disabled: true,
									children: t("card.selectPlaceholder")
								}), images.map((image, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: index,
									children: t("card.select", { n: index + 1 })
								}, index))]
							}),
							anchor !== void 0 && (images.length === 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								title: t("card.setAnchor"),
								onClick: () => void setAnchor(images[0].attachment.name ?? "mockup-1.png"),
								children: t("card.setAnchorButton")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								value: anchorPicked,
								onChange: (event) => {
									const raw = event.target.value;
									if (raw === "") return;
									const index = Number(raw);
									setAnchorPicked("");
									const name = images[index].attachment.name ?? `mockup-${index + 1}.png`;
									setAnchor(name);
								},
								title: t("card.setAnchor"),
								style: {
									height: 28,
									padding: "0 8px",
									border: "1px solid var(--dsw-alias-border-l2)",
									borderRadius: 999,
									background: "var(--dsw-alias-bg-layer-3)",
									font: "inherit",
									fontSize: 13,
									color: "var(--dsw-alias-label-primary)"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									disabled: true,
									children: t("card.setAnchorSelect")
								}), images.map((image, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: index,
									children: t("card.setAnchorOption", { n: index + 1 })
								}, index))]
							})),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setShowFeedback((value) => !value),
								children: t("card.feedback")
							})
						]
					}),
					showFeedback && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 6
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: opinion,
							onChange: (event) => setOpinion(event.target.value),
							placeholder: t("card.feedbackPlaceholder"),
							rows: 2,
							style: {
								resize: "vertical",
								padding: "6px 12px",
								border: "1px solid var(--dsw-alias-border-l2)",
								borderRadius: 8,
								background: "var(--dsw-alias-bg-layer-3)",
								font: "inherit",
								fontSize: 13,
								lineHeight: "20px",
								color: "var(--dsw-alias-label-primary)"
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								disabled: opinion.trim() === "",
								onClick: () => {
									if (opinion.trim() === "") return;
									const name = images[0].attachment.name ?? "mockup-1.png";
									send(buildFeedbackMessage(name, 0, opinion));
									setOpinion("");
									setShowFeedback(false);
								},
								children: t("card.feedbackSubmit")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => setShowFeedback(false),
								children: t("card.feedbackCancel")
							})]
						})]
					}),
					annotating !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnnotateModal, {
						name: annotating,
						cwd,
						t,
						onClose: () => setAnnotating(null),
						onSubmit: (opinion, marks, imageWidth, imageHeight) => {
							const projections = projectMarks(marks, imageWidth, imageHeight);
							const text = projections.length > 0 ? buildAnnotationFeedbackMessage({
								name: annotating,
								time: /* @__PURE__ */ new Date(),
								projections,
								opinion
							}) : buildFeedbackMessage(annotating, 0, opinion);
							send(text);
							setAnnotating(null);
						}
					})
				]
			});
		}
		//#endregion
		//#region src/providers.ts
		/** DashScope 当前可安全接收单参考图的模型族（千问系与万相 2.7）。 */
		function supportsDashscopeReference(model) {
			return model.startsWith("qwen-image") || model === "wan2.7-image" || model === "wan2.7-image-pro";
		}
		/** 已注册供应商（顺序即面板卡片序与补丁行追加序）。 */
		const PROVIDER_REGISTRY = [
			{
				id: "dashscope",
				patchId: "image-dashscope",
				packageName: "@mackwan84/dsh-image-dashscope",
				credential: "DASHSCOPE_API_KEY",
				probeBaseUrl: "https://dashscope.aliyuncs.com",
				probePath: "/api/v1/services/aigc/image-generation/generation",
				nameKey: "panel.provider.dashscopeName",
				hints: {
					wireframe: [
						"",
						"qwen-image-3.0",
						"qwen-image-2.0",
						"wan2.7-image"
					],
					highFidelity: [
						"",
						"qwen-image-3.0-pro",
						"qwen-image-2.0-pro",
						"wan2.7-image-pro"
					],
					draft: [
						"",
						"qwen-image-3.0",
						"wan2.7-image"
					]
				},
				presetDisabled: false,
				cardNotes: "status",
				supportsReference: (model) => model === void 0 || supportsDashscopeReference(model),
				referenceSkipHint: "请改用 qwen-image 或 wan2.7-image 系列"
			},
			{
				id: "volcengine",
				patchId: "image-volcengine",
				packageName: "@mackwan84/dsh-image-volcengine",
				credential: "ARK_API_KEY",
				probeBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
				probePath: "/images/generations",
				nameKey: "panel.provider.volcengineName",
				hints: {
					wireframe: [
						"",
						"doubao-seedream-4-5-251128",
						"doubao-seedream-4-0-250828"
					],
					highFidelity: [
						"",
						"doubao-seedream-5-0-pro-260628",
						"doubao-seedream-5-0-260128"
					],
					draft: ["", "doubao-seedream-4-5-251128"]
				},
				presetDisabled: true,
				cardNotes: "note"
			},
			{
				id: "openai-compat",
				patchId: "image-openai-compat",
				packageName: "@mackwan84/dsh-image-openai-compat",
				credential: "OPENAI_COMPAT_API_KEY",
				probeBaseUrl: "",
				probePath: "/images/generations",
				nameKey: "panel.provider.openaiCompatName",
				hints: {
					wireframe: ["", "gpt-image-2"],
					highFidelity: [
						"",
						"gpt-image-2.5-flare",
						"gpt-image-2.5-sunburst"
					],
					draft: ["", "gpt-image-2"]
				},
				presetDisabled: true,
				cardNotes: "note",
				supportsReference: () => false,
				referenceSkipHint: "OpenAI 兼容最小子集不含参考图(I2I), 请解除风格锚点或换用支持参考图的提供方"
			}
		];
		/** 精确查找：未注册 id（含 unknown）返回 undefined。 */
		function providerOf(id) {
			return PROVIDER_REGISTRY.find((meta) => meta.id === id);
		}
		/**
		* 网关地址归一 + 校验：去空白与尾部斜杠；空串视为「未配置」（合法），
		* 非空则必须以 http/https 开头。宿主端点与设置面板共用同一口径，
		* 避免「面板放行、宿主拒绝」这类割裂。
		*/
		function normalizeBaseUrl(raw) {
			const value = raw.trim().replace(/\/+$/, "");
			return {
				value,
				valid: value === "" || /^https?:\/\//.test(value)
			};
		}
		/** image 服务未挂载 / 状态端点不可达时的面板渲染回退条目：
		*  凭据名随默认提供方（与 0.2.0 面板口径一致，元数据表测试锁定）；
		*  模型候选保留通用千问系。仅用于渲染，绝不进入补丁写入、探测或切换目标。 */
		const UNKNOWN_PROVIDER_FALLBACK = {
			id: "unknown",
			patchId: "image-unknown",
			packageName: "",
			credential: providerOf("dashscope")?.credential ?? "",
			probeBaseUrl: "",
			probePath: "",
			nameKey: "panel.provider.unknown",
			hints: {
				wireframe: ["", "qwen-image-3.0"],
				highFidelity: ["", "qwen-image-3.0-pro"],
				draft: ["", "qwen-image-3.0"]
			},
			presetDisabled: false,
			cardNotes: "status"
		};
		/** 面板用的宽容查找：未注册 id 回退到渲染回退条目，永不返回 undefined。 */
		function providerMetaOf(id) {
			return providerOf(id) ?? UNKNOWN_PROVIDER_FALLBACK;
		}
		//#endregion
		//#region src/client/settings-panel.css?inline
		var settings_panel_default = ".ui-mockup-section, .ui-mockup-tabpanel, .ui-mockup-history-toolbar, .ui-mockup-history-row, .ui-mockup-history-summary {\n  min-width: 0;\n}\n\n.ui-mockup-history-summary {\n  overflow-wrap: anywhere;\n  flex: 1 1 0;\n}\n\n.ui-mockup-section {\n  box-sizing: border-box;\n  container-type: inline-size;\n}\n\n.ui-mockup-card, .ui-mockup-config-section, .ui-mockup-provider-card, .ui-mockup-overview, .ui-mockup-overview-status, .ui-mockup-quick-step {\n  box-sizing: border-box;\n  min-width: 0;\n  max-width: 100%;\n}\n\n.ui-mockup-provider-page {\n  flex-direction: column;\n  gap: 14px;\n  display: flex;\n}\n\n.ui-mockup-config-section {\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  flex-direction: column;\n  gap: 12px;\n  padding: 14px 16px;\n  display: flex;\n}\n\n.ui-mockup-config-header {\n  justify-content: space-between;\n  align-items: flex-start;\n  gap: 16px;\n  display: flex;\n}\n\n.ui-mockup-config-heading {\n  min-width: 0;\n}\n\n.ui-mockup-config-title {\n  color: var(--dsw-alias-label-primary);\n  margin: 0;\n  font-size: 15px;\n  font-weight: 600;\n  line-height: 22px;\n}\n\n.ui-mockup-config-description {\n  color: var(--dsw-alias-label-tertiary);\n  margin: 2px 0 0;\n  font-size: 12px;\n  line-height: 18px;\n}\n\n.ui-mockup-config-aside {\n  flex: none;\n  align-items: center;\n  gap: 12px;\n  display: flex;\n}\n\n.ui-mockup-provider-grid {\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 10px;\n  display: grid;\n}\n\n.ui-mockup-provider-card {\n  border: 1px solid var(--dsw-alias-border-l2);\n  cursor: pointer;\n  background: none;\n  border-radius: 10px;\n  align-items: flex-start;\n  gap: 8px;\n  min-height: 72px;\n  padding: 14px 12px 30px;\n  transition: border-color .12s, background-color .12s;\n  display: flex;\n  position: relative;\n}\n\n.ui-mockup-provider-card[data-active=\"true\"] {\n  border-color: var(--dsw-alias-brand-primary-new-colorprimary-new-color);\n  background: var(--dsw-alias-bg-module-platform);\n  cursor: default;\n}\n\n.ui-mockup-provider-card[data-disabled=\"true\"] {\n  cursor: wait;\n}\n\n.ui-mockup-provider-card:not([data-active=\"true\"]):hover {\n  border-color: var(--dsw-static-neutral-bluish-400);\n  background: var(--dsw-alias-bg-layer-3);\n}\n\n.ui-mockup-provider-card:focus-within {\n  outline: 2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);\n  outline-offset: 2px;\n}\n\n.ui-mockup-provider-card input {\n  flex: none;\n  margin: 2px 0 0;\n}\n\n.ui-mockup-provider-name {\n  min-width: 0;\n  color: var(--dsw-alias-label-primary);\n  overflow-wrap: anywhere;\n  font-size: 13px;\n  font-weight: 600;\n  line-height: 20px;\n}\n\n.ui-mockup-provider-badge {\n  border: 1px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);\n  max-width: calc(100% - 20px);\n  color: var(--dsw-alias-brand-primary-new-colorprimary-new-color);\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  border-radius: 999px;\n  padding: 1px 7px;\n  font-size: 11px;\n  line-height: 17px;\n  position: absolute;\n  bottom: 8px;\n  right: 10px;\n  overflow: hidden;\n}\n\n.ui-mockup-connection-status, .ui-mockup-credential-status {\n  color: var(--dsw-alias-label-secondary);\n  align-items: center;\n  gap: 7px;\n  font-size: 12px;\n  line-height: 18px;\n  display: inline-flex;\n}\n\n.ui-mockup-connection-row {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n  grid-template-columns: 100px minmax(0, 1fr);\n  align-items: start;\n  gap: 14px;\n  padding-top: 12px;\n  display: grid;\n}\n\n.ui-mockup-connection-label {\n  color: var(--dsw-alias-label-primary);\n  padding-top: 7px;\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 20px;\n}\n\n.ui-mockup-connection-field {\n  flex-direction: column;\n  gap: 5px;\n  min-width: 0;\n  display: flex;\n}\n\n.ui-mockup-connection-control {\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n  display: flex;\n}\n\n.ui-mockup-connection-control button {\n  flex: none;\n}\n\n.ui-mockup-connection-control > :first-child {\n  flex: auto;\n  min-width: 0;\n}\n\n.ui-mockup-connection-control > :first-child input {\n  box-sizing: border-box;\n  width: 100%;\n}\n\n.ui-mockup-connection-details {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  padding-top: 10px;\n  font-size: 13px;\n  line-height: 20px;\n}\n\n.ui-mockup-connection-details > summary {\n  cursor: pointer;\n  width: fit-content;\n  font-weight: 500;\n}\n\n.ui-mockup-connection-details > summary:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 3px;\n  border-radius: 4px;\n}\n\n.ui-mockup-connection-methods {\n  color: var(--dsw-alias-label-tertiary);\n  flex-direction: column;\n  gap: 2px;\n  margin-top: 8px;\n  font-size: 12px;\n  line-height: 18px;\n  display: flex;\n}\n\n.ui-mockup-connection-methods ol {\n  margin: 0;\n  padding-left: 20px;\n}\n\n.ui-mockup-model-grid {\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 0;\n  display: grid;\n}\n\n.ui-mockup-model-field {\n  flex-direction: column;\n  gap: 7px;\n  min-width: 0;\n  padding: 0 14px;\n  display: flex;\n}\n\n.ui-mockup-model-field:first-child {\n  padding-left: 0;\n}\n\n.ui-mockup-model-field + .ui-mockup-model-field {\n  border-left: 1px solid var(--dsw-alias-border-l2);\n}\n\n.ui-mockup-model-field:last-child {\n  padding-right: 0;\n}\n\n.ui-mockup-model-label {\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 20px;\n}\n\n.ui-mockup-model-menu, .ui-mockup-model-combobox {\n  box-sizing: border-box;\n  width: 100%;\n  min-width: 0;\n}\n\n.ui-mockup-model-menu {\n  display: block;\n}\n\n.ui-mockup-model-combobox {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-3);\n  border-radius: 8px;\n  align-items: center;\n  height: 34px;\n  display: flex;\n  overflow: hidden;\n}\n\n.ui-mockup-model-combobox:focus-within {\n  border-color: var(--dsw-alias-brand-primary);\n}\n\n.ui-mockup-model-combobox > input {\n  min-width: 0;\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  background: none;\n  border: 0;\n  outline: 0;\n  flex: auto;\n  padding: 0 4px 0 12px;\n  font-size: 13px;\n  line-height: 20px;\n}\n\n.ui-mockup-model-combobox > input::placeholder {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.ui-mockup-model-combobox > input:disabled, .ui-mockup-model-combobox[data-disabled=\"true\"] {\n  cursor: default;\n  opacity: .6;\n}\n\n.ui-mockup-model-menu-trigger {\n  width: 32px;\n  height: 32px;\n  color: var(--dsw-alias-label-secondary);\n  cursor: pointer;\n  background: none;\n  border: 0;\n  flex: 0 0 32px;\n  justify-content: center;\n  align-items: center;\n  padding: 0;\n  display: inline-flex;\n}\n\n.ui-mockup-model-menu-trigger:hover:not(:disabled) {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.ui-mockup-model-menu-trigger:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: -2px;\n}\n\n.ui-mockup-model-hint {\n  color: var(--dsw-alias-label-tertiary);\n  overflow-wrap: anywhere;\n  font-size: 11px;\n  line-height: 17px;\n}\n\n.ui-mockup-tabs {\n  scrollbar-width: thin;\n  gap: 22px;\n  max-width: 100%;\n  overflow: auto hidden;\n}\n\n.ui-mockup-tab {\n  white-space: nowrap;\n  flex: none;\n}\n\n.ui-mockup-field-label {\n  min-width: 96px;\n}\n\n.ui-mockup-field-row > * {\n  max-width: 100%;\n}\n\n.ui-mockup-select-trigger {\n  background: var(--dsw-alias-bg-module-platform);\n  max-width: 100%;\n  height: 36px;\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  cursor: pointer;\n  border: 0;\n  border-radius: 18px;\n  align-items: center;\n  gap: 12px;\n  padding: 0 14px;\n  font-size: 14px;\n  line-height: 22px;\n  display: inline-flex;\n}\n\n.ui-mockup-select-trigger:hover:not(:disabled) {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.ui-mockup-select-trigger:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 2px;\n}\n\n.ui-mockup-select-trigger:disabled {\n  cursor: default;\n  opacity: .6;\n}\n\n.ui-mockup-select-trigger > span {\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  min-width: 0;\n  overflow: hidden;\n}\n\n.ui-mockup-select-chevron {\n  flex: none;\n}\n\n.ui-mockup-history-search {\n  flex: 220px;\n  min-width: 0;\n}\n\n.ui-mockup-history-pagination, .ui-mockup-history-pages, .ui-mockup-history-anchor-nav {\n  min-width: 0;\n  max-width: 100%;\n}\n\n.ui-mockup-history-page-number {\n  min-width: 28px;\n}\n\n@container (width <= 640px) {\n  .ui-mockup-tabs {\n    gap: 16px;\n  }\n\n  .ui-mockup-field-label {\n    flex: 1 0 100%;\n    min-width: 0;\n  }\n\n  .ui-mockup-card, .ui-mockup-config-section, .ui-mockup-provider-card, .ui-mockup-preferences-footer, .ui-mockup-overview, .ui-mockup-overview-status, .ui-mockup-quick-step {\n    overflow-wrap: anywhere;\n    overflow: hidden;\n  }\n\n  .ui-mockup-overview-status, .ui-mockup-config-header, .ui-mockup-config-aside, .ui-mockup-connection-control {\n    flex-wrap: wrap;\n  }\n\n  .ui-mockup-config-aside {\n    justify-content: flex-end;\n  }\n\n  .ui-mockup-provider-name {\n    max-width: 88px;\n  }\n\n  .ui-mockup-field-row > *, .ui-mockup-preferences-footer > *, .ui-mockup-preferences-actions > *, .ui-mockup-preferences-actions button {\n    box-sizing: border-box;\n    min-width: 0;\n    max-width: 100%;\n  }\n\n  .ui-mockup-preferences-footer button, .ui-mockup-preferences-actions button {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n  }\n\n  .ui-mockup-preferences-footer, .ui-mockup-history-toolbar, .ui-mockup-history-row, .ui-mockup-history-anchor-nav {\n    flex-wrap: wrap;\n  }\n\n  .ui-mockup-history-toolbar, .ui-mockup-history-row, .ui-mockup-history-actions, .ui-mockup-history-pagination, .ui-mockup-history-pages, .ui-mockup-history-anchor-nav {\n    overflow: hidden;\n  }\n\n  .ui-mockup-history-pages {\n    flex-wrap: wrap;\n  }\n\n  .ui-mockup-history-toolbar > *, .ui-mockup-history-actions > *, .ui-mockup-history-actions button, .ui-mockup-history-anchor-nav > * {\n    box-sizing: border-box;\n    min-width: 0;\n    max-width: 100%;\n  }\n\n  .ui-mockup-history-toolbar button, .ui-mockup-history-actions button, .ui-mockup-history-pages button, .ui-mockup-history-anchor-nav button {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    min-width: 0;\n    max-width: 100%;\n    overflow: hidden;\n  }\n\n  .ui-mockup-history-row > img {\n    max-width: 100%;\n    height: auto;\n  }\n\n  .ui-mockup-preferences-actions, .ui-mockup-history-actions {\n    width: 100%;\n  }\n\n  .ui-mockup-preferences-actions {\n    justify-content: flex-end;\n  }\n\n  .ui-mockup-history-summary {\n    flex-basis: calc(100% - 70px);\n  }\n}\n\n@container (width <= 520px) {\n  .ui-mockup-config-section {\n    padding: 12px;\n  }\n\n  .ui-mockup-config-header {\n    flex-direction: column;\n    gap: 10px;\n  }\n\n  .ui-mockup-config-aside {\n    justify-content: space-between;\n    width: 100%;\n  }\n\n  .ui-mockup-provider-grid, .ui-mockup-model-grid {\n    grid-template-columns: minmax(0, 1fr);\n  }\n\n  .ui-mockup-provider-card {\n    align-items: center;\n    min-height: 58px;\n    padding: 12px 110px 12px 12px;\n  }\n\n  .ui-mockup-provider-card input {\n    margin-top: 0;\n  }\n\n  .ui-mockup-provider-badge {\n    top: 50%;\n    bottom: auto;\n    right: 10px;\n    transform: translateY(-50%);\n  }\n\n  .ui-mockup-connection-row {\n    grid-template-columns: minmax(0, 1fr);\n    gap: 6px;\n  }\n\n  .ui-mockup-connection-label {\n    padding-top: 0;\n  }\n\n  .ui-mockup-connection-control > :first-child {\n    flex-basis: 100% !important;\n  }\n\n  .ui-mockup-model-field, .ui-mockup-model-field:first-child, .ui-mockup-model-field:last-child {\n    padding: 12px 0 0;\n  }\n\n  .ui-mockup-model-field:first-child {\n    padding-top: 0;\n  }\n\n  .ui-mockup-model-field + .ui-mockup-model-field {\n    border-top: 1px solid var(--dsw-alias-border-l2);\n    border-left: 0;\n    margin-top: 12px;\n  }\n}\n";
		//#endregion
		//#region src/client/settings-panel.tsx
		/**
		* 「UI 草图」设置区块：单个 settings.section 挂四张子页（概览 / 提供方与模型 /
		* 生成偏好 / 生成历史），子页内切换与已确认线框一致。
		* 视觉完全使用 DSH 主题令牌（--dsw-*）与 UI primitives，浅/深色自适应；
		* 数据面：偏好经同名 settings 命名空间镜像读写，历史/锚点/测试连接走私有 RPC 频道。
		*/
		/** 面板本地默认值：须与宿主 DEFAULT_PREFS 保持一致（改动时两侧同步）。 */
		const PANEL_DEFAULTS = {
			defaultFidelity: "wireframe",
			defaultPlatform: "web",
			defaultCount: 2,
			outputDir: "design/images",
			pollTimeoutMinutes: 10,
			wireframeModel: "",
			highFidelityModel: "",
			draftModel: "",
			defaultSize: ""
		};
		const SUBPAGES = [
			"overview",
			"provider",
			"preferences",
			"history"
		];
		/** 子页标题 key 表（i18n词条 panel.tab.*）。 */
		const TAB_KEYS = {
			overview: "panel.tab.overview",
			provider: "panel.tab.provider",
			preferences: "panel.tab.preferences",
			history: "panel.tab.history"
		};
		function UiMockupSection({ t, prefs, connection }) {
			const [page, setPage] = (0, react.useState)("overview");
			const tabsId = (0, react.useId)();
			const tabRefs = (0, react.useRef)([]);
			const selectTabFromKeyboard = (event, index) => {
				const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? SUBPAGES.length - 1 : event.key === "ArrowRight" ? (index + 1) % SUBPAGES.length : event.key === "ArrowLeft" ? (index - 1 + SUBPAGES.length) % SUBPAGES.length : null;
				if (nextIndex === null) return;
				const nextPage = SUBPAGES[nextIndex];
				if (nextPage === void 0) return;
				event.preventDefault();
				setPage(nextPage);
				tabRefs.current[nextIndex]?.focus();
			};
			const activeTabId = `${tabsId}-tab-${page}`;
			const activePanelId = `${tabsId}-panel-${page}`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "ui-mockup-section",
				style: sectionStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", {
						"data-ui-mockup-styles": true,
						children: settings_panel_default
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "tablist",
						"aria-label": t("panel.nav"),
						className: "ui-mockup-tabs",
						style: tabsStyle,
						children: SUBPAGES.map((key, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							id: `${tabsId}-tab-${key}`,
							ref: (element) => {
								tabRefs.current[index] = element;
							},
							type: "button",
							role: "tab",
							className: "ui-mockup-tab",
							"aria-selected": page === key,
							"aria-controls": `${tabsId}-panel-${key}`,
							tabIndex: page === key ? 0 : -1,
							"data-active": page === key,
							onClick: () => setPage(key),
							onKeyDown: (event) => selectTabFromKeyboard(event, index),
							style: page === key ? {
								...tabStyle,
								...tabActiveStyle
							} : tabStyle,
							children: t(TAB_KEYS[key])
						}, key))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						id: activePanelId,
						role: "tabpanel",
						"aria-labelledby": activeTabId,
						className: "ui-mockup-tabpanel",
						tabIndex: 0,
						children: [
							page === "overview" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewPage, {
								t,
								connection
							}),
							page === "provider" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderPage, {
								t,
								prefs,
								connection
							}),
							page === "preferences" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PreferencesPage, {
								t,
								prefs
							}),
							page === "history" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HistoryPage, {
								t,
								connection
							})
						]
					})
				]
			});
		}
		/**
		* DSH 真实主题令牌（--dsw-alias-*，与 ui-theme / ui-settings-plugins 的
		* module.css 同名同用途）与原生设置区实测尺寸。布局仍用内联样式，但取值
		* 逐项对齐 fields.module.css / PluginsSettingsSection.module.css，不再自造。
		*/
		const tokens = {
			labelPrimary: "var(--dsw-alias-label-primary)",
			labelSecondary: "var(--dsw-alias-label-secondary)",
			labelTertiary: "var(--dsw-alias-label-tertiary)",
			labelError: "var(--dsw-alias-label-error)",
			border: "var(--dsw-alias-border-l2)",
			bgLayer: "var(--dsw-alias-bg-layer-3)",
			brand: "var(--dsw-alias-brand-primary)"
		};
		/** 面板根容器：与原生设置 section 同宽（max-width 760px）。 */
		const sectionStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 12,
			maxWidth: 760,
			width: "100%",
			color: tokens.labelPrimary
		};
		const tabsStyle = {
			display: "flex",
			alignItems: "flex-end",
			borderBottom: `1px solid ${tokens.border}`,
			marginTop: 2
		};
		const tabStyle = {
			position: "relative",
			border: 0,
			padding: "7px 1px 9px",
			background: "transparent",
			color: tokens.labelTertiary,
			font: "inherit",
			fontSize: 13,
			lineHeight: "20px",
			cursor: "pointer"
		};
		const tabActiveStyle = { color: tokens.labelPrimary };
		/** 状态点：直接复用原语 StateDot（done 绿 / warning 琥珀），观感与会话列表一致。 */
		function StatusDot({ ok, busy }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
				state: busy ? "ongoing" : ok ? "done" : "warning",
				className: "ui-mockup-dot"
			});
		}
		/**
		* 卡片容器：恢复已确认线框的圆角卡片布局，视觉用真实令牌
		* （border-l2 边框 / 8px 圆角 / 标题 15px·600 对齐原生 heading 层级）。
		*/
		function Card({ title, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "ui-mockup-card",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 8,
					border: `1px solid ${tokens.border}`,
					borderRadius: 8,
					padding: "10px 12px"
				},
				children: [title !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 15,
						fontWeight: 600,
						lineHeight: "22px"
					},
					children: title
				}), children]
			});
		}
		/**
		* 提供方页的配置区块：标题、说明和状态/操作拥有固定层级，并通过原生 section
		* 暴露可访问区域名称。视觉仍沿用宿主令牌，避免把每一行再包成嵌套卡片。
		*/
		function ConfigSection({ title, description, aside, children }) {
			const titleId = (0, react.useId)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"aria-labelledby": titleId,
				className: "ui-mockup-config-section",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "ui-mockup-config-header",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ui-mockup-config-heading",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							id: titleId,
							className: "ui-mockup-config-title",
							children: title
						}), description !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "ui-mockup-config-description",
							children: description
						})]
					}), aside !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ui-mockup-config-aside",
						children: aside
					})]
				}), children]
			});
		}
		/**
		* 字段行：横排（label 左 96px，控件右）。为对齐原生 `.field + .field { border-top }`
		* 的表单节奏，相邻字段行之间画 1px 分隔线；卡片内首行由调用方传 `first` 免除。
		* 内容区统一 min-height 34（控件基准高）并垂直居中，使 radio / 输入框 / 纯文字行
		* 各行等高、底边齐平，分隔线间距一致。
		* 无障碍：用 role=group + aria-labelledby 而非 <label> 包裹——单个 label 只能
		* 隐式关联一个可标记元素，多 radio 场景下其余选项会失去标签关联。
		*/
		function FieldRow({ label, children, first = false }) {
			const labelId = (0, react.useId)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "group",
				"aria-labelledby": labelId,
				className: "ui-mockup-field-row",
				style: {
					display: "flex",
					alignItems: "center",
					gap: 10,
					flexWrap: "wrap",
					minHeight: 34,
					paddingTop: 10,
					...first ? {} : { borderTop: `1px solid ${tokens.border}` }
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					id: labelId,
					className: "ui-mockup-field-label",
					style: {
						fontSize: 13,
						lineHeight: "20px",
						color: tokens.labelSecondary
					},
					children: label
				}), children]
			});
		}
		/** 提示行：对齐原生 hint（12px tertiary）/ invalid（12px error），不带边框。 */
		function Notice({ children, danger }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: {
					margin: 0,
					fontSize: 12,
					lineHeight: "20px",
					color: danger ? tokens.labelError : tokens.labelTertiary
				},
				children
			});
		}
		/** 快速使用三步的图标与词条键（显式常量，规避模板字面量推断不进字典联合）。 */
		const QUICK_STEPS = [
			{
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16,
				title: "panel.overview.step1Title",
				body: "panel.overview.step1Body"
			},
			{
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconEditOutline16,
				title: "panel.overview.step2Title",
				body: "panel.overview.step2Body"
			},
			{
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16,
				title: "panel.overview.step3Title",
				body: "panel.overview.step3Body"
			}
		];
		function OverviewPage({ t, connection }) {
			const [data, setData] = (0, react.useState)();
			const [error, setError] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				let alive = true;
				callPanel(connection, "overview").then((value) => {
					if (alive) setData(value);
				}).catch((err) => {
					if (alive) setError(err instanceof Error ? err.message : String(err));
				});
				return () => {
					alive = false;
				};
			}, [connection]);
			if (error !== "") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
				danger: true,
				children: t("panel.loadFailed", { error })
			});
			if (data === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: { color: tokens.labelTertiary },
				children: t("panel.loading")
			});
			const overviewMeta = providerOf(data.provider);
			const overviewCredential = overviewMeta?.credential ?? providerMetaOf("unknown").credential;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "ui-mockup-overview",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 12
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							fontSize: 13,
							lineHeight: "20px",
							color: tokens.labelTertiary
						},
						children: t("panel.overview.intro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
						title: t("panel.overview.quickTitle"),
						children: QUICK_STEPS.map(({ Icon, title, body }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ui-mockup-quick-step",
							style: {
								display: "flex",
								alignItems: "flex-start",
								flexWrap: "nowrap",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": true,
								style: {
									flex: "none",
									color: tokens.labelSecondary,
									marginTop: 2
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { size: 16 })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								style: {
									flex: "1 1 0%",
									minWidth: 0,
									margin: 0,
									lineHeight: "20px",
									overflowWrap: "anywhere"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: { fontSize: 13 },
										children: t(title)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 13,
											color: tokens.labelSecondary
										},
										children: t(body)
									})
								]
							})]
						}, title))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ui-mockup-overview-status",
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							fontSize: 13,
							lineHeight: "20px",
							color: tokens.labelSecondary
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusDot, { ok: data.credential.configured }), t("panel.overview.statusLine", {
							provider: overviewMeta !== void 0 ? t(overviewMeta.nameKey) : t("panel.provider.unknown"),
							credential: data.credential.configured ? t("panel.credential.ready") : t("panel.credential.missing", { credential: overviewCredential })
						})]
					})
				]
			});
		}
		/** 来源层 id → 词条键（显式映射，规避模板字面量推断不进字典联合）。 */
		const SOURCE_LABELS = {
			env: "panel.credential.source.env",
			file: "panel.credential.source.file",
			"project-env": "panel.credential.source.project-env",
			"user-env": "panel.credential.source.user-env",
			ambient: "panel.credential.source.ambient"
		};
		function sourceLabelText(t, source) {
			if (source === void 0) return void 0;
			const key = SOURCE_LABELS[source];
			return key === void 0 ? source : t(key);
		}
		function ProviderPage({ t, prefs, connection }) {
			const snap = prefs.getSnapshot();
			usePrefSync(prefs);
			const baseUrlInputId = (0, react.useId)();
			const credentialInputId = (0, react.useId)();
			const [testResult, setTestResult] = (0, react.useState)(null);
			const [testing, setTesting] = (0, react.useState)(false);
			const [writeError, setWriteError] = (0, react.useState)("");
			const [providerId, setProviderId] = (0, react.useState)("unknown");
			const [statusUnknown, setStatusUnknown] = (0, react.useState)(true);
			const [switching, setSwitching] = (0, react.useState)(false);
			const [providerNotice, setProviderNotice] = (0, react.useState)(null);
			const [credential, setCredential] = (0, react.useState)();
			const [keyDraft, setKeyDraft] = (0, react.useState)("");
			const [keyBusy, setKeyBusy] = (0, react.useState)(false);
			const [keyNotice, setKeyNotice] = (0, react.useState)(null);
			const [effectiveBaseUrl, setEffectiveBaseUrl] = (0, react.useState)("");
			const [baseUrlDraft, setBaseUrlDraft] = (0, react.useState)(null);
			const [baseUrlBusy, setBaseUrlBusy] = (0, react.useState)(false);
			const [openModelTier, setOpenModelTier] = (0, react.useState)(null);
			const [baseUrlNotice, setBaseUrlNotice] = (0, react.useState)(null);
			const refreshProviderStatus = (0, react.useCallback)(async () => {
				try {
					const value = await callPanel(connection, "provider/status");
					setProviderId(value.active);
					setEffectiveBaseUrl(typeof value.baseUrl === "string" ? value.baseUrl : "");
					setStatusUnknown(false);
					return value.active;
				} catch {
					setProviderId("unknown");
					setEffectiveBaseUrl("");
					setStatusUnknown(true);
					return "unknown";
				}
			}, [connection]);
			(0, react.useEffect)(() => {
				refreshProviderStatus();
			}, [refreshProviderStatus]);
			const activeMeta = providerMetaOf(providerId);
			const credentialName = activeMeta.credential;
			/** 一键切换生效提供方：宿主改写 home 用户层 patch（DSH 热重载），完成后刷新状态。 */
			const switchProvider = async (target) => {
				if (switching) return;
				setSwitching(true);
				setProviderNotice(null);
				try {
					const result = await callPanel(connection, "provider/switch", { provider: target });
					let activeAfterSwitch = result.active;
					if (result.pending === true) activeAfterSwitch = await refreshProviderStatus();
					const notices = [];
					if (activeAfterSwitch === target || result.pending === true) {
						const current = prefs.getSnapshot().value;
						if (current !== void 0 && (current.wireframeModel !== "" || current.highFidelityModel !== "" || current.draftModel !== "")) try {
							await prefs.set("wireframeModel", "");
							await prefs.set("highFidelityModel", "");
							await prefs.set("draftModel", "");
							notices.push(t("panel.provider.modelsReset"));
						} catch {}
					}
					if (result.pending === true && activeAfterSwitch !== target) notices.push(t("panel.provider.switchPending"));
					if (notices.length > 0) setProviderNotice(notices.join(" "));
				} catch (err) {
					setTestResult(err instanceof Error ? err.message : String(err));
				} finally {
					await refreshProviderStatus();
					await refreshCredential();
					setSwitching(false);
				}
			};
			const refreshCredential = (0, react.useCallback)(async () => {
				try {
					const value = await callPanel(connection, "overview");
					setCredential(value.credential);
					return value.credential;
				} catch {
					setCredential(void 0);
					return;
				}
			}, [connection]);
			(0, react.useEffect)(() => {
				refreshCredential();
			}, [refreshCredential]);
			/** 写入（覆盖）或清除存储中的密钥；成功后清空草稿并刷新状态。 */
			const applyKey = async (endpoint) => {
				setKeyBusy(true);
				setKeyNotice(null);
				try {
					const result = await callPanel(connection, endpoint, endpoint === "credential/set" ? { value: keyDraft } : {});
					setCredential(result.credential);
					setKeyDraft("");
					setKeyNotice({
						kind: "ok",
						text: endpoint === "credential/set" ? t("panel.credential.savedNotice") : t("panel.credential.clearedNotice", { credential: credentialName })
					});
				} catch (err) {
					setKeyNotice({
						kind: "error",
						text: err instanceof Error ? err.message : String(err)
					});
				} finally {
					setKeyBusy(false);
				}
			};
			const runTest = async () => {
				setTesting(true);
				setTestResult(null);
				try {
					const result = await callPanel(connection, "test-connection");
					setTestResult(result.ok ? t("panel.test.ok") : result.reason === "missing-key" ? t("panel.test.missingKey", { credential: credentialName }) : result.reason === "invalid-key" ? t("panel.test.invalidKey", { credential: credentialName }) : result.reason === "unknown" ? t("panel.test.unknown", { detail: result.detail ?? "" }) : t("panel.test.gatewayFail", { detail: result.detail ?? "" }));
				} catch (err) {
					setTestResult(err instanceof Error ? err.message : String(err));
				} finally {
					setTesting(false);
				}
			};
			/** 保存网关地址（仅 openai-compat）：宿主写用户层补丁 config 节并热重载落位，
			*  与切换提供方同款「几秒落位」体验；pending 语义同切换。 */
			const saveBaseUrl = async () => {
				const normalized = normalizeBaseUrl(baseUrlDraft ?? effectiveBaseUrl);
				if (!normalized.valid) {
					setBaseUrlNotice({
						kind: "error",
						text: t("panel.connection.invalid")
					});
					return;
				}
				const raw = normalized.value;
				setBaseUrlBusy(true);
				setBaseUrlNotice(null);
				try {
					const result = await callPanel(connection, "provider/baseurl/set", { baseUrl: raw });
					setBaseUrlDraft(raw);
					setBaseUrlNotice(result.pending === true ? {
						kind: "ok",
						text: t("panel.connection.pending")
					} : {
						kind: "ok",
						text: t("panel.connection.saved")
					});
				} catch (err) {
					setBaseUrlNotice({
						kind: "error",
						text: err instanceof Error ? err.message : String(err)
					});
				} finally {
					setBaseUrlBusy(false);
					await refreshProviderStatus();
				}
			};
			const [fetchedModels, setFetchedModels] = (0, react.useState)([]);
			(0, react.useEffect)(() => {
				let alive = true;
				setOpenModelTier(null);
				setFetchedModels([]);
				callPanel(connection, "provider/models").then((value) => {
					if (alive && Array.isArray(value.models)) setFetchedModels(value.models);
				}).catch(() => void 0);
				return () => {
					alive = false;
				};
			}, [
				connection,
				providerId,
				effectiveBaseUrl
			]);
			/** 下拉建议 = 注册表静态候选 ∪ 网关拉取建议（去重排序；空串「跟随默认」不进建议）。 */
			const suggestionsOf = (tier) => [.../* @__PURE__ */ new Set([...activeMeta.hints[tier].filter(Boolean), ...fetchedModels])].sort();
			const sourceLabel = sourceLabelText(t, credential?.source);
			const credentialLine = credential === void 0 ? t("panel.credential.checking") : credential.configured ? sourceLabel === void 0 ? t("panel.credential.ready") : t("panel.credential.readyWithSource", { source: sourceLabel }) : t("panel.credential.missing", { credential: credentialName });
			const needsBaseUrl = providerId === "openai-compat";
			const connectionReady = credential?.configured === true && (!needsBaseUrl || effectiveBaseUrl !== "");
			const connectionStatus = credential === void 0 ? t("panel.connection.checkingStatus") : connectionReady ? t("panel.connection.readyStatus") : t("panel.connection.incompleteStatus");
			const modelTiers = [
				{
					key: "wireframe",
					pref: "wireframeModel",
					label: t("panel.models.wireframe"),
					menuLabel: t("panel.models.options", { label: t("panel.models.wireframe") }),
					visibleLabel: t("panel.models.wireframe"),
					value: snap.value?.wireframeModel ?? ""
				},
				{
					key: "highFidelity",
					pref: "highFidelityModel",
					label: t("panel.models.highFidelity"),
					menuLabel: t("panel.models.options", { label: t("panel.models.highFidelity") }),
					visibleLabel: t("panel.models.highFidelity"),
					value: snap.value?.highFidelityModel ?? ""
				},
				{
					key: "draft",
					pref: "draftModel",
					label: t("panel.models.draft"),
					menuLabel: t("panel.models.options", { label: t("panel.models.draft") }),
					visibleLabel: t("panel.models.draftShort"),
					value: snap.value?.draftModel ?? ""
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "ui-mockup-provider-page",
				children: [
					snap.mode === "memory" || !snap.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, { children: t("panel.readonlyBanner") }) : null,
					writeError !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
						danger: true,
						children: writeError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ConfigSection, {
						title: t("panel.provider.title"),
						description: t("panel.provider.description"),
						children: [
							statusUnknown && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, { children: t("panel.provider.unknownHint") }),
							providerNotice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, { children: providerNotice }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								role: "radiogroup",
								"aria-label": t("panel.provider.title"),
								"aria-busy": switching,
								className: "ui-mockup-provider-grid",
								children: PROVIDER_REGISTRY.map((meta) => {
									const isFallbackActive = statusUnknown && providerId === "unknown" && meta.id === "dashscope";
									const active = providerId === meta.id || isFallbackActive;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "ui-mockup-provider-card",
										"data-active": active,
										"data-disabled": switching,
										onClick: () => {
											if (!active) switchProvider(meta.id);
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: "ui-mockup-provider",
												checked: active,
												disabled: switching,
												readOnly: true,
												"aria-label": t(meta.nameKey)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
												className: "ui-mockup-provider-name",
												children: t(meta.nameKey)
											}),
											active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "ui-mockup-provider-badge",
												children: isFallbackActive ? t("panel.provider.fallbackActive") : t("panel.provider.current")
											})
										]
									}, meta.id);
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ConfigSection, {
						title: t("panel.connection.title"),
						aside: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "ui-mockup-connection-status",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusDot, {
								ok: connectionReady,
								busy: credential === void 0 || testing || baseUrlBusy || keyBusy
							}), connectionStatus]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							onClick: () => void runTest(),
							disabled: testing || providerId === "openai-compat" && effectiveBaseUrl === "",
							children: testing ? t("panel.testing") : t("panel.testConnection")
						})] }),
						children: [
							providerId === "openai-compat" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ui-mockup-connection-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									htmlFor: baseUrlInputId,
									className: "ui-mockup-connection-label",
									children: t("panel.connection.baseUrlShortLabel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ui-mockup-connection-field",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "ui-mockup-connection-control",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												id: baseUrlInputId,
												type: "text",
												"aria-label": t("panel.connection.baseUrlLabel"),
												style: {
													flex: "1 1 240px",
													minWidth: 0
												},
												value: baseUrlDraft ?? effectiveBaseUrl,
												placeholder: t("panel.connection.baseUrlPlaceholder"),
												autoComplete: "off",
												onChange: (event) => setBaseUrlDraft(event.target.value),
												onKeyDown: (event) => {
													if (event.key === "Enter") saveBaseUrl();
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "primary",
												size: "sm",
												"aria-label": t("panel.connection.save"),
												disabled: baseUrlBusy || (baseUrlDraft ?? effectiveBaseUrl).trim() === effectiveBaseUrl.trim(),
												onClick: () => void saveBaseUrl(),
												children: t("panel.action.save")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, { children: t("panel.connection.baseUrlHint") }),
										baseUrlNotice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
											danger: baseUrlNotice.kind === "error",
											children: baseUrlNotice.text
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ui-mockup-connection-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									htmlFor: credentialInputId,
									className: "ui-mockup-connection-label",
									children: t("panel.connection.apiKeyLabel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ui-mockup-connection-field",
									children: [
										credential?.writable === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "ui-mockup-connection-control",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
													id: credentialInputId,
													type: "password",
													"aria-label": t("panel.credential.keyInputLabel", { credential: credentialName }),
													style: {
														flex: "1 1 220px",
														minWidth: 0
													},
													value: keyDraft,
													autoComplete: "off",
													placeholder: t("panel.credential.writePlaceholder", { credential: credentialName }),
													onChange: (event) => setKeyDraft(event.target.value),
													onKeyDown: (event) => {
														if (event.key === "Enter" && keyDraft.trim() !== "") applyKey("credential/set");
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "primary",
													size: "sm",
													"aria-label": t("panel.credential.save"),
													disabled: keyBusy || keyDraft.trim() === "",
													onClick: () => void applyKey("credential/set"),
													children: t("panel.action.save")
												}),
												credential.configured && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "ghost",
													size: "sm",
													disabled: keyBusy,
													onClick: () => void applyKey("credential/unset"),
													children: t("panel.credential.clear")
												})
											]
										}) : credential !== void 0 && credential.configured ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, { children: t("panel.credential.notWritable", { source: sourceLabel ?? "" }) }) : null,
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "ui-mockup-credential-status",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusDot, { ok: credential?.configured === true }), credentialLine]
										}),
										keyNotice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
											danger: keyNotice.kind === "error",
											children: keyNotice.text
										})
									]
								})]
							}),
							testResult !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, { children: testResult }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: "ui-mockup-connection-details",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("panel.connection.moreMethods") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ui-mockup-connection-methods",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.credential.howTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ol", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("panel.credential.way1", { credential: credentialName }) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("panel.credential.way2") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("panel.credential.way3", { credential: credentialName }) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("panel.credential.way4", { credential: credentialName }) })
									] })]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfigSection, {
						title: t("panel.models.title"),
						description: t("panel.models.description"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "ui-mockup-model-grid",
							children: modelTiers.map((tier) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ui-mockup-model-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "ui-mockup-model-label",
										children: tier.visibleLabel
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditableMenuCombobox, {
										label: tier.label,
										menuLabel: tier.menuLabel,
										value: tier.value,
										placeholder: t("panel.models.followDefault"),
										options: suggestionsOf(tier.key),
										open: openModelTier === tier.key,
										onOpenChange: (open) => setOpenModelTier(open ? tier.key : null),
										onChange: (value) => void writePref(prefs, tier.pref, value.trim(), setWriteError),
										disabled: snap.mode === "memory" || !snap.writable
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "ui-mockup-model-hint",
										children: t("panel.models.recommended", { models: activeMeta.hints[tier.key].find((model) => model !== "") ?? t("panel.models.followDefault") })
									})
								]
							}, tier.key))
						})
					})
				]
			});
		}
		const EDITABLE_PREF_FIELDS = [
			"defaultFidelity",
			"defaultPlatform",
			"defaultCount",
			"pollTimeoutMinutes",
			"defaultSize"
		];
		/** 只比较本页可编辑字段；Provider 模型偏好不应影响本页保存按钮。 */
		function editablePrefsEqual(left, right) {
			return left.defaultFidelity === right.defaultFidelity && left.defaultPlatform === right.defaultPlatform && left.defaultCount === right.defaultCount && left.pollTimeoutMinutes === right.pollTimeoutMinutes && left.defaultSize === right.defaultSize;
		}
		/** unset 成功以用户层字段消失为准；resolved value 可以来自自定义 composition base。 */
		function editableUserOverridesCleared(user) {
			if (user === void 0) return true;
			if (typeof user !== "object" || user === null || Array.isArray(user)) return false;
			return EDITABLE_PREF_FIELDS.every((field) => !Object.prototype.hasOwnProperty.call(user, field));
		}
		function PreferencesPage({ t, prefs }) {
			const snap = prefs.getSnapshot();
			usePrefSync(prefs);
			const initial = (0, react.useMemo)(() => snap.value ?? PANEL_DEFAULTS, [snap.value]);
			const [draft, setDraft] = (0, react.useState)(initial);
			const [baseline, setBaseline] = (0, react.useState)(initial);
			const [savedAt, setSavedAt] = (0, react.useState)(0);
			const [error, setError] = (0, react.useState)("");
			const [mutating, setMutating] = (0, react.useState)(false);
			const mutationLock = (0, react.useRef)(false);
			const dirty = !editablePrefsEqual(draft, baseline);
			(0, react.useEffect)(() => {
				if (!dirty && !mutating && snap.value !== void 0) {
					setDraft(snap.value);
					setBaseline(snap.value);
				}
			}, [
				dirty,
				mutating,
				snap.value
			]);
			const patch = (part) => {
				if (mutationLock.current) return;
				setDraft((prev) => ({
					...prev,
					...part
				}));
			};
			const beginMutation = () => {
				if (mutationLock.current) return false;
				mutationLock.current = true;
				setMutating(true);
				setSavedAt(0);
				setError("");
				return true;
			};
			const endMutation = () => {
				mutationLock.current = false;
				setMutating(false);
			};
			const confirmApplied = (expected) => {
				const actual = prefs.getSnapshot().value;
				if (actual === void 0 || !editablePrefsEqual(actual, expected)) throw new Error(t("panel.prefs.writeNotApplied"));
				return actual;
			};
			/** 单字段写入后立即确认落盘；宿主 set 失败时静默恢复（不抛错），逐字段确认
			能在第一时间中止后续写入，避免静默部分落盘。 */
			const setField = async (field, value) => {
				await prefs.set(field, value);
				const actual = prefs.getSnapshot().value;
				if (actual === void 0 || actual[field] !== value) throw new Error(t("panel.prefs.writeNotAppliedField", { field }));
			};
			const confirmResetApplied = () => {
				const current = prefs.getSnapshot();
				if (current.value === void 0 || !editableUserOverridesCleared(current.user)) throw new Error(t("panel.prefs.writeNotApplied"));
				return current.value;
			};
			const save = async () => {
				if (!beginMutation()) return;
				try {
					const saved = {
						...draft,
						defaultCount: Math.min(4, Math.max(1, Math.round(draft.defaultCount))),
						pollTimeoutMinutes: Math.max(1, Math.round(draft.pollTimeoutMinutes))
					};
					await setField("defaultFidelity", saved.defaultFidelity);
					await setField("defaultPlatform", saved.defaultPlatform);
					await setField("defaultCount", saved.defaultCount);
					await setField("pollTimeoutMinutes", saved.pollTimeoutMinutes);
					await setField("defaultSize", saved.defaultSize);
					const applied = confirmApplied(saved);
					setDraft(applied);
					setBaseline(applied);
					setSavedAt(Date.now());
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					endMutation();
				}
			};
			const resetDefaults = async () => {
				if (!beginMutation()) return;
				try {
					for (const field of EDITABLE_PREF_FIELDS) await prefs.unset(field);
					const applied = confirmResetApplied();
					setDraft(applied);
					setBaseline(applied);
					setSavedAt(Date.now());
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					endMutation();
				}
			};
			const readonlyNote = snap.mode === "memory" || !snap.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 12
				},
				children: [
					readonlyNote && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, { children: t("panel.readonlyBanner") }),
					error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
						danger: true,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(FieldRow, {
							first: true,
							label: t("panel.prefs.fidelity"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Radio, {
								label: t("panel.prefs.fidelityWireframe"),
								checked: draft.defaultFidelity === "wireframe",
								onChange: () => patch({ defaultFidelity: "wireframe" }),
								name: "pref-fidelity",
								disabled: readonlyNote || mutating
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Radio, {
								label: t("panel.prefs.fidelityHigh"),
								checked: draft.defaultFidelity === "high-fidelity",
								onChange: () => patch({ defaultFidelity: "high-fidelity" }),
								name: "pref-fidelity",
								disabled: readonlyNote || mutating
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(FieldRow, {
							label: t("panel.prefs.platform"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Radio, {
								label: "Web",
								checked: draft.defaultPlatform === "web",
								onChange: () => patch({ defaultPlatform: "web" }),
								name: "pref-platform",
								disabled: readonlyNote || mutating
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Radio, {
								label: "Mobile",
								checked: draft.defaultPlatform === "mobile",
								onChange: () => patch({ defaultPlatform: "mobile" }),
								name: "pref-platform",
								disabled: readonlyNote || mutating
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
							label: t("panel.prefs.count"),
							children: [
								1,
								2,
								3,
								4
							].map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Radio, {
								label: String(n),
								checked: draft.defaultCount === n,
								onChange: () => patch({ defaultCount: n }),
								name: "pref-count",
								disabled: readonlyNote || mutating
							}, n))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(FieldRow, {
							label: t("panel.prefs.pollTimeout"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								type: "number",
								"aria-label": t("panel.prefs.pollTimeout"),
								min: 1,
								max: 60,
								style: { width: 100 },
								value: draft.pollTimeoutMinutes,
								onChange: (event) => patch({ pollTimeoutMinutes: Number(event.target.value) }),
								disabled: readonlyNote || mutating
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 12,
									color: tokens.labelTertiary
								},
								children: t("panel.prefs.minutes")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
							label: t("panel.prefs.backoff"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 13,
									lineHeight: "20px",
									color: tokens.labelTertiary
								},
								children: t("panel.prefs.backoffFixed")
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
							label: t("panel.prefs.size"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuSelect, {
								label: t("panel.prefs.size"),
								value: draft.defaultSize,
								options: [
									{
										value: "",
										label: t("panel.models.followDefault")
									},
									{
										value: "1024*1024",
										label: "1024*1024"
									},
									{
										value: "1280*720",
										label: "1280*720"
									},
									{
										value: "720*1280",
										label: "720*1280"
									}
								],
								onChange: (value) => patch({ defaultSize: value }),
								disabled: readonlyNote || mutating
							})
						})
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ui-mockup-preferences-footer",
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => void resetDefaults(),
							disabled: readonlyNote || mutating,
							children: t("panel.prefs.reset")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ui-mockup-preferences-actions",
							style: {
								display: "flex",
								gap: 10,
								alignItems: "center"
							},
							children: [savedAt > 0 && !dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								role: "status",
								"aria-live": "polite",
								style: {
									fontSize: 12,
									color: tokens.labelTertiary
								},
								children: t("panel.prefs.saved")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								onClick: () => void save(),
								disabled: readonlyNote || mutating || !dirty,
								children: t("panel.prefs.save")
							})]
						})]
					})
				]
			});
		}
		function HistoryPage({ t, connection }) {
			const cwd = void 0;
			const [rows, setRows] = (0, react.useState)();
			const [anchorFile, setAnchorFile] = (0, react.useState)(null);
			const [anchorIndex, setAnchorIndex] = (0, react.useState)(-1);
			const [total, setTotal] = (0, react.useState)(0);
			const [page, setPage] = (0, react.useState)(1);
			const [queryDraft, setQueryDraft] = (0, react.useState)("");
			const [appliedQuery, setAppliedQuery] = (0, react.useState)("");
			const [draftOnly, setDraftOnly] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [confirmingClear, setConfirmingClear] = (0, react.useState)(false);
			const requestSeq = (0, react.useRef)(0);
			const reload = (0, react.useCallback)(async (needle, targetPage, onlyDraft) => {
				const seq = ++requestSeq.current;
				setError("");
				try {
					const data = await callPanel(connection, "history/list", {
						cwd,
						query: needle,
						page: targetPage,
						pageSize: 5,
						...onlyDraft ? { draftOnly: true } : {}
					});
					if (seq !== requestSeq.current) return;
					setRows(data.entries);
					setAnchorFile(data.anchorFile);
					setAnchorIndex(data.anchorIndex);
					setTotal(data.total);
					setPage(data.page);
				} catch (err) {
					if (seq !== requestSeq.current) return;
					setError(err instanceof Error ? err.message : String(err));
				}
			}, [connection, cwd]);
			(0, react.useEffect)(() => {
				setDraftOnly(false);
				reload("", 1, false);
			}, [reload]);
			const submitSearch = () => {
				setAppliedQuery(queryDraft);
				reload(queryDraft, 1, draftOnly);
			};
			const toggleDraftOnly = (next) => {
				setDraftOnly(next);
				reload(appliedQuery, 1, next);
			};
			const totalPages = Math.max(1, Math.ceil(total / 5));
			const anchorPage = anchorPageOf(anchorIndex, 5);
			const act = async (endpoint, payload, stayPage = page) => {
				try {
					await callPanel(connection, endpoint, payload);
					await reload(appliedQuery, stayPage, draftOnly);
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				}
			};
			if (error !== "") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
				danger: true,
				children: t("panel.loadFailed", { error })
			});
			if (rows === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: { color: tokens.labelTertiary },
				children: t("panel.loading")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "search",
						"aria-label": t("panel.history.searchLabel"),
						className: "ui-mockup-history-toolbar",
						style: {
							display: "flex",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								type: "search",
								"aria-label": t("panel.history.searchLabel"),
								className: "ui-mockup-history-search",
								placeholder: t("panel.history.searchPlaceholder"),
								value: queryDraft,
								onChange: (event) => setQueryDraft(event.target.value),
								onKeyDown: (event) => {
									if (event.key !== "Enter") return;
									event.preventDefault();
									submitSearch();
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: submitSearch,
								children: t("panel.history.search")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 6,
									fontSize: 12,
									color: tokens.labelSecondary,
									whiteSpace: "nowrap"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: draftOnly,
									onChange: (event) => toggleDraftOnly(event.target.checked)
								}), t("panel.history.draftOnly")]
							}),
							confirmingClear ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => void act("history/clear", { cwd }, 1).finally(() => setConfirmingClear(false)),
								style: {
									color: tokens.labelError,
									borderColor: tokens.labelError
								},
								children: t("panel.history.confirmClear")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => setConfirmingClear(false),
								children: t("panel.history.cancelClear")
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => setConfirmingClear(true),
								children: t("panel.history.clear")
							})
						]
					}),
					queryDraft !== appliedQuery && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						role: "status",
						"aria-live": "polite",
						style: {
							fontSize: 12,
							lineHeight: "17px",
							color: tokens.labelTertiary
						},
						children: t("panel.history.pendingSearch")
					}),
					rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: tokens.labelTertiary,
							fontSize: 13,
							lineHeight: "20px",
							padding: "18px 0",
							textAlign: "center"
						},
						children: t("panel.history.empty")
					}),
					rows.map((row, index) => {
						const first = row.files[0];
						const name = first === void 0 ? "" : first.split("/").pop() ?? "";
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ui-mockup-history-row",
							style: {
								display: "flex",
								gap: 10,
								alignItems: "center",
								border: `${row.anchored ? 2 : 1}px solid ${tokens.border}`,
								borderRadius: 8,
								padding: 8,
								position: "relative"
							},
							children: [
								row.anchored && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										position: "absolute",
										top: -9,
										right: 10,
										background: "var(--dsw-alias-bg-module-platform)",
										borderRadius: 999,
										fontSize: 11,
										lineHeight: "17px",
										padding: "1px 8px",
										fontWeight: 500,
										color: tokens.labelSecondary
									},
									children: ["🚩 ", t("panel.history.anchorTag")]
								}),
								name !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									src: imageUrl(name, cwd),
									alt: name,
									loading: "lazy",
									width: 56,
									height: 56,
									style: {
										borderRadius: 8,
										border: `1px solid ${tokens.border}`,
										objectFit: "cover",
										background: tokens.bgLayer,
										flexShrink: 0
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ui-mockup-history-summary",
									style: {
										minWidth: 0,
										display: "flex",
										flexDirection: "column",
										gap: 2
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
											fontSize: 13,
											lineHeight: "20px",
											fontWeight: row.anchored ? 600 : 400
										},
										children: row.description
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 12,
											lineHeight: "17px",
											color: tokens.labelTertiary
										},
										children: [
											formatTime(row.time),
											" · ",
											row.model ?? "—",
											" · ",
											row.size ?? "—",
											" ·",
											" ",
											t("panel.history.fileCount", { n: row.files.length }),
											row.fastPreview === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													marginLeft: 6,
													padding: "0 6px",
													borderRadius: 999,
													fontSize: 11,
													background: "var(--dsw-alias-bg-module-platform)",
													color: tokens.labelSecondary
												},
												children: t("panel.history.draftTag")
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ui-mockup-history-actions",
									style: {
										display: "flex",
										gap: 6,
										flexWrap: "wrap"
									},
									children: [row.anchored && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => void act("anchor/unset", { cwd }),
										children: t("panel.history.unsetAnchor")
									}), name !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										href: imageUrl(name, cwd),
										target: "_blank",
										rel: "noreferrer",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											children: t("card.openOriginal")
										})
									})]
								})
							]
						}, `${row.time}:${row.files[0] ?? index}`);
					}),
					anchorPage !== null && anchorPage !== page && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ui-mockup-history-anchor-nav",
						style: {
							display: "flex",
							alignItems: "center",
							gap: 6,
							fontSize: 12,
							lineHeight: "17px",
							color: tokens.labelSecondary
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["🚩 ", t("panel.history.anchorOnPage", { n: anchorPage })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => void reload(appliedQuery, anchorPage, draftOnly),
							children: t("panel.history.goToAnchor")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ui-mockup-history-pagination",
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 8,
							flexWrap: "wrap"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 12,
								color: tokens.labelTertiary
							},
							children: t("panel.history.totalCount", { n: total })
						}), totalPages > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ui-mockup-history-pages",
							style: {
								display: "flex",
								alignItems: "center",
								gap: 4
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: page <= 1,
									onClick: () => void reload(appliedQuery, page - 1, draftOnly),
									children: t("panel.history.prev")
								}),
								Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: p === page ? "primary" : "ghost",
									size: "sm",
									className: "ui-mockup-history-page-number",
									onClick: () => void reload(appliedQuery, p, draftOnly),
									children: p
								}, p)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: page >= totalPages,
									onClick: () => void reload(appliedQuery, page + 1, draftOnly),
									children: t("panel.history.next")
								})
							]
						})]
					}),
					anchorFile !== null && rows.some((r) => r.anchored) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, { children: t("panel.history.anchorHint") })
				]
			});
		}
		function formatTime(iso) {
			const date = new Date(iso);
			if (Number.isNaN(date.getTime())) return iso;
			const pad = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
		}
		function MenuSelect({ label, value, options, onChange, disabled }) {
			const [open, setOpen] = (0, react.useState)(false);
			const triggerRef = (0, react.useRef)(null);
			const idOf = (optionValue) => optionValue === "" ? "__default__" : optionValue;
			const selected = options.find((option) => option.value === value);
			const closeMenu = (0, react.useCallback)(() => setOpen(false), []);
			useMenuEscapeBoundary(open, closeMenu, triggerRef);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: closeMenu,
				items: options.map((option) => ({
					id: idOf(option.value),
					label: option.label
				})),
				selectedId: idOf(value),
				onSelect: (id) => {
					const option = options.find((entry) => idOf(entry.value) === id);
					if (option === void 0) return;
					triggerRef.current?.focus();
					closeMenu();
					onChange(option.value);
				},
				align: "end",
				portal: true,
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: triggerRef,
					type: "button",
					className: "ui-mockup-select-trigger",
					"aria-label": label,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					disabled,
					onClick: () => setOpen((current) => !current),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: selected?.label ?? value }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: "ui-mockup-select-chevron" })]
				})
			});
		}
		function EditableMenuCombobox({ label, menuLabel, value, placeholder, options, open, onOpenChange, onChange, disabled }) {
			const [activeOptionId, setActiveOptionId] = (0, react.useState)(null);
			const inputRef = (0, react.useRef)(null);
			const activeOption = activeOptionId !== null && options.includes(activeOptionId) ? activeOptionId : void 0;
			(0, react.useEffect)(() => {
				if (!open || activeOptionId !== null && !options.includes(activeOptionId)) setActiveOptionId(null);
			}, [
				activeOptionId,
				open,
				options
			]);
			const closeMenu = (0, react.useCallback)(() => {
				onOpenChange(false);
				setActiveOptionId(null);
			}, [onOpenChange]);
			useMenuEscapeBoundary(open, closeMenu, inputRef);
			const selectOption = (option) => {
				inputRef.current?.focus();
				closeMenu();
				onChange(option);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: open && options.length > 0,
				onClose: closeMenu,
				items: options.map((option) => ({
					id: option,
					label: option
				})),
				selectedId: activeOption ?? (options.includes(value) ? value : void 0),
				onSelect: selectOption,
				align: "start",
				portal: true,
				className: "ui-mockup-model-menu",
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "ui-mockup-model-combobox",
					"data-disabled": disabled === true,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						ref: inputRef,
						type: "text",
						role: "combobox",
						"aria-label": label,
						"aria-haspopup": "menu",
						"aria-expanded": open && options.length > 0,
						"aria-autocomplete": "list",
						value,
						placeholder,
						autoComplete: "off",
						spellCheck: false,
						disabled,
						onFocus: () => onOpenChange(true),
						onClick: () => onOpenChange(true),
						onChange: (event) => {
							onOpenChange(true);
							setActiveOptionId(null);
							onChange(event.target.value);
						},
						onKeyDown: (event) => {
							if (event.key === "Escape") {
								closeMenu();
								return;
							}
							if (event.key === "ArrowDown" || event.key === "ArrowUp") {
								if (options.length === 0) return;
								event.preventDefault();
								onOpenChange(true);
								setActiveOptionId((current) => {
									const currentIndex = current === null ? -1 : options.indexOf(current);
									if (currentIndex < 0) return event.key === "ArrowDown" ? options[0] ?? null : options.at(-1) ?? null;
									return options[(currentIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length] ?? null;
								});
								return;
							}
							if (event.key === "Enter" && open && activeOption !== void 0) {
								event.preventDefault();
								selectOption(activeOption);
							}
						}
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ui-mockup-model-menu-trigger",
						"aria-label": menuLabel,
						"aria-haspopup": "menu",
						"aria-expanded": open && options.length > 0,
						disabled: disabled || options.length === 0,
						onClick: () => {
							setActiveOptionId(null);
							onOpenChange(!open);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
					})]
				})
			});
		}
		/**
		* DSH Menu 与宿主 Modal 都在 document 监听 Esc。菜单打开时由更靠前的捕获阶段
		* 消费该按键并归还焦点，避免一次 Esc 同时关闭菜单和整个设置弹窗。
		*/
		function useMenuEscapeBoundary(open, onClose, returnFocus) {
			(0, react.useEffect)(() => {
				if (!open) return;
				const consumeEscape = (event) => {
					if (event.key !== "Escape") return;
					event.preventDefault();
					event.stopImmediatePropagation();
					returnFocus.current?.focus();
					onClose();
				};
				document.addEventListener("keydown", consumeEscape, true);
				return () => document.removeEventListener("keydown", consumeEscape, true);
			}, [
				open,
				onClose,
				returnFocus
			]);
		}
		function Radio(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 4
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "radio",
					name: props.name,
					checked: props.checked,
					disabled: props.disabled,
					onChange: props.onChange
				}), props.label]
			});
		}
		/** 订阅偏好快照使面板随宿主文档变更刷新（写回后镜像更新 → re-render）。 */
		function usePrefSync(prefs) {
			const [, bump] = (0, react.useState)(0);
			(0, react.useEffect)(() => prefs.subscribe(() => bump((n) => n + 1)), [prefs]);
		}
		/** 单字段写入并显示错误。 */
		async function writePref(prefs, field, value, onError) {
			try {
				await prefs.set(field, value);
				onError("");
			} catch (err) {
				onError(err instanceof Error ? err.message : String(err));
			}
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* 客户端半区硬依赖：卡片与设置槽注册、语言切换、connection 通道。
		* 0.2.x 起宿主不再提供 settingsScope 服务，偏好由 LocalPrefScope 本地持久化。
		*/
		const inject = [
			"slots",
			"locale",
			"connection"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-mockup: dictionaries");
			const prefs = new LocalPrefScope();
			const connection = ctx.get("connection");
			/**
			* 卡片锚点入口：设锚动作发生在「刚看完这版图」的瞬间，注入窄面
			* set/unset 闭包捕获 connection，直连 RPC 不绕 agent 消息流。
			*/
			const anchorFace = { set: (file, cwd) => callPanel(connection, "anchor/set", {
				file,
				cwd
			}) };
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "ui_mockup",
				locale: NS,
				inject: () => ({ anchor: anchorFace })
			}, UiMockupToolview));
			const panelInjected = () => ({
				prefs,
				connection
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "ui-mockup",
				order: 100,
				label: () => ctx.locale.bind(NS)("panel.nav"),
				locale: NS,
				inject: panelInjected
			}, UiMockupSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map