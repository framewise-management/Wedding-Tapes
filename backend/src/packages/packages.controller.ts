import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { AddPackageServiceDto } from './dto/add-package-service.dto';
import { ListPackagesQueryDto } from './dto/list-packages-query.dto';

@Controller('packages')
@UseGuards(JwtAuthGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListPackagesQueryDto,
  ) {
    return this.packagesService.findAll(user.businessId, query.active);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePackageDto) {
    return this.packagesService.create(user.businessId, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.findOne(user.businessId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.packagesService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    await this.packagesService.remove(user.businessId, id);
    return { success: true };
  }

  @Post(':id/services')
  addService(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPackageServiceDto,
  ) {
    return this.packagesService.addService(user.businessId, id, dto);
  }

  @Delete(':id/services/:serviceId')
  removeService(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.packagesService.removeService(user.businessId, id, serviceId);
  }
}
