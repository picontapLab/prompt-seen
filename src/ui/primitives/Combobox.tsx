'use client';

import { ChevronDown, CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import {
  Button as AriaButton,
  ComboBox as AriaComboBox,
  FieldError,
  Group,
  Input,
  Label,
  ListBox,
  Popover,
  Text,
  type ComboBoxProps as AriaComboBoxProps,
} from 'react-aria-components';
import { cx } from './cx';
import styles from './Field.module.css';
import { OptionItem, type Option } from './Select';

export type ComboboxOption = Option & {
  /** Extra words the filter matches, e.g. the language name in the interface language. */
  keywords?: string;
};

export type ComboboxProps = Omit<AriaComboBoxProps<ComboboxOption>, 'className' | 'children' | 'style' | 'items'> & {
  label: ReactNode;
  options: readonly ComboboxOption[];
  description?: ReactNode;
  errorMessage?: ReactNode;
  placeholder?: string;
  /** Hide the label visually (it still names the field), for compact placements. */
  labelHidden?: boolean;
  /** Borderless, monospaced: for the header (language). */
  quiet?: boolean;
  className?: string;
};

/**
 * Combobox (§11.1.7): a searchable list. Matches label, detail and keywords, case- and
 * accent-insensitively, so "japanese", "ja" or "日本" all find 日本語 (§11.7).
 */
export function Combobox({
  label,
  options,
  description,
  errorMessage,
  placeholder,
  labelHidden,
  quiet,
  className,
  ...props
}: ComboboxProps) {
  const t = useTranslations('primitives.combobox');
  // The query the user typed; null while the list should show every option (opened by focus or
  // the button, or showing the selected value). React Aria's filter sees only textValue, which
  // must stay the label, so filtering happens here.
  const [query, setQuery] = useState<string | null>(props.defaultInputValue || null);
  const items = query ? options.filter((o) => matches(searchText(o), query)) : options;
  return (
    <AriaComboBox
      menuTrigger="focus"
      {...props}
      items={items}
      onInputChange={(value) => {
        setQuery(value);
        props.onInputChange?.(value);
      }}
      onOpenChange={(isOpen, trigger) => {
        if (isOpen && trigger !== 'input') setQuery(null);
        props.onOpenChange?.(isOpen, trigger);
      }}
      className={cx(styles.field, quiet && styles.quiet, className)}
    >
      {({ isOpen, isInvalid, isDisabled }) => (
        <>
          <Label className={cx(styles.label, labelHidden && 'visually-hidden')}>{label}</Label>
          <Group
            className={styles.control}
            data-open={isOpen || undefined}
            isInvalid={isInvalid}
            isDisabled={isDisabled}
          >
            <Input className={styles.input} placeholder={placeholder} />
            <AriaButton className={styles.trigger} aria-label={t('showOptions')}>
              <ChevronDown aria-hidden="true" />
            </AriaButton>
          </Group>
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
            <ListBox
              className={styles.listbox}
              renderEmptyState={() => <div className={styles.empty}>{t('noResults')}</div>}
            >
              {(option: ComboboxOption) => <OptionItem option={option} />}
            </ListBox>
          </Popover>
        </>
      )}
    </AriaComboBox>
  );
}

const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();

const searchText = (o: ComboboxOption) =>
  [o.label, typeof o.detail === 'string' ? o.detail : '', o.keywords ?? '', String(o.id)].join(' ');

/** Substring match on case- and accent-folded text. */
export function matches(text: string, input: string): boolean {
  return fold(text).includes(fold(input.trim()));
}
