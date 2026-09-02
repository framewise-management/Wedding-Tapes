import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { BusinessService } from '../business/business.service';
import { PdfService } from '../pdf/pdf.service';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { CalculateProposalDto } from './dto/calculate-proposal.dto';
import { ListProposalsQueryDto } from './dto/list-proposals-query.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly businessService: BusinessService,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListProposalsQueryDto,
  ) {
    return this.proposalsService.findAll(user.businessId, query);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProposalDto) {
    return this.proposalsService.create(user.businessId, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.proposalsService.findOne(user.businessId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalDto,
  ) {
    return this.proposalsService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    await this.proposalsService.remove(user.businessId, id);
    return { success: true };
  }

  @Post(':id/calculate')
  calculate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalculateProposalDto,
  ) {
    return this.proposalsService.calculate(user.businessId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalStatusDto,
  ) {
    return this.proposalsService.updateStatus(user.businessId, id, dto.status);
  }

  @Post(':id/generate-pdf')
  async generatePdf(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const [proposal, business] = await Promise.all([
      this.proposalsService.findOne(user.businessId, id),
      this.businessService.findOne(user.businessId),
    ]);
    const pdf = await this.pdfService.generateProposalPdf(proposal, business);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${proposal.proposalNumber}.pdf"`,
      })
      .send(pdf);
  }
}
