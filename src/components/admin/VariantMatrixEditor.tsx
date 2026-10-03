import { Plus, Trash2 } from 'lucide-react';
import type { ProductGrade, ProductVariant } from '../../types';

type Props = {
  variants: ProductVariant[];
  gradeChoices: ProductGrade[];
  isApplePhone: boolean;
  errors: Record<string, string | undefined>;
  onChange: (variants: ProductVariant[]) => void;
};

const emptyVariant = (number: number): ProductVariant => ({
  id: `variant-${Date.now().toString(36)}-${number}`,
  color: '', storage: '', connectivity: '', condition: 'Pristine',
  price: 0, originalPrice: 0, stock: 0,
});

/** A single model's actual sellable configurations — never a guessed matrix. */
export default function VariantMatrixEditor({ variants, gradeChoices, isApplePhone, errors, onChange }: Props) {
  const patch = (index: number, change: Partial<ProductVariant>) =>
    onChange(variants.map((variant, i) => i === index ? { ...variant, ...change } : variant));
  const remove = (index: number) => onChange(variants.filter((_, i) => i !== index));
  const total = variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0);

  return (
    <section style={sectionStyle} aria-labelledby="variant-matrix-title">
      <div style={headStyle}>
        <div>
          <h2 id="variant-matrix-title" style={titleStyle}>Sellable variants</h2>
          <p style={noteStyle}>Create only configurations you physically have. Set stock to 0 when a unit sells elsewhere; it stays recorded but disappears from sale.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-md" onClick={() => onChange([...variants, emptyVariant(variants.length + 1)])}>
          <Plus size={15} /> Add variant
        </button>
      </div>

      {variants.length === 0 ? (
        <div style={emptyStyle}>
          <strong>This is a single-SKU listing.</strong>
          <span>Use “Add variant” for a model with storage, colour, condition, Wi-Fi/cellular or battery differences.</span>
        </div>
      ) : (
        <>
          <p style={summaryStyle}>{variants.length} configurations · <strong>{total} units available</strong> · card price and stock are calculated from these rows.</p>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead><tr>{['Storage', 'Colour', 'Connection', 'Condition', 'Battery', 'Sell £', 'Was £', 'Stock', ''].map(label => <th key={label} style={thStyle}>{label}</th>)}</tr></thead>
              <tbody>
                {variants.map((variant, index) => {
                  const prefix = `variant-${index}`;
                  return (
                    <tr key={variant.id}>
                      <td style={tdStyle}><input aria-label={`Variant ${index + 1} storage`} style={inputStyle} value={variant.storage ?? ''} placeholder="128GB" onChange={e => patch(index, { storage: e.target.value })} /></td>
                      <td style={tdStyle}><input aria-label={`Variant ${index + 1} colour`} style={inputStyle} value={variant.color ?? ''} placeholder="Black" onChange={e => patch(index, { color: e.target.value })} /></td>
                      <td style={tdStyle}><select aria-label={`Variant ${index + 1} connection`} style={inputStyle} value={variant.connectivity ?? ''} onChange={e => patch(index, { connectivity: e.target.value })}><option value="">—</option><option value="Wi-Fi">Wi-Fi</option><option value="Cellular">Cellular</option></select></td>
                      <td style={tdStyle}><select aria-label={`Variant ${index + 1} condition`} style={inputStyle} value={variant.condition ?? 'Pristine'} onChange={e => patch(index, { condition: e.target.value as ProductGrade })}>{gradeChoices.map(g => <option key={g} value={g}>{g}</option>)}</select></td>
                      <td style={tdStyle}><input aria-label={`Variant ${index + 1} battery health`} style={inputStyle} type="number" min={isApplePhone ? 85 : 0} max="100" value={variant.batteryHealth ?? ''} placeholder={isApplePhone ? '85+' : '—'} onChange={e => patch(index, { batteryHealth: e.target.value === '' ? undefined : Number(e.target.value) })} /></td>
                      <td style={tdStyle}><input aria-label={`Variant ${index + 1} selling price`} style={inputStyle} type="number" min="0" step="0.01" value={variant.price || ''} onChange={e => patch(index, { price: Number(e.target.value) || 0 })} /></td>
                      <td style={tdStyle}><input aria-label={`Variant ${index + 1} was price`} style={inputStyle} type="number" min="0" step="0.01" value={variant.originalPrice || ''} onChange={e => patch(index, { originalPrice: Number(e.target.value) || 0 })} /></td>
                      <td style={tdStyle}><input aria-label={`Variant ${index + 1} stock`} style={inputStyle} type="number" min="0" step="1" value={variant.stock} onChange={e => patch(index, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} /></td>
                      <td style={tdStyle}><button type="button" className="admin-ghost-danger" aria-label={`Remove variant ${index + 1}`} onClick={() => remove(index)}><Trash2 size={15} /></button></td>
                      {Object.keys(errors).some(key => key.startsWith(prefix)) && <td colSpan={9} style={errorCellStyle}>{Object.entries(errors).filter(([key]) => key.startsWith(prefix)).map(([, value]) => value).join(' ')}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

const sectionStyle: React.CSSProperties = { border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-20)', marginBottom: 'var(--spacing-20)', background: 'var(--grey-0)' };
const headStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' };
const titleStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--black)' };
const noteStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: 'var(--grey-60)', margin: '5px 0 0', maxWidth: 620 };
const emptyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16, padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--grey-5)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-60)' };
const summaryStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-60)', margin: '16px 0 10px' };
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-md)' };
const tableStyle: React.CSSProperties = { width: '100%', minWidth: 900, borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 8px', fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--grey-50)', background: 'var(--grey-5)' };
const tdStyle: React.CSSProperties = { padding: 8, borderTop: '1px solid var(--grey-10)', verticalAlign: 'top' };
const inputStyle: React.CSSProperties = { width: '100%', minWidth: 74, height: 36, padding: '0 8px', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-sm)', background: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, boxSizing: 'border-box' };
const errorCellStyle: React.CSSProperties = { padding: '0 8px 10px', color: 'var(--color-sale)', fontFamily: 'var(--font-body)', fontSize: 12 };
