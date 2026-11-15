import Link from "next/link";

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#f7f8f8" />
      <path d="M7 8.5h10a1.5 1.5 0 0 1 1.5 1.5v4.5A1.5 1.5 0 0 1 17 16h-5.5L8 18.5V16H7a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 7 8.5Z" fill="#08090a" />
      <circle cx="15.2" cy="12.25" r="1.25" fill="#4f8cff" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-fg">
      <Mark /> Hikma
    </Link>
  );
}
