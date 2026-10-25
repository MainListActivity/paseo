import { PluginUsage, usePluginUsage } from "./plugin-usage";
import { HostFilter } from "@/components/hosts/host-filter";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AdaptiveModalSheet } from "@/components/adaptive-modal-sheet";
import { builtinSidebarNavLabelKey } from "@/sidebar-nav/model";
import { useHostUsageWithControls } from "./controls";
import { useUsagePreferences } from "./display";
import { useUsageHostSelection } from "./hosts";
import type { UsageHost } from "./model";
import { UsageBody, UsageMessage } from "./usage-section";

const CUSTOM_BODY_STYLE = { flex: 1, minHeight: 0 };
interface UsageModalProps {
  visible: boolean;
  onClose: () => void;
  onDismiss: () => void;
}

/**
 * Usage over the current screen: a dialog on wide layouts, a bottom sheet on compact ones. It
 * shows the usage host's reports with pins, and the host filter, Refresh all, and Settings in its
 * title row.
 */
export function UsageModal(props: UsageModalProps) {
  const { t } = useTranslation();
  const { serverId, connectedHosts, select } = useUsageHostSelection();
  const resolution = usePluginUsage(serverId);
  const customActions = useMemo(
    () =>
      serverId ? (
        <HostFilter
          hosts={connectedHosts}
          selectedHost={serverId}
          onSelectHost={select}
          includeAllHost={false}
        />
      ) : null,
    [serverId, connectedHosts, select],
  );
  if (!serverId) {
    return (
      <UsageModalFrame {...props}>
        <UsageMessage text={t("providerUsage.noHosts")} />
      </UsageModalFrame>
    );
  }
  if (resolution.match || resolution.conflict)
    return (
      <UsageModalFrame {...props} custom actions={customActions}>
        <PluginUsage resolution={resolution} serverId={serverId} />
      </UsageModalFrame>
    );
  // Keyed by host so a refresh in flight on one host never shows on another's cards.
  return (
    <HostUsageModal
      key={serverId}
      {...props}
      serverId={serverId}
      hosts={connectedHosts}
      onSelectHost={select}
    />
  );
}

function HostUsageModal({
  serverId,
  hosts,
  onSelectHost,
  ...props
}: UsageModalProps & {
  serverId: string;
  hosts: UsageHost[];
  onSelectHost: (serverId: string) => void;
}) {
  const { display } = useUsagePreferences();
  const hostSelection = useMemo(
    () => ({ hosts, serverId, onSelect: onSelectHost }),
    [hosts, onSelectHost, serverId],
  );
  const { view, refresh, controls } = useHostUsageWithControls(hostSelection);
  return (
    <UsageModalFrame {...props} actions={controls}>
      <View testID={`usage-host-${serverId}`}>
        <UsageBody serverId={serverId} view={view} display={display} onRefresh={refresh} />
      </View>
    </UsageModalFrame>
  );
}

function UsageModalFrame({
  visible,
  onClose,
  onDismiss,
  actions,
  custom = false,
  children,
}: UsageModalProps & { actions?: ReactNode; custom?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  const title = t(builtinSidebarNavLabelKey("usage"));
  const header = useMemo(() => ({ title, actions }), [actions, title]);
  return (
    <AdaptiveModalSheet
      header={header}
      visible={visible}
      onClose={onClose}
      onDismiss={onDismiss}
      desktopMaxWidth={custom ? 1100 : 640}
      scrollable={!custom}
      contextBridge={null}
      testID="usage-modal"
    >
      <View style={custom ? CUSTOM_BODY_STYLE : undefined} testID="usage-modal-body">
        {children}
      </View>
    </AdaptiveModalSheet>
  );
}
