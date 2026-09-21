import { Image } from "expo-image";
import { useTheme } from "expo-router/react-navigation";

// Local SVG assets keep the original mark crisp without a runtime SVG library.
const sources = {
  light: require("@/assets/images/powl-mark-light.svg"),
  dark: require("@/assets/images/powl-mark-dark.svg"),
};

export function BrandMark({ size = 36 }: { size?: number }) {
  const { dark } = useTheme();
  return (
    <Image
      source={dark ? sources.dark : sources.light}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
