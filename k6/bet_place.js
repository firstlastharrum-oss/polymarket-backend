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

const placeTrend = new Trend('bet_place_duration');
const placeErrors = new Rate('bet_place_errors');
const EPS = Number(__ENV.EPSILON || 0.02);
const AMOUNT = Number(__ENV.AMOUNT || 1);

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
  const headers = { 'Content-Type': 'application/json' };
  if (COOKIE) headers['Cookie'] = COOKIE;
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const listRes = http.get(`${BASE_URL}/listing`, { headers });
  if (listRes.status !== 200) { placeErrors.add(1); return; }
  const id = pickId(listRes.json());
  if (!id) { placeErrors.add(1); return; }

  const preRes = http.get(`${BASE_URL}/bets/listing/${id}/pool`, { headers });
  if (preRes.status !== 200) { placeErrors.add(1); return; }
  const pre = preRes.json();
  const total = Number(pre?.pool?.totalPoolAmount || 0);
  const yesAmt = Number(pre?.pool?.totalYesAmount || 0);
  const noAmt = Number(pre?.pool?.totalNoAmount || 0);
  const side = Math.random() < 0.5 ? 'YES' : 'NO';

  const expectedTotal = total + AMOUNT;
  const expectedYes = side === 'YES' ? yesAmt + AMOUNT : yesAmt;
  const expectedNo = side === 'NO' ? noAmt + AMOUNT : noAmt;
  const expectedYesProb = expectedTotal > 0 ? expectedYes / expectedTotal : 0;
  const expectedNoProb = expectedTotal > 0 ? expectedNo / expectedTotal : 0;

  const placeRes = http.post(
    `${BASE_URL}/bets/listing/place`,
    JSON.stringify({ listingId: id, side, amount: AMOUNT }),
    { headers }
  );
  placeTrend.add(placeRes.timings.duration);
  const placedOk = check(placeRes, { 'placed ok': (r) => r.status >= 200 && r.status < 300 });
  if (!placedOk) { placeErrors.add(1); return; }

  const postRes = http.get(`${BASE_URL}/bets/listing/${id}/pool`, { headers });
  if (postRes.status !== 200) { placeErrors.add(1); return; }
  const post = postRes.json();
  const y2 = Number(post?.probabilities?.yes || 0);
  const n2 = Number(post?.probabilities?.no || 0);

  const consistent = Math.abs(y2 - expectedYesProb) <= EPS && Math.abs(n2 - expectedNoProb) <= EPS;
  const ok = check(postRes, {
    'odds consistent': () => consistent,
  });
  if (!ok) placeErrors.add(1);
  sleep(0.1);
}
