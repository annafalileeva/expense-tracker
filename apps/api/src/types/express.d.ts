import type { UserView } from '../modules/users/queries';

declare global {
  namespace Express {
    interface User extends UserView {}
  }
}

export {};
