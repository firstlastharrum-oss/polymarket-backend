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

const fetchTrend = new Trend('markets_fetch_duration');
const fetchErrors = new Rate('markets_fetch_errors');

export default function () {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
  const COOKIE = __ENV.COOKIE || '';
  const TOKEN = __ENV.TOKEN || '';
  const headers = {};
  if (COOKIE) headers['Cookie'] = COOKIE;
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const res = http.get(`${BASE_URL}/listing`, { headers });

  fetchTrend.add(res.timings.duration);
  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'array payload': (r) => {
      try {
        const d = r.json();
        return Array.isArray(d) || Array.isArray(d?.data);
      } catch { return false; }
    },
  });
  if (!ok) fetchErrors.add(1);
  sleep(0.1);
}
