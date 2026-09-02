import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Proposal,
  ProposalItem,
  ProposalPackage,
} from './entities/proposal.entity';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { AuthModule } from '../auth/auth.module';
import { PackagesModule } from '../packages/packages.module';
import { ServicesModule } from '../services/services.module';
import { CustomersModule } from '../customers/customers.module';
import { BusinessModule } from '../business/business.module';
import { PricingModule } from '../pricing/pricing.module';
import { PdfModule } from '../pdf/pdf.module';

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
