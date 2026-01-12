import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const ramp = Number(__ENV.RAMP || 10);
const sustain = Number(__ENV.SUSTAIN || 20);
const drain = Number(__ENV.DRAIN || 10);

export const options = {
  stages: [
    { duration: `${ramp}s`, target: 1000 },
    { duration: `${sustain}s`, target: 1000 },
    { duration: `${drain}s`, target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2500'],
  },
};

const mixTrend = new Trend('mixed_duration');
const mixErrors = new Rate('mixed_errors');

function pickId(listings) {
  const arr = Array.isArray(listings) ? listings : listings?.data || [];
  if (!arr.length) return null;
  const i = Math.floor(Math.random() * arr.length);
  return arr[i]?.id || null;
}

export default function () {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
  const COOKIE = __ENV.COOKIE || '';
  const TOKEN = __ENV.TOKEN || '';

  const headersGet = {};
  const headersPost = { 'Content-Type': 'application/json' };
  if (COOKIE) { headersGet['Cookie'] = COOKIE; headersPost['Cookie'] = COOKIE; }
  if (TOKEN) { headersGet['Authorization'] = `Bearer ${TOKEN}`; headersPost['Authorization'] = `Bearer ${TOKEN}`; }

  const resList = http.get(`${BASE_URL}/listing`, { headers: headersGet });
  if (resList.status !== 200) { mixErrors.add(1); return; }
  const id = pickId(resList.json());
  if (!id) { mixErrors.add(1); return; }

  const resOdds = http.get(`${BASE_URL}/bets/listing/${id}/pool`, { headers: headersGet });
  if (resOdds.status !== 200) { mixErrors.add(1); return; }

  const side = Math.random() < 0.5 ? 'YES' : 'NO';
  const resPlace = http.post(
    `${BASE_URL}/bets/listing/place`,
    JSON.stringify({ listingId: id, side, amount: Number(__ENV.AMOUNT || 1) }),
    { headers: headersPost }
  );
  const resOdds2 = http.get(`${BASE_URL}/bets/listing/${id}/pool`, { headers: headersGet });

  mixTrend.add(resList.timings.duration + resOdds.timings.duration + resPlace.timings.duration + resOdds2.timings.duration);

  const ok = check(resPlace, {
    'place ok': (r) => r.status >= 200 && r.status < 300,
  }) && check(resOdds2, {
    'post-odds 200': (r) => r.status === 200,
  });
  if (!ok) mixErrors.add(1);
  sleep(0.1);
}
