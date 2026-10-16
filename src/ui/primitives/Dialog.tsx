'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  type ModalOverlayProps,
} from 'react-aria-components';
import { IconButton } from './Button';
import { cx } from './cx';
import styles from './Dialog.module.css';

export type DialogVariant = 'modal' | 'alert' | 'sheet';

export type DialogProps = Pick<ModalOverlayProps, 'isOpen' | 'onOpenChange' | 'defaultOpen'> & {
  title: ReactNode;
  /** Hide the title visually; it still names the dialog. */
  titleHidden?: boolean;
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Buttons at the end, e.g. Cancel and Confirm. */
  actions?: (close: () => void) => ReactNode;
  /**
   * modal: centred panel. alert: a confirmation that needs an answer (alertdialog, no outside
   * dismissal). sheet: full-height panel from the inline end, e.g. the mobile menu.
   */
  variant?: DialogVariant;
  /** A React Aria trigger, usually Button. Omit to control the dialog with isOpen. */
  trigger?: ReactElement;
  className?: string;
};

/**
 * Dialog on React Aria Modal (§11.1.7, §11.7): focus moves in and stays in, Esc and a visible
 * close button both close it, focus returns to the trigger. The scrim never is the only way out.
 */
export function Dialog({
  title,
  titleHidden,
  children,
  actions,
  variant = 'modal',
  trigger,
  className,
  ...overlay
}: DialogProps) {
  const t = useTranslations('primitives.dialog');
  const dialog = (
    <ModalOverlay
      {...(trigger ? {} : overlay)}
      isDismissable={variant !== 'alert'}
      className={cx(styles.overlay, styles[`${variant}Overlay`])}
    >
      <Modal className={cx(styles.modal, styles[variant], className)}>
        <AriaDialog role={variant === 'alert' ? 'alertdialog' : 'dialog'} className={styles.dialog}>
          {({ close }) => (
            <>
              <header className={styles.header}>
                <Heading slot="title" className={cx(styles.title, titleHidden && 'visually-hidden')}>
                  {title}
                </Heading>
                {variant !== 'alert' && (
                  <IconButton
                    className={styles.close}
                    variant="ghost"
                    icon={<X aria-hidden="true" />}
                    label={t('close')}
                    tooltip={false}
                    onPress={close}
                  />
                )}
              </header>
              <div className={styles.body}>{typeof children === 'function' ? children(close) : children}</div>
              {actions && <footer className={styles.actions}>{actions(close)}</footer>}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
  return trigger ? (
    <DialogTrigger {...overlay}>
      {trigger}
      {dialog}
    </DialogTrigger>
  ) : (
    dialog
  );
}
