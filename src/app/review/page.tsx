import { connection } from "next/server";
import ReviewDashboard from "@/components/srs/ReviewDashboard";
import { getReviewForecast, getReviewStats } from "@/lib/api";

export default async function ReviewPage() {
  await connection();
  const [stats, forecast] = await Promise.all([getReviewStats(), getReviewForecast(30)]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Review</h1>
        <p className="mt-1 text-sm text-muted">Spaced repetition across all lessons: every word has recognition, writing and tone cards.</p>
      </div>
      <ReviewDashboard stats={stats} forecast={forecast} />
    </section>
  );
}
