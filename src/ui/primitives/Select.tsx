'use client';

import { Check, ChevronDown, CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
  Text,
  type Key,
  type SelectProps as AriaSelectProps,
} from 'react-aria-components';
import { cx } from './cx';
import styles from './Field.module.css';

export type Option = {
  id: Key;
  label: string;
  /** Secondary text in the list, e.g. a count or a native name. */
  detail?: ReactNode;
  isDisabled?: boolean;
};

export type SelectProps = Omit<AriaSelectProps<Option>, 'className' | 'children' | 'style' | 'items'> & {
  label: ReactNode;
  options: readonly Option[];
  description?: ReactNode;
  errorMessage?: ReactNode;
  className?: string;
};

/** Select (§11.1.7): a short list of fixed options. Searchable lists use Combobox. */
export function Select({ label, options, description, errorMessage, placeholder, className, ...props }: SelectProps) {
  const t = useTranslations('primitives.select');
  return (
    <AriaSelect {...props} placeholder={placeholder ?? t('placeholder')} className={cx(styles.field, className)}>
      {({ isOpen, isInvalid, isDisabled }) => (
        <>
          <Label className={styles.label}>{label}</Label>
          <AriaButton
            className={styles.control}
            data-open={isOpen || undefined}
            data-invalid={isInvalid || undefined}
            data-disabled={isDisabled || undefined}
          >
            <SelectValue className={styles.input} />
            <span className={styles.trigger} aria-hidden="true">
              <ChevronDown />
            </span>
          </AriaButton>
          {description && (
            <Text slot="description" className={styles.description}>
              {description}
            </Text>
          )}
          <FieldError className={styles.error}>
            <CircleAlert aria-hidden="true" />
            <span>{errorMessage}</span>
          </FieldError>
          <Popover className={styles.popover}>
            <ListBox className={styles.listbox} items={options}>
              {(option) => <OptionItem option={option} />}
            </ListBox>
          </Popover>
        </>
      )}
    </AriaSelect>
  );
}

export function OptionItem({ option }: { option: Option }) {
  return (
    <ListBoxItem id={option.id} textValue={option.label} isDisabled={option.isDisabled} className={styles.option}>
      {({ isSelected }) => (
        <>
          <span>{option.label}</span>
          {option.detail && <span className={styles.optionDetail}>{option.detail}</span>}
          {isSelected && <Check className={styles.check} aria-hidden="true" />}
        </>
      )}
    </ListBoxItem>
  );
}
