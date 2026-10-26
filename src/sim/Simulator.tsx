import { Component, Suspense, lazy, type ComponentProps, type ReactNode } from "react";
import { useT } from "../i18n/useT";
import type { SimCanvas } from "./SimCanvas";

// The simulator's code is split from the app's, but fetched at startup rather than when a drive
// begins. After a deploy, the offline cache drops the previous version's files, and a page still
// running that version would find them gone the moment a drive started.
let pending: Promise<typeof import("./SimCanvas")> | null = null;
export const loadSim = () =>
  (pending ??= import("./SimCanvas").catch((e) => {
    pending = null;
    throw e;
  }));

const Lazy = lazy(() => loadSim().then((m) => ({ default: m.SimCanvas })));

function ReloadButton() {
  const t = useT();
  return (
    <div className="flex h-full items-center justify-center">
      <button onClick={() => location.reload()} className="h-11 rounded-xl bg-white/10 px-4 text-[15px] font-semibold text-white hover:bg-white/20">
        {t("Reload the simulator view")}
      </button>
    </div>
  );
}

/** If the code still can't load, reload once: the visit is saved, so the drive picks up where it was.
 * If that didn't help, offer the reload instead of trying again on its own. */
class Reload extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    try {
      if (Date.now() - Number(sessionStorage.getItem("sim-reload") ?? 0) < 30_000) return;
      sessionStorage.setItem("sim-reload", String(Date.now()));
    } catch {
      return;
    }
    location.reload();
  }
  render() {
    return this.state.failed ? <ReloadButton /> : this.props.children;
  }
}

/** The live simulator view. */
export function Simulator(props: ComponentProps<typeof SimCanvas>) {
  return (
    <Reload>
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    </Reload>
  );
}
