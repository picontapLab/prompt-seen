import { useTranslations } from 'next-intl';
import styles from './FrameNumber.module.css';

/** Four-digit frame number from a work's sequence number, e.g. 127 → "0127" (§11.1.9). */
export const formatFrame = (n: number) => String(Math.trunc(n)).padStart(4, '0');

export type FrameNumberProps = {
  n: number;
  /** "FRAME 0127" (captions, detail) instead of "0127" (cards). */
  labelled?: boolean;
  /** On the film edge: film-mark amber, which stays bright in both themes. */
  onFilm?: boolean;
  className?: string;
};

/** Frame number: monospaced digits in safelight amber (`mark`, §11.1.9). */
export function FrameNumber({ n, labelled, onFilm, className }: FrameNumberProps) {
  const t = useTranslations('shell.brand');
  const number = formatFrame(n);
  return (
    <span className={[styles.frame, onFilm && styles.onFilm, className].filter(Boolean).join(' ')}>
      {labelled ? t('frame', { number }) : number}
    </span>
  );
}
