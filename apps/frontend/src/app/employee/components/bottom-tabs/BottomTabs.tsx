import { Icon } from "@/components";
import { Tab, TabBar } from "./BottomTabs.style";

const TABS = [
  { to: "/employee", label: "Home", icon: "home", end: true },
  { to: "/employee/history", label: "History", icon: "calendar" },
  { to: "/employee/leave", label: "Leave", icon: "sun" },
  { to: "/employee/requests", label: "Requests", icon: "file" },
  { to: "/employee/profile", label: "Profile", icon: "user" },
];

export function BottomTabs() {
  return (
    <TabBar aria-label="Employee app">
      {TABS.map((tab) => (
        <Tab key={tab.to} to={tab.to} end={tab.end}>
          <Icon name={tab.icon} />
          {tab.label}
        </Tab>
      ))}
    </TabBar>
  );
}
