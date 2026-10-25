import { PluginUsage, usePluginUsage } from "./plugin-usage";
import { useTranslation } from "react-i18next";
import { useUsagePreferences } from "./display";
import { useHostUsage } from "./queries";
import { UsageSection } from "./usage-section";

/** A host's usage reports, for its settings page. */
export function HostUsageSection({ serverId }: { serverId: string }) {
  const resolution = usePluginUsage(serverId);
  if (resolution.match || resolution.conflict || resolution.unavailable)
    return <PluginUsage key={serverId} resolution={resolution} serverId={serverId} />;
  return <BuiltinHostUsageSection serverId={serverId} />;
}

function BuiltinHostUsageSection({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const { view, refresh } = useHostUsage(serverId);
  const { display } = useUsagePreferences(serverId);
  return (
    <UsageSection
      serverId={serverId}
      title={t("providerUsage.title")}
      view={view}
      display={display}
      onRefresh={refresh}
      testID="usage-card"
    />
  );
}
