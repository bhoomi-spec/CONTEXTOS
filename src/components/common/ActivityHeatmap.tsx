import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Flame, Activity, Zap } from 'lucide-react';
import { ActivityEvent, Memory, Decision, Commitment } from '../../types';

interface ActivityHeatmapProps {
  activities: ActivityEvent[];
  memories?: Memory[];
  decisions?: Decision[];
  commitments?: Commitment[];
  weeksToShow?: number;
}

interface DayData {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  weekIndex: number;
  totalEvents: number;
  memoryCount: number;
  decisionCount: number;
  commitmentCount: number;
  intensityLevel: number; // 0, 1, 2, 3, 4
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  activities = [],
  memories = [],
  decisions = [],
  commitments = [],
  weeksToShow = 12
}) => {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Compute aggregated daily events across past `weeksToShow` weeks
  const { gridWeeks, totalPeriodEvents, maxDailyCount, activeDaysCount, streakDays } = useMemo(() => {
    // 1. Gather all events by YYYY-MM-DD
    const countsMap = new Map<string, { memories: number; decisions: number; commitments: number; total: number }>();

    const recordEvent = (dateStr: string, type: 'memory' | 'decision' | 'commitment') => {
      if (!dateStr || dateStr.length < 10) return;
      const key = dateStr.slice(0, 10);
      const cur = countsMap.get(key) || { memories: 0, decisions: 0, commitments: 0, total: 0 };
      if (type === 'memory') cur.memories += 1;
      else if (type === 'decision') cur.decisions += 1;
      else if (type === 'commitment') cur.commitments += 1;
      cur.total += 1;
      countsMap.set(key, cur);
    };

    activities.forEach((act) => {
      const date = act.timestampISO || '2026-10-10';
      if (act.type.startsWith('MEMORY')) recordEvent(date, 'memory');
      else if (act.type.startsWith('DECISION')) recordEvent(date, 'decision');
      else if (act.type.startsWith('COMMITMENT')) recordEvent(date, 'commitment');
      else recordEvent(date, 'memory');
    });

    memories.forEach((m) => {
      if (m.createdAt) recordEvent(m.createdAt, 'memory');
    });

    decisions.forEach((d) => {
      if (d.createdAt) recordEvent(d.createdAt, 'decision');
    });

    commitments.forEach((c) => {
      if (c.createdAt) recordEvent(c.createdAt, 'commitment');
    });

    // 2. Build calendar days grid
    // Anchor to today (local reference or 2026-10-12)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate start date so that end date ends on Saturday of current week
    const currentDayOfWeek = today.getDay(); // 0 is Sunday
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - currentDayOfWeek)); // Next Saturday

    const totalDays = weeksToShow * 7;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - totalDays + 1);

    const weeks: DayData[][] = [];
    let curWeek: DayData[] = [];
    let totalEventsAcc = 0;
    let maxDaily = 0;
    let activeDays = 0;

    const iterDate = new Date(startDate);
    let weekIdx = 0;

    while (iterDate <= endDate) {
      const year = iterDate.getFullYear();
      const month = String(iterDate.getMonth() + 1).padStart(2, '0');
      const day = String(iterDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const counts = countsMap.get(dateKey) || { memories: 0, decisions: 0, commitments: 0, total: 0 };
      totalEventsAcc += counts.total;
      if (counts.total > maxDaily) maxDaily = counts.total;
      if (counts.total > 0) activeDays += 1;

      // Intensity level mapping (0 to 4)
      let intensity = 0;
      if (counts.total >= 7) intensity = 4;
      else if (counts.total >= 5) intensity = 3;
      else if (counts.total >= 3) intensity = 2;
      else if (counts.total >= 1) intensity = 1;

      const dayObj: DayData = {
        dateStr: dateKey,
        dateObj: new Date(iterDate),
        dayOfWeek: iterDate.getDay(),
        weekIndex: weekIdx,
        totalEvents: counts.total,
        memoryCount: counts.memories,
        decisionCount: counts.decisions,
        commitmentCount: counts.commitments,
        intensityLevel: intensity
      };

      curWeek.push(dayObj);

      if (curWeek.length === 7) {
        weeks.push(curWeek);
        curWeek = [];
        weekIdx += 1;
      }

      iterDate.setDate(iterDate.getDate() + 1);
    }

    if (curWeek.length > 0) {
      weeks.push(curWeek);
    }

    // Calculate current streak
    let streak = 0;
    const checkDate = new Date(today);
    while (true) {
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const c = countsMap.get(dateKey);
      if (c && c.total > 0) {
        streak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      gridWeeks: weeks,
      totalPeriodEvents: totalEventsAcc,
      maxDailyCount: Math.max(maxDaily, 1),
      activeDaysCount: activeDays,
      streakDays: streak
    };
  }, [activities, memories, decisions, commitments, weeksToShow]);

  // Color generator for intensity levels
  const getCellBg = (intensity: number) => {
    switch (intensity) {
      case 4:
        return 'bg-[#C38EB4] border-[#D5A5C8] shadow-[0_0_8px_rgba(195,142,180,0.4)]';
      case 3:
        return 'bg-[#A15B91] border-[#C38EB4]/70';
      case 2:
        return 'bg-[#6B375F] border-[#A15B91]/60';
      case 1:
        return 'bg-[#3A2234] border-[#6B375F]/40';
      case 0:
      default:
        return 'bg-[#0E1F2E] border-[#26425A]/60 hover:border-[#86AACF]/40';
    }
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-[#112436] border border-[#26425A] rounded-sm p-5 shadow-sm space-y-4">
      {/* Header and Summary Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#26425A]">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#C38EB4]" />
            <h2 className="text-[14px] font-medium font-mono uppercase tracking-wider text-[#FFFFFF]">
              SYSTEM ACTIVITY HEATMAP
            </h2>
          </div>
          <p className="text-[12px] text-[#E1CBD7] mt-0.5">
            Daily event frequency and vault operations over trailing {weeksToShow} weeks.
          </p>
        </div>

        {/* Real Metrics Badges */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-2.5 py-1 rounded bg-[#0E1F2E] border border-[#26425A] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#C38EB4]" />
            <span className="text-[#86AACF] text-[10.5px]">TOTAL EVENTS:</span>
            <span className="text-[#FFFFFF] font-bold">{totalPeriodEvents}</span>
          </div>

          <div className="px-2.5 py-1 rounded bg-[#0E1F2E] border border-[#26425A] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#86AACF]" />
            <span className="text-[#86AACF] text-[10.5px]">ACTIVE DAYS:</span>
            <span className="text-[#86AACF] font-bold">{activeDaysCount}</span>
          </div>

          <div className="px-2.5 py-1 rounded bg-[#0E1F2E] border border-[#26425A] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#C38EB4]" />
            <span className="text-[#86AACF] text-[10.5px]">STREAK:</span>
            <span className="text-[#C38EB4] font-bold">{streakDays}d</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-2 min-w-full">
          {/* Day of Week Labels */}
          <div className="flex flex-col gap-1.5 pt-4 shrink-0">
            {dayLabels.map((lbl, idx) => (
              <div
                key={lbl}
                className="h-3 text-[9px] font-mono text-[#86AACF] leading-3 text-right pr-1 w-6 select-none"
              >
                {idx % 2 === 1 ? lbl : ''}
              </div>
            ))}
          </div>

          {/* Week Columns */}
          <div className="flex gap-1.5">
            {gridWeeks.map((week, wIdx) => {
              // Month label if first week of month
              const firstDayOfWeek = week[0]?.dateObj;
              const showMonthLabel = firstDayOfWeek && (firstDayOfWeek.getDate() <= 7 || wIdx === 0);
              const monthName = firstDayOfWeek
                ? firstDayOfWeek.toLocaleString('default', { month: 'short' })
                : '';

              return (
                <div key={`week-${wIdx}`} className="flex flex-col gap-1.5">
                  {/* Month Label Header */}
                  <div className="h-3 text-[9.5px] font-mono text-[#86AACF] leading-3 truncate w-3.5 select-none">
                    {showMonthLabel ? monthName : ''}
                  </div>

                  {/* 7 Days in Week Column */}
                  {week.map((day) => {
                    const isToday =
                      day.dateObj.toDateString() === new Date().toDateString();

                    return (
                      <div
                        key={day.dateStr}
                        onMouseEnter={(e) => {
                          setHoveredDay(day);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMousePos({ x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-3.5 h-3.5 rounded-[2px] border transition-transform duration-100 cursor-pointer hover:scale-125 hover:z-20 ${getCellBg(
                          day.intensityLevel
                        )} ${isToday ? 'ring-1 ring-[#86AACF]' : ''}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Footer: Intensity Legend & Peak Volume */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-[#26425A]/60 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-[11px] text-[#86AACF]">
          <span>PEAK DAILY VOLUME:</span>
          <span className="text-[#C38EB4] font-bold">{maxDailyCount} events/day</span>
        </div>

        {/* Dusty Rose Intensity Scale */}
        <div className="flex items-center gap-2 text-[11px] text-[#86AACF]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[2px] bg-[#0E1F2E] border border-[#26425A]" title="0 events" />
            <span className="w-3 h-3 rounded-[2px] bg-[#3A2234] border border-[#6B375F]/40" title="1-2 events" />
            <span className="w-3 h-3 rounded-[2px] bg-[#6B375F] border border-[#A15B91]/60" title="3-4 events" />
            <span className="w-3 h-3 rounded-[2px] bg-[#A15B91] border border-[#C38EB4]/70" title="5-6 events" />
            <span className="w-3 h-3 rounded-[2px] bg-[#C38EB4] border border-[#D5A5C8]" title="7+ events" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Hover Floating Tooltip */}
      {hoveredDay && mousePos && (
        <div
          className="fixed z-50 pointer-events-none p-2.5 rounded bg-[#0C1D44] border border-[#C38EB4]/50 shadow-2xl text-xs font-mono text-[#FFFFFF] -translate-x-1/2 -translate-y-full -mt-2"
          style={{ left: mousePos.x, top: mousePos.y }}
        >
          <div className="font-bold text-[#FFFFFF] pb-1 border-b border-[#26425A] flex items-center justify-between gap-3">
            <span>{hoveredDay.dateStr}</span>
            <span className="text-[#C38EB4] font-bold">{hoveredDay.totalEvents} events</span>
          </div>
          <div className="pt-1.5 space-y-0.5 text-[11px]">
            <div className="flex items-center justify-between gap-3 text-[#E1CBD7]">
              <span>Memories & Facts:</span>
              <span className="font-mono text-[#C38EB4]">{hoveredDay.memoryCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#E1CBD7]">
              <span>Decisions:</span>
              <span className="font-mono text-[#86AACF]">{hoveredDay.decisionCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#E1CBD7]">
              <span>Commitments & Tasks:</span>
              <span className="font-mono text-[#86AACF]">{hoveredDay.commitmentCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
