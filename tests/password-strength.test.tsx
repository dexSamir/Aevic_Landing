import {expect,it} from 'vitest';
import {passwordFeedback} from '../src/utils/passwordStrength';
it('matches existing length, uppercase and digit rules and rejects obvious passwords',()=>{
 for(const value of ['', 'short1A', 'alllowercase44','NoDigitsHere','Password123!','Qwerty12345','AbcAbcAbc123','A'.repeat(129)+'1'])expect(passwordFeedback(value).valid).toBe(false);
 for(const value of ['DistinctMountain86','İşıqlıSəhər82','Four natural Words 7'])expect(passwordFeedback(value).valid).toBe(true);
});
