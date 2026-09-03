import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  foreignKey,
  unique,
  boolean,
  date,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
export type DiscountType = 'FIXED' | 'PERCENTAGE';
export type PriceType = 'per_day' | 'flat';

export const businesses = pgTable('businesses', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar().notNull(),
  logo: varchar(),
  phone: varchar(),
  email: varchar(),
  address: varchar(),
  website: varchar(),
  defaultValidityDays: integer('default_validity_days'),
  defaultTerms: text('default_terms'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull()
    .$onUpdate(() => sql`now()`),
});

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    businessId: uuid('business_id').notNull(),
    email: varchar().notNull(),
    passwordHash: varchar('password_hash'),
    firstName: varchar('first_name'),
    lastName: varchar('last_name'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    foreignKey({
      columns: [table.businessId],
      foreignColumns: [businesses.id],
      name: 'FK_cde4b2aabca86cfabdc78b537f0',
    }).onDelete('cascade'),
    unique('UQ_97672ac88f789774dd47f7c8be3').on(table.email),
  ],
);

export const services = pgTable(
  'services',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    businessId: uuid('business_id').notNull(),
    name: varchar().notNull(),
    category: varchar(),
    description: text(),
    perDayPrice: integer('per_day_price'),
    flatPrice: integer('flat_price'),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    foreignKey({
      columns: [table.businessId],
      foreignColumns: [businesses.id],
      name: 'FK_c591d6bbbe01010d8705127ba33',
    }).onDelete('cascade'),
  ],
);

export const packages = pgTable(
  'packages',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    businessId: uuid('business_id').notNull(),
    name: varchar().notNull(),
    description: text(),
    price: integer().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    foreignKey({
      columns: [table.businessId],
      foreignColumns: [businesses.id],
      name: 'FK_deeed0c0b7c9248204ad64c1b85',
    }).onDelete('cascade'),
  ],
);

export const packageServices = pgTable(
  'package_services',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    packageId: uuid('package_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    quantity: integer().default(1).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [services.id],
      name: 'FK_88a6b1f9641c4e6e37b385e20bb',
    }),
    foreignKey({
      columns: [table.packageId],
      foreignColumns: [packages.id],
      name: 'FK_f30752478d9171c81d95b2754d8',
    }).onDelete('cascade'),
    unique('UQ_51bf6320688f8e6e978b2f7c42c').on(table.packageId, table.serviceId),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    businessId: uuid('business_id').notNull(),
    name: varchar().notNull(),
    phone: varchar().notNull(),
    email: varchar(),
    address: text(),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    foreignKey({
      columns: [table.businessId],
      foreignColumns: [businesses.id],
      name: 'FK_c04b1ab3076e753f96c64318286',
    }).onDelete('cascade'),
  ],
);

export const proposals = pgTable(
  'proposals',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    businessId: uuid('business_id').notNull(),
    customerId: uuid('customer_id').notNull(),
    proposalNumber: varchar('proposal_number').notNull(),
    weddingDate: date('wedding_date', { mode: 'string' }).notNull(),
    weddingLocation: varchar('wedding_location').notNull(),
    numberOfDays: integer('number_of_days'),
    status: varchar().$type<ProposalStatus>().default('DRAFT').notNull(),
    subtotal: integer().default(0).notNull(),
    discountType: varchar('discount_type').$type<DiscountType>(),
    discountValue: integer('discount_value'),
    discountAmount: integer('discount_amount').default(0).notNull(),
    taxRate: integer('tax_rate').default(0).notNull(),
    taxAmount: integer('tax_amount').default(0).notNull(),
    total: integer().default(0).notNull(),
    validUntil: date('valid_until', { mode: 'string' }),
    notes: text(),
    shareViewCount: integer('share_view_count').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'FK_6f9ef1e855e753fc183ced310fd',
    }),
    foreignKey({
      columns: [table.businessId],
      foreignColumns: [businesses.id],
      name: 'FK_b103c9b87cf36982e70db67609d',
    }).onDelete('cascade'),
    unique('UQ_d722f69b1d321dfe53cfa38dd29').on(table.businessId, table.proposalNumber),
  ],
);

export const proposalPackages = pgTable(
  'proposal_packages',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    proposalId: uuid('proposal_id').notNull(),
    packageId: uuid('package_id').notNull(),
    packageName: varchar('package_name').notNull(),
    packageDescription: text('package_description'),
    quantity: integer().default(1).notNull(),
    unitPrice: integer('unit_price').notNull(),
    total: integer().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.packageId],
      foreignColumns: [packages.id],
      name: 'FK_7d0fec3c8a38a500d592c4bd6b8',
    }),
    foreignKey({
      columns: [table.proposalId],
      foreignColumns: [proposals.id],
      name: 'FK_fbae1e2110026d140767642c571',
    }).onDelete('cascade'),
  ],
);

export const proposalItems = pgTable(
  'proposal_items',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    proposalId: uuid('proposal_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    serviceName: varchar('service_name').notNull(),
    description: text(),
    priceType: varchar('price_type').$type<PriceType>().notNull(),
    quantity: integer().default(1).notNull(),
    unitPrice: integer('unit_price').notNull(),
    total: integer().notNull(),
    isOptional: boolean('is_optional').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [services.id],
      name: 'FK_07083c82df82e27a93c6cc32f20',
    }),
    foreignKey({
      columns: [table.proposalId],
      foreignColumns: [proposals.id],
      name: 'FK_461897fd2a9acc7e9a9d65c8bf2',
    }).onDelete('cascade'),
  ],
);

// Relation names below are chosen to match what the app code expects
// (e.g. package.items, proposal.packages, proposal.items) -- not the
// raw table names drizzle-kit pull would otherwise default to.

export const businessesRelations = relations(businesses, ({ many }) => ({
  users: many(users),
  services: many(services),
  packages: many(packages),
  customers: many(customers),
  proposals: many(proposals),
}));

export const usersRelations = relations(users, ({ one }) => ({
  business: one(businesses, {
    fields: [users.businessId],
    references: [businesses.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  business: one(businesses, {
    fields: [services.businessId],
    references: [businesses.id],
  }),
  packageServices: many(packageServices),
  proposalItems: many(proposalItems),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  business: one(businesses, {
    fields: [packages.businessId],
    references: [businesses.id],
  }),
  items: many(packageServices),
  proposalPackages: many(proposalPackages),
}));

export const packageServicesRelations = relations(packageServices, ({ one }) => ({
  service: one(services, {
    fields: [packageServices.serviceId],
    references: [services.id],
  }),
  package: one(packages, {
    fields: [packageServices.packageId],
    references: [packages.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id],
  }),
  proposals: many(proposals),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  customer: one(customers, {
    fields: [proposals.customerId],
    references: [customers.id],
  }),
  business: one(businesses, {
    fields: [proposals.businessId],
    references: [businesses.id],
  }),
  packages: many(proposalPackages),
  items: many(proposalItems),
}));

export const proposalPackagesRelations = relations(proposalPackages, ({ one }) => ({
  package: one(packages, {
    fields: [proposalPackages.packageId],
    references: [packages.id],
  }),
  proposal: one(proposals, {
    fields: [proposalPackages.proposalId],
    references: [proposals.id],
  }),
}));

export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  service: one(services, {
    fields: [proposalItems.serviceId],
    references: [services.id],
  }),
  proposal: one(proposals, {
    fields: [proposalItems.proposalId],
    references: [proposals.id],
  }),
}));
