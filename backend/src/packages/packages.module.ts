import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package, PackageService } from './entities/package.entity';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { AuthModule } from '../auth/auth.module';
import { ServicesModule } from '../services/services.module';

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
