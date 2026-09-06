import { PostCard } from "@/components/post-card";
import { VendorPostComposer } from "@/components/vendor-post-composer";
import { getCommentsForPost, getEngagementCounts, getPostImageIds, getPostsByVendor } from "@/lib/data/social";
import { getVendorListings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { DeleteVendorPostButton } from "./delete-vendor-post-button";

export default async function VendorPostsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [listingRows, postRows] = await Promise.all([
    getVendorListings(vendorProfile.id),
    getPostsByVendor(vendorProfile.id),
  ]);

  const postIds = postRows.map((r) => r.post.id);
  const [imageIdsMap, { likeMap, commentMap }, commentsByPost] = await Promise.all([
    getPostImageIds(postIds),
    getEngagementCounts(postIds),
    Promise.all(postIds.map((id) => getCommentsForPost(id).then((c) => [id, c] as const))),
  ]);
  const commentsMap = new Map(commentsByPost);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Posts</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Share updates and events on your page — these publish immediately, no review needed. Travellers can
          comment underneath.
        </p>
      </div>

      <VendorPostComposer listings={listingRows.map(({ listing }) => ({ id: listing.id, title: listing.title }))} />

      <div className="space-y-3">
        {postRows.length === 0 ? (
          <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            Nothing posted yet.
          </p>
        ) : (
          postRows.map(({ post }) => (
            <div key={post.id} className="space-y-1">
              <PostCard
                postId={post.id}
                authorName={vendorProfile.businessName}
                authorUsername={null}
                content={post.content}
                imageUrl={post.imageUrl}
                imageIds={imageIdsMap.get(post.id) ?? []}
                createdAt={new Date(post.createdAt)}
                likeCount={likeMap.get(post.id) ?? 0}
                commentCount={commentMap.get(post.id) ?? 0}
                liked={false}
                canInteract={false}
                comments={commentsMap.get(post.id) ?? []}
              />
              <div className="flex justify-end pr-1">
                <DeleteVendorPostButton postId={post.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
