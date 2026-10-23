import { Bus, CalendarPlus, Car, CarFront, Check, ChevronRight, MapPin, Phone, Share2, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { destinations, family, home, locations, offices, referringDoctor, specialist } from "../data/demo";
import { outcomeCopy, planDetail } from "../data/scenarios";
import { addMonths, longDate, shortDate, today } from "../lib/dates";
import { useDemo, useScore, type Ride } from "../state/store";
import { Avatar } from "../ui/Brand";
import { DomainBars } from "../ui/DomainBars";
import { Button, Group, SectionLabel, Segmented } from "../ui/primitives";
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
        <Gauge value={result.total} max={result.possible} size={276} delay={0.5} />
        <div className="mt-1 text-center">
          <div className="font-display text-[20px] font-bold">DriverScore{result.incomplete ? ` ${result.total} of ${result.possible}` : ""}</div>
          <div className="mt-0.5 text-[17px] text-graphite">One part of {specialist.first}'s decision</div>
        </div>
      </div>
      <div className="mt-6 px-1">
        <DomainBars domains={result.domains} patient delay={1.1} />
      </div>
    </div>
  );
}

function StepRow({ n, label, detail, children }: { n: number; label: string; detail?: string; children?: ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="flex gap-4">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-mist font-display text-[15px] font-bold">{n}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-semibold leading-snug">{label}</div>
          {detail && <div className="mt-0.5 text-[17px] leading-snug text-graphite">{detail}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function NextSteps() {
  const d = useDemo((s) => s.determination)!;
  const [added, setAdded] = useState(false);
  const retest = addMonths(today(), d.retestMonths);
  return (
    <Group>
      {d.plan.map((p, i) => (
        <StepRow key={p} n={i + 1} label={p} detail={planDetail[p]} />
      ))}
      {d.retestMonths > 0 && (
        <StepRow n={d.plan.length + 1} label={`Re-test by ${shortDate(retest)}`} detail={`${specialist.first}'s office will call you to book.`}>
          <Button size="md" variant={added ? "quiet" : "secondary"} className="mt-3 w-full" icon={added ? <Check size={18} strokeWidth={3} /> : <CalendarPlus size={18} />} onClick={() => setAdded(true)}>
            {added ? "Added to your calendar" : "Add to calendar"}
          </Button>
        </StepRow>
      )}
    </Group>
  );
}

function ShareWithFamily() {
  const familyShare = useDemo((s) => s.familyShare);
  const set = useDemo((s) => s.set);
  const shared = familyShare.results;
  return (
    <div className="mt-9">
      <Button
        variant={shared ? "secondary" : "primary"}
        className="w-full"
        icon={shared ? <Check size={20} strokeWidth={3} /> : <Share2 size={20} />}
        onClick={() => !shared && set({ familyShare: { ...familyShare, results: true } })}
      >
        {shared ? `Sent to ${family.first}` : `Text this to ${family.first}`}
      </Button>
      {shared && <p className="mt-2 text-center text-[17px] text-graphite">You can stop this in Family.</p>}
    </div>
  );
}

type RideOption = { id: string; icon: ReactNode; name: string; detail: string; cta: string; paid?: string };

const rideOptions: RideOption[] = [
  { id: "family", icon: <Users size={24} />, name: `Ride with ${family.first}`, detail: `Texts ${family.first} to ask. Her answer shows up here.`, cta: `Text ${family.first}` },
  { id: "taxi", icon: <Phone size={24} />, name: "Taxi by phone", detail: "Valley Cab. About $18. No app needed.", cta: "Call Valley Cab" },
  { id: "shuttle", icon: <Bus size={24} />, name: "Senior shuttle", detail: "Free. Book a day ahead.", cta: "Ask for a shuttle ride" },
  { id: "app", icon: <Car size={24} />, name: "Uber", detail: "About $14, 5 minutes away", cta: "Request Uber, about $14", paid: "You pay in the Uber app." },
  { id: "self", icon: <CarFront size={24} />, name: "Self-driving car", detail: "About $12, 7 minutes away", cta: "Request a car, about $12", paid: "You pay in the app." },
];

function GettingAround() {
  const set = useDemo((s) => s.set);
  return (
    <Section title="Getting around">
      <Group>
        {rideOptions.map((r) => (
          <button key={r.id} onClick={() => set({ ride: { dest: "", option: r.id, when: "now", status: "choose" } })} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mist">{r.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[19px] font-semibold leading-snug">{r.name}</span>
              <span className="block text-[17px] leading-snug text-graphite">{r.detail}</span>
            </span>
            <ChevronRight size={22} className="shrink-0 text-graphite" />
          </button>
        ))}
      </Group>
    </Section>
  );
}

function rideCopy(ride: NonNullable<Ride>, option: RideOption, destName: string) {
  switch (option.id) {
    case "family":
      return ride.status === "requested"
        ? { title: `Asked ${family.first}`, sub: "We'll tell you when she answers." }
        : { title: `${family.first} said yes`, sub: `She'll text you when she leaves. To ${destName}.` };
    case "shuttle":
      return { title: "Request sent", sub: `The shuttle office will call you to set a time. To ${destName}.` };
    default:
      return ride.status === "requested" ? { title: "Finding your ride", sub: `To ${destName}` } : { title: "Your ride is on the way", sub: `To ${destName}` };
  }
}

export function RideSheet() {
  const ride = useDemo((s) => s.ride);
  const answers = useDemo((s) => s.answers);
  const set = useDemo((s) => s.set);
  const speed = useDemo((s) => s.speed);
  const textScale = useDemo((s) => s.textScale);
  const atVisit = useDemo((s) => s.phase === "released");
  const chosen = (answers.places as string[] | undefined)?.length ? (answers.places as string[]) : ["Doctor visits", "Grocery store", "Family"];
  // On visit day she is at the hospital, so home comes first and the hospital drops off the list.
  const places = (atVisit ? ["Home", ...chosen.filter((p) => p !== "Doctor visits")] : chosen).filter((p) => destinations[p]);
  const hospital = locations.find((l) => l.here)!;
  const option = rideOptions.find((o) => o.id === ride?.option) ?? rideOptions[0];

  useEffect(() => {
    if (ride?.status !== "requested") return;
    const id = setTimeout(() => set({ ride: { ...ride, status: "arriving" } }), (option.id === "family" ? 3200 : 2200) / speed);
    return () => clearTimeout(id);
  }, [ride, set, speed, option.id]);

  const close = () => set({ ride: null });
  const destName = ride?.dest === "other" ? ride.other || "Your address" : ride?.dest ? destinations[ride.dest]?.name : "";
  const from = atVisit && ride?.when === "now" ? `${hospital.name}, 1200 E Lakeview Dr` : `${home.label}, ${home.address}`;
  const ready = !!ride?.dest && (ride.dest !== "other" || !!ride.other?.trim());
  const request = () => ride && set({ ride: { ...ride, status: option.id === "shuttle" ? "arriving" : "requested" } });

  return (
    <AnimatePresence>
      {ride && (
        <motion.div className="absolute inset-0 z-40 flex flex-col justify-end" initial="hidden" animate="shown" exit="hidden">
          <motion.div className="absolute inset-0 bg-asphalt/45" variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }} onClick={close} />
          <motion.div
            role="dialog"
            aria-label={option.name}
            className="no-scrollbar relative max-h-[92%] overflow-y-auto rounded-t-[28px] bg-canvas px-6 pt-5 pb-[calc(var(--safe-bottom,0px)+18px)]"
            style={{ zoom: textScale }}
            variants={{ hidden: { y: "100%" }, shown: { y: 0 } }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line" />
            {option.id === "taxi" ? (
              <>
                <p className="text-[17px] font-semibold text-graphite">{option.name}</p>
                <h2 className="mt-1 font-display text-[28px] font-extrabold">Call Valley Cab</h2>
                <p className="mt-2 text-[18px] leading-snug text-graphite">Tell them where you are and where you're going. About $18 to most places nearby. Pay the driver.</p>
                <a href={`tel:${offices.cab.replace(/\D/g, "")}`} className="mt-5 flex h-[60px] w-full items-center justify-center gap-2.5 rounded-2xl bg-asphalt text-[20px] font-semibold text-white">
                  <Phone size={20} /> {offices.cab}
                </a>
                <Button variant="secondary" className="mt-3 w-full" onClick={close}>
                  Close
                </Button>
              </>
            ) : ride.status === "choose" ? (
              <>
                <p className="text-[17px] font-semibold text-graphite">{option.name}</p>
                <h2 className="mt-1 font-display text-[28px] font-extrabold">Where to?</h2>
                <Group className="mt-4">
                  {[...places, "other"].map((p) => {
                    const on = ride.dest === p;
                    return (
                      <div key={p}>
                        <button onClick={() => set({ ride: { ...ride, dest: p } })} className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left" aria-pressed={on}>
                          <span>
                            <span className="block text-[19px] font-semibold">{p === "other" ? "Somewhere else" : destinations[p].name}</span>
                            {p !== "other" && <span className="block text-[16px] text-graphite">{destinations[p].address}</span>}
                          </span>
                          <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${on ? "bg-asphalt text-white" : "border-2 border-line-strong"}`}>{on && <Check size={18} strokeWidth={3} />}</span>
                        </button>
                        {p === "other" && on && (
                          <div className="px-5 pb-4">
                            <input
                              autoFocus
                              value={ride.other ?? ""}
                              onChange={(e) => set({ ride: { ...ride, other: e.target.value } })}
                              placeholder="Address or place"
                              className="h-14 w-full rounded-xl border-2 border-line bg-canvas px-4 text-[19px] outline-none focus:border-asphalt"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Group>
                {option.id !== "shuttle" && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[17px] font-semibold">When</span>
                    <Segmented
                      label="When"
                      value={ride.when}
                      onChange={(v) => set({ ride: { ...ride, when: v } })}
                      options={[
                        { value: "now", label: "Now" },
                        { value: "later", label: "Later today" },
                      ]}
                    />
                  </div>
                )}
                <div className="mt-4 flex items-start gap-3 text-[17px] text-graphite">
                  <MapPin size={20} className="mt-0.5 shrink-0" />
                  <span>
                    From {from}
                    {option.paid ? <><br />{option.paid}</> : null}
                  </span>
                </div>
                <Button className="mt-5 w-full" disabled={!ready} onClick={request}>
                  {option.cta}
                </Button>
              </>
            ) : (
              <>
                {(option.id === "app" || option.id === "self") && <RideMap arriving={ride.status === "arriving"} />}
                {(() => {
                  const c = rideCopy(ride, option, destName);
                  return (
                    <>
                      <h2 className={`${option.id === "app" || option.id === "self" ? "mt-5" : ""} font-display text-[28px] font-extrabold`}>{c.title}</h2>
                      <p className="mt-1 text-[18px] text-graphite">{c.sub}</p>
                    </>
                  );
                })()}
                {ride.status === "requested" && option.id === "family" && (
                  <div className="mt-5 rounded-2xl bg-paper px-5 py-4">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-graphite">
                      <motion.span className="block size-4 rounded-full border-2 border-asphalt border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                      Texted {family.first}, {family.phone}
                    </div>
                    <p className="mt-2 text-[18px] leading-snug">
                      "{family.first === "Sarah" ? "Mom" : "Margaret"} asks for a ride to {destName}, {ride.when === "now" ? "now" : "later today"}. Reply YES or NO."
                    </p>
                  </div>
                )}
                {ride.status === "arriving" && option.id !== "shuttle" && option.id !== "family" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-center gap-4 rounded-2xl bg-paper px-5 py-4">
                    <Avatar initials={option.id === "self" ? "SD" : "LM"} size={48} tone="mist" />
                    <div className="flex-1">
                      <div className="text-[19px] font-semibold">{option.id === "self" ? "Self-driving car" : "Luis M."}</div>
                      <div className="text-[16px] text-graphite">White sedan, 7KD 214</div>
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

function Limits() {
  const d = useDemo((s) => s.determination)!;
  return (
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
  );
}

export function Result() {
  const d = useDemo((s) => s.determination);
  if (!d || !d.outcome) return null;
  const copy = outcomeCopy[d.outcome];
  const signed = d.signedAt ? new Date(d.signedAt) : today();
  const score = (
    <Section title="How you did">
      <ScoreBlock />
    </Section>
  );
  const steps = (
    <Section title="Next steps">
      <NextSteps />
    </Section>
  );

  return (
    <Screen speech={`${copy.title} ${d.note}`}>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="pt-2 font-display text-[38px] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance"
      >
        {copy.title}
      </motion.h1>
      <div className="mt-5 flex items-start gap-3">
        <Avatar initials={specialist.initials} size={40} />
        <p className="text-[17px] leading-snug text-graphite">
          Signed by {specialist.name}, {specialist.plain}, {longDate(signed)}.
          <br />
          Sent to you and {referringDoctor.name}.
          <br />
          Questions? Call {specialist.first}'s office at {offices.dana}.
        </p>
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-6 border-l-[3px] border-signal pl-4 text-[20px] leading-[1.45]">
        {d.note}
      </motion.p>

      {d.outcome === "clear" && (
        <>
          <div className="mt-9">
            <ScoreBlock />
          </div>
          {steps}
        </>
      )}
      {d.outcome === "conditions" && (
        <>
          {d.conditions.length > 0 && <Limits />}
          {steps}
          {score}
        </>
      )}
      {d.outcome === "pause" && (
        <>
          {steps}
          <GettingAround />
          {score}
        </>
      )}
      {d.outcome === "stop" && (
        <>
          <GettingAround />
          {steps}
          {score}
        </>
      )}
      <ShareWithFamily />
    </Screen>
  );
}
