import { useAppStore } from "../../store/appStore";
import { WbsDisplay } from "./WbsDisplay";
import { GoalList } from "./GoalList";

export function PhpSummaryPage() {
  const phpData = useAppStore((s) => s.phpData);

  if (!phpData) return <div>No Personal Health Plan loaded.</div>;

  const name = phpData.patient
    ? `${phpData.patient.given.join(" ")} ${phpData.patient.family}`
    : "Unknown Patient";

  return (
    <div>
      <h2>Personal Health Plan — {name}</h2>

      {phpData.what_matters_most && (
        <section>
          <h3>What Matters Most</h3>
          <p>{phpData.what_matters_most}</p>
        </section>
      )}

      {phpData.wbs && (
        <section>
          <h3>Well-Being Signs</h3>
          <WbsDisplay wbs={phpData.wbs} />
        </section>
      )}

      {phpData.goals.length > 0 && (
        <section>
          <h3>Goals</h3>
          <GoalList goals={phpData.goals} />
        </section>
      )}
    </div>
  );
}
