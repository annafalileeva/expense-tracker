import type { UserView } from '../../users/queries';

export class AuthResponseDto {
  accessToken!: string;
  user!: UserView;
}
