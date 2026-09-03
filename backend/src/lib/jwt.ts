import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  businessId: string;
  email: string;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    // matches the previous @nestjs/jwt config: JWT_EXPIRES_IN default '1d'
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}
