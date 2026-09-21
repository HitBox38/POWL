import { useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useShallow } from "zustand/react/shallow";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DeviceCard } from "@/components/device-card";
import { BrandMark } from "@/components/brand-mark";
import { useDevicesStore } from "@/store/devices";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { getWakeUnavailableReason } from "@/modules/wol-sender";

const renderDevice = ({ item }: { item: string }) => <DeviceCard id={item} />;
const keyExtractor = (id: string) => id;

export default function HomeScreen() {
  const [filter, setFilter] = useState("all");
  const groups = useDevicesStore((state) => state.groups);
  const count = useDevicesStore((state) => state.devices.length);
  const hasFavorites = useDevicesStore((state) =>
    state.devices.some((device) => device.isFavorite),
  );
  const selectedGroup = groups.find((group) => group.id === filter);
  const activeFilter = filter === "favorites" || selectedGroup ? filter : "all";
  const ids = useDevicesStore(
    useShallow((state) =>
      state.devices
        .filter((device) =>
          activeFilter === "favorites"
            ? device.isFavorite
            : selectedGroup
              ? device.groupId === selectedGroup.id
              : true,
        )
        .map((device) => device.id),
    ),
  );
  const hasProfiles = useNetworkProfilesStore(
    (state) => state.profiles.length > 0,
  );
  const profileName = useNetworkProfilesStore(
    (state) =>
      state.profiles.find((profile) => profile.id === state.activeProfileId)
        ?.name,
  );
  const unavailable = getWakeUnavailableReason();
  const add = () => router.push("/device/new");

  const header = (
    <View>
      <View className="pt-3 pb-5 flex-row items-center justify-between">
        <View className="flex-1 pr-3 flex-row items-center gap-3">
          <BrandMark />
          <Text
            accessibilityRole="header"
            className="text-2xl font-bold tracking-tight"
          >
            POWL
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel="Settings"
          onPress={() => router.push("/settings")}
        >
          <Icon name="settings" size={24} />
        </Button>
      </View>
      {count ? (
        <View className="border-b border-border">
          {hasProfiles ? (
            <Button
              variant="ghost"
              className="justify-start px-0 py-2 mb-3 rounded-none"
              onPress={() => router.push("/networks")}
            >
              <View className="flex-1">
                <Text className="text-base text-left font-medium">
                  {profileName ?? "Choose a network"}
                </Text>
                <Text className="text-sm text-muted-foreground text-left font-normal">
                  Manual network selection
                </Text>
              </View>
              <Text className="text-sm text-primary">Change</Text>
            </Button>
          ) : null}
          {hasFavorites || groups.length || activeFilter === "favorites" ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-5">
                {[
                  { id: "all", name: `All (${count})` },
                  ...(hasFavorites || activeFilter === "favorites"
                    ? [{ id: "favorites", name: "Favorites" }]
                    : []),
                  ...groups,
                ].map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`rounded-none px-0 border-b-2 ${activeFilter === item.id ? "border-primary" : "border-transparent"}`}
                    accessibilityState={{
                      selected: activeFilter === item.id,
                    }}
                    onPress={() => setFilter(item.id)}
                  >
                    <Text
                      className={
                        activeFilter === item.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      {item.name}
                    </Text>
                  </Button>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text className="text-sm text-muted-foreground py-3">
              {count} {count === 1 ? "computer" : "computers"}
            </Text>
          )}
          {selectedGroup ? (
            <Button
              variant="outline"
              className="my-3"
              disabled={!ids.length}
              onPress={() =>
                router.push({
                  pathname: "/group/[id]/wake",
                  params: { id: selectedGroup.id },
                })
              }
            >
              <Text>Wake group · {ids.length}</Text>
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="w-full max-w-2xl self-center flex-1">
        {count ? (
          <FlatList
            ListHeaderComponent={header}
            data={ids}
            renderItem={renderDevice}
            keyExtractor={keyExtractor}
            contentContainerClassName="px-6 pb-5"
            initialNumToRender={10}
            ListEmptyComponent={
              <View className="py-12 gap-3">
                <Text className="text-lg font-semibold">
                  {activeFilter === "favorites"
                    ? "Your favorites go here"
                    : "This group is empty"}
                </Text>
                <Text className="text-muted-foreground leading-6">
                  Open a computer to{" "}
                  {activeFilter === "favorites"
                    ? "mark it as a favorite."
                    : "choose its group."}
                </Text>
                <Button variant="outline" onPress={() => setFilter("all")}>
                  <Text>Show all computers</Text>
                </Button>
              </View>
            }
            ListFooterComponent={
              <View className="pt-6 gap-3">
                <Text className="text-sm text-muted-foreground leading-5">
                  A sent request doesn’t confirm your computer is awake.
                </Text>
                {unavailable ? (
                  <Text className="text-sm text-muted-foreground leading-5">
                    {unavailable}
                  </Text>
                ) : null}
              </View>
            }
          />
        ) : (
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View className="px-6">{header}</View>
            <View className="flex-1 justify-center px-6 py-10 gap-5">
              <Text
                accessibilityRole="header"
                className="text-3xl font-semibold tracking-tight"
              >
                Save it once.{"\n"}Wake it from here.
              </Text>
              <Text className="text-muted-foreground leading-6">
                Save your computer once, then send a wake request whenever you
                need it. All on your local network.
              </Text>
              <Button onPress={add}>
                <Icon
                  name="add"
                  size={22}
                  className="text-primary-foreground"
                />
                <Text>Add your first device</Text>
              </Button>
              <Button variant="ghost" onPress={() => router.push("/help")}>
                <Text className="text-primary">How to set up Wake-on-LAN</Text>
              </Button>
              <Button variant="ghost" onPress={() => router.push("/transfer")}>
                <Text className="text-muted-foreground">
                  Import saved devices
                </Text>
              </Button>
            </View>
          </ScrollView>
        )}
        {count ? (
          <View className="px-6 pt-3 pb-2 border-t border-border">
            <Button variant="outline" onPress={add}>
              <Icon name="add" size={22} className="text-primary" />
              <Text className="text-primary">Add device</Text>
            </Button>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
