import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ cookie: 'session', post: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: mock.cookie }) }) }));
vi.mock('../gasClient', () => ({ gasPost: mock.post }));
import { adminRoute } from '../adminRoute';
import { signSession } from '../session';
const request = (body: unknown, origin?: string) => new Request('https://test.example/api/tournament-lite/state', { method: 'POST', headers: origin ? { origin } : {}, body: JSON.stringify(body) });
beforeEach(async () => { process.env.TOURNAMENT_LITE_ADMIN_SESSION_TOKEN = 'session'; mock.cookie = await signSession('a'.repeat(32), Date.now()+60000); mock.post.mockReset().mockResolvedValue({ ok: true }); });
describe('Tournament admin proxy', () => {
  it.each(['state','generate','reset','score','recalc','category','entries','settings','tournaments'])('requires an admin session for %s', async route => {
    mock.cookie = 'wrong'; expect((await adminRoute(request({}), route)).status).toBe(401); expect(mock.post).not.toHaveBeenCalled();
  });
  it('rejects cross-origin mutations', async () => { expect((await adminRoute(request({}, 'https://attacker.example'), 'reset')).status).toBe(403); expect(mock.post).not.toHaveBeenCalled(); });
  it('keeps request-specific tournament scope through generation preview and confirmation', async () => {
    await adminRoute(request({ tournamentId: 'event-two', categoryId: 'C', preview: true, secret: 'attacker' }), 'generate');
    expect(mock.post).toHaveBeenLastCalledWith('generateFixtures', { categoryId: 'C', preview: true }, 'event-two', 'a'.repeat(32));
    await adminRoute(request({ tournamentId: 'event-three', categoryId: 'C', confirm: true }), 'generate');
    expect(mock.post).toHaveBeenLastCalledWith('generateFixtures', { categoryId: 'C', confirm: true }, 'event-three', 'a'.repeat(32));
  });
  it('forwards club entries and score corrections to the selected event only', async () => {
    await adminRoute(request({ tournamentId:'event-two', Entry_ID:'E', Category_ID:'C', Entry_Name:'Team', Club_Name:'North', Tournament_ID:'legacy' }), 'entries');
    expect(mock.post).toHaveBeenLastCalledWith('upsertEntry', { Entry_ID:'E', Category_ID:'C', Entry_Name:'Team', Club_Name:'North' }, 'event-two', 'a'.repeat(32));
    await adminRoute(request({ tournamentId:'event-two', matchId:'M',score1:21,score2:17 }), 'score');
    expect(mock.post).toHaveBeenLastCalledWith('updateScore', {matchId:'M',score1:21,score2:17}, 'event-two', 'a'.repeat(32));
  });
  it('rejects invalid scope, unknown actions and malformed destructive requests', async () => {
    for (const body of [{ tournamentId:'' }, { tournamentId:null }, { tournamentId:[] }]) expect((await adminRoute(request(body), 'reset')).status).toBe(400);
    expect((await adminRoute(request({action:'resetFixtures'}), 'tournaments')).status).toBe(400);
    expect((await adminRoute(new Request('https://test.example/', {method:'POST',body:'{' }), 'reset')).status).toBe(400);
    expect(mock.post).not.toHaveBeenCalled();
  });
});
