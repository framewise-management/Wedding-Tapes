import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppService } from './app.service.js';
import { Business } from './business/entities/business.entity.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const businessCount = await this.businessRepository.count();
    return { status: 'ok', businessCount };
  }
}
