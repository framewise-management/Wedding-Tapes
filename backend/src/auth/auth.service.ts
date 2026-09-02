import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError, Repository } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '../users/entities/user.entity';
import { Business } from '../business/entities/business.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  async login(dto: LoginDto): Promise<{ token: string }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      const isUnconfirmed =
        (error as { code?: string }).code === 'email_not_confirmed' ||
        error.message.toLowerCase().includes('email not confirmed');
      if (isUnconfirmed) {
        throw new ForbiddenException(
          'Please verify your email before logging in — check your inbox for the confirmation link.',
        );
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.userRepository.findOneBy({ email: dto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      businessId: user.businessId,
      email: user.email,
    };
    return { token: this.jwtService.sign(payload) };
  }

  async signup(dto: SignupDto): Promise<{ message: string }> {
    const existing = await this.userRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: { emailRedirectTo: `${frontendUrl}/?verified=true` },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new BadRequestException(error.message);
    }
    if (!data.user) {
      throw new BadRequestException('Signup failed');
    }

    try {
      await this.userRepository.manager.transaction(async (manager) => {
        const business = await manager.save(
          manager.create(Business, { name: dto.businessName, email: dto.email }),
        );
        await manager.save(
          manager.create(User, {
            id: data.user!.id,
            businessId: business.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
          }),
        );
      });
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === '23505'
      ) {
        throw new ConflictException('An account with this email already exists');
      }
      throw err;
    }

    return {
      message: 'Account created — check your email to verify your address before logging in.',
    };
  }
}
