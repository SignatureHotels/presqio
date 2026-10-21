import { useAdmin } from "@/hooks/use-admin";
import { Icon, SectionHeader } from "@/components";
import { timeAgo } from "@/utils/dates";
import { Timeline, TimelineIcon, TimelineItem } from "./RecentActivity.style";
export function RecentActivity() {
  const { overview } = useAdmin();
  const activity = (overview?.activity ?? []).slice(0, 5);
  return (
    <section className="card card-pad">
      <SectionHeader title="Recent activity" subtitle="Changes made in your workspace" />
      <Timeline>
        {activity.length === 0 && <p className="muted sm">Nothing has happened yet.</p>}
        {activity.map((item) => (
          <TimelineItem key={item.id}>
            <TimelineIcon>
              <Icon name="check" className="tiny" />
            </TimelineIcon>
            <div>
              <strong>{item.title}</strong>
              <p>
                {item.description} · {timeAgo(item.occurredAt)}
              </p>
            </div>
          </TimelineItem>
        ))}
      </Timeline>
    </section>
  );
}
