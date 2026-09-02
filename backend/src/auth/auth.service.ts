import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError, Repository } from 'typeorm';
import { compare, hash } from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Business } from '../business/entities/business.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string }> {
    const user = await this.userRepository.findOneBy({ email: dto.email });
    const passwordMatches = user
      ? await compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      businessId: user.businessId,
      email: user.email,
    };
    return { token: this.jwtService.sign(payload) };
  }

  async signup(dto: SignupDto): Promise<{ token: string }> {
    const existing = await this.userRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await hash(dto.password, 10);

    try {
      const user = await this.userRepository.manager.transaction(async (manager) => {
        const business = await manager.save(
          manager.create(Business, { name: dto.businessName, email: dto.email }),
        );
        return manager.save(
          manager.create(User, {
            businessId: business.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            passwordHash,
          }),
        );
      });

      const payload: JwtPayload = {
        sub: user.id,
        businessId: user.businessId,
        email: user.email,
      };
      return { token: this.jwtService.sign(payload) };
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === '23505'
      ) {
        throw new ConflictException('An account with this email already exists');
      }
      throw err;
    }
  }
}
