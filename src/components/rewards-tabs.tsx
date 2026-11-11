import { REWARDS_PAGE_TABS, type RewardsPageTabKey } from "@/lib/rewards-tabs";
import { TabPills } from "@/components/tab-pills";

export function RewardsTabs({ active }: { active: RewardsPageTabKey }) {
  return <TabPills tabs={REWARDS_PAGE_TABS} active={active} basePath="/rewards" ariaLabel="Rewards sections" />;
}
