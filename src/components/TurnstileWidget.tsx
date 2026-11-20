import React, { useEffect, useRef } from 'react';

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  appearance?: 'always' | 'execute' | 'interaction-only';
  size?: 'normal' | 'compact' | 'flexible';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstileScript(): Promise<TurnstileApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile requires browser window'));
  }
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-city-turnstile="true"]'
      );
      if (existing && window.turnstile) {
        resolve(window.turnstile);
        return;
      }
      const script = existing ?? document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.cityTurnstile = 'true';

      const onLoad = () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error('Turnstile global API missing after load'));
      };
      const onError = () => {
        turnstileScriptPromise = null;
        reject(new Error('Failed to load Turnstile script'));
      };

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (!existing) {
        document.head.appendChild(script);
      }
    });
  }
  return turnstileScriptPromise;
}

interface TurnstileWidgetProps {
  siteKey: string;
  action?: string;
  resetSignal: number;
  onToken: (token: string | null) => void;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  action = 'stylize',
  resetSignal,
  onToken,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let active = true;
    const el = containerRef.current;
    if (!el || !siteKey) return;

    void loadTurnstileScript()
      .then((api) => {
        if (!active || !containerRef.current || widgetIdRef.current !== null) return;
        const id = api.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'light',
          appearance: 'interaction-only',
          size: 'flexible',
          callback: (token: string) => {
            if (active) onTokenRef.current(token);
          },
          'expired-callback': () => {
            if (active) onTokenRef.current(null);
            if (widgetIdRef.current) {
              api.reset(widgetIdRef.current);
            }
          },
          'error-callback': () => {
            if (active) onTokenRef.current(null);
          },
        });
        widgetIdRef.current = id;
      })
      .catch(() => {
        if (active) onTokenRef.current(null);
      });

    return () => {
      active = false;
      const wid = widgetIdRef.current;
      widgetIdRef.current = null;
      if (wid && window.turnstile) {
        try {
          window.turnstile.remove(wid);
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (resetSignal === 0) return;
    onTokenRef.current(null);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
  }, [resetSignal]);

  return <div ref={containerRef} className="turnstile-slot" />;
};
