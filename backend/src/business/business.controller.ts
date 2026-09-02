import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { BusinessService } from './business.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('business')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  getBusiness(@CurrentUser() user: JwtPayload) {
    return this.businessService.findOne(user.businessId);
  }

  @Put()
  updateBusiness(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessService.update(user.businessId, dto);
  }
}
