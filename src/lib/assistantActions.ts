import { addHours, isValid, setHours, setMinutes } from 'date-fns';
import type { AssistantAction } from '../types/domain';

export interface ParsedAssistantIntent {
  summary: string;
  actions: AssistantAction[];
}

function parseDateish(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('tomorrow')) {
    const date = addHours(now, 24);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  }

  if (lower.includes('next wednesday')) {
    const next = new Date(now);
    const delta = (3 - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + delta);
    return next.toISOString();
  }

  if (lower.includes('friday')) {
    const friday = new Date(now);
    const dayDelta = (5 - now.getDay() + 7) % 7 || 7;
    friday.setDate(now.getDate() + dayDelta);
    return friday.toISOString();
  }

  return null;
}

function parseTime(text: string): { hour: number; minute: number } | null {
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridian = match[3]?.toLowerCase();

  if (meridian === 'pm' && hour < 12) hour += 12;
  if (meridian === 'am' && hour === 12) hour = 0;

  return { hour, minute };
}

export function parseAssistantIntent(input: string, pageContext: string): ParsedAssistantIntent {
  const text = input.trim();
  const lower = text.toLowerCase();
  const actions: AssistantAction[] = [];

  if (lower.includes('task')) {
    actions.push({
      type: 'create_task',
      label: 'Create task draft',
      payload: { title: text },
      requiresConfirmation: true,
    });
  }

  if (lower.includes('release')) {
    actions.push({
      type: 'navigate',
      label: 'Open ideas & WIPs',
      payload: { to: '/ideas' },
    });
  }

  if (lower.includes('schedule') || lower.includes('book') || pageContext.includes('calendar')) {
    const dateish = parseDateish(text);
    const time = parseTime(text);
    const baseDate = dateish ? new Date(dateish) : new Date();
    const dated = time
      ? setMinutes(setHours(baseDate, time.hour), time.minute)
      : baseDate;

    if (isValid(dated)) {
      actions.push({
        type: lower.includes('teaser') || lower.includes('reel')
          ? 'open_content_scheduler'
          : 'create_calendar_event',
        label: lower.includes('teaser') || lower.includes('reel')
          ? 'Open content scheduler'
          : 'Create calendar event',
        payload: {
          title: text,
          startsAt: dated.toISOString(),
        },
        requiresConfirmation: true,
      });
    }
  }

  if (actions.length === 0) {
    actions.push({
      type: 'navigate',
      label: 'Open Coach history',
      payload: { to: '/coach' },
    });
  }

  return {
    summary: `Parsed ${actions.length} suggested action${actions.length === 1 ? '' : 's'} from "${text}".`,
    actions,
  };
}
