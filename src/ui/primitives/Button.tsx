'use client';

import Link from 'next/link';
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
  /** Tooltip text when it differs from the name, e.g. with its keyboard shortcut: "Save (S)" (§11.10). */
  hint?: ReactNode;
  className?: string;
};

/** Icon-only button: 44 × 44 target, accessible name, tooltip after about 500 ms (§11.1.6). */
export function IconButton({
  icon,
  label,
  variant = 'secondary',
  tooltip = true,
  hint,
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
  return tooltip ? <Tooltip content={hint ?? label}>{button}</Tooltip> : button;
}

export type ButtonLinkProps = {
  /** Internal path (`paths.*`); next/link adds the base path. */
  href: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Off by default: links prefetch on intent only (§16.4). */
  prefetch?: boolean;
};

/**
 * A link styled as a button, for actions that go somewhere (§11.1.7), such as "Customize" on a
 * prompt that comes from a template. Navigation stays a real link: it works before hydration,
 * opens in a new tab and shows its address.
 */
export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
  prefetch = false,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cx(styles.button, styles[variant], styles.link, size === 'lg' && styles.lg, className)}
    >
      <span className={styles.content}>
        {icon}
        {children}
      </span>
    </Link>
  );
}
