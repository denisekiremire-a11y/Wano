import { JournalEditor } from "../journal-editor";
import { createJournalPostAction } from "@/lib/actions/journal-actions";
import { requireAdminPage } from "@/lib/auth";
import { getAdminAuthors } from "@/lib/data/journal";

export default async function NewJournalPostPage() {
  await requireAdminPage("/admin/journal");
  const authors = await getAdminAuthors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">New journal post</h1>
      </div>
      <JournalEditor action={createJournalPostAction} authors={authors} />
    </div>
  );
}
