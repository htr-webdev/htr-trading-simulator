const POSITION_HEADERS = [
  "Symbol",
  "Volume",
  "Entry",
  "Current",
  "P/L",
  "Close",
] as const;

/**
 * Positions table shared by the desktop terminal panel and the mobile
 * terminal section. Shows an empty placeholder until paper trading
 * provides real positions.
 */
function PositionsTable() {
  return (
    <table className="w-full font-mono-terminal text-xs" data-testid="positions-table">
      <thead>
        <tr className="text-left text-terminal-muted">
          {POSITION_HEADERS.map((header) => (
            <th key={header} scope="col" className="px-2 py-1 font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        <tr>
          <td
            colSpan={POSITION_HEADERS.length}
            className="px-2 py-4 text-center text-terminal-muted"
          >
            No positions
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default PositionsTable;
