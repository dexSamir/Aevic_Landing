import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MfaCodeInput } from '../src/components/auth/MfaCodeInput';
import { passwordFeedback } from '../src/utils/passwordStrength';
it('defaults to six numeric digits and switches to recovery without carrying credentials',()=>{
 function Form(){const [value,setValue]=useState('');return <MfaCodeInput value={value} onChange={setValue}/>;}
 render(<Form/>);const input=screen.getByLabelText('Authenticator kodu');
 expect(input).toHaveAttribute('inputmode','numeric');expect(input).toHaveAttribute('autocomplete','one-time-code');
 fireEvent.change(input,{target:{value:'123 456'}});expect(input).toHaveValue('123456');
 fireEvent.click(screen.getByRole('button',{name:'Bərpa kodundan istifadə et'}));
 expect(screen.getByLabelText('Bərpa kodu')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('Bərpa kodu'),{target:{value:'ABCD-EFGH-IJKL'}});
 fireEvent.click(screen.getByRole('button',{name:'Authenticator koduna qayıt'}));expect(screen.getByLabelText('Authenticator kodu')).toHaveValue('');
});
it('rewards varied secrets and passphrases without rewarding predictable complexity',()=>{
 expect(passwordFeedback('P@ssw0rd123!').score).toBeLessThan(3);
 expect(passwordFeedback('AbAbAbAb123!').score).toBeLessThan(3);
 expect(passwordFeedback('K8!vR2#tM9@p').score).toBeGreaterThanOrEqual(4);
 expect(passwordFeedback('Four distant lanterns under Moon 7').score).toBe(5);
 expect(passwordFeedback('CaptainMorgan74!', ['CaptainMorgan@example.test']).score).toBeLessThan(3);
});
