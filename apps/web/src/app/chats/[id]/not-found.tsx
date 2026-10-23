import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack" style={{ paddingBlock: "var(--space-2)" }}>
      <div role="alert" className="alert alert-warning">
        <span>Chat not found</span> <Link href="/chats">Back to chats</Link>
      </div>
    </div>
  );
}
