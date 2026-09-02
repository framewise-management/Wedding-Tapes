import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Proposal,
  ProposalItem,
  ProposalPackage,
} from './entities/proposal.entity.js';
import { ProposalsService } from './proposals.service.js';
import { ProposalsController } from './proposals.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { PackagesModule } from '../packages/packages.module.js';
import { ServicesModule } from '../services/services.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { BusinessModule } from '../business/business.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { PdfModule } from '../pdf/pdf.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proposal, ProposalPackage, ProposalItem]),
    AuthModule,
    PackagesModule,
    ServicesModule,
    CustomersModule,
    BusinessModule,
    PricingModule,
    PdfModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService],
})
export class ProposalsModule {}
