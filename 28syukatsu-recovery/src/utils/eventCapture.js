function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    .replace(/[()（）・/／-]/g, '');
}

function findCompanyMatch(sourceText = '', companies = []) {
  const haystack = normalizeText(sourceText);

  for (const company of companies) {
    const candidates = [
      company.name,
      company.canonical_name_en,
      ...String(company.aliases || '').split('|')
    ]
      .map((item) => item && item.trim())
      .filter(Boolean);

    for (const candidate of candidates) {
      if (haystack.includes(normalizeText(candidate))) {
        return {
          company_id: company.id || null,
          company_name_raw: company.name || candidate
        };
      }
    }
  }

  return { company_id: null, company_name_raw: '' };
}

function isMailMetadataLine(line = '') {
  const value = String(line || '').trim();
  if (!value) return false;

  return (
    /^(subject|from|date|to|cc|bcc|reply-to|message-id)\s*:/i.test(value) ||
    /^(content-type|content-transfer-encoding|mime-version|charset)\s*:/i.test(value) ||
    /^--[-=\w]+/.test(value)
  );
}

function extractSubjectLine(text = '') {
  const match = String(text).match(/^subject\s*:\s*(.+)$/im);
  return match?.[1]?.trim() || '';
}

function stripMailMetadata(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => !isMailMetadataLine(line))
    .join('\n')
    .trim();
}

function inferEventType(text = '') {
  const source = String(text);
  if (/面接|interview/i.test(source)) return 'interview';
  if (/説明会|座談会|セミナー|webinar|event/i.test(source)) return 'seminar';
  if (/締切|期限|deadline|応募/i.test(source)) return 'deadline';
  if (/面談|OB訪問|casual/i.test(source)) return 'meeting';
  if (/web.?test|tg-web|spi|玉手箱/i.test(source)) return 'webtest';
  return 'general';
}

function inferLocation(sourceText = '') {
  const text = String(sourceText);
  const urlMatch = text.match(/https?:\/\/[^\s)>\]]+/i);
  const hasOnline = /zoom|teams|meet|webex|online|オンライン/i.test(text);
  const hasOffline = /会場|オフィス|住所|本社|東京|大阪|渋谷|新宿|対面/i.test(text);

  if (hasOnline && hasOffline) {
    return { location_type: 'hybrid', location_value: urlMatch?.[0] || '' };
  }
  if (hasOnline) {
    return { location_type: 'online', location_value: urlMatch?.[0] || '' };
  }
  if (hasOffline) {
    const line = text
      .split('\n')
      .find((item) => /会場|オフィス|住所|本社|東京|大阪|渋谷|新宿|対面/i.test(item));
    return { location_type: 'offline', location_value: line?.trim() || '' };
  }

  return { location_type: 'unknown', location_value: urlMatch?.[0] || '' };
}

function collectDateCandidates(text = '') {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = [];
  const pattern = /(?:(\d{4})[\/\-年])?\s*(\d{1,2})[\/\-月](\d{1,2})日?(?:[^0-9]{0,12}(\d{1,2}):(\d{2})(?:\s*[-~〜]\s*(\d{1,2}):(\d{2}))?)?/g;

  lines.forEach((line) => {
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const hasTime = match[4] != null;
      const looksLikeHeader = /^date\s*:/i.test(line);
      candidates.push({
        line,
        match,
        hasTime,
        looksLikeHeader,
        score:
          (hasTime ? 4 : 0) +
          (/説明会|座談会|面接|イベント|セミナー|業界研究|web.?test|締切|開催/i.test(line) ? 3 : 0) +
          (/予約|ご案内|参加|詳細|会場|オンライン|zoom|teams/i.test(line) ? 1 : 0) +
          (looksLikeHeader ? -6 : 0)
      });
    }
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function parseDateTime(fragment = '') {
  const candidates = collectDateCandidates(fragment);
  const top = candidates[0];

  if (!top) {
    return { start_at: '', end_at: '' };
  }

  if (top.score < 3) {
    return { start_at: '', end_at: '' };
  }

  const [, yearRaw, monthRaw, dayRaw, startHourRaw, startMinuteRaw, endHourRaw, endMinuteRaw] = top.match;
  const now = new Date();
  const year = Number(yearRaw || now.getFullYear());
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const startHour = startHourRaw != null ? Number(startHourRaw) : 9;
  const startMinute = startMinuteRaw != null ? Number(startMinuteRaw) : 0;
  const endHour = endHourRaw != null ? Number(endHourRaw) : null;
  const endMinute = endMinuteRaw != null ? Number(endMinuteRaw) : null;

  const start = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  const end =
    endHour !== null
      ? new Date(year, month - 1, day, endHour, endMinute || 0, 0, 0)
      : null;

  return {
    start_at: Number.isNaN(start.getTime()) ? '' : start.toISOString(),
    end_at: end && !Number.isNaN(end.getTime()) ? end.toISOString() : ''
  };
}

function buildTitle(text = '', companyName = '', eventType = 'general') {
  const subjectLine = extractSubjectLine(text);
  if (subjectLine) {
    return subjectLine.replace(/\s+/g, ' ').trim().slice(0, 100);
  }

  const firstMeaningfulLine = String(text)
    .split('\n')
    .map((item) => item.trim())
    .find((line) => line && !isMailMetadataLine(line));

  const cleaned = String(firstMeaningfulLine || '')
    .replace(/\d{1,4}[\/\-年]\d{1,2}[\/\-月]\d{1,2}日?/g, '')
    .replace(/\d{1,2}:\d{2}(?:\s*[-~〜]\s*\d{1,2}:\d{2})?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned) return cleaned.slice(0, 100);

  const typeLabel = {
    seminar: '説明会',
    interview: '面接',
    deadline: '締切',
    meeting: '面談',
    webtest: 'Webテスト',
    general: 'イベント'
  }[eventType] || 'イベント';

  return companyName ? `${companyName} ${typeLabel}` : typeLabel;
}

function scoreDraft(draft) {
  let confidence = 0.2;
  if (draft.company_id || draft.company_name_raw) confidence += 0.2;
  if (draft.title) confidence += 0.2;
  if (draft.start_at) confidence += 0.25;
  if (draft.event_type && draft.event_type !== 'general') confidence += 0.1;
  if (draft.location_type !== 'unknown' || draft.location_value) confidence += 0.1;
  if (draft.end_at) confidence += 0.05;
  return Math.min(1, Number(confidence.toFixed(2)));
}

function buildPrimaryEmailSegment(text = '') {
  const subject = extractSubjectLine(text);
  const body = stripMailMetadata(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/mail_campaign|setting|unsubscribe|配信停止|受信設定|配信専用/i.test(line))
    .slice(0, 24)
    .join('\n');

  return [subject, body].filter(Boolean).join('\n').trim() || String(text || '').trim();
}

function buildSegments(text = '', sourceType = 'email') {
  const lines = String(text)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (sourceType === 'email') {
    return [buildPrimaryEmailSegment(text)];
  }

  const dateLineIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /(?:\d{4}[\/\-年])?\d{1,2}[\/\-月]\d{1,2}日?/.test(line))
    .map(({ index }) => index);

  if (!dateLineIndexes.length) {
    return [lines.slice(0, 6).join('\n') || text];
  }

  return dateLineIndexes.map((index) =>
    lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 3)).join('\n')
  );
}

export function parseEventCandidates(sourceText = '', sourceType = 'email', companies = []) {
  const text = String(sourceText || '').trim();
  if (!text) return [];

  const baseCompany = findCompanyMatch(text, companies);
  const segments = buildSegments(text, sourceType);

  const drafts = segments.map((segment, index) => {
    const eventType = inferEventType(segment || text);
    const timing = parseDateTime(segment || text);
    const location = inferLocation(segment || text);
    const candidate = {
      id: `draft-${Date.now()}-${index}`,
      company_id: baseCompany.company_id,
      company_name_raw: baseCompany.company_name_raw,
      title: buildTitle(segment || text, baseCompany.company_name_raw, eventType),
      event_type: eventType,
      start_at: timing.start_at,
      end_at: timing.end_at,
      location_type: location.location_type,
      location_value: location.location_value,
      source_text: text,
      source_type: sourceType,
      status: 'draft',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const confidence = scoreDraft(candidate);
    return {
      ...candidate,
      confidence,
      needs_attention: confidence < 0.6 || !candidate.start_at || !candidate.title
    };
  });

  const seen = new Set();
  return drafts.filter((draft) => {
    const key = [
      draft.company_id || draft.company_name_raw || '',
      draft.title || '',
      draft.start_at || '',
      draft.event_type || ''
    ].join('::');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
