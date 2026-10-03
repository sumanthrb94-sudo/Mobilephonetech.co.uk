import { Plus, Trash2, Smartphone } from 'lucide-react';
import type { InventoryUnit, ProductGrade, ProductVariant } from '../../types';

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

const physicalUnit = (variant: ProductVariant, number: number): InventoryUnit => ({
  id: `unit-${Date.now().toString(36)}-${number}`,
  status: 'available',
  batteryHealth: variant.batteryHealth,
  supplier: variant.supplier,
  buyPrice: variant.buyPrice,
  stockLocation: variant.stockLocation ?? 'OFFICE',
  stockInDate: new Date().toISOString().slice(0, 10),
});

const availableUnits = (units: InventoryUnit[]) => units.filter(unit => unit.status === 'available').length;

/**
 * Model configuration first, physical unit second. A row describes what the
 * customer selects; its unit ledger contains the real devices and is the only
 * stock source once tracking begins. This avoids the old "one IMEI per
 * variant" problem where two identical phones could not both be traced.
 */
export default function VariantMatrixEditor({ variants, gradeChoices, isApplePhone, errors, onChange }: Props) {
  const patch = (index: number, change: Partial<ProductVariant>) =>
    onChange(variants.map((variant, i) => i === index ? { ...variant, ...change } : variant));
  const remove = (index: number) => onChange(variants.filter((_, i) => i !== index));
  const updateUnits = (index: number, nextUnits: InventoryUnit[]) =>
    patch(index, { inventoryUnits: nextUnits, stock: availableUnits(nextUnits) });
  const total = variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0);

  return (
    <section style={sectionStyle} aria-labelledby="variant-matrix-title">
      <div style={headStyle}>
        <div>
          <h2 id="variant-matrix-title" style={titleStyle}>Sellable configurations & units</h2>
          <p style={noteStyle}>Add a configuration for each customer-facing option. Then add each physical phone underneath with its IMEI, buy price and location. Once units are added, available stock is counted automatically.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-md" onClick={() => onChange([...variants, emptyVariant(variants.length + 1)])}>
          <Plus size={15} /> Add configuration
        </button>
      </div>

      {variants.length === 0 ? (
        <div style={emptyStyle}>
          <strong>Create the first customer-facing configuration.</strong>
          <span>For a single phone, add one row and then register each handset below it by IMEI.</span>
        </div>
      ) : (
        <>
          <p style={summaryStyle}>{variants.length} configurations · <strong>{total} units available</strong> · public price and stock are calculated from these rows.</p>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead><tr>{['Storage', 'Colour', 'Connection', 'Condition', 'Battery', 'Sell £', 'Was £', 'Available', 'Physical units', ''].map(label => <th key={label} style={thStyle}>{label}</th>)}</tr></thead>
              <tbody>
                {variants.map((variant, index) => {
                  const units = variant.inventoryUnits ?? [];
                  const tracked = units.length > 0;
                  const prefix = `variant-${index}`;
                  return (
                    <>
                      <tr key={variant.id}>
                        <td style={tdStyle}><input aria-label={`Configuration ${index + 1} storage`} style={inputStyle} value={variant.storage ?? ''} placeholder="128GB" onChange={e => patch(index, { storage: e.target.value })} /></td>
                        <td style={tdStyle}><input aria-label={`Configuration ${index + 1} colour`} style={inputStyle} value={variant.color ?? ''} placeholder="Black" onChange={e => patch(index, { color: e.target.value })} /></td>
                        <td style={tdStyle}><select aria-label={`Configuration ${index + 1} connection`} style={inputStyle} value={variant.connectivity ?? ''} onChange={e => patch(index, { connectivity: e.target.value })}><option value="">—</option><option value="Wi-Fi">Wi-Fi</option><option value="Cellular">Cellular</option></select></td>
                        <td style={tdStyle}><select aria-label={`Configuration ${index + 1} condition`} style={inputStyle} value={variant.condition ?? 'Pristine'} onChange={e => patch(index, { condition: e.target.value as ProductGrade })}>{gradeChoices.map(g => <option key={g} value={g}>{g}</option>)}</select></td>
                        <td style={tdStyle}><input aria-label={`Configuration ${index + 1} battery health`} style={inputStyle} type="number" min={isApplePhone ? 85 : 0} max="100" value={variant.batteryHealth ?? ''} placeholder={isApplePhone ? '85+' : '—'} onChange={e => patch(index, { batteryHealth: e.target.value === '' ? undefined : Number(e.target.value) })} /></td>
                        <td style={tdStyle}><input aria-label={`Configuration ${index + 1} selling price`} style={inputStyle} type="number" min="0" step="0.01" value={variant.price || ''} onChange={e => patch(index, { price: Number(e.target.value) || 0 })} /></td>
                        <td style={tdStyle}><input aria-label={`Configuration ${index + 1} was price`} style={inputStyle} type="number" min="0" step="0.01" value={variant.originalPrice || ''} onChange={e => patch(index, { originalPrice: Number(e.target.value) || 0 })} /></td>
                        <td style={tdStyle}>
                          {tracked ? <strong style={stockCountStyle}>{availableUnits(units)} tracked</strong> : <input aria-label={`Configuration ${index + 1} stock`} style={inputStyle} type="number" min="0" step="1" value={variant.stock} onChange={e => patch(index, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />}
                        </td>
                        <td style={tdStyle}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateUnits(index, [...units, physicalUnit(variant, units.length + 1)])}>
                            <Smartphone size={14} /> {tracked ? 'Add unit' : 'Track by IMEI'}
                          </button>
                        </td>
                        <td style={tdStyle}><button type="button" className="admin-ghost-danger" aria-label={`Remove configuration ${index + 1}`} onClick={() => remove(index)}><Trash2 size={15} /></button></td>
                      </tr>
                      {tracked && (
                        <tr key={`${variant.id}-units`}>
                          <td colSpan={10} style={unitCellStyle}>
                            <div style={unitHeadStyle}>
                              <strong style={unitTitleStyle}>Physical unit ledger</strong>
                              <span style={unitHintStyle}>Sold status is changed automatically by the order flow. Remove only a unit entered in error.</span>
                            </div>
                            <div style={unitGridStyle}>
                              {units.map((unit, unitIndex) => (
                                <UnitCard
                                  key={unit.id || unitIndex}
                                  unit={unit}
                                  unitNumber={unitIndex + 1}
                                  isApplePhone={isApplePhone}
                                  errors={Object.entries(errors).filter(([key]) => key.startsWith(`${prefix}-unit-${unitIndex}`)).map(([, message]) => message).filter(Boolean) as string[]}
                                  onChange={change => updateUnits(index, units.map((candidate, i) => i === unitIndex ? { ...candidate, ...change } : candidate))}
                                  onRemove={() => updateUnits(index, units.filter((_, i) => i !== unitIndex))}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      {Object.keys(errors).some(key => key.startsWith(prefix) && !key.includes('-unit-')) && <tr key={`${variant.id}-errors`}><td colSpan={10} style={errorCellStyle}>{Object.entries(errors).filter(([key]) => key.startsWith(prefix) && !key.includes('-unit-')).map(([, value]) => value).join(' ')}</td></tr>}
                    </>
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

function UnitCard({ unit, unitNumber, isApplePhone, errors, onChange, onRemove }: {
  unit: InventoryUnit; unitNumber: number; isApplePhone: boolean; errors: string[];
  onChange: (change: Partial<InventoryUnit>) => void; onRemove: () => void;
}) {
  return (
    <article style={unitCardStyle}>
      <div style={unitCardHeadStyle}>
        <strong style={unitNameStyle}>Unit {unitNumber} <span style={statusStyle}>{unit.status}</span></strong>
        <button type="button" className="admin-ghost-danger" aria-label={`Remove unit ${unitNumber}`} onClick={onRemove}><Trash2 size={14} /></button>
      </div>
      <div style={unitFieldsStyle}>
        <MiniField label="IMEI" required><input aria-label={`Unit ${unitNumber} IMEI`} style={miniInputStyle} inputMode="numeric" value={unit.imei ?? ''} placeholder="15 digits" onChange={e => onChange({ imei: e.target.value.replace(/\s/g, '') })} /></MiniField>
        <MiniField label="SKU"><input aria-label={`Unit ${unitNumber} SKU`} style={miniInputStyle} value={unit.sku ?? ''} onChange={e => onChange({ sku: e.target.value })} /></MiniField>
        <MiniField label="Buy price £"><input aria-label={`Unit ${unitNumber} buy price`} style={miniInputStyle} type="number" min="0" step="0.01" value={unit.buyPrice ?? ''} onChange={e => onChange({ buyPrice: e.target.value === '' ? undefined : Number(e.target.value) })} /></MiniField>
        <MiniField label="Supplier"><input aria-label={`Unit ${unitNumber} supplier`} style={miniInputStyle} value={unit.supplier ?? ''} onChange={e => onChange({ supplier: e.target.value })} /></MiniField>
        <MiniField label="Location"><select aria-label={`Unit ${unitNumber} stock location`} style={miniInputStyle} value={unit.stockLocation ?? 'OFFICE'} onChange={e => onChange({ stockLocation: e.target.value as InventoryUnit['stockLocation'] })}><option value="OFFICE">Office</option><option value="SHS">SHS</option><option value="WAREHOUSE">Warehouse</option><option value="FBA">FBA</option></select></MiniField>
        <MiniField label="Stock in"><input aria-label={`Unit ${unitNumber} stock in date`} style={miniInputStyle} type="date" value={unit.stockInDate ?? ''} onChange={e => onChange({ stockInDate: e.target.value || undefined })} /></MiniField>
        <MiniField label={isApplePhone ? 'Battery %' : 'Battery % (optional)'}><input aria-label={`Unit ${unitNumber} battery health`} style={miniInputStyle} type="number" min={isApplePhone ? 85 : 0} max="100" value={unit.batteryHealth ?? ''} placeholder={isApplePhone ? '85+' : '—'} onChange={e => onChange({ batteryHealth: e.target.value === '' ? undefined : Number(e.target.value) })} /></MiniField>
      </div>
      <MiniField label="Internal note"><input aria-label={`Unit ${unitNumber} internal note`} style={miniInputStyle} value={unit.notes ?? ''} placeholder="Cosmetic note, shelf position…" onChange={e => onChange({ notes: e.target.value })} /></MiniField>
      {errors.length > 0 && <p role="alert" style={unitErrorStyle}>{errors.join(' ')}</p>}
    </article>
  );
}

function MiniField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label style={miniFieldStyle}><span>{label}{required && <b style={{ color: 'var(--color-sale)' }}> *</b>}</span>{children}</label>;
}

const sectionStyle: React.CSSProperties = { border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-20)', marginBottom: 'var(--spacing-20)', background: 'var(--grey-0)' };
const headStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' };
const titleStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--black)' };
const noteStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: 'var(--grey-60)', margin: '5px 0 0', maxWidth: 700 };
const emptyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16, padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--grey-5)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-60)' };
const summaryStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-60)', margin: '16px 0 10px' };
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-md)' };
const tableStyle: React.CSSProperties = { width: '100%', minWidth: 1100, borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 8px', fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--grey-50)', background: 'var(--grey-5)' };
const tdStyle: React.CSSProperties = { padding: 8, borderTop: '1px solid var(--grey-10)', verticalAlign: 'top' };
const inputStyle: React.CSSProperties = { width: '100%', minWidth: 74, height: 36, padding: '0 8px', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-sm)', background: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, boxSizing: 'border-box' };
const stockCountStyle: React.CSSProperties = { display: 'inline-block', minWidth: 78, paddingTop: 9, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-trust-text)' };
const unitCellStyle: React.CSSProperties = { padding: '14px 16px 16px', background: 'var(--grey-5)', borderTop: '1px solid var(--grey-10)' };
const unitHeadStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 };
const unitTitleStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--black)' };
const unitHintStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--grey-50)' };
const unitGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 };
const unitCardStyle: React.CSSProperties = { padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-15)', background: '#fff' };
const unitCardHeadStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 };
const unitNameStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--black)' };
const statusStyle: React.CSSProperties = { marginLeft: 5, padding: '2px 6px', borderRadius: 99, background: 'var(--color-trust)', color: 'var(--color-trust-text)', fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
const unitFieldsStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 8 };
const miniFieldStyle: React.CSSProperties = { display: 'grid', gap: 4, fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 700, color: 'var(--grey-60)' };
const miniInputStyle: React.CSSProperties = { width: '100%', minWidth: 0, height: 34, padding: '0 8px', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-sm)', background: '#fff', boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--black)' };
const unitErrorStyle: React.CSSProperties = { margin: '8px 0 0', color: 'var(--color-sale)', fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.4 };
const errorCellStyle: React.CSSProperties = { padding: '0 8px 10px', color: 'var(--color-sale)', fontFamily: 'var(--font-body)', fontSize: 12 };
