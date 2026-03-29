const GROUP_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-lime-500",
  "bg-fuchsia-500",
];

export function parseServerDate(value) {
  if (!value) {
    return new Date(0);
  }
  return new Date(value.endsWith("Z") ? value : `${value}Z`);
}

export function formatBeijingTimestamp(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(parseServerDate(value));
}

export function timeAgoBeijing(value) {
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - parseServerDate(value).getTime()) / 1000));
  if (deltaSeconds < 60) {
    return "刚刚";
  }
  if (deltaSeconds < 3600) {
    return `${Math.floor(deltaSeconds / 60)} 分钟前`;
  }
  if (deltaSeconds < 86400) {
    return `${Math.floor(deltaSeconds / 3600)} 小时前`;
  }
  return formatBeijingTimestamp(value);
}

export function getGroupColor(groupName = "") {
  const hash = [...groupName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}

export function reorderItems(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}
