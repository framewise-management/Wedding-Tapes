import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum DiscountType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'proposal_number', type: 'varchar' })
  proposalNumber: string;

  @Column({ name: 'wedding_date', type: 'date' })
  weddingDate: string;

  @Column({ name: 'wedding_location', type: 'varchar' })
  weddingLocation: string;

  @Column({ name: 'number_of_days', type: 'int', nullable: true })
  numberOfDays: number | null;

  @Column({
    type: 'varchar',
    default: ProposalStatus.DRAFT,
  })
  status: ProposalStatus;

  @Column({ type: 'int', default: 0 })
  subtotal: number;

  @Column({
    name: 'discount_type',
    type: 'varchar',
    nullable: true,
  })
  discountType: DiscountType | null;

  @Column({ name: 'discount_value', type: 'int', nullable: true })
  discountValue: number | null;

  @Column({ name: 'discount_amount', type: 'int', default: 0 })
  discountAmount: number;

  @Column({ name: 'tax_rate', type: 'int', default: 0 })
  taxRate: number;

  @Column({ name: 'tax_amount', type: 'int', default: 0 })
  taxAmount: number;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ProposalPackage, (item) => item.proposal, {
    cascade: true,
  })
  packages: ProposalPackage[];

  @OneToMany(() => ProposalItem, (item) => item.proposal, { cascade: true })
  items: ProposalItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('proposal_packages')
export class ProposalPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => Proposal, (proposal) => proposal.packages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({ name: 'package_id' })
  packageId: string;

  @Column({ name: 'package_name', type: 'varchar' })
  packageName: string;

  @Column({ name: 'package_description', type: 'text', nullable: true })
  packageDescription: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  total: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('proposal_items')
export class ProposalItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => Proposal, (proposal) => proposal.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ name: 'service_name', type: 'varchar' })
  serviceName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'price_type', type: 'varchar' })
  priceType: 'per_day' | 'flat';

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  total: number;

  @Column({ name: 'is_optional', type: 'boolean', default: false })
  isOptional: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
