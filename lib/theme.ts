import { Theme } from "expo-router/react-navigation";

const NAV_THEME = {
  light: {
    dark: false,
    colors: {
      primary: "hsl(166, 62%, 25%)",
      background: "hsl(60, 18%, 97%)",
      card: "hsl(0, 0%, 100%)",
      text: "hsl(150, 12%, 14%)",
      border: "hsl(135, 9%, 82%)",
      notification: "hsl(0, 72%, 36%)",
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" as const },
      medium: { fontFamily: "System", fontWeight: "500" as const },
      bold: { fontFamily: "System", fontWeight: "700" as const },
      heavy: { fontFamily: "System", fontWeight: "900" as const },
    },
  },
  dark: {
    dark: true,
    colors: {
      primary: "hsl(159, 46%, 69%)",
      background: "hsl(150, 14%, 10%)",
      card: "hsl(150, 12%, 14%)",
      text: "hsl(60, 18%, 95%)",
      border: "hsl(150, 8%, 28%)",
      notification: "hsl(0, 85%, 80%)",
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" as const },
      medium: { fontFamily: "System", fontWeight: "500" as const },
      bold: { fontFamily: "System", fontWeight: "700" as const },
      heavy: { fontFamily: "System", fontWeight: "900" as const },
    },
  },
} satisfies Record<"light" | "dark", Theme>;

export { NAV_THEME };
