import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Business } from './business/entities/business.entity';
import { BusinessModule } from './business/business.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { PackagesModule } from './packages/packages.module';
import { CustomersModule } from './customers/customers.module';
import { ProposalsModule } from './proposals/proposals.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        ssl: config.get('DATABASE_CA_CERT')
          ? { ca: config.get('DATABASE_CA_CERT') }
          : undefined,
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([Business]),
    AuthModule,
    BusinessModule,
    ServicesModule,
    PackagesModule,
    CustomersModule,
    ProposalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
