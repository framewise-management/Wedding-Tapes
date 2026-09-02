import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async findOne(businessId: string): Promise<Business> {
    const business = await this.businessRepository.findOneBy({
      id: businessId,
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(
    businessId: string,
    dto: UpdateBusinessDto,
  ): Promise<Business> {
    await this.findOne(businessId);
    await this.businessRepository.update(businessId, dto);
    return this.findOne(businessId);
  }
}
