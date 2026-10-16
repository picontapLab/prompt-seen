'use client';

import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cx } from './cx';
import styles from './Button.module.css';
import { Tooltip } from './Tooltip';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<AriaButtonProps, 'className' | 'children' | 'style'> & {
  /** One primary button per view, as a rule (§11.1.7). */
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  /** Leading icon, e.g. a Lucide icon at the default size. */
  icon?: ReactNode;
  children: ReactNode;
  /**
   * Why the button is disabled (§11.1.7): shown next to it and linked with aria-describedby,
   * because a disabled button can neither be focused nor show a tooltip.
   */
  disabledReason?: ReactNode;
  className?: string;
};

/**
 * Button (§11.1.7): primary, secondary, ghost. `isPending` keeps the width and shows progress
 * in place of the label; React Aria announces it and ignores presses meanwhile.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  disabledReason,
  className,
  ...props
}: ButtonProps) {
  const t = useTranslations('primitives.button');
  const reasonId = useId();
  const showReason = Boolean(props.isDisabled && disabledReason);
  const button = (
    <AriaButton
      {...props}
      aria-describedby={cx(props['aria-describedby'], showReason && reasonId) || undefined}
      className={cx(styles.button, styles[variant], size === 'lg' && styles.lg, !showReason && className)}
    >
      <span className={styles.content}>
        {icon}
        {children}
      </span>
      {props.isPending && (
        <span className={styles.progress} role="presentation">
          <span className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="visually-hidden">{t('pending')}</span>
        </span>
      )}
    </AriaButton>
  );
  if (!showReason) return button;
  return (
    <span className={cx(styles.withReason, className)}>
      {button}
      <span id={reasonId} className={styles.reason}>
        {disabledReason}
      </span>
    </span>
  );
}

export type IconButtonProps = Omit<AriaButtonProps, 'className' | 'children' | 'style' | 'aria-label'> & {
  icon: ReactNode;
  /** Accessible name, also shown as the tooltip (§11.1.6). May contain theme-dependent parts. */
  label: ReactNode;
  variant?: 'secondary' | 'ghost';
  tooltip?: boolean;
  className?: string;
};

/** Icon-only button: 44 × 44 target, accessible name, tooltip after about 500 ms (§11.1.6). */
export function IconButton({
  icon,
  label,
  variant = 'secondary',
  tooltip = true,
  className,
  ...props
}: IconButtonProps) {
  const button = (
    <AriaButton {...props} className={cx(styles.button, styles[variant], styles.iconOnly, className)}>
      <span className={styles.content}>
        {icon}
        <span className="visually-hidden">{label}</span>
      </span>
    </AriaButton>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
