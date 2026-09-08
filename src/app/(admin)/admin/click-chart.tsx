import type { DailyClicks } from "@/lib/clicks";

/**
 * Daily LINE clicks over the retention window (SPEC.md §8 item 5).
 *
 * A column chart, not a line: these are discrete daily counts, and a line
 * between them would draw a continuity that does not exist — half a click on
 * Tuesday afternoon is not a reading. One series, so no legend; the heading
 * says what is plotted.
 *
 * Green is the one colour allowed here. docs/DESIGN.md reserves
 * `--color-accent` for the LINE handoff and nothing else, and this chart *is*
 * the LINE handoff counted. Text stays on the text tokens — no label wears the
 * series colour.
 *
 * Boxes rather than SVG. A responsive SVG has to choose between letterboxing
 * and `preserveAspectRatio="none"`, and the latter scales the columns, their
 * corner radii and their labels horizontally — measured at 35px wide against a
 * 24px cap, with visibly stretched type. In CSS the mark specs are real pixels
 * at every width: a 24px cap, a 4px radius on the data-end only, and a 2px gap
 * doing the separating.
 */
const PLOT_HEIGHT = 144;
const MAX_COLUMN_W = 24;

const thaiDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });

function label(day: string): string {
  return thaiDate.format(new Date(`${day}T00:00:00+07:00`));
}

export function ClickChart({ data }: { data: DailyClicks[] }) {
  if (data.length === 0) return null;

  const peak = Math.max(...data.map((d) => d.clicks));
  const total = data.reduce((sum, d) => sum + d.clicks, 0);
  const first = data[0];
  const last = data[data.length - 1];
  const middle = data[Math.floor((data.length - 1) / 2)];

  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={`กราฟจำนวนคลิก LINE รายวัน ${data.length} วันล่าสุด รวม ${total} ครั้ง สูงสุด ${peak} ครั้งต่อวัน`}
      >
        {/* gap-0.5 is the 2px surface gap; the columns are separated by it, not by a stroke. */}
        <div className="flex items-end gap-0.5" style={{ height: PLOT_HEIGHT }}>
          {data.map((point) => {
            const height = peak === 0 ? 0 : (point.clicks / peak) * (PLOT_HEIGHT - 16);
            return (
              <div
                key={point.day}
                // The whole band is the hover target, so a zero day still reads.
                title={`${label(point.day)} — ${point.clicks} ครั้ง`}
                className="flex h-full flex-1 flex-col justify-end"
              >
                {/* The one direct label: the peak. Everything else is in the table. */}
                {point.clicks === peak && peak > 0 && (
                  <span className="lat mb-1 text-center text-[11px] text-(--color-text-muted)">
                    {peak}
                  </span>
                )}
                <div
                  className="mx-auto w-full rounded-t-[4px] bg-(--color-accent)"
                  style={{
                    height: point.clicks === 0 ? 0 : Math.max(height, 3),
                    maxWidth: MAX_COLUMN_W,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Baseline. A grid behind thirty thin columns is more ink than data. */}
        <div className="h-px bg-(--color-border)" />

        {/* Three ticks, not thirty: a date under every column is unreadable. */}
        <div className="mt-2 flex justify-between text-[11px] text-(--color-text-muted)">
          <span>{first && label(first.day)}</span>
          <span>{middle && label(middle.day)}</span>
          <span>{last && label(last.day)}</span>
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-(--color-brand)">ดูข้อมูลเป็นตาราง</summary>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">จำนวนคลิก LINE รายวัน</caption>
          <thead>
            <tr className="border-b border-(--color-border)">
              <th scope="col" className="py-2 text-start font-medium">
                วันที่
              </th>
              <th scope="col" className="py-2 text-end font-medium">
                คลิก
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.day} className="border-b border-(--color-border)">
                <th scope="row" className="py-1.5 text-start font-normal text-(--color-text)">
                  {label(point.day)}
                </th>
                <td className="lat py-1.5 text-end text-(--color-text)">{point.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
