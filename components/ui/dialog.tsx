import { Icon } from "@/components/ui/icon";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@rn-primitives/dialog";
import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewProps,
} from "react-native";
import { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const FullWindowOverlay =
  Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment;

function DialogOverlay({
  className,
  children,
  onViewportLayout,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Overlay>, "asChild"> & {
  children?: React.ReactNode;
  onViewportLayout?: (event: LayoutChangeEvent) => void;
}) {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== "web") {
    return (
      <FullWindowOverlay>
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={StyleSheet.absoluteFill}
        >
          <View
            pointerEvents="box-none"
            style={{
              flex: 1,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
              paddingLeft: insets.left + 16,
              paddingRight: insets.right + 16,
            }}
          >
            {/* A sibling backdrop never competes with the content's swipe gestures. */}
            <DialogPrimitive.Overlay
              className={cn("bg-black/50", className)}
              style={StyleSheet.absoluteFill}
              {...props}
            />
            <View
              pointerEvents="box-none"
              onLayout={onViewportLayout}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NativeOnlyAnimatedView
                entering={FadeIn.duration(150).reduceMotion(
                  ReduceMotion.System,
                )}
                exiting={FadeOut.duration(100).reduceMotion(
                  ReduceMotion.System,
                )}
                style={{ maxHeight: "100%", flexShrink: 1 }}
              >
                {children}
              </NativeOnlyAnimatedView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </FullWindowOverlay>
    );
  }
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-black/50 p-4",
        "animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto [&>*]:w-full [&>*]:max-w-lg",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Overlay>
  );
}
function DialogContent({
  portalHost,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  portalHost?: string;
}) {
  return (
    <DialogPortal hostName={portalHost}>
      <DialogSurface {...props} />
    </DialogPortal>
  );
}

// Mounted only while the portal is open, so each opening measures its own viewport.
function DialogSurface({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [viewport, setViewport] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const availableWidth = Math.max(
    0,
    Math.min(
      width - insets.left - insets.right - 32,
      viewport?.width ?? Infinity,
    ),
  );
  const availableHeight = Math.max(
    0,
    Math.min(
      height - insets.top - insets.bottom - 32,
      viewport?.height ?? Infinity,
    ),
  );
  const onViewportLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setViewport((previous) =>
      previous?.width === layout.width && previous.height === layout.height
        ? previous
        : { width: layout.width, height: layout.height },
    );
  };
  return (
    <DialogOverlay onViewportLayout={onViewportLayout}>
      <DialogPrimitive.Content
        {...props}
        onStartShouldSetResponder={() => false}
        style={[
          style,
          {
            width: Math.min(512, availableWidth),
            maxHeight: availableHeight,
            flexShrink: 1,
            minHeight: 0,
            margin: 0,
            padding: 0,
            overflow: "hidden",
          },
        ]}
        className={cn(
          "bg-background border-border z-50 flex flex-col rounded-lg border shadow-lg shadow-black/5",
          Platform.select({
            web: "animate-in fade-in-0 zoom-in-95 duration-200",
          }),
          className,
        )}
      >
        <ScrollView
          style={{ flexShrink: 1, minHeight: 0 }}
          contentContainerStyle={{ padding: 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator
        >
          {children}
        </ScrollView>
        <DialogPrimitive.Close
          className={cn(
            "absolute right-2 top-2 z-10 min-h-12 min-w-12 items-center justify-center rounded bg-background opacity-90 active:opacity-100",
            Platform.select({
              web: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2",
            }),
          )}
          accessibilityLabel="Close dialog"
        >
          <Icon
            name="close"
            size={16}
            className={cn(
              "text-accent-foreground web:pointer-events-none size-4 shrink-0",
            )}
          />
          <Text className="sr-only">Close</Text>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogOverlay>
  );
}

function DialogHeader({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        "flex flex-col gap-2 pr-10 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-foreground text-lg font-semibold leading-none",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
