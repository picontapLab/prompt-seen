'use client';

import type { ReactElement, ReactNode } from 'react';
import { Tooltip as AriaTooltip, TooltipTrigger, type TooltipProps as AriaTooltipProps } from 'react-aria-components';
import styles from './Tooltip.module.css';

export type TooltipProps = {
  /** Supplementary text only: never the only place necessary information appears (§11.1.7). */
  content: ReactNode;
  /** A focusable React Aria trigger, such as Button. */
  children: ReactElement;
  placement?: AriaTooltipProps['placement'];
  isDisabled?: boolean;
};

/** Text label that appears after about 500 ms of hover or on keyboard focus (§11.1.6). */
export function Tooltip({ content, children, placement = 'bottom', isDisabled }: TooltipProps) {
  return (
    <TooltipTrigger delay={500} closeDelay={0} isDisabled={isDisabled}>
      {children}
      <AriaTooltip className={styles.tooltip} placement={placement} offset={8}>
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
}
