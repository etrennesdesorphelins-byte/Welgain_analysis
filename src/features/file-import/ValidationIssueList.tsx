import type { ValidationIssue } from "../../domain/csv";

export function ValidationIssueList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <ul className="validation-issue-list">
      {issues.map((issue) => (
        <li key={issue.code} className={`validation-issue validation-issue--${issue.severity}`}>
          <span className="validation-issue__badge">
            {issue.severity === "error" ? "エラー" : "警告"}
          </span>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
