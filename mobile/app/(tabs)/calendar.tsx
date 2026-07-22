import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { fetchJson } from '@/lib/api';
import { alpha, colors, fonts, km, spacing, typography } from '@/lib/theme';

type CompactDay = {
  date: string;
  weekday: string | null;
  dayIndex: number;
  title: string;
  category: string | null;
  distanceKm: number | null;
  verified: boolean;
  offPlanVerified: boolean;
  logged: boolean;
};

type DashboardFallback = {
  data?: {
    todayISO?: string;
    planStart?: string | null;
    planEnd?: string | null;
    days?: CompactDay[];
  };
};

type CalendarPayload = {
  today?: string;
  planStart?: string | null;
  planEnd?: string | null;
  days?: CompactDay[];
  daysByDate?: Record<string, unknown> | Array<[string, unknown]>;
};

type CalendarState = {
  today: string;
  planStart: string | null;
  planEnd: string | null;
  days: CompactDay[];
};

export default function CalendarScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [state, setState] = useState<CalendarState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calendar, dashboard] = await Promise.all([
        fetchJson<CalendarPayload | null>(`/api/mobile/calendar?month=${month}`),
        fetchJson<DashboardFallback>('/api/mobile/dashboard').catch(() => null),
      ]);
      setState(normalizeCalendar(calendar, dashboard));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load calendar.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const daysByDate = useMemo(() => {
    const map = new Map<string, CompactDay>();
    for (const day of state?.days ?? []) map.set(day.date, day);
    return map;
  }, [state?.days]);

  return (
    <Screen
      title={monthLabel(month)}
      eyebrow="Calendar"
      subtitle="Tap any plan day for the full prescription and evidence."
      refreshing={loading}
      onRefresh={load}
    >
      <View style={styles.nav}>
        <Button title="Prev" variant="ghost" onPress={() => setMonth(addMonths(month, -1))} />
        <Button title="Today" variant="quiet" onPress={() => setMonth(currentMonth())} />
        <Button title="Next" variant="ghost" onPress={() => setMonth(addMonths(month, 1))} />
      </View>
      {error ? (
        <Panel>
          <Text style={styles.body}>{error}</Text>
        </Panel>
      ) : null}
      <Panel padded={false}>
        <View style={styles.weekHeader}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <Text key={`${day}-${index}`} style={styles.weekLabel}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {monthGrid(month).flat().map((date) => {
            const day = daysByDate.get(date);
            return (
              <DayCell
                key={date}
                date={date}
                day={day}
                inMonth={date.slice(0, 7) === month}
                isToday={date === state?.today}
                onPress={() => router.push(`/day/${date}` as Href)}
              />
            );
          })}
        </View>
      </Panel>
      {!loading && daysByDate.size === 0 ? (
        <Panel>
          <Text style={styles.body}>No calendar days are available yet.</Text>
        </Panel>
      ) : null}
    </Screen>
  );
}

function DayCell({
  date,
  day,
  inMonth,
  isToday,
  onPress,
}: {
  date: string;
  day?: CompactDay;
  inMonth: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  const tone = day?.verified || day?.logged
    ? colors.sage
    : day?.offPlanVerified
      ? colors.strava
      : day
        ? colors.accent
        : colors.inkFaint;

  return (
    <Pressable
      disabled={!day}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        !inMonth && styles.outMonth,
        isToday && styles.today,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.dayNumber, !inMonth && styles.outMonthText]}>
        {Number(date.slice(8, 10))}
      </Text>
      {day ? (
        <>
          <View style={[styles.dot, { backgroundColor: tone }]} />
          <Text numberOfLines={1} style={styles.cellTitle}>
            {day.distanceKm != null ? km(day.distanceKm) : categoryLabel(day.category)}
          </Text>
        </>
      ) : null}
    </Pressable>
  );
}

function normalizeCalendar(
  calendar: CalendarPayload | null,
  dashboard: DashboardFallback | null,
): CalendarState {
  const dashboardDays = dashboard?.data?.days ?? [];
  const calendarDays = extractDays(calendar);
  return {
    today: calendar?.today ?? dashboard?.data?.todayISO ?? todayIso(),
    planStart: calendar?.planStart ?? dashboard?.data?.planStart ?? null,
    planEnd: calendar?.planEnd ?? dashboard?.data?.planEnd ?? null,
    days: calendarDays.length > 0 ? calendarDays : dashboardDays,
  };
}

function extractDays(payload: CalendarPayload | null): CompactDay[] {
  if (!payload) return [];
  if (Array.isArray(payload.days)) return payload.days;
  const source = payload.daysByDate;
  if (!source) return [];
  const values = Array.isArray(source) ? source.map(([, value]) => value) : Object.values(source);
  return values.flatMap((value) => {
    if (!isRecord(value)) return [];
    const day = isRecord(value.day) ? value.day : value;
    const date = typeof day.date === 'string' ? day.date : null;
    if (!date) return [];
    const primary = isRecord(value.primary) ? value.primary : null;
    return [{
      date,
      weekday: typeof day.weekday === 'string' ? day.weekday : null,
      dayIndex: typeof day.day_index === 'number' ? day.day_index : 0,
      title: text(primary?.title) ?? text(day.title) ?? 'Training day',
      category: text(primary?.category) ?? text(day.category),
      distanceKm: number(primary?.distance_km) ?? number(day.planned_run_km),
      verified: Array.isArray(value.evidence) && value.evidence.length > 0 && !value.offPlan,
      offPlanVerified: Boolean(value.offPlan),
      logged: Boolean(value.log),
    }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function categoryLabel(category: string | null | undefined): string {
  if (!category) return '--';
  return category.replace(/_/g, ' ');
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  return todayIso().slice(0, 7);
}

function addMonths(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function monthGrid(month: string): string[][] {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const start = new Date(first);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  start.setUTCDate(first.getUTCDate() - mondayOffset);

  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + row * 7 + column);
      return date.toISOString().slice(0, 10);
    }),
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  weekLabel: {
    flex: 1,
    paddingVertical: spacing[3],
    textAlign: 'center',
    color: colors.inkFaint,
    fontFamily: fonts.monoBold,
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 78,
    padding: spacing[2],
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    gap: spacing[1],
  },
  outMonth: {
    opacity: 0.35,
  },
  outMonthText: {
    color: colors.inkFaint,
  },
  today: {
    backgroundColor: alpha(colors.accent, 0.08),
  },
  pressed: {
    backgroundColor: alpha(colors.accent, 0.14),
  },
  dayNumber: {
    color: colors.ink,
    fontFamily: fonts.monoBold,
    fontSize: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cellTitle: {
    color: colors.inkDull,
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 13,
    textTransform: 'capitalize',
  },
  body: {
    ...typography.body,
  },
});
