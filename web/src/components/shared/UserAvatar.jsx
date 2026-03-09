export default function UserAvatar({ user, size = "md" }) {
  const dim = size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const text = size === "lg" ? "text-sm" : "text-xs";
  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-fuchsia-500 ${text} font-semibold text-white shrink-0`}
    >
      {initials}
    </div>
  );
}
