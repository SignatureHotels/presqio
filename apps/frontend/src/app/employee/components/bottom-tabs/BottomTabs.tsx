import { Icon } from "@/components";
import { useT, type MessageKey } from "@/i18n";
import { Tab, TabBar } from "./BottomTabs.style";

const TABS: { to: string; label: MessageKey; icon: string; end?: boolean }[] = [
  { to: "/employee", label: "tab.home", icon: "home", end: true },
  { to: "/employee/history", label: "tab.history", icon: "calendar" },
  { to: "/employee/leave", label: "tab.leave", icon: "sun" },
  { to: "/employee/requests", label: "tab.requests", icon: "file" },
  { to: "/employee/profile", label: "tab.profile", icon: "user" },
];

export function BottomTabs() {
  const t = useT();
  return (
    <TabBar aria-label="Employee app">
      {TABS.map((tab) => (
        <Tab key={tab.to} to={tab.to} end={tab.end}>
          <Icon name={tab.icon} />
          {t(tab.label)}
        </Tab>
      ))}
    </TabBar>
  );
}
