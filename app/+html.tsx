import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="theme-color" content="#F7F7F2" />
        <meta name="color-scheme" content="light dark" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
      html, body { height: 100%; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; }
      #root { height: 100dvh; }
      button, [role="button"], [role="radio"], a { touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      [role="button"] *, [role="radio"] * { user-select: none; -webkit-user-select: none; }
      input, textarea, select { font-size: 16px; }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; } }
    `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
