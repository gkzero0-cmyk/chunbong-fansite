(() => {
  'use strict';

  function dateOnly(value = '') {
    return String(value || '').slice(0, 10);
  }

  function itemStartDate(item = {}) {
    return dateOnly(item.start);
  }

  function itemEndDate(item = {}) {
    return dateOnly(item.end || item.start);
  }

  function shiftDate(key, days) {
    const date = new Date(`${key}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }

  function intersectsDateRange(item, start, end) {
    const itemStart = itemStartDate(item);
    const itemEnd = itemEndDate(item);
    return Boolean(itemStart && itemEnd && itemEnd >= start && itemStart <= end);
  }

  function statusFor(item, today) {
    const start = itemStartDate(item);
    const end = itemEndDate(item);
    if (start <= today && end >= today) return 'today';
    if (start > today) return 'upcoming';
    return 'recent';
  }

  function sortByStart(items = []) {
    return [...items].sort((a, b) =>
      String(a.start || '').localeCompare(String(b.start || '')) ||
      String(a.title || '').localeCompare(String(b.title || ''), 'ko')
    );
  }

  function upcomingItems(items = [], today = '') {
    return sortByStart(items.filter(item => itemEndDate(item) >= today))
      .sort((a, b) => {
        const aToday = statusFor(a, today) === 'today' ? 0 : 1;
        const bToday = statusFor(b, today) === 'today' ? 0 : 1;
        return aToday - bToday || String(a.start || '').localeCompare(String(b.start || ''));
      });
  }

  function previousWeekBounds(today = '', offset = 1) {
    const safeOffset = Math.max(1, Number(offset) || 1);
    const end = shiftDate(today, -1 - ((safeOffset - 1) * 7));
    return { start: shiftDate(end, -6), end };
  }

  function previousWeekItems(items = [], today = '', offset = 1) {
    const range = previousWeekBounds(today, offset);
    return sortByStart(items.filter(item => intersectsDateRange(item, range.start, range.end)));
  }

  window.__CHUNBONG_SCHEDULE_HELPERS__ = {
    dateOnly,
    itemStartDate,
    itemEndDate,
    shiftDate,
    intersectsDateRange,
    statusFor,
    sortByStart,
    upcomingItems,
    previousWeekBounds,
    previousWeekItems
  };
})();
