import { expect, it } from "vitest";
import { resolvePluginUsage } from "./plugin-usage-model";

it("scopes replacement to the selected host and leaves other surfaces alone", () => {
  const local = {
    serverId: "local",
    surfaces: [{ id: "usage", title: "Usage", Component: () => null }],
  };
  const remote = {
    serverId: "remote",
    surfaces: [{ id: "usage", title: "Usage", Component: () => null }],
  };
  expect(resolvePluginUsage([local, remote], "local").match?.plugin).toBe(local);
  expect(resolvePluginUsage([local], "remote").match).toBeUndefined();
  expect(
    resolvePluginUsage(
      [
        {
          serverId: "local",
          surfaces: [{ id: "company", title: "Company", Component: () => null }],
        },
      ],
      "local",
    ).match,
  ).toBeUndefined();
});
it("rejects competing replacements instead of silently selecting one", () => {
  const plugin = {
    serverId: "local",
    surfaces: [{ id: "usage", title: "Usage", Component: () => null }],
  };
  expect(resolvePluginUsage([plugin, plugin], "local")).toEqual({
    match: undefined,
    conflict: true,
  });
});
