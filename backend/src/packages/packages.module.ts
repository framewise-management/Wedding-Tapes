import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package, PackageService } from './entities/package.entity.js';
import { PackagesService } from './packages.service.js';
import { PackagesController } from './packages.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { ServicesModule } from '../services/services.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package, PackageService]),
    AuthModule,
    ServicesModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
