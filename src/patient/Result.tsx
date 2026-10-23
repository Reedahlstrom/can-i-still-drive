import { Bus, CalendarPlus, Car, CarFront, Check, ChevronRight, Phone, Share2, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { destinations, family, specialist } from "../data/demo";
import { outcomeCopy } from "../data/scenarios";
import { addMonths, longDate, shortDate, today } from "../lib/dates";
import { useDemo, useScore } from "../state/store";
import { Avatar } from "../ui/Brand";
import { DomainBars } from "../ui/DomainBars";
import { Button, CheckDot, Group, SectionLabel } from "../ui/primitives";
import { CarTop, Gauge } from "../ui/Road";
import { Screen } from "./Screen";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  );
}

function ScoreBlock() {
  const result = useScore();
  return (
    <div>
      <div className="flex flex-col items-center rounded-3xl bg-paper px-5 pt-6 pb-6">
        <Gauge value={result.total} size={276} delay={0.5} />
        <div className="mt-1 text-center">
          <div className="font-display text-[20px] font-bold">DriverScore</div>
          <div className="mt-0.5 text-[15px] text-graphite">Version 0, not yet validated</div>
        </div>
      </div>
      <div className="mt-6 px-1">
        <DomainBars domains={result.domains} patient delay={1.1} />
      </div>
    </div>
  );
}

function ActionRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <CheckDot done={false} />
      <div className="min-w-0 flex-1 text-[19px] leading-snug">{label}</div>
    </div>
  );
}

function NextSteps() {
  const d = useDemo((s) => s.determination)!;
  const [added, setAdded] = useState(false);
  const retest = addMonths(today(), d.retestMonths);
  return (
    <Group>
      {d.plan.map((p) => (
        <ActionRow key={p} label={p} />
      ))}
      {d.retestMonths > 0 && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-4">
            <CalendarPlus size={26} className="shrink-0" />
            <div>
              <div className="text-[19px] leading-snug">Re-test by {shortDate(retest)}</div>
              <div className="text-[16px] text-graphite">
                {d.retestMonths} months from today
              </div>
            </div>
          </div>
          <Button size="md" variant={added ? "quiet" : "secondary"} className="mt-3 w-full" icon={added ? <Check size={18} strokeWidth={3} /> : undefined} onClick={() => setAdded(true)}>
            {added ? "Added to your calendar" : "Add to calendar"}
          </Button>
        </div>
      )}
    </Group>
  );
}

function ShareWithFamily() {
  const familyShare = useDemo((s) => s.familyShare);
  const set = useDemo((s) => s.set);
  const shared = familyShare.results;
  return (
    <Button
      variant={shared ? "secondary" : "primary"}
      className="mt-9 w-full"
      icon={shared ? <Check size={20} strokeWidth={3} /> : <Share2 size={20} />}
      onClick={() => set({ familyShare: { ...familyShare, results: true } })}
    >
      {shared ? `Shared with ${family.first}` : `Share with ${family.first}`}
    </Button>
  );
}

const rideOptions = [
  { id: "family", icon: <Users size={24} />, name: `Ride with ${family.first}`, detail: `Free. ${family.first} gets your request.` },
  { id: "app", icon: <Car size={24} />, name: "Uber or Lyft", detail: "About $14, 5 minutes away" },
  { id: "self", icon: <CarFront size={24} />, name: "Self-driving ride", detail: "About $12, 7 minutes away" },
  { id: "taxi", icon: <Phone size={24} />, name: "Taxi by phone", detail: "About $18. No app needed." },
  { id: "shuttle", icon: <Bus size={24} />, name: "Senior shuttle", detail: "Free. Book a day ahead." },
];

function GettingAround() {
  const set = useDemo((s) => s.set);
  return (
    <Section title="Getting around">
      <Button className="mb-3 w-full" icon={<Car size={22} />} onClick={() => set({ ride: { dest: "", option: "app", status: "choose" } })}>
        Book a ride
      </Button>
      <Group>
        {rideOptions.map((r) => (
          <button key={r.id} onClick={() => set({ ride: { dest: "", option: r.id, status: "choose" } })} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mist">{r.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[19px] font-semibold leading-snug">{r.name}</span>
              <span className="block text-[16px] leading-snug text-graphite">{r.detail}</span>
            </span>
            <ChevronRight size={22} className="shrink-0 text-fog" />
          </button>
        ))}
      </Group>
      <div className="mt-3 rounded-2xl bg-signal-soft px-5 py-4 text-[17px] leading-relaxed">
        Your car costs about <strong>$480 a month</strong>. Rides to your usual places would be about <strong>$260</strong>.
      </div>
    </Section>
  );
}

export function RideSheet() {
  const ride = useDemo((s) => s.ride);
  const answers = useDemo((s) => s.answers);
  const set = useDemo((s) => s.set);
  const speed = useDemo((s) => s.speed);
  const places = ((answers.places as string[] | undefined)?.length ? (answers.places as string[]) : ["Doctor visits", "Grocery store", "Family"]).filter((p) => destinations[p]);
  const option = rideOptions.find((o) => o.id === ride?.option) ?? rideOptions[1];

  useEffect(() => {
    if (ride?.status !== "requested") return;
    const id = setTimeout(() => set({ ride: { ...ride, status: "arriving" } }), 2200 / speed);
    return () => clearTimeout(id);
  }, [ride, set, speed]);

  const close = () => set({ ride: null });
  const dest = ride?.dest ? destinations[ride.dest] : null;

  return (
    <AnimatePresence>
      {ride && (
        <motion.div className="absolute inset-0 z-40 flex flex-col justify-end" initial="hidden" animate="shown" exit="hidden">
          <motion.div className="absolute inset-0 bg-asphalt/45" variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }} onClick={close} />
          <motion.div
            role="dialog"
            aria-label="Book a ride"
            className="relative rounded-t-[28px] bg-canvas px-6 pt-5 pb-[calc(var(--safe-bottom,0px)+18px)]"
            variants={{ hidden: { y: "100%" }, shown: { y: 0 } }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line" />
            {ride.status === "choose" && (
              <>
                <h2 className="font-display text-[28px] font-extrabold">Where to?</h2>
                <p className="mt-1 text-[18px] text-graphite">{option.name}</p>
                <Group className="mt-5">
                  {places.map((p) => (
                    <button
                      key={p}
                      onClick={() => set({ ride: { ...ride, dest: p } })}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-pressed={ride.dest === p}
                    >
                      <span>
                        <span className="block text-[19px] font-semibold">{destinations[p].name}</span>
                        <span className="block text-[16px] text-graphite">{destinations[p].address}</span>
                      </span>
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${ride.dest === p ? "bg-asphalt text-white" : "border-2 border-line-strong"}`}>
                        {ride.dest === p && <Check size={18} strokeWidth={3} />}
                      </span>
                    </button>
                  ))}
                </Group>
                <Button className="mt-5 w-full" disabled={!ride.dest} onClick={() => set({ ride: { ...ride, status: "requested" } })}>
                  {option.id === "family" ? `Ask ${family.first}` : "Request ride"}
                </Button>
              </>
            )}
            {ride.status !== "choose" && dest && (
              <>
                <RideMap arriving={ride.status === "arriving"} />
                <h2 className="mt-5 font-display text-[28px] font-extrabold">{ride.status === "requested" ? "Finding your ride" : option.id === "family" ? `${family.first} is on the way` : "Your ride is on the way"}</h2>
                <p className="mt-1 text-[18px] text-graphite">To {dest.name}</p>
                {ride.status === "arriving" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-center gap-4 rounded-2xl bg-paper px-5 py-4">
                    <Avatar initials={option.id === "family" ? family.initials : option.id === "self" ? "SD" : "LM"} size={48} tone="mist" />
                    <div className="flex-1">
                      <div className="text-[19px] font-semibold">{option.id === "family" ? family.name : option.id === "self" ? "Self-driving car" : "Luis M."}</div>
                      <div className="text-[16px] text-graphite">{option.id === "family" ? "Gray SUV, 4MX 902" : "White sedan, 7KD 214"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-[24px] font-bold">4</div>
                      <div className="text-[15px] text-graphite">min</div>
                    </div>
                  </motion.div>
                )}
                <Button variant="secondary" className="mt-5 w-full" onClick={close}>
                  {ride.status === "arriving" ? "Done" : "Cancel"}
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RideMap({ arriving }: { arriving: boolean }) {
  const path = "M20 120 L120 120 L120 50 L250 50 L250 90 L310 90";
  return (
    <div className="relative h-[150px] overflow-hidden rounded-2xl bg-[#E4E8E5]" aria-hidden>
      <svg viewBox="0 0 330 150" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {[30, 80, 130].map((y) => (
          <line key={y} x1="0" x2="330" y1={y} y2={y} stroke="#fff" strokeWidth="9" />
        ))}
        {[60, 160, 250].map((x) => (
          <line key={x} y1="0" y2="150" x1={x} x2={x} stroke="#fff" strokeWidth="9" />
        ))}
        <path d={path} fill="none" stroke="#1C2229" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={arriving ? "0" : "2 9"} />
        <circle cx="310" cy="90" r="9" fill="#1C2229" />
        <circle cx="310" cy="90" r="3.5" fill="#F4B400" />
      </svg>
      <motion.div
        className="absolute top-0 left-0"
        style={{ offsetPath: `path("${path}")`, offsetRotate: "auto" }}
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: arriving ? "62%" : "8%" }}
        transition={{ duration: arriving ? 2.4 : 0.6, ease: "easeInOut" }}
      >
        <div style={{ transform: "translate(-13px,-7px)" }}>
          <CarTop width={26} />
        </div>
      </motion.div>
    </div>
  );
}

export function Result() {
  const d = useDemo((s) => s.determination);
  if (!d) return null;
  const copy = outcomeCopy[d.outcome];
  const stop = d.outcome === "stop";
  const signed = d.signedAt ? new Date(d.signedAt) : today();
  return (
    <Screen speech={`${copy.title} ${d.note}`}>
      <div className="flex items-center gap-3 pt-1">
        <Avatar initials={specialist.initials} size={40} />
        <p className="text-[16px] leading-snug text-graphite">
          Signed by {specialist.name}, {specialist.credentials}
          <br />
          {longDate(signed)}
        </p>
      </div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-7 font-display text-[38px] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance"
      >
        {copy.title}
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-5 border-l-[3px] border-signal pl-4 text-[20px] leading-[1.45]">
        {d.note}
      </motion.p>

      {stop ? (
        <>
          <GettingAround />
          <Section title="Next steps">
            <NextSteps />
          </Section>
          <Section title="Your results">
            <ScoreBlock />
          </Section>
        </>
      ) : (
        <>
          <div className="mt-9">
            <ScoreBlock />
          </div>
          {d.conditions.length > 0 && (
            <Section title="Your driving limits">
              <Group>
                {d.conditions.map((c) => (
                  <div key={c} className="flex items-center gap-4 px-5 py-4">
                    <span className="h-6 w-1.5 shrink-0 rounded-full bg-signal" />
                    <span className="text-[19px] font-semibold">{c}</span>
                  </div>
                ))}
              </Group>
            </Section>
          )}
          <Section title="Next steps">
            <NextSteps />
          </Section>
        </>
      )}
      <ShareWithFamily />
    </Screen>
  );
}
