import type {ServerConfig} from '../config';
import {sendTransactional} from '../emailDelivery';
export {sendTransactional} from '../emailDelivery';
/** Plain transactional email; no remote resources or untrusted markup. */
export async function sendVerification(config:ServerConfig,to:string,link:string){
 const message={subject:'AEVIC — E-poçt ünvanınızı təsdiqləyin',text:`AEVIC hesabınızın e-poçt ünvanını təsdiqləmək üçün bu keçidi açın:\n\n${link}\n\nKeçid 30 dəqiqə etibarlıdır. Bu sorğunu siz göndərməmisinizsə, məktubu nəzərə almayın.`};
 return sendTransactional(config,to,message);
}
