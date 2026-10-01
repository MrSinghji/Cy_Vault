import type { BadgeTone } from '../utils/status';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

/** Status/role pill. Tone maps to a CSS class in index.css. */
export default function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
