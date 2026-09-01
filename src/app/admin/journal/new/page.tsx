import { JournalEditor } from "../journal-editor";
import { createJournalPostAction } from "@/lib/actions/journal-actions";
import { getAdminAuthors } from "@/lib/data/journal";

export default async function NewJournalPostPage() {
  const authors = await getAdminAuthors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">New journal post</h1>
      </div>
      <JournalEditor action={createJournalPostAction} authors={authors} />
    </div>
  );
}
