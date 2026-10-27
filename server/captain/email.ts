import type {ResetMailer} from './service';
import type {ServerConfig} from '../config';
import {sendTransactional} from '../emailDelivery';
import {passwordResetEmail} from './reset-email';

export function resetMailer(config:ServerConfig):ResetMailer {
 return {send:(to,link)=>sendTransactional(config,to,passwordResetEmail(link))};
}
