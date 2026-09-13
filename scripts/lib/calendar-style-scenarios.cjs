// Reset transient calendar UI between captures; fixture data stays unchanged.
function resetCalendarStyleState() {
  calYear = new Date().getFullYear(); calMonth = new Date().getMonth(); calViewMode = 'week';
  document.getElementById('calBtnWeek').classList.add('active');
  document.getElementById('calBtnBiweek').classList.remove('active');
  document.getElementById('calDayDetail').style.display = 'none';
  document.getElementById('calGridWrap').scrollLeft = 0;
}

function prepareCalendarStyleScenario(name) {
  const previousAccounts = accounts;
  const before = JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  let hover = null;
  try {
    if (name.startsWith('calendar-mini-')) {
      const mini = document.getElementById('dashCalendarMini');
      for (const state of ['is-gain', 'is-loss', 'is-muted', 'today']) {
        if (!mini.querySelector(`.dash-cal-cell.${state}`)) throw new Error(`Mini calendar state missing: ${state}`);
      }
      mini.scrollIntoView({block: 'center'});
      if (name === 'calendar-mini-open') {
        mini.querySelector('.dash-cal-cell.is-gain').click();
        if (!document.querySelector('#page-calendar.active')) throw new Error('Mini calendar did not navigate');
      } else hover = '#dashCalendarMini .dash-cal-cell.is-gain';
    } else {
      const wrap = document.getElementById('calGridWrap');
      if (name === 'calendar-month-compat') setCalView('month');
      else document.getElementById(name === 'calendar-biweek' ? 'calBtnBiweek' : 'calBtnWeek').click();
      const expectedGrid = name === 'calendar-month-compat' ? '.cal-grid' : name === 'calendar-biweek' ? '.cal-biweek-grid' : '.cal-week-grid';
      if (!wrap.querySelector(expectedGrid) || wrap.querySelectorAll('.cal-day[onclick]').length !== 30) throw new Error('Calendar mode or day count changed');
      for (const state of ['win', 'loss', 'today', 'other-month']) {
        if (!wrap.querySelector(`.cal-day.${state}`)) throw new Error(`Calendar state missing: ${state}`);
      }
      const day = value => wrap.querySelector(`[onclick="showCalDay(${value})"]`);
      const detail = document.getElementById('calDayDetail');
      if (['calendar-day-win', 'calendar-day-loss', 'calendar-day-empty'].includes(name)) {
        day(name === 'calendar-day-loss' ? 9 : 10).click();
        const status = name === 'calendar-day-loss' ? 'loss' : 'win';
        if (getComputedStyle(detail).display !== 'block' || document.querySelectorAll('#calDayTbody tr').length !== 1 ||
          !document.querySelector(`#calDayTbody .badge.${status}`)) throw new Error('Calendar day detail changed');
        if (name === 'calendar-day-empty') {
          day(11).click();
          if (getComputedStyle(detail).display !== 'none') throw new Error('Empty day did not hide detail');
        } else detail.scrollIntoView({block: 'center'});
      }
      const pick = value => {
        const picker = document.getElementById('calMonthPicker');
        picker.value = value; picker.dispatchEvent(new Event('change', {bubbles: true}));
        if (picker.value !== value) throw new Error('Calendar month picker changed');
      };
      if (name === 'calendar-nav-year') {
        pick('2026-12');
        document.querySelector('#page-calendar [onclick="calNav(1)"]').click();
        if (calYear !== 2027 || calMonth !== 0) throw new Error('Next month did not cross the year');
        document.querySelector('#page-calendar [onclick="calNav(-1)"]').click();
        if (calYear !== 2026 || calMonth !== 11 || wrap.querySelectorAll('.cal-day[onclick]').length !== 31) throw new Error('Previous month did not restore December');
      }
      if (name === 'calendar-leap-month') {
        pick('2024-02');
        if (calYear !== 2024 || calMonth !== 1 || wrap.querySelectorAll('.cal-day[onclick]').length !== 29) throw new Error('Leap month day count changed');
      }
      if (!['calendar-day-win', 'calendar-day-loss'].includes(name)) wrap.scrollIntoView({block: 'center'});
      if (name === 'calendar-week-scroll') {
        wrap.scrollLeft = wrap.scrollWidth;
        if (wrap.scrollWidth > wrap.clientWidth && wrap.scrollLeft <= 0) throw new Error('Calendar did not scroll horizontally');
      }
      if (name === 'calendar-day-hover') hover = '#calGridWrap .cal-day.win';
    }
  } finally { accounts = previousAccounts; }
  if (before !== JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])})) {
    throw new Error('Calendar scenario changed account/trade data or storage');
  }
  return hover;
}

module.exports = {resetCalendarStyleState, prepareCalendarStyleScenario};
