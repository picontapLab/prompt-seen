'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { Label, Radio, RadioGroup, Text } from 'react-aria-components';
import { cx } from '@/ui/primitives/cx';
import fieldStyles from '@/ui/primitives/Field.module.css';
import { ratioOf } from './values';
import styles from './Pickers.module.css';

export type PickerOption = { value: string; label: string; lang?: string; swatch?: readonly string[] | null };

type PickerProps = {
  label: ReactNode;
  necessity?: 'optional' | 'required';
  description?: ReactNode;
  options: readonly PickerOption[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  className?: string;
};

function Picker({
  label,
  necessity,
  description,
  options,
  value,
  onChange,
  isDisabled,
  className,
  kind,
}: PickerProps & { kind: 'ratio' | 'swatch' }) {
  const f = useTranslations('primitives.field');
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
      orientation="horizontal"
      className={cx(fieldStyles.field, className)}
    >
      <Label className={fieldStyles.label}>
        {label}
        {necessity && <span className={fieldStyles.necessity}> · {f(necessity)}</span>}
      </Label>
      <div className={styles.options} data-kind={kind}>
        {options.map((option) => (
          <Radio key={option.value} value={option.value} className={styles.option}>
            {kind === 'ratio' ? <Frame value={option.value} /> : <Swatch colors={option.swatch ?? []} />}
            <span lang={option.lang} dir="auto" className={styles.optionLabel}>
              {option.label}
            </span>
          </Radio>
        ))}
      </div>
      {description && (
        <Text slot="description" className={fieldStyles.description}>
          {description}
        </Text>
      )}
    </RadioGroup>
  );
}

/** The ratio drawn at its true proportions inside a fixed box, so 21:9 and 1:3 read at a glance. */
function Frame({ value }: { value: string }) {
  const r = ratioOf(value);
  const style = { '--_w': r >= 1 ? 1 : r, '--_h': r >= 1 ? 1 / r : 1 } as CSSProperties;
  return (
    <span className={styles.frameBox} aria-hidden="true">
      <span className={styles.frame} style={style} />
    </span>
  );
}

/** The option's colours side by side. They are content, not tokens: the template defines them. */
function Swatch({ colors }: { colors: readonly string[] }) {
  return (
    <span className={styles.swatch} aria-hidden="true">
      {colors.map((color, i) => (
        <span key={i} style={{ background: color }} />
      ))}
    </span>
  );
}

/** AspectRatioPicker (§11.1.7, §11.8.4): a ratio choice, each option a small frame of that ratio. */
export function AspectRatioPicker(props: PickerProps) {
  return <Picker {...props} kind="ratio" />;
}

/** SwatchPicker (§11.1.7, §11.8.4): a palette choice, each option its colour chips and name. */
export function SwatchPicker(props: PickerProps) {
  return <Picker {...props} kind="swatch" />;
}
