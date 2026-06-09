const QUICK_CITIES = ['Zagreb', 'Split', 'Rijeka', 'Osijek'];

document.addEventListener('DOMContentLoaded', async () => {
  if (!await initAuth()) return;
  document.body.insertAdjacentHTML('afterbegin', createSidebar('weather'));

  document.getElementById('get-weather-btn').addEventListener('click', () => {
    const city = document.getElementById('city-input').value.trim();
    if (city) fetchWeather(city);
  });

  document.getElementById('city-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const city = e.target.value.trim();
      if (city) fetchWeather(city);
    }
  });

  const container = document.getElementById('quick-btns');
  QUICK_CITIES.forEach(city => {
    const btn = document.createElement('button');
    btn.className   = 'btn btn-secondary btn-sm';
    btn.textContent = city;
    btn.addEventListener('click', () => {
      document.getElementById('city-input').value = city;
      fetchWeather(city);
    });
    container.appendChild(btn);
  });
});

async function fetchWeather(city) {
  const resultsEl = document.getElementById('weather-results');
  clearAlert('alert-container');
  resultsEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-3)"><span class="spinner spinner-blue"></span> Fetching weather…</div>`;

  const btn  = document.getElementById('get-weather-btn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Loading…`;

  try {
    const data = await apiRequest('GET', `/api/weather/${encodeURIComponent(city)}`);

    const items = data?.results ?? (Array.isArray(data) ? data : (data ? [data] : []));

    if (!items.length) {
      resultsEl.innerHTML = noDataHtml(city);
      return;
    }

    resultsEl.innerHTML = `<div class="weather-grid" style="justify-content:center">${items.map(renderCard).join('')}</div>`;
  } catch (err) {
    if (err.status === 404) {
      resultsEl.innerHTML = noDataHtml(city);
    } else {
      showAlert('alert-container', err.message, 'error');
      resultsEl.innerHTML = '';
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

function noDataHtml(city) {
  return `<div class="empty mt-4">
    <div class="empty-text">No data found for "${escapeHtml(city)}"</div>
  </div>`;
}

function renderCard(w) {
  const city     = w.city     ?? w.cityName  ?? '—';
  const temp     = w.temperature ?? '—';
  const humidity = w.humidity ?? '—';
  const wind     = w.wind     ?? w.windSpeed ?? '—';

  const fmtNum = v => {
    const n = parseFloat(v);
    return isNaN(n) ? (v ?? '—') : n.toFixed(1);
  };
  const fmtInt = v => {
    const n = parseFloat(v);
    return isNaN(n) ? (v ?? '—') : Math.round(n);
  };

  return `<div class="weather-card">
    <div class="weather-city">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>
      </svg>
      ${escapeHtml(String(city))}
    </div>
    <div class="weather-temp">${fmtNum(temp)}<sup>°C</sup></div>
    <div class="weather-stat">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 14a4 4 0 110-8 4 4 0 010 8z"/>
      </svg>
      Humidity ${fmtInt(humidity)}%
    </div>
    <div class="weather-stat">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.7 7.7a2.5 2.5 0 111.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1111 8H2"/><path d="M12.6 19.4A2 2 0 1014 16H2"/>
      </svg>
      Wind ${fmtNum(wind)} km/h
    </div>
  </div>`;
}
