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
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
  },
};

const oddsTrend = new Trend('odds_read_duration');
const oddsErrors = new Rate('odds_read_errors');

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
  const headers = {};
  if (COOKIE) headers['Cookie'] = COOKIE;
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const listRes = http.get(`${BASE_URL}/listing`, { headers });
  if (listRes.status !== 200) { oddsErrors.add(1); return; }
  const id = pickId(listRes.json());
  if (!id) { oddsErrors.add(1); return; }
  const res = http.get(`${BASE_URL}/bets/listing/${id}/pool`, { headers });
  oddsTrend.add(res.timings.duration);
  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'probabilities in range': (r) => {
      try {
        const d = r.json();
        const y = Number(d?.probabilities?.yes || 0);
        const n = Number(d?.probabilities?.no || 0);
        return y >= 0 && y <= 1 && n >= 0 && n <= 1;
      } catch { return false; }
    },
  });
  if (!ok) oddsErrors.add(1);
  sleep(0.1);
}
