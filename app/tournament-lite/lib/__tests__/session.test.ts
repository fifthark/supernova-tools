import { beforeEach, expect, it } from 'vitest';
import { signSession, verifySession } from '../session';
import { eventCourtLabels } from '../utils';
beforeEach(()=>{process.env.TOURNAMENT_LITE_ADMIN_SESSION_TOKEN='synthetic-signing-key';});
it('verifies signatures and expiry, rejects static, malformed and tampered cookies',async()=>{
 const id='b'.repeat(32), expiresAt=Date.now()+60000;const cookie=await signSession(id,expiresAt);
 expect(await verifySession(cookie)).toEqual({id,expiresAt});
 for(const invalid of ['synthetic-signing-key',cookie+'x','garbage.a',cookie.replace(/^./,c=>c==='a'?'b':'a'),await signSession(id,Date.now()-1)]) expect(await verifySession(invalid)).toBeNull();
 process.env.TOURNAMENT_LITE_ADMIN_SESSION_TOKEN='rotated';expect(await verifySession(cookie)).toBeNull();
});
it('court picker matches configured labels only',()=>{
 const state=(Num_Courts:number,Court_Names='')=>({ok:true,settings:[{Key:'Num_Courts',Value:Num_Courts},{Key:'Court_Names',Value:Court_Names}]});
 expect(eventCourtLabels(state(4))).toEqual(['Court 1','Court 2','Court 3','Court 4']);
 expect(eventCourtLabels(state(2,'East,West'))).toEqual(['East','West']);
 expect(eventCourtLabels(state(2,'East'))).toEqual([]);expect(eventCourtLabels(state(0))).toEqual([]);
});
