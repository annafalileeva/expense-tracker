export * from './register.command';
export * from './login.command';

import { RegisterHandler } from './register.handler';
import { LoginHandler } from './login.handler';

export const AuthCommandHandlers = [RegisterHandler, LoginHandler];
