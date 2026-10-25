import { useMemo } from "react";
import type { PluginScreenProps } from "@getpaseo/plugin/client";
import type { PluginTheme } from "@getpaseo/plugin";
import { Text } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import { useHostRuntimeIsConnected } from "@/runtime/host-runtime";
import { useIsCompactFormFactor } from "@/constants/layout";
import { pluginRegistry, useInstalledPlugins } from "@/plugins/registry";
import { PluginInstallationProvider } from "@/plugins/installation-provider";
import { usePluginHostNavigation } from "@/plugins/host-navigation";
import { resolvePluginPlatform } from "@/plugins/platform";
import { SurfaceErrorBoundary } from "@/plugins/surface-error-boundary";
import { toPluginTheme } from "@/plugins/theme";
import type { Theme } from "@/styles/theme";
import { resolvePluginUsage } from "./plugin-usage-model";

export function usePluginUsage(serverId: string | null) {
  const resolution = resolvePluginUsage(useInstalledPlugins(), serverId);
  const connected = useHostRuntimeIsConnected(serverId ?? "");
  return {
    ...resolution,
    unavailable:
      !!serverId &&
      (!connected || (!resolution.match && pluginRegistry.hasConfiguredSurface(serverId, "usage"))),
  };
}

type Resolution = ReturnType<typeof usePluginUsage>;
const themeMapping = (theme: Theme) => ({ theme: toPluginTheme(theme) });
export function PluginUsage({
  resolution,
  serverId,
  agentId,
}: {
  resolution: Resolution;
  serverId: string;
  agentId?: string;
}) {
  if (resolution.unavailable)
    return <Text>用量来源暂不可用，等待此主机或插件恢复；不会切换到其他账号。</Text>;
  if (resolution.conflict) return <Text>多个插件同时接管用量，请保留一个 usage 页面。</Text>;
  if (!resolution.match) return null;
  return (
    <ThemedUsageRenderer
      match={resolution.match}
      serverId={serverId}
      agentId={agentId}
      uniProps={themeMapping}
    />
  );
}

function UsageRenderer({
  match,
  serverId,
  agentId,
  theme,
}: {
  match: NonNullable<Resolution["match"]>;
  serverId: string;
  agentId?: string;
  theme: PluginTheme;
}) {
  const navigation = usePluginHostNavigation(serverId);
  const compact = useIsCompactFormFactor();
  const Surface = match.surface.Component;
  const params = useMemo<PluginScreenProps["params"]>(
    (): PluginScreenProps["params"] => (agentId ? { agentId } : {}),
    [agentId],
  );
  const host = useMemo(() => ({ id: serverId, label: serverId }), [serverId]);
  const layout = useMemo(() => ({ compact, platform: resolvePluginPlatform() }), [compact]);
  return (
    <SurfaceErrorBoundary installation={match.plugin} Surface={Surface} resetKey={agentId}>
      <PluginInstallationProvider plugin={match.plugin}>
        <Surface
          theme={theme}
          host={host}
          layout={layout}
          navigation={navigation}
          params={params}
        />
      </PluginInstallationProvider>
    </SurfaceErrorBoundary>
  );
}
const ThemedUsageRenderer = withUnistyles(UsageRenderer);
