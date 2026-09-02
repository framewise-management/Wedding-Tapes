import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Package, PackageService } from './entities/package.entity.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { AddPackageServiceDto } from './dto/add-package-service.dto.js';
import { ServicesService } from '../services/services.service.js';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    @InjectRepository(PackageService)
    private readonly packageServiceRepository: Repository<PackageService>,
    private readonly servicesService: ServicesService,
  ) {}

  findAll(businessId: string, active?: boolean): Promise<Package[]> {
    return this.packageRepository.find({
      where: { businessId, ...(active !== undefined ? { active } : {}) },
      relations: { items: { service: true } },
    });
  }

  async findOne(businessId: string, id: string): Promise<Package> {
    const pkg = await this.packageRepository.findOne({
      where: { id, businessId },
      relations: { items: { service: true } },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  create(businessId: string, dto: CreatePackageDto): Promise<Package> {
    return this.packageRepository.save(
      this.packageRepository.create({ ...dto, businessId }),
    );
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdatePackageDto,
  ): Promise<Package> {
    await this.findOne(businessId, id);
    await this.packageRepository.update({ id, businessId }, dto);
    return this.findOne(businessId, id);
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    try {
      await this.packageRepository.delete({ id, businessId });
    } catch (err) {
      if (err instanceof QueryFailedError && (err.driverError as { code?: string })?.code === '23503') {
        throw new ConflictException(
          'Cannot delete a package that is used in a proposal',
        );
      }
      throw err;
    }
  }

  async addService(
    businessId: string,
    packageId: string,
    dto: AddPackageServiceDto,
  ): Promise<Package> {
    await this.findOne(businessId, packageId);
    await this.servicesService.findOne(businessId, dto.serviceId);

    const existing = await this.packageServiceRepository.findOneBy({
      packageId,
      serviceId: dto.serviceId,
    });

    if (existing) {
      await this.packageServiceRepository.update(existing.id, {
        quantity: dto.quantity,
      });
    } else {
      await this.packageServiceRepository.save(
        this.packageServiceRepository.create({
          packageId,
          serviceId: dto.serviceId,
          quantity: dto.quantity,
        }),
      );
    }

    return this.findOne(businessId, packageId);
  }

  async removeService(
    businessId: string,
    packageId: string,
    serviceId: string,
  ): Promise<Package> {
    await this.findOne(businessId, packageId);
    const existing = await this.packageServiceRepository.findOneBy({
      packageId,
      serviceId,
    });
    if (!existing) {
      throw new NotFoundException('Service is not part of this package');
    }
    await this.packageServiceRepository.delete(existing.id);
    return this.findOne(businessId, packageId);
  }
}
