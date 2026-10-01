export type BadgeTone = 'active' | 'inactive' | 'pending' | 'neutral';

/** Map domain statuses to badge tones so pages stay consistent. */
export function toneForStatus(status: string): BadgeTone {
  switch (status) {
    case 'ACTIVE':
    case 'ALLOCATED':
    case 'MINTED':
      return 'active';
    case 'PENDING':
    case 'REGISTERED':
      return 'pending';
    case 'INACTIVE':
    case 'ARCHIVED':
      return 'inactive';
    default:
      return 'neutral';
  }
}
