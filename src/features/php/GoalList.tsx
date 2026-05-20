import type { Goal } from "coach-notes";

interface Props {
  goals: Goal[];
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Met",
  cancelled: "Not Met",
  active: "In Progress",
};

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <li style={{ marginBottom: "1rem" }}>
      <strong>{goal.text}</strong>
      {(goal.importance !== undefined || goal.confidence !== undefined) && (
        <div style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.25rem" }}>
          {goal.importance !== undefined && <span>Importance: {goal.importance}/10</span>}
          {goal.importance !== undefined && goal.confidence !== undefined && <span> · </span>}
          {goal.confidence !== undefined && <span>Confidence: {goal.confidence}/10</span>}
        </div>
      )}
      {goal.importance_note && (
        <div style={{ fontSize: "0.8rem", color: "#777", marginTop: "0.15rem" }}>
          {goal.importance_note}
        </div>
      )}
      {goal.confidence_note && (
        <div style={{ fontSize: "0.8rem", color: "#777", marginTop: "0.15rem" }}>
          {goal.confidence_note}
        </div>
      )}
      {goal.goal_type === "short-term" && goal.lifecycle_status !== "active" && (
        <span
          style={{
            display: "inline-block",
            marginTop: "0.25rem",
            fontSize: "0.8rem",
            background: goal.lifecycle_status === "completed" ? "#d4edda" : "#f8d7da",
            borderRadius: "3px",
            padding: "0 6px",
          }}
        >
          {STATUS_LABELS[goal.lifecycle_status] ?? goal.lifecycle_status}
        </span>
      )}
    </li>
  );
}

export function GoalList({ goals }: Props) {
  const longTermGoals = goals.filter((g) => g.goal_type === "long-term");
  return (
    <ul style={{ paddingLeft: "1.2rem" }}>
      {longTermGoals.map((goal, i) => (
        <GoalCard key={i} goal={goal} />
      ))}
    </ul>
  );
}

export function ActionStepList({ goals }: Props) {
  const shortTermGoals = goals.filter((g) => g.goal_type === "short-term");
  if (shortTermGoals.length === 0) return null;
  return (
    <ul style={{ paddingLeft: "1.2rem" }}>
      {shortTermGoals.map((goal, i) => (
        <GoalCard key={i} goal={goal} />
      ))}
    </ul>
  );
}
