import { PASSPORT_TABS, type PassportTabKey } from "@/lib/passport-tabs";
import { TabPills } from "@/components/tab-pills";

export function PassportTabs({ active }: { active: PassportTabKey }) {
  return <TabPills tabs={PASSPORT_TABS} active={active} basePath="/passport" ariaLabel="Passport sections" />;
}
