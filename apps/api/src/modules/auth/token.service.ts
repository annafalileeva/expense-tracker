import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserView } from '../users/queries';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(user: UserView): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
}
