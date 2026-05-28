import { create } from 'zustand';

const normalize = (array) => {
  if (!array) return {};
  return array.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
};

export const useCanvasStore = create((set, get) => ({
  // Dicionários individuais para O(1) de acesso e máxima reatividade
  strokes: {},
  strokeIds: [],

  textBlocks: {},
  textBlockIds: [],

  imageBlocks: {},
  imageBlockIds: [],

  codeBlocks: {},
  codeBlockIds: [],

  mathBlocks: {},
  mathBlockIds: [],

  ggbBlocks: {},
  ggbBlockIds: [],

  mermaidBlocks: {},
  mermaidBlockIds: [],

  mindmapBlocks: {},
  mindmapBlockIds: [],

  pdfBlocks: {},
  pdfBlockIds: [],

  connections: {},
  connectionIds: [],

  // Estados de Interação
  selectedIds: [],
  selectedStrokeIds: [],
  selectedConnectionIds: [],
  isDrawing: false,
  isErasing: false,
  isDraggingSelection: false,
  editingBlockId: null,
  hoveredBlockId: null,
  connectingState: null,
  eraserCursorPos: null,

  // Carregar dados da nota de forma limpa
  loadNoteData: (content) => set({
    strokes: normalize(content?.strokes),
    strokeIds: (content?.strokes || []).map(s => s.id),

    textBlocks: normalize(content?.textBlocks),
    textBlockIds: (content?.textBlocks || []).map(b => b.id),

    imageBlocks: normalize(content?.imageBlocks),
    imageBlockIds: (content?.imageBlockIds || content?.imageBlocks || []).map(b => b.id),

    codeBlocks: normalize(content?.codeBlocks),
    codeBlockIds: (content?.codeBlocks || []).map(b => b.id),

    mathBlocks: normalize(content?.mathBlocks),
    mathBlockIds: (content?.mathBlocks || []).map(b => b.id),

    ggbBlocks: normalize(content?.ggbBlocks),
    ggbBlockIds: (content?.ggbBlocks || []).map(b => b.id),

    mermaidBlocks: normalize(content?.mermaidBlocks),
    mermaidBlockIds: (content?.mermaidBlocks || []).map(b => b.id),

    mindmapBlocks: normalize(content?.mindmapBlocks),
    mindmapBlockIds: (content?.mindmapBlocks || []).map(b => b.id),

    pdfBlocks: normalize(content?.pdfBlocks),
    pdfBlockIds: (content?.pdfBlocks || []).map(b => b.id),

    connections: normalize(content?.connections),
    connectionIds: (content?.connections || []).map(c => c.id),

    selectedIds: [],
    selectedStrokeIds: [],
    selectedConnectionIds: [],
    isDrawing: false,
    isErasing: false,
    isDraggingSelection: false,
    editingBlockId: null,
    hoveredBlockId: null,
    connectingState: null,
    eraserCursorPos: null
  }),

  // Helpers genéricos com suporte a Atualizações Funcionais (compatibilidade total com useState)
  setStrokes: (arg) => set(state => {
    const current = Object.values(state.strokes);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      strokes: normalize(resolved),
      strokeIds: resolved.map(s => s.id)
    };
  }),

  setTextBlocks: (arg) => set(state => {
    const current = Object.values(state.textBlocks);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      textBlocks: normalize(resolved),
      textBlockIds: resolved.map(b => b.id)
    };
  }),

  setImageBlocks: (arg) => set(state => {
    const current = Object.values(state.imageBlocks);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      imageBlocks: normalize(resolved),
      imageBlockIds: resolved.map(b => b.id)
    };
  }),

  setCodeBlocks: (arg) => set(state => {
    const current = Object.values(state.codeBlocks);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      codeBlocks: normalize(resolved),
      codeBlockIds: resolved.map(b => b.id)
    };
  }),

  setMathBlocks: (arg) => set(state => {
    const current = Object.values(state.mathBlocks);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      mathBlocks: normalize(resolved),
      mathBlockIds: resolved.map(b => b.id)
    };
  }),

  setGgbBlocks: (arg) => set(state => {
    const current = Object.values(state.ggbBlocks);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      ggbBlocks: normalize(resolved),
      ggbBlockIds: resolved.map(b => b.id)
    };
  }),

  setMermaidBlocks: (arg) => set(state => {
    const current = Object.values(state.mermaidBlocks);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      mermaidBlocks: normalize(resolved),
      mermaidBlockIds: resolved.map(b => b.id)
    };
  }),

  setMindmapBlocks: (arg) => set(state => {
    const current = Object.values(state.mindmapBlocks);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      mindmapBlocks: normalize(resolved),
      mindmapBlockIds: resolved.map(b => b.id)
    };
  }),

  setPdfBlocks: (arg) => set(state => {
    const current = Object.values(state.pdfBlocks);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      pdfBlocks: normalize(resolved),
      pdfBlockIds: resolved.map(b => b.id)
    };
  }),

  setConnections: (arg) => set(state => {
    const current = Object.values(state.connections);
    const resolved = typeof arg === 'function' ? arg(current) : arg;
    return {
      connections: normalize(resolved),
      connectionIds: resolved.map(c => c.id)
    };
  }),

  // Getters para compatibilidade com o formato original de exportação/gravação
  getCanvasContent: () => {
    const s = get();
    return {
      strokes: Object.values(s.strokes),
      textBlocks: Object.values(s.textBlocks),
      imageBlocks: Object.values(s.imageBlocks),
      codeBlocks: Object.values(s.codeBlocks),
      mathBlocks: Object.values(s.mathBlocks),
      ggbBlocks: Object.values(s.ggbBlocks),
      mermaidBlocks: Object.values(s.mermaidBlocks),
      mindmapBlocks: Object.values(s.mindmapBlocks),
      pdfBlocks: Object.values(s.pdfBlocks),
      connections: Object.values(s.connections)
    };
  },

  // Ações de Estado de Interação
  setSelectedIds: (arg) => set(state => ({ selectedIds: typeof arg === 'function' ? arg(state.selectedIds) : arg })),
  setSelectedStrokeIds: (arg) => set(state => ({ selectedStrokeIds: typeof arg === 'function' ? arg(state.selectedStrokeIds) : arg })),
  setSelectedConnectionIds: (arg) => set(state => ({ selectedConnectionIds: typeof arg === 'function' ? arg(state.selectedConnectionIds) : arg })),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setIsErasing: (isErasing) => set({ isErasing }),
  setIsDraggingSelection: (isDragging) => set({ isDraggingSelection: isDragging }),
  setEditingBlockId: (id) => set({ editingBlockId: id }),
  setHoveredBlockId: (id) => set({ hoveredBlockId: id }),
  setConnectingState: (arg) => set(state => ({ connectingState: typeof arg === 'function' ? arg(state.connectingState) : arg })),
  setEraserCursorPos: (arg) => set(state => ({ eraserCursorPos: typeof arg === 'function' ? arg(state.eraserCursorPos) : arg }))
}));
