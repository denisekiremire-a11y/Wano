-- The new-account post review queue is gone (createPostAction stopped
-- setting pending_review a while back, and the admin approve/remove UI
-- for it is removed as of this migration) — but any post that was
-- flagged into that queue before it stopped being written to is still
-- sitting there, invisible everywhere (every feed query filters to
-- status = 'visible'), with no UI left to ever approve it. Auto-approve
-- them now so they show up like any other post; nothing else reads
-- pending_review going forward, so this is a one-time backfill, not an
-- ongoing behavior change.
UPDATE posts SET status = 'visible' WHERE status = 'pending_review';
