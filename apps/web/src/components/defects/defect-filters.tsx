"use client";

import { Icon } from "@/components/icon";
import { SEVERITY_BADGE, STATUS_BADGE } from "@/components/defects/defect-row";
import {
  AREAS,
  SEVERITIES,
  type DefectFilters as Filters,
  type DefectSeverity,
  type DefectStatus,
} from "@/lib/defects";

interface DefectFiltersProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  searchRef?: React.Ref<HTMLInputElement>;
}

const STATUSES: DefectStatus[] = ["open", "in_progress", "closed"];

export function DefectFilters({ filters, onChange, searchRef }: DefectFiltersProps) {
  const toggle = (status: DefectStatus) =>
    onChange({
      ...filters,
      statuses: filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status],
    });

  return (
    <form
      className="toolbar"
      role="search"
      aria-label="Search and filter defects"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="field">
        <label htmlFor="defect-q">Search defects</label>
        <div className="search-wrap">
          <Icon name="search" />
          <input
            ref={searchRef}
            className="input"
            id="defect-q"
            type="search"
            placeholder="Search by title or ID"
            autoComplete="off"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
          />
        </div>
      </div>
      <div className="toolbar-filters">
        <div className="field" role="group" aria-labelledby="defect-status-label">
          <span className="field-label" id="defect-status-label">
            Status
          </span>
          <div className="cluster">
            {STATUSES.map((status) => {
              const pressed = filters.statuses.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  className="chip"
                  aria-pressed={pressed}
                  onClick={() => toggle(status)}
                >
                  {pressed && <Icon name="check" />}
                  {STATUS_BADGE[status].label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="select-group">
          <div className="field">
            <label htmlFor="defect-severity">Severity</label>
            <select
              className="select"
              id="defect-severity"
              value={filters.severity}
              onChange={(e) => onChange({ ...filters, severity: e.target.value as DefectSeverity | "" })}
            >
              <option value="">All</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_BADGE[s].label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="defect-area">Area</label>
            <select
              className="select"
              id="defect-area"
              value={filters.area}
              onChange={(e) => onChange({ ...filters, area: e.target.value })}
            >
              <option value="">All</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </form>
  );
}
