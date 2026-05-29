import React from 'react';
import BlockWrapper from './BlockWrapper';
import { Plus, Minus } from 'lucide-react';

const TableBlock = ({
  block,
  activeTool,
  isDarkMode,
  updateBlock,
  removeBlock,
  onInteract,
  isEditing,
  setEditing,
  isDragging,
  canvasScale,
  canvasPan
}) => {
  const rows = block.rowsCount || 3;
  const cols = block.colsCount || 3;
  const cells = block.cells || {};

  const handleCellChange = (r, c, val) => {
    const updatedCells = { ...cells, [`${r}-${c}`]: val };
    updateBlock(block.id, { cells: updatedCells });
  };

  const handleAddRow = (e) => {
    e.stopPropagation();
    updateBlock(block.id, { rowsCount: rows + 1 });
  };

  const handleRemoveRow = (e) => {
    e.stopPropagation();
    if (rows > 1) {
      // Clean up deleted row cells
      const updatedCells = { ...cells };
      for (let c = 0; c < cols; c++) {
        delete updatedCells[`${rows - 1}-${c}`];
      }
      updateBlock(block.id, { rowsCount: rows - 1, cells: updatedCells });
    }
  };

  const handleAddCol = (e) => {
    e.stopPropagation();
    updateBlock(block.id, { colsCount: cols + 1 });
  };

  const handleRemoveCol = (e) => {
    e.stopPropagation();
    if (cols > 1) {
      // Clean up deleted col cells
      const updatedCells = { ...cells };
      for (let r = 0; r < rows; r++) {
        delete updatedCells[`${r}-${cols - 1}`];
      }
      updateBlock(block.id, { colsCount: cols - 1, cells: updatedCells });
    }
  };

  const headerActions = (
    <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 rounded-xl p-1 no-interact">
      <button
        onClick={handleAddRow}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-[var(--text-primary)] transition"
        title="Adicionar Linha"
      >
        <Plus size={12} />
      </button>
      <button
        onClick={handleRemoveRow}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-[var(--text-primary)] transition"
        title="Remover Linha"
      >
        <Minus size={12} />
      </button>
      <div className="w-[1px] h-3 bg-[var(--text-secondary)] opacity-20 mx-0.5" />
      <button
        onClick={handleAddCol}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-[var(--text-primary)] transition"
        title="Adicionar Coluna"
      >
        <Plus size={12} className="rotate-90" />
      </button>
      <button
        onClick={handleRemoveCol}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-[var(--text-primary)] transition"
        title="Remover Coluna"
      >
        <Minus size={12} className="rotate-90" />
      </button>
    </div>
  );

  return (
    <BlockWrapper
      block={block}
      title="Tabela"
      color="emerald"
      isEditing={isEditing}
      isDragging={isDragging}
      isDarkMode={isDarkMode}
      onClose={removeBlock}
      onInteract={onInteract}
      onDoubleClick={() => setEditing(true)}
      canvasScale={canvasScale}
      canvasPan={canvasPan}
      updateBlock={updateBlock}
      headerActions={headerActions}
    >
      <div className="block-interactivity-isolation w-full h-full p-4 overflow-auto min-h-[150px]">
        <table className="w-full border-collapse select-text">
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-black/10 dark:border-white/10 last:border-0">
                {Array.from({ length: cols }).map((_, c) => {
                  const cellId = `${r}-${c}`;
                  return (
                    <td
                      key={c}
                      className="border-r border-black/10 dark:border-white/10 last:border-0 p-1 min-w-[80px]"
                    >
                      <textarea
                        value={cells[cellId] || ''}
                        onChange={(e) => handleCellChange(r, c, e.target.value)}
                        placeholder="..."
                        rows={1}
                        className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] resize-none text-[0.85rem] px-2 py-1 focus:bg-black/5 dark:focus:bg-white/5 rounded transition font-medium"
                        style={{ minHeight: '2rem' }}
                        onFocus={() => setEditing(true)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockWrapper>
  );
};

export default TableBlock;
