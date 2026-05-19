"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  blockBodyEndMinutes,
  blockEndMinutes,
  earliestStartMinutes,
  formatTime,
  latestEndMinutes,
  perCourtDistribution,
  startMinutes,
} from "../lib/calculations";
import {
  buildBlockCourtClashSet,
  type Clash,
} from "../lib/clashDetection";
import { blockEventCode, eventCodeClass } from "../lib/colors";
import { exportTimetableMarkdown } from "../lib/markdownExport";
import type { Block, Category, Plan } from "../types";

interface Props {
  plan: Plan;
  blocks: Block[];
  categories: Category[];
  courtNumbers: number[];
  clashes: Clash[];
}

const DEFAULT_START_MIN = 8 * 60;
const DEFAULT_END_MIN = 18 * 60;
const PADDING_MIN = 30;

function roundDownToHour(min: number): number {
  return Math.floor(min / 60) * 60;
}

function roundUpToHour(min: number): number {
  return Math.ceil(min / 60) * 60;
}

export default function Timetable({
  plan,
  blocks,
  categories,
  courtNumbers,
  clashes,
}: Props) {
  const [copied, setCopied] = useState(false);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const earliest = earliestStartMinutes(blocks);
    const latest = latestEndMinutes(blocks);
    if (earliest == null || latest == null) {
      return { rangeStart: DEFAULT_START_MIN, rangeEnd: DEFAULT_END_MIN };
    }
    return {
      rangeStart: roundDownToHour(Math.max(0, earliest - PADDING_MIN)),
      rangeEnd: roundUpToHour(latest + PADDING_MIN),
    };
  }, [blocks]);

  const totalMin = Math.max(60, rangeEnd - rangeStart);
  const hourMarks: number[] = [];
  for (let m = rangeStart; m <= rangeEnd; m += 60) hourMarks.push(m);

  const clashSet = useMemo(() => buildBlockCourtClashSet(clashes), [clashes]);

  const rootStyle: CSSProperties = {
    ["--scheduler-timetable-minutes" as string]: totalMin,
  };

  const handleCopy = async () => {
    const md = exportTimetableMarkdown(plan);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this markdown:", md);
    }
  };

  return (
    <section className="scheduler-timetable-wrap">
      <header className="scheduler-timetable-toolbar">
        <h2 className="section-header">Court-wise timetable</h2>
        <button className="btn-secondary btn-small" onClick={handleCopy}>
          {copied ? "Copied ✓" : "Copy as markdown"}
        </button>
      </header>

      <div className="scheduler-timetable" style={rootStyle}>
        {/* corner */}
        <div className="scheduler-timetable-corner" />

        {/* column headers */}
        {courtNumbers.map(n => (
          <div key={`h-${n}`} className="scheduler-timetable-court-header">
            <span className="scheduler-timetable-court-name">Court {n}</span>
            <span className="scheduler-timetable-court-id">
              {plan.courtIdMap[n] ?? ""}
            </span>
          </div>
        ))}

        {/* time-label column */}
        <div className="scheduler-timetable-time-col">
          {hourMarks.map(m => {
            const offset = m - rangeStart;
            return (
              <div
                key={m}
                className="scheduler-timetable-hour-label"
                style={
                  {
                    ["--scheduler-row-offset" as string]: offset,
                  } as CSSProperties
                }
              >
                {formatTime(m)}
              </div>
            );
          })}
        </div>

        {/* court columns */}
        {courtNumbers.map(n => {
          const blocksOnCourt = blocks.filter(b => b.courts.includes(n));
          return (
            <div key={`c-${n}`} className="scheduler-timetable-court-col">
              {blocksOnCourt.map(b => {
                const start = startMinutes(b);
                const bodyEnd = blockBodyEndMinutes(b);
                const fullEnd = blockEndMinutes(b);
                const top = start - rangeStart;
                const bodyHeight = Math.max(0, bodyEnd - start);
                const bufferHeight = Math.max(0, fullEnd - bodyEnd);
                const code = blockEventCode(b, categories);
                const isClashing = clashSet.has(`${b.id}:${n}`);
                const distribution = perCourtDistribution(b);
                const idx = b.courts.indexOf(n);
                const matchesOnThisCourt =
                  b.mode === "match-count" ? distribution[idx] ?? 0 : null;

                const colourStyle: CSSProperties = b.colourOverride
                  ? {
                      background: b.colourOverride,
                      borderColor: b.colourOverride,
                    }
                  : {};

                return (
                  <div
                    key={b.id}
                    className="scheduler-timetable-block-stack"
                    style={
                      {
                        ["--scheduler-row-offset" as string]: top,
                      } as CSSProperties
                    }
                  >
                    <div
                      className={`scheduler-timetable-block ${eventCodeClass(code)} ${
                        isClashing ? "scheduler-timetable-block-clash" : ""
                      }`}
                      style={
                        {
                          ["--scheduler-row-height" as string]: bodyHeight,
                          ...colourStyle,
                        } as CSSProperties
                      }
                      title={`${b.label}  ${formatTime(start)}–${formatTime(bodyEnd)}`}
                    >
                      <div className="scheduler-timetable-block-label">
                        {b.label}
                      </div>
                      <div className="scheduler-timetable-block-meta">
                        {formatTime(start)}–{formatTime(bodyEnd)}
                        {matchesOnThisCourt != null && (
                          <> · {matchesOnThisCourt}m</>
                        )}
                      </div>
                    </div>
                    {bufferHeight > 0 && (
                      <div
                        className="scheduler-timetable-buffer"
                        style={
                          {
                            ["--scheduler-row-height" as string]: bufferHeight,
                          } as CSSProperties
                        }
                        title={`After-block buffer ${bufferHeight}m`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="annotation scheduler-timetable-legend">
        Block fill = match body. Hatched tail = after-block buffer. Red border = clash.
        Hover a block for time range.
      </p>
    </section>
  );
}
