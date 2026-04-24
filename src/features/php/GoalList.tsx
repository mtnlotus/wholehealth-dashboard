import type { Goal } from "coach-skills";

interface Props {
  goals: Goal[];
}

const STATUS_LABELS: Record<string, string> = {
  met: "Met",
  "not-met": "Not Met",
  "in-progress": "In Progress",
};

export function GoalList({ goals }: Props) {
  return (
    <ul style={{ paddingLeft: "1.2rem" }}>
      {goals.map((goal, i) => (
        <li key={i} style={{ marginBottom: "1rem" }}>
          <strong>{goal.text}</strong>
          {goal.action_steps.length > 0 && (
            <ul>
              {goal.action_steps.map((step, j) => (
                <li key={j}>
                  {step.text}
                  {step.status && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.8rem",
                        background: "#eee",
                        borderRadius: "3px",
                        padding: "0 4px",
                      }}
                    >
                      {STATUS_LABELS[step.status] ?? step.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
