import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import {
  Proposal,
  ProposalItem,
  ProposalPackage,
  ProposalStatus,
} from './entities/proposal.entity.js';
import {
  CreateProposalDto,
  ProposalItemInputDto,
  ProposalPackageInputDto,
} from './dto/create-proposal.dto.js';
import { UpdateProposalDto } from './dto/update-proposal.dto.js';
import { CalculateProposalDto } from './dto/calculate-proposal.dto.js';
import { ListProposalsQueryDto } from './dto/list-proposals-query.dto.js';
import { PackagesService } from '../packages/packages.service.js';
import { ServicesService } from '../services/services.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { BusinessService } from '../business/business.service.js';
import { PricingService } from '../pricing/pricing.service.js';

const RELATIONS = { customer: true, packages: true, items: true };

type PackageSnapshot = Pick<
  ProposalPackage,
  'packageId' | 'packageName' | 'packageDescription' | 'quantity' | 'unitPrice' | 'total'
>;

type ItemSnapshot = Pick<
  ProposalItem,
  | 'serviceId'
  | 'serviceName'
  | 'description'
  | 'priceType'
  | 'quantity'
  | 'unitPrice'
  | 'total'
  | 'isOptional'
>;

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepository: Repository<Proposal>,
    @InjectRepository(ProposalPackage)
    private readonly proposalPackageRepository: Repository<ProposalPackage>,
    @InjectRepository(ProposalItem)
    private readonly proposalItemRepository: Repository<ProposalItem>,
    private readonly packagesService: PackagesService,
    private readonly servicesService: ServicesService,
    private readonly customersService: CustomersService,
    private readonly businessService: BusinessService,
    private readonly pricingService: PricingService,
  ) {}

  findAll(businessId: string, query: ListProposalsQueryDto = {}): Promise<Proposal[]> {
    const qb = this.proposalRepository
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.customer', 'customer')
      .leftJoinAndSelect('proposal.packages', 'packages')
      .leftJoinAndSelect('proposal.items', 'items')
      .where('proposal.businessId = :businessId', { businessId })
      .orderBy('proposal.createdAt', 'DESC');
    if (query.status) {
      qb.andWhere('proposal.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere('customer.name ILIKE :search', { search: `%${query.search}%` });
    }
    return qb.getMany();
  }

  async findOne(businessId: string, id: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id, businessId },
      relations: RELATIONS,
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    await this.proposalRepository.delete({ id, businessId });
  }

  async create(businessId: string, dto: CreateProposalDto): Promise<Proposal> {
    if (!dto.packages?.length && !dto.items?.length) {
      throw new BadRequestException(
        'A proposal needs at least one package or service',
      );
    }
    await this.customersService.findOne(businessId, dto.customerId);

    const packages = await Promise.all(
      (dto.packages ?? []).map((input) =>
        this.resolvePackageSnapshot(businessId, input, true),
      ),
    );
    const items = await Promise.all(
      (dto.items ?? []).map((input) =>
        this.resolveItemSnapshot(businessId, input, true),
      ),
    );
    const taxRate = dto.taxRate ?? 0;
    const pricing = this.pricingService.calculate({
      packages,
      items,
      discountType: dto.discount?.type ?? null,
      discountValue: dto.discount?.value ?? null,
      taxRate,
    });

    const proposalNumber = await this.generateProposalNumber(businessId);
    const validUntil = await this.resolveValidUntil(businessId, dto.validUntil);

    const proposal = this.proposalRepository.create({
      businessId,
      customerId: dto.customerId,
      proposalNumber,
      weddingDate: dto.weddingDate,
      weddingLocation: dto.weddingLocation,
      numberOfDays: dto.numberOfDays ?? null,
      notes: dto.notes ?? null,
      validUntil,
      status: ProposalStatus.DRAFT,
      discountType: dto.discount?.type ?? null,
      discountValue: dto.discount?.value ?? null,
      taxRate,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      taxAmount: pricing.taxAmount,
      total: pricing.total,
      packages,
      items,
    });
    const saved = await this.proposalRepository.save(proposal);
    return this.findOne(businessId, saved.id);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateProposalDto,
  ): Promise<Proposal> {
    const existing = await this.findOne(businessId, id);
    if (existing.status !== ProposalStatus.DRAFT) {
      throw new ConflictException('Only draft proposals can be edited');
    }
    if (dto.customerId !== undefined) {
      await this.customersService.findOne(businessId, dto.customerId);
    }

    await this.proposalRepository.update({ id, businessId }, {
      ...(dto.customerId !== undefined && { customerId: dto.customerId }),
      ...(dto.weddingDate !== undefined && { weddingDate: dto.weddingDate }),
      ...(dto.weddingLocation !== undefined && {
        weddingLocation: dto.weddingLocation,
      }),
      ...(dto.numberOfDays !== undefined && {
        numberOfDays: dto.numberOfDays,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.validUntil !== undefined && { validUntil: dto.validUntil }),
      ...(dto.discount !== undefined && {
        discountType: dto.discount?.type ?? null,
        discountValue: dto.discount?.value ?? null,
      }),
      ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
    });

    if (dto.packages !== undefined || dto.items !== undefined) {
      if (dto.packages !== undefined) {
        await this.proposalPackageRepository.delete({ proposalId: id });
      }
      if (dto.items !== undefined) {
        await this.proposalItemRepository.delete({ proposalId: id });
      }
      const existingPackageIds = new Set(existing.packages.map((p) => p.packageId));
      const existingServiceIds = new Set(existing.items.map((i) => i.serviceId));
      const packages = dto.packages
        ? await Promise.all(
            dto.packages.map((input) =>
              this.resolvePackageSnapshot(
                businessId,
                input,
                !existingPackageIds.has(input.packageId),
              ),
            ),
          )
        : undefined;
      const items = dto.items
        ? await Promise.all(
            dto.items.map((input) =>
              this.resolveItemSnapshot(
                businessId,
                input,
                !existingServiceIds.has(input.serviceId),
              ),
            ),
          )
        : undefined;
      if (packages) {
        await this.proposalPackageRepository.save(
          packages.map((p) => ({ ...p, proposalId: id })),
        );
      }
      if (items) {
        await this.proposalItemRepository.save(
          items.map((i) => ({ ...i, proposalId: id })),
        );
      }
    }

    const refreshed = await this.findOne(businessId, id);
    await this.persistPricing(refreshed);
    return this.findOne(businessId, id);
  }

  async calculate(
    businessId: string,
    id: string,
    dto: CalculateProposalDto,
  ): Promise<Proposal> {
    const existing = await this.findOne(businessId, id);
    if (existing.status !== ProposalStatus.DRAFT) {
      throw new ConflictException('Only draft proposals can be edited');
    }

    await this.proposalRepository.update({ id, businessId }, {
      ...(dto.discount !== undefined && {
        discountType: dto.discount?.type ?? null,
        discountValue: dto.discount?.value ?? null,
      }),
      ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
    });

    const refreshed = await this.findOne(businessId, id);
    await this.persistPricing(refreshed);
    return this.findOne(businessId, id);
  }

  async updateStatus(
    businessId: string,
    id: string,
    status: ProposalStatus,
  ): Promise<Proposal> {
    await this.findOne(businessId, id);
    await this.proposalRepository.update({ id, businessId }, { status });
    return this.findOne(businessId, id);
  }

  private async persistPricing(proposal: Proposal): Promise<void> {
    const pricing = this.pricingService.calculate({
      packages: proposal.packages,
      items: proposal.items,
      discountType: proposal.discountType,
      discountValue: proposal.discountValue,
      taxRate: proposal.taxRate,
    });
    await this.proposalRepository.update(
      { id: proposal.id, businessId: proposal.businessId },
      {
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        taxAmount: pricing.taxAmount,
        total: pricing.total,
      },
    );
  }

  private async resolvePackageSnapshot(
    businessId: string,
    input: ProposalPackageInputDto,
    requireActive: boolean,
  ): Promise<PackageSnapshot> {
    const pkg = await this.packagesService.findOne(businessId, input.packageId);
    if (requireActive && !pkg.active) {
      throw new BadRequestException(`${pkg.name} is not active and cannot be added`);
    }
    const quantity = input.quantity ?? 1;
    return {
      packageId: pkg.id,
      packageName: pkg.name,
      packageDescription: pkg.description,
      quantity,
      unitPrice: pkg.price,
      total: pkg.price * quantity,
    };
  }

  private async resolveItemSnapshot(
    businessId: string,
    input: ProposalItemInputDto,
    requireActive: boolean,
  ): Promise<ItemSnapshot> {
    const service = await this.servicesService.findOne(
      businessId,
      input.serviceId,
    );
    if (requireActive && !service.active) {
      throw new BadRequestException(`${service.name} is not active and cannot be added`);
    }
    const priceType =
      input.priceType ?? (service.perDayPrice != null ? 'per_day' : 'flat');
    const unitPrice =
      priceType === 'per_day' ? service.perDayPrice : service.flatPrice;
    if (unitPrice == null) {
      throw new BadRequestException(
        `${service.name} has no ${priceType === 'per_day' ? 'per-day' : 'flat'} price set`,
      );
    }
    const quantity = input.quantity ?? 1;
    return {
      serviceId: service.id,
      serviceName: service.name,
      description: service.description,
      priceType,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
      isOptional: input.isOptional ?? false,
    };
  }

  private async generateProposalNumber(businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    // ponytail: count-based sequence, not concurrency-safe; add a DB sequence/advisory lock if concurrent proposal creation becomes real.
    const count = await this.proposalRepository.count({
      where: { businessId, proposalNumber: Like(`WP-${year}-%`) },
    });
    const sequence = String(count + 1).padStart(4, '0');
    return `WP-${year}-${sequence}`;
  }

  private async resolveValidUntil(
    businessId: string,
    provided?: string,
  ): Promise<string | null> {
    if (provided) return provided;
    const business = await this.businessService.findOne(businessId);
    if (!business.defaultValidityDays) return null;
    const date = new Date();
    date.setDate(date.getDate() + business.defaultValidityDays);
    return date.toISOString().slice(0, 10);
  }
}
