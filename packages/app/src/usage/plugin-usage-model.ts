import type { InstalledPlugin } from "@/plugins/types";

/** A host may replace usage with exactly one trusted plugin surface named `usage`. */
export function resolvePluginUsage<T extends Pick<InstalledPlugin, "serverId" | "surfaces">>(
  plugins: readonly T[],
  serverId: string | null,
) {
  const matches = plugins.flatMap((plugin) => {
    if (plugin.serverId !== serverId) return [];
    return plugin.surfaces
      .filter((surface) => surface.id === "usage")
      .map((surface) => ({ plugin, surface }));
  });
  return { match: matches.length === 1 ? matches[0] : undefined, conflict: matches.length > 1 };
}
