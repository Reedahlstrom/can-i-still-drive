import { getLang } from "../i18n";

const formats = {
  en: {
    long: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }),
    short: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }),
  },
  ja: {
    long: new Intl.DateTimeFormat("ja-JP", { weekday: "long", month: "long", day: "numeric" }),
    short: new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", year: "numeric" }),
    time: new Intl.DateTimeFormat("ja-JP", { hour: "numeric", minute: "2-digit" }),
  },
};

export const today = () => new Date();
export const longDate = (d: Date) => formats[getLang()].long.format(d);
export const shortDate = (d: Date) => formats[getLang()].short.format(d);
export const timeOf = (d: Date) => formats[getLang()].time.format(d);

export function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}
