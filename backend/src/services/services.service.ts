import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  findAll(businessId: string, active?: boolean): Promise<Service[]> {
    return this.serviceRepository.findBy({
      businessId,
      ...(active !== undefined ? { active } : {}),
    });
  }

  async findOne(businessId: string, id: string): Promise<Service> {
    const service = await this.serviceRepository.findOneBy({
      id,
      businessId,
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  create(businessId: string, dto: CreateServiceDto): Promise<Service> {
    if (dto.perDayPrice === undefined && dto.flatPrice === undefined) {
      throw new BadRequestException(
        'Set a per-day price, a flat price, or both',
      );
    }
    return this.serviceRepository.save(
      this.serviceRepository.create({ ...dto, businessId }),
    );
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateServiceDto,
  ): Promise<Service> {
    await this.findOne(businessId, id);
    await this.serviceRepository.update({ id, businessId }, dto);
    return this.findOne(businessId, id);
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    try {
      await this.serviceRepository.delete({ id, businessId });
    } catch (err) {
      if (err instanceof QueryFailedError && (err.driverError as { code?: string })?.code === '23503') {
        throw new ConflictException(
          'Cannot delete a service that is part of a package',
        );
      }
      throw err;
    }
  }
}
