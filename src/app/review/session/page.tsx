import Link from "next/link";
import ReviewSession from "@/components/srs/ReviewSession";

export default function ReviewSessionPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href="/review" className="text-sm text-muted hover:text-foreground">
          ← Review
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Review session</h1>
      </div>
      <ReviewSession />
    </section>
  );
}
