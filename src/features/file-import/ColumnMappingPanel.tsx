import { CSV_COLUMN_DEFINITIONS, type ColumnMapping, type CsvColumnKey } from "../../domain/csv";

interface ColumnMappingPanelProps {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (key: CsvColumnKey, header: string | null) => void;
}

export function ColumnMappingPanel({ headers, mapping, onChange }: ColumnMappingPanelProps) {
  return (
    <table className="column-mapping-table">
      <thead>
        <tr>
          <th>項目</th>
          <th>CSV列</th>
        </tr>
      </thead>
      <tbody>
        {CSV_COLUMN_DEFINITIONS.map((def) => (
          <tr key={def.key}>
            <td>
              {def.label}
              {def.required ? <span className="required-mark"> *</span> : null}
            </td>
            <td>
              <select
                value={mapping[def.key] ?? ""}
                onChange={(e) => onChange(def.key, e.target.value === "" ? null : e.target.value)}
              >
                <option value="">（未割当）</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
