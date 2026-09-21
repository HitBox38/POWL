import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "nativewind";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { NAV_THEME } from "@/lib/theme";
import { Platform } from "react-native";

type ThemePreference = "system" | "light" | "dark";
const STORAGE_KEY = "powl-appearance";

const ThemePreferenceContext = createContext<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  storageError: string | null;
} | null>(null);

// Keep the native splash visible until the saved preference has been applied.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  // NativeWind returns a new setter wrapper each render; hydration must only run once.
  const applyInitialScheme = useRef(setColorScheme);
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPreference() {
      let saved: ThemePreference = "system";
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        if (value === "light" || value === "dark") saved = value;
      } catch {
        if (active)
          setStorageError("Your saved appearance could not be loaded.");
      }
      if (!active) return;
      setPreferenceState(saved);
      applyInitialScheme.current(saved);
      setReady(true);
    }
    void loadPreference();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", colorScheme === "dark" ? "#161D1A" : "#F7F7F2");
    document.documentElement.style.colorScheme = colorScheme ?? "light";
    document.documentElement.classList.toggle("dark", colorScheme === "dark");
  }, [colorScheme, preference]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    setColorScheme(next);
    setStorageError(null);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      setStorageError(
        "Appearance changed, but could not be saved for next time.",
      );
    });
  }

  if (!ready) return null;

  const effectiveScheme = colorScheme ?? "light";
  return (
    <ThemePreferenceContext.Provider
      value={{ preference, setPreference, storageError }}
    >
      <ThemeProvider value={NAV_THEME[effectiveScheme]}>
        <StatusBar style={effectiveScheme === "dark" ? "light" : "dark"} />
        {children}
      </ThemeProvider>
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error("Theme preferences require AppThemeProvider.");
  return context;
}
