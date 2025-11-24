'use client';

import { useEffect } from 'react';

const normalizeKey = (key: string) => {
  const trimmed = key.trim().toLowerCase();
  if (trimmed === '') return '';
  if (trimmed === ' ') return 'space';
  if (trimmed === 'esc') return 'escape';
  return trimmed;
};

const isInputLike = (element: EventTarget | null): element is HTMLElement => {
  if (!element || !(element as HTMLElement).tagName) return false;
  const tagName = (element as HTMLElement).tagName;
  const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
  return inputTags.includes(tagName) || (element as HTMLElement).isContentEditable;
};

const isDisabled = (el: HTMLElement) => {
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    return el.disabled;
  }
  const ariaDisabled = el.getAttribute('aria-disabled');
  return ariaDisabled === 'true';
};

const elementMatchesKey = (el: HTMLElement, key: string) => {
  const attr = el.getAttribute('data-hotkeys') ?? el.getAttribute('data-hotkey');
  if (!attr) return false;
  return attr
    .split(',')
    .map((part) => normalizeKey(part))
    .includes(key);
};

export function useButtonHotkeys() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = normalizeKey(event.key);
      if (!key) return;

      const fromInput = isInputLike(event.target);

      const allCandidates = Array.from(
        document.querySelectorAll<HTMLElement>('[data-hotkey], [data-hotkeys]')
      ).filter((el) => elementMatchesKey(el, key));

      if (allCandidates.length === 0) return;

      if (fromInput && key !== 'escape') {
        const allowInInputs = allCandidates.some((el) => el.dataset.hotkeyAllowInput === 'true');
        if (!allowInInputs) return;
      }

      const enabledCandidates = allCandidates.filter((el) => {
        if (fromInput && key !== 'escape' && el.dataset.hotkeyAllowInput !== 'true') {
          return false;
        }
        return !isDisabled(el);
      });

      if (enabledCandidates.length === 0) return;

      const priorityTarget =
        enabledCandidates.find((el) => el.dataset.hotkeyPriority === 'true') ?? enabledCandidates[0];

      event.preventDefault();
      priorityTarget.click();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
