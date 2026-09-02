import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Business } from '../business/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { Service } from '../services/entities/service.entity';
import { Package, PackageService } from '../packages/entities/package.entity';
import { Customer } from '../customers/entities/customer.entity';
import {
  Proposal,
  ProposalItem,
  ProposalPackage,
} from '../proposals/entities/proposal.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : undefined,
  entities: [
    Business,
    User,
    Service,
    Package,
    PackageService,
    Customer,
    Proposal,
    ProposalPackage,
    ProposalItem,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
