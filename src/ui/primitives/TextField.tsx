'use client';

import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import {
  FieldError,
  Group,
  Input,
  Label,
  Text,
  TextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { cx } from './cx';
import styles from './Field.module.css';

export type TextFieldProps = Omit<AriaTextFieldProps, 'className' | 'children' | 'style'> & {
  label: ReactNode;
  description?: ReactNode;
  /** Says what happened and how to fix it (§11.11). Shown when isInvalid or validation fails. */
  errorMessage?: ReactNode | ((validation: { validationErrors: string[] }) => ReactNode);
  /** Multi-line (TextArea, §11.1.7). */
  multiline?: boolean;
  placeholder?: string;
  /**
   * Which fields carry a marker: when most fields of a form are required, mark only the optional
   * ones, and the other way round (§11.8.4). Never a lone asterisk or colour.
   */
  necessity?: 'optional' | 'required';
  className?: string;
};

/**
 * TextField and TextArea (§11.1.7): label outside, help, error beside the field. With maxLength,
 * the count appears from 80% of the limit; values are counted in user-visible characters.
 */
export function TextField({
  label,
  description,
  errorMessage,
  multiline,
  placeholder,
  necessity,
  className,
  ...props
}: TextFieldProps) {
  const t = useTranslations('primitives.field');
  const [uncontrolled, setUncontrolled] = useState(props.defaultValue ?? '');
  const value = props.value ?? uncontrolled;
  const length = graphemes(value);
  const max = props.maxLength;
  const showCount = max !== undefined && length >= max * 0.8;
  return (
    <AriaTextField
      {...props}
      onChange={(next) => {
        setUncontrolled(next);
        props.onChange?.(next);
      }}
      className={cx(styles.field, className)}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <div className={styles.labelRow}>
            <Label className={styles.label}>
              {label}
              {necessity && <span className={styles.necessity}> · {t(necessity)}</span>}
            </Label>
            {showCount && (
              <span className={styles.counter} data-over={length > max ? '' : undefined} aria-hidden="true">
                {t('length', { count: length, max })}
              </span>
            )}
          </div>
          <Group className={styles.control} role="presentation" isDisabled={isDisabled} isInvalid={isInvalid}>
            {multiline ? (
              <TextArea className={styles.input} placeholder={placeholder} />
            ) : (
              <Input className={styles.input} placeholder={placeholder} />
            )}
          </Group>
          {description && (
            <Text slot="description" className={styles.description}>
              {description}
              {showCount && <span className="visually-hidden"> {t('length', { count: length, max })}</span>}
            </Text>
          )}
          <FieldError className={styles.error}>
            {(validation) => (
              <>
                <CircleAlert aria-hidden="true" />
                <span>
                  {typeof errorMessage === 'function'
                    ? errorMessage(validation)
                    : (errorMessage ?? validation.validationErrors.join(' '))}
                </span>
              </>
            )}
          </FieldError>
        </>
      )}
    </AriaTextField>
  );
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter() : null;

/** User-visible characters (grapheme clusters), as template limits count them. */
export function graphemes(value: string): number {
  return segmenter ? Array.from(segmenter.segment(value)).length : [...value].length;
}
