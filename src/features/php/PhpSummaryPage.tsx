import { useAppStore } from "../../store/appStore";
import { WbsDisplay } from "./WbsDisplay";
import { GoalList, ActionStepList } from "./GoalList";

export function PhpSummaryPage() {
  const phpData = useAppStore((s) => s.phpData);

  if (!phpData) return <div>No Personal Health Plan loaded.</div>;

  const name = phpData.patient
    ? `${phpData.patient.given.join(" ")} ${phpData.patient.family}`
    : "Unknown Patient";

  const birthDate = phpData.patient?.birth_date;

  return (
    <div>
      <h2>Personal Health Plan — {name}</h2>
      {birthDate && (
        <p style={{ margin: "0 0 1rem", color: "#555", fontSize: "0.9rem" }}>
          Date of Birth: {birthDate}
        </p>
      )}

      {phpData.map && (
        <section>
          <h3>Mission, Aspiration, Purpose (MAP)</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{phpData.map}</p>
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
          <h3>Long-Term Goals</h3>
          <GoalList goals={phpData.goals} />
        </section>
      )}

      {phpData.goals.some((g) => g.goal_type === "short-term") && (
        <section>
          <h3>Short-Term Goals</h3>
          <ActionStepList goals={phpData.goals} />
        </section>
      )}
    </div>
  );
}
